import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class ChatwootService {
  private readonly logger = new Logger(ChatwootService.name);
  private readonly httpClient: AxiosInstance;

  constructor(private configService: ConfigService) {
    const baseUrl = this.configService.get<string>('CHATWOOT_API_URL');
    const apiToken = this.configService.get<string>('CHATWOOT_API_TOKEN');

    this.httpClient = axios.create({
      baseURL: baseUrl,
      headers: {
        api_access_token: apiToken,
        'Content-Type': 'application/json',
      },
    });
  }

  async filterContacts(accountId: number, filters: any[]) {
    try {
      this.logger.log(`Filtering contacts for account ${accountId}`);
      const response = await this.httpClient.post(
        `/api/v1/accounts/${accountId}/contacts/filter`,
        { payload: filters },
      );
      return response.data.payload; // Array de contatos
    } catch (error) {
      this.logger.error(`Error filtering contacts: ${error.message}`);
      throw error;
    }
  }

  async getOrCreateConversation(accountId: number, inboxId: number, contactId: number) {
    try {
      // Tenta buscar conversa existente (simplificado)
      // No mundo real, você verificaria se já existe uma conversa aberta para este contato no inbox
      this.logger.log(`Creating/Finding conversation for contact ${contactId} in inbox ${inboxId}`);
      
      const response = await this.httpClient.post(
        `/api/v1/accounts/${accountId}/conversations`,
        {
          source_id: inboxId,
          contact_id: contactId,
        },
      );
      return response.data;
    } catch (error) {
      this.logger.error(`Error creating conversation: ${error.message}`);
      throw error;
    }
  }

  async updateKanbanStatus(accountId: number, conversationId: number, statusLabel: string) {
    try {
      this.logger.log(`Updating Kanban status for conversation ${conversationId} to ${statusLabel}`);
      
      // No Chatwoot, o Kanban customizado geralmente é baseado em Labels na Conversa
      await this.httpClient.post(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`,
        { labels: [statusLabel] },
      );
    } catch (error) {
      this.logger.error(`Error updating Kanban status: ${error.message}`);
    }
  }
}
