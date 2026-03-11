import { Injectable, Logger } from '@nestjs/common';
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
    const { name, message, filters = [], inboxId, evolutionInstance } = createCampaignDto;
    const accountId = createCampaignDto.accountId || this.configService.get<number>('CHATWOOT_ACCOUNT_ID');

    try {
      this.logger.log(`Starting campaign creation: ${name} (Account: ${accountId})`);

      if (!accountId) {
        throw new Error('CHATWOOT_ACCOUNT_ID is required');
      }

      // 1. Busca contatos filtrados no Chatwoot
      this.logger.log(`Step 1: Fetching contacts from Chatwoot with filters: ${filters.join(', ')}`);
      const contacts = await this.chatwootService.filterContacts(Number(accountId), filters);
      
      this.logger.log(`Step 2: Persisting campaign in database. Found ${contacts?.length || 0} contacts.`);

      // 2. Salva a campanha no banco
      const campaign = this.campaignRepository.create({
        name,
        message,
        filters,
        accountId,
        inboxId,
        evolutionInstance,
        status: (contacts && contacts.length > 0) ? CampaignStatus.PROCESSING : CampaignStatus.COMPLETED,
        totalContacts: contacts?.length || 0,
      });

      const savedCampaign = await this.campaignRepository.save(campaign);

      // 3. Adiciona na fila de disparos apenas se houver contatos
      if (contacts && contacts.length > 0) {
        this.logger.log(`Step 3: Enqueuing ${contacts.length} jobs for campaign ${savedCampaign.id}`);
        await this.enqueueDisparos(savedCampaign.id, contacts);
      } else {
        this.logger.warn(`No contacts found for campaign ${savedCampaign.id}. Skipping enqueue.`);
      }

      this.logger.log(`Campaign ${savedCampaign.id} created successfully.`);
      return savedCampaign;

    } catch (error) {
      this.logger.error(`Failed to create campaign: ${error.message}`, error.stack);
      throw error;
    }
  }

  private async enqueueDisparos(campaignId: number, contacts: any[]) {
    this.logger.log(`Enqueuing ${contacts.length} jobs for campaign ${campaignId}`);
    
    const jobs = contacts.map(contact => ({
      name: `disparo-${campaignId}-${contact.id}`,
      data: { campaignId, contact },
      opts: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
      },
    }));

    // Adiciona em chunks para evitar sobrecarga (opcional, mas recomendado para grandes volumes)
    await this.campaignQueue.addBulk(jobs);
  }

  async findAll() {
    return this.campaignRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number) {
    return this.campaignRepository.findOneBy({ id });
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
