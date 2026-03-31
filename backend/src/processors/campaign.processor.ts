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
        campaign.chatwootToken
      );

      // 2. Envia via Chatwoot (Unificado)
      // Substitui placeholders na mensagem
      const contactName = contact.name || '';
      const personalizedMessage = campaign.message
        .replace(/\{\{name\}\}/gi, contactName)
        .replace(/\{\{phone\}\}/gi, contact.phone_number || '')
        .replace(/\{\{email\}\}/gi, contact.email || '');

      const phone = contact.phone_number ? contact.phone_number.replace('+', '') : 'unknown';
      
      if (campaign.mediaUrl) {
        // Envio com Mídia
        const mediaUrlToUse = campaign.mediaPublicUrl || campaign.mediaUrl;
        this.logger.log(`Media URL for contact ${contact.id}: ${mediaUrlToUse} (Public: ${!!campaign.mediaPublicUrl})`);
        
        if (campaign.evolutionInstance && campaign.evolutionInstance !== 'default' && campaign.evolutionInstance !== 'none') {
            this.logger.log(`Sending dynamic media (${campaign.mediaType}) via Evolution (${campaign.evolutionInstance}) for contact ${contact.id} (${phone}).`);
            await this.evolutionService.sendMedia(
                campaign.evolutionInstance,
                phone,
                mediaUrlToUse, // Usa URL absoluta se disponível
                campaign.mediaType || 'image',
                personalizedMessage
            );
        } else {
            // Fallback para Chatwoot Nativo (Configuração Oficial ou sem Evolution)
            this.logger.log(`Sending dynamic media via Chatwoot Native for contact ${contact.id} (${phone}).`);
            await this.chatwootService.sendMediaWithAttachment(
                campaign.accountId,
                conversation.id,
                personalizedMessage,
                mediaUrlToUse, // Usa URL absoluta se disponível
                campaign.chatwootToken
            );
        }
      } else {
        // Envio Apenas Texto
        this.logger.log(`Sending text only for contact ${contact.id} (${phone}): "${personalizedMessage.substring(0, 50)}..."`);
        await this.chatwootService.sendMessage(
          campaign.accountId,
          conversation.id,
          personalizedMessage,
          campaign.chatwootToken
        );
      }


      // 3. Atualiza Kanban (Opcional - Configurável)
      // Ex: Move para a coluna "Mensagem Enviada" no seu script customizado
      await this.chatwootService.updateKanbanStatus(
        campaign.accountId,
        conversation.id,
        'campanha_enviada',
        campaign.chatwootToken
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
