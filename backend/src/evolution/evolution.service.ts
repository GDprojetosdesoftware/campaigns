import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class EvolutionService {
  private readonly logger = new Logger(EvolutionService.name);
  private readonly httpClient: AxiosInstance;

  constructor(private configService: ConfigService) {
    const baseUrl = this.configService.get<string>('EVOLUTION_API_URL');
    const apiToken = this.configService.get<string>('EVOLUTION_API_TOKEN');

    this.httpClient = axios.create({
      baseURL: baseUrl,
      headers: {
        apikey: apiToken,
        'Content-Type': 'application/json',
      },
    });
  }

  async sendMessage(instanceName: string, number: string, text: string) {
    try {
      this.logger.log(`Sending message to ${number} via instance ${instanceName}`);
      
      // Ajuste conforme a versão da Evolution API que você usa
      const response = await this.httpClient.post(
        `/message/sendText/${instanceName}`,
        {
          number: number,
          options: {
            delay: 1200,
            presence: 'composing',
            linkPreview: false,
          },
          textMessage: {
            text: text,
          },
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error sending message via Evolution: ${error.message}`);
      throw error;
    }
  }
}
