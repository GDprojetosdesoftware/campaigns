import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { Campaign } from './entities/campaign.entity';
import { ChatwootService } from '../chatwoot/chatwoot.service';
import { EvolutionService } from '../evolution/evolution.service';
import { CampaignProcessor } from '../processors/campaign.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign]),
    BullModule.registerQueue({
      name: 'campaign-disparos',
    }),
  ],
  controllers: [CampaignsController],
  providers: [
    CampaignsService,
    ChatwootService,
    EvolutionService,
    CampaignProcessor,
  ],
  exports: [CampaignsService],
})
export class CampaignsModule {}
