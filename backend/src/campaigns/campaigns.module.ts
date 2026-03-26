import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { Campaign } from './entities/campaign.entity';
import { ChatwootService } from '../chatwoot/chatwoot.service';
import { EvolutionService } from '../evolution/evolution.service';
import { CampaignProcessor } from '../processors/campaign.processor';

import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign]),
    BullModule.registerQueue({
      name: 'campaign-disparos',
    }),
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
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
