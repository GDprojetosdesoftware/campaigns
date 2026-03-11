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

  async fetchInstances() {
    try {
      this.logger.log('Fetching all instances from Evolution API');
      const response = await this.httpClient.get('/instance/fetchInstances');
      
      const envInstances = this.configService.get<string>('EVOLUTION_INSTANCE_NAME');
      
      if (envInstances && response.data && Array.isArray(response.data)) {
        const allowedNames = envInstances.split(',').map(name => name.trim().toLowerCase());
        
        const filtered = response.data.filter((item: any) => {
          const itemInstanceName = item.instance?.instanceName || item.instanceName || item.name || String(item);
          return allowedNames.includes(itemInstanceName.toLowerCase());
        });
        
        return filtered;
      }
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching instances via Evolution: ${error.message}`);
      throw error;
    }
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
