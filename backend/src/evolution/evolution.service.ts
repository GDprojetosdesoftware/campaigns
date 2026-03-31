import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class EvolutionService {
  private readonly logger = new Logger(EvolutionService.name);
  private readonly httpClient: AxiosInstance;

  constructor(private configService: ConfigService) {
    let baseUrl = this.configService.get<string>('EVOLUTION_API_URL') || '';
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
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
      this.logger.debug(`Allowed instances from env: ${envInstances}`);
      
      if (envInstances && response.data && Array.isArray(response.data)) {
        const allowedNames = envInstances.split(',').map(name => name.trim().toLowerCase());
        
        const filtered = response.data.filter((item: any) => {
          // Robust instance name extraction
          const itemInstanceName = item.instance?.instanceName || item.instanceName || item.name || item.instance?.name || String(item);
          const isAllowed = allowedNames.includes(itemInstanceName.toLowerCase());
          if (isAllowed) {
            this.logger.debug(`Instance allowed: ${itemInstanceName}`);
          }
          return isAllowed;
        }).map((item: any) => {
          // Return a normalized object
          return {
            instanceName: item.instance?.instanceName || item.instanceName || item.name || item.instance?.name || String(item),
            status: item.instance?.status || item.status || 'unknown'
          };
        });
        
        return filtered;
      }
      
      // Also normalize if no env filtering is applied
      if (response.data && Array.isArray(response.data)) {
        return response.data.map((item: any) => ({
          instanceName: item.instance?.instanceName || item.instanceName || item.name || item.instance?.name || String(item),
          status: item.instance?.status || item.status || 'unknown'
        }));
      }
      
      return response.data;
    } catch (error) {
      this.logger.error(`Error fetching instances via Evolution: ${error.message}`);
      if (error.response) {
        this.logger.error(`Response data: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async sendMessage(instanceName: string, number: string, text: string) {
    try {
      // Robust number formatting: remove all non-digits
      const formattedNumber = number.replace(/\D/g, '');
      
      this.logger.log(`Sending message to ${formattedNumber} via instance ${instanceName}`);
      
      const payload = {
        number: formattedNumber,
        options: {
          delay: 1200,
          presence: 'composing',
          linkPreview: false,
        },
        text: text,
      };

      this.logger.debug(`Payload for ${instanceName}: ${JSON.stringify(payload)}`);

      const response = await this.httpClient.post(
        `/message/sendText/${instanceName}`,
        payload,
      );
      
      this.logger.log(`Message sent successfully to ${formattedNumber}. Status: ${response.status}`);
      return response.data;
    } catch (error) {
      const errorData = error.response?.data;
      const errorStatus = error.response?.status;
      this.logger.error(
        `Error sending message via Evolution (${errorStatus}): ${JSON.stringify(errorData || error.message)}`
      );
      throw error;
    }
  }

  async sendMedia(instanceName: string, number: string, mediaUrl: string, mediaType: string, caption?: string) {
    try {
      // Formata o número (só dígitos)
      const formattedNumber = number.replace(/\D/g, '');
      this.logger.log(`Sending ${mediaType} to ${formattedNumber} via instance ${instanceName}`);
      
      // Processa a URL de mídia
      let finalMediaUrl = mediaUrl;
      
      // Se a URL for relativa (começa com /), precisa de prefixação
      if (mediaUrl.startsWith('/')) {
        const baseUrl = this.configService.get<string>('APP_URL') || 
                        this.configService.get<string>('BACKEND_PUBLIC_URL') ||
                        process.env.APP_URL ||
                        process.env.BACKEND_PUBLIC_URL ||
                        'http://campaign-backend:3000';
        const host = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        finalMediaUrl = `${host}${mediaUrl}`;
      }
      // Se for URL absoluta, usa como está
      // Se for relativa sem /, trata como relativa para o APP_URL
      else if (!mediaUrl.startsWith('http')) {
        const baseUrl = this.configService.get<string>('APP_URL') || 
                        this.configService.get<string>('BACKEND_PUBLIC_URL') ||
                        process.env.APP_URL ||
                        process.env.BACKEND_PUBLIC_URL ||
                        'http://campaign-backend:3000';
        const host = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
        finalMediaUrl = `${host}/${mediaUrl}`;
      }

      const mediaTypeLower = mediaType.toLowerCase();

      // Formato esperado pela Evolution API v1/v2 para /message/sendMedia
      const payload = {
        number: formattedNumber,
        mediatype: mediaTypeLower,
        media: finalMediaUrl,
        caption: caption || '',
        fileName: mediaUrl.split('/').pop() || 'file'
      };

      this.logger.debug(`Sending Media to Evolution for ${instanceName}:`);
      this.logger.debug(`  Number: ${formattedNumber}`);
      this.logger.debug(`  Type: ${mediaTypeLower}`);
      this.logger.debug(`  URL: ${finalMediaUrl}`);
      this.logger.debug(`  Caption: ${caption || '(none)'}`);

      const response = await this.httpClient.post(
        `/message/sendMedia/${instanceName}`,
        payload,
      );

      this.logger.log(`Media sent successfully to ${formattedNumber}. Status: ${response.status}`);
      return response.data;
    } catch (error: any) {
      const errorData = error.response?.data;
      const errorStatus = error.response?.status;
      this.logger.error(
        `Error sending media via Evolution (${errorStatus}): ${JSON.stringify(errorData || error.message)}`
      );
      throw error;
    }
  }
}
