import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ChatwootService } from '../chatwoot/chatwoot.service';
import { EvolutionService } from '../evolution/evolution.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Campaign, CampaignStatus } from '../campaigns/entities/campaign.entity';
import { Repository } from 'typeorm';

@Processor('campaign-disparos')
export class CampaignProcessor extends WorkerHost {
  private readonly logger = new Logger(CampaignProcessor.name);

  constructor(
    @InjectRepository(Campaign)
    private campaignRepository: Repository<Campaign>,
    private chatwootService: ChatwootService,
    private evolutionService: EvolutionService,
  ) {
    super();
  }

  async process(job: Job<any>): Promise<any> {
    const { campaignId, contact } = job.data;
    const campaign = await this.campaignRepository.findOneBy({ id: campaignId });

    if (!campaign || campaign.status === CampaignStatus.CANCELLED) {
      return;
    }

    try {
      this.logger.log(`Processing contact ${contact.id} for campaign ${campaignId}`);

      // 1. Garante conversa no Chatwoot
      const conversation = await this.chatwootService.getOrCreateConversation(
        campaign.accountId,
        campaign.inboxId,
        contact.id,
      );

      // 2. Envia via Evolution API
      // Substitui placeholders na mensagem
      const phone = contact.phone_number.replace('+', '');
      const contactName = contact.name || '';
      const personalizedMessage = campaign.message
        .replace(/\{\{name\}\}/gi, contactName)
        .replace(/\{\{phone\}\}/gi, contact.phone_number || '')
        .replace(/\{\{email\}\}/gi, contact.email || '');

      this.logger.log(`Sending to ${phone}: "${personalizedMessage.substring(0, 50)}..."`);

      await this.evolutionService.sendMessage(
        campaign.evolutionInstance,
        phone,
        personalizedMessage,
      );

      // 3. Atualiza Kanban (Opcional - Configurável)
      // Ex: Move para a coluna "Mensagem Enviada" no seu script customizado
      await this.chatwootService.updateKanbanStatus(
        campaign.accountId,
        conversation.id,
        'campanha_enviada',
      );

      // 4. Atualiza contadores
      await this.campaignRepository.increment({ id: campaignId }, 'sentSuccess', 1);

      // 5. Verifica se a campanha foi finalizada
      const updatedCampaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
      if (updatedCampaign && (updatedCampaign.sentSuccess + updatedCampaign.sentError) >= updatedCampaign.totalContacts) {
        await this.campaignRepository.update(campaignId, { status: CampaignStatus.COMPLETED });
        this.logger.log(`Campaign ${campaignId} marked as COMPLETED`);
      }

    } catch (error) {
      this.logger.error(`Failed to process contact ${contact.id}: ${error.message}`);
      await this.campaignRepository.increment({ id: campaignId }, 'sentError', 1);
      
      // Verifica finalização também no erro
      const updatedCampaignAfterError = await this.campaignRepository.findOne({ where: { id: campaignId } });
      if (updatedCampaignAfterError && (updatedCampaignAfterError.sentSuccess + updatedCampaignAfterError.sentError) >= updatedCampaignAfterError.totalContacts) {
        await this.campaignRepository.update(campaignId, { status: CampaignStatus.COMPLETED });
        this.logger.log(`Campaign ${campaignId} marked as COMPLETED (due to error at end)`);
      }
      
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed`);
  }
}
