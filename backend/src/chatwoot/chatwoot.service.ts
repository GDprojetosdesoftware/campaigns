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

  async filterContacts(accountId: number, filters: string[]) {
    try {
      if (!filters || filters.length === 0) {
        this.logger.warn(`No filters provided for account ${accountId}. Returning empty contact list.`);
        return [];
      }
      this.logger.log(`Filtering contacts for account ${accountId} with tags: ${filters.join(', ')}`);
      
      const payload = filters.map((tag, index) => ({
        attribute_key: 'labels',
        filter_operator: 'equal_to',
        values: [tag],
        query_operator: index === filters.length - 1 ? null : 'and'
      }));

      const response = await this.httpClient.post(
        `/api/v1/accounts/${accountId}/contacts/filter`,
        { payload },
      );

      if (!response.data || !response.data.payload) {
        this.logger.warn(`Chatwoot returned no payload for account ${accountId}. Response: ${JSON.stringify(response.data)}`);
        return [];
      }

      return response.data.payload; // Array de contatos
    } catch (error) {
      const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`Error filtering contacts: ${errorDetail}`);
      throw error;
    }
  }

  async getLabels(accountId: number) {
    try {
      this.logger.log(`Fetching labels for account ${accountId}`);
      const response = await this.httpClient.get(
        `/api/v1/accounts/${accountId}/labels`,
      );
      return response.data.payload;
    } catch (error) {
      this.logger.error(`Error fetching labels: ${error.message}`);
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
      
      await this.httpClient.post(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`,
        { labels: [statusLabel] },
      );
    } catch (error) {
      this.logger.error(`Error updating Kanban status: ${error.message}`);
    }
  }

  async getInboxes(accountId: number) {
    try {
      this.logger.log(`Fetching inboxes for account ${accountId}`);
      const response = await this.httpClient.get(
        `/api/v1/accounts/${accountId}/inboxes`,
      );
      return response.data.payload;
    } catch (error) {
      this.logger.error(`Error fetching inboxes: ${error.message}`);
      throw error;
    }
  }
}
