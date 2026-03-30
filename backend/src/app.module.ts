import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { CampaignsModule } from './campaigns/campaigns.module';
import { Campaign } from './campaigns/entities/campaign.entity';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('DATABASE_URL');
        if (url) {
          return {
            type: 'postgres',
            url,
            entities: [Campaign],
            synchronize: true, // Apenas para dev/protótipo
            retryAttempts: 10,
            retryDelay: 3000,
          };
        }
        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST', 'db'),
          port: configService.get<number>('DB_PORT', 5432),
          username: configService.get<string>('POSTGRES_USER', 'postgres'),
          password: configService.get<string>('POSTGRES_PASSWORD', 'postgres'),
          database: configService.get<string>('POSTGRES_DB', 'campanhas_db'),
          entities: [Campaign],
          synchronize: true,
          retryAttempts: 10,
          retryDelay: 3000,
        };
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('REDIS_URL');
        if (url) {
          try {
            const parsedUrl = new URL(url);
            const dbIndex = parseInt(parsedUrl.pathname.replace('/', ''), 10);
            return {
              connection: {
                host: parsedUrl.hostname,
                port: parseInt(parsedUrl.port, 10) || 6379,
                password: parsedUrl.password || undefined,
                db: isNaN(dbIndex) ? 0 : dbIndex,
              },
            };
          } catch (e) {
            // Fallback se falhar o parse
          }
        }
        return {
          connection: {
            host: configService.get<string>('REDIS_HOST', 'redis'),
            port: configService.get<number>('REDIS_PORT', 6379),
          },
        };
      },
    }),

    CampaignsModule,
  ],
})
export class AppModule {}
