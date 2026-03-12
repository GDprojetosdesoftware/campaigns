import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign, CampaignStatus } from './entities/campaign.entity';
import { ChatwootService } from '../chatwoot/chatwoot.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { EvolutionService } from '../evolution/evolution.service';

@Injectable()
export class CampaignsService {
  private readonly logger = new Logger(CampaignsService.name);

  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    private chatwootService: ChatwootService,
    private configService: ConfigService,
    @InjectQueue('campaign-disparos')
    private campaignQueue: Queue,
    private evolutionService: EvolutionService,
  ) {}

  async create(createCampaignDto: any) {
    const { name, message, filters = [], inboxId, evolutionInstance, scheduledAt } = createCampaignDto;
    const accountId = createCampaignDto.accountId || this.configService.get<number>('CHATWOOT_ACCOUNT_ID');

    try {
      this.logger.log(`Starting campaign creation: ${name} (Account: ${accountId})`);

      if (!accountId) {
        throw new BadRequestException('CHATWOOT_ACCOUNT_ID is required (check environment variables)');
      }
      if (!name || !message || !inboxId || !evolutionInstance) {
        throw new BadRequestException('Fields name, message, inboxId, and evolutionInstance are required');
      }

      this.logger.log(`Saving campaign in database as PENDING.`);

      const campaign = this.campaignRepository.create({
        name,
        message,
        filters,
        accountId: Number(accountId),
        inboxId: Number(inboxId),
        evolutionInstance,
        status: CampaignStatus.PENDING,
        totalContacts: 0,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      });

      const savedCampaign = await this.campaignRepository.save(campaign);

      this.logger.log(`Campaign ${savedCampaign.id} created successfully with status ${savedCampaign.status}.`);
      return savedCampaign;

    } catch (error) {
      this.logger.error(`Failed to create campaign: ${error.message}`, error.stack);
      throw error;
    }
  }

  async startCampaign(id: number) {
    const campaign = await this.campaignRepository.findOneBy({ id });
    if (!campaign) {
      throw new NotFoundException(`Campaign ${id} not found`);
    }

    // Permite iniciar se PENDING ou re-iniciar se COMPLETED/FAILED
    if (campaign.status === CampaignStatus.PROCESSING) {
      throw new BadRequestException(`Campaign ${id} is already processing`);
    }

    // Reset para re-execução
    campaign.sentSuccess = 0;
    campaign.sentError = 0;
    campaign.totalContacts = 0;

    try {
      this.logger.log(`Step 1: Fetching contacts from Chatwoot for campaign ${id} with filters: ${JSON.stringify(campaign.filters)}`);
      const contacts = await this.chatwootService.filterContacts(campaign.accountId, campaign.filters || []);
      
      const contactsCount = contacts?.length || 0;
      this.logger.log(`Step 2: Found ${contactsCount} contacts. Updating campaign status.`);

      campaign.totalContacts = contactsCount;
      campaign.status = contactsCount > 0 ? CampaignStatus.PROCESSING : CampaignStatus.COMPLETED;
      
      const updatedCampaign = await this.campaignRepository.save(campaign);

      if (contactsCount > 0) {
        this.logger.log(`Step 3: Enqueuing ${contactsCount} jobs for campaign ${id}`);
        try {
          await this.enqueueDisparos(id, contacts);
        } catch (queueError) {
          this.logger.error(`Failed to enqueue disparos for campaign ${id}: ${queueError.message}`);
          updatedCampaign.status = CampaignStatus.FAILED;
          await this.campaignRepository.save(updatedCampaign);
          throw new Error(`Failed to enqueue jobs. Check Redis connection: ${queueError.message}`);
        }
      } else {
        this.logger.warn(`No contacts found for campaign ${id}. Status set to COMPLETED.`);
      }

      return updatedCampaign;
    } catch (error) {
      this.logger.error(`Failed to start campaign ${id}: ${error.message}`, error.stack);
      campaign.status = CampaignStatus.FAILED;
      await this.campaignRepository.save(campaign);
      throw error;
    }
  }

  private async enqueueDisparos(campaignId: number, contacts: any[]) {
    this.logger.log(`Enqueuing ${contacts.length} jobs for campaign ${campaignId} with randomized delays`);
    
    let cumulativeDelay = 0;
    const MIN_DELAY = 5000; // 5 segundos
    const MAX_DELAY = 15000; // 15 segundos

    const jobs = contacts.map((contact, index) => {
      // Adiciona um delay aleatório entre MIN e MAX para cada mensagem
      // O delay é cumulativo para que as mensagens sejam disparadas em sequência com intervalos
      if (index > 0) {
        const randomInterval = Math.floor(Math.random() * (MAX_DELAY - MIN_DELAY + 1)) + MIN_DELAY;
        cumulativeDelay += randomInterval;
      }

      return {
        name: `disparo-${campaignId}-${contact.id}`,
        data: { campaignId, contact },
        opts: {
          delay: cumulativeDelay, // BullMQ delay em ms
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
        },
      };
    });

    await this.campaignQueue.addBulk(jobs);
  }

  async findAll() {
    return this.campaignRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number) {
    const campaign = await this.campaignRepository.findOneBy({ id });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    return campaign;
  }

  async update(id: number, updateDto: any) {
    const campaign = await this.campaignRepository.findOneBy({ id });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);

    // Only allow editing pending campaigns
    if (campaign.status === CampaignStatus.PROCESSING) {
      throw new BadRequestException('Cannot edit a campaign that is currently processing');
    }

    if (updateDto.name !== undefined) campaign.name = updateDto.name;
    if (updateDto.message !== undefined) campaign.message = updateDto.message;
    if (updateDto.filters !== undefined) campaign.filters = updateDto.filters;
    if (updateDto.inboxId !== undefined) campaign.inboxId = Number(updateDto.inboxId);
    if (updateDto.evolutionInstance !== undefined) campaign.evolutionInstance = updateDto.evolutionInstance;
    if (updateDto.scheduledAt !== undefined) campaign.scheduledAt = updateDto.scheduledAt ? new Date(updateDto.scheduledAt) : null;

    // Reset to pending when edited so user must restart
    campaign.status = CampaignStatus.PENDING;
    campaign.sentSuccess = 0;
    campaign.sentError = 0;
    campaign.totalContacts = 0;

    return this.campaignRepository.save(campaign);
  }

  async remove(id: number) {
    const campaign = await this.campaignRepository.findOneBy({ id });
    if (!campaign) throw new NotFoundException(`Campaign ${id} not found`);
    await this.campaignRepository.remove(campaign);
    return { message: `Campaign ${id} deleted successfully` };
  }

  async duplicate(id: number) {
    const original = await this.campaignRepository.findOneBy({ id });
    if (!original) throw new NotFoundException(`Campaign ${id} not found`);

    const duplicate = this.campaignRepository.create({
      name: `${original.name} (cópia)`,
      message: original.message,
      filters: original.filters,
      accountId: original.accountId,
      inboxId: original.inboxId,
      evolutionInstance: original.evolutionInstance,
      status: CampaignStatus.PENDING,
      totalContacts: 0,
      sentSuccess: 0,
      sentError: 0,
      scheduledAt: null,
    });

    return this.campaignRepository.save(duplicate);
  }

  async getInboxes() {
    const accountId = this.configService.get<number>('CHATWOOT_ACCOUNT_ID');
    if (!accountId) {
      throw new Error('CHATWOOT_ACCOUNT_ID is required');
    }
    return this.chatwootService.getInboxes(Number(accountId));
  }

  async getLabels() {
    const accountId = this.configService.get<number>('CHATWOOT_ACCOUNT_ID');
    if (!accountId) {
      throw new Error('CHATWOOT_ACCOUNT_ID is required');
    }
    return this.chatwootService.getLabels(Number(accountId));
  }

  async getEvolutionInstances() {
    return this.evolutionService.fetchInstances();
  }
}
