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
      if (!this.httpClient.defaults.baseURL || !this.httpClient.defaults.headers['api_access_token']) {
        throw new Error('Chatwoot API URL or Token not configured. Check environment variables.');
      }

      // Se não há filtros, busca TODOS os contatos paginados
      if (!filters || filters.length === 0) {
        this.logger.log(`No filters provided for account ${accountId}. Fetching ALL contacts.`);
        return this.getAllContacts(accountId);
      }

      this.logger.log(`Filtering contacts for account ${accountId} with tags: ${filters.join(', ')}`);
      
      const payload = filters.map((filter, index) => ({
        attribute_key: 'labels',
        filter_operator: 'contains',
        values: [filter],
        query_operator: index === filters.length - 1 ? 'and' : 'and' // 'and' or 'or' for joining
      }));

      this.logger.debug(`Filter payload sent to Chatwoot: ${JSON.stringify({ payload })}`);

      const response = await this.httpClient.post(
        `/api/v1/accounts/${accountId}/contacts/filter`,
        { payload },
      );

      const contacts = response.data?.payload || [];
      this.logger.log(`Chatwoot returned ${contacts.length} contacts for filters: ${filters.join(', ')}`);

      if (contacts.length === 0) {
        this.logger.warn(`No contacts found in Chatwoot for account ${accountId} with labels: ${filters.join(', ')}`);
      }

      return contacts; // Array de contatos
    } catch (error) {
      const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`Error filtering contacts in account ${accountId}: ${errorDetail}`);
      throw error;
    }
  }

  /** Busca todos os contatos paginando até o fim */
  private async getAllContacts(accountId: number): Promise<any[]> {
    const allContacts: any[] = [];
    let page = 1;
    const pageSize = 100;

    while (true) {
      const response = await this.httpClient.get(
        `/api/v1/accounts/${accountId}/contacts`,
        { params: { page, include_contacts: true } },
      );

      const contacts = response.data?.payload || [];
      allContacts.push(...contacts);

      if (contacts.length < pageSize) break; // última página
      page++;
    }

    this.logger.log(`Fetched ${allContacts.length} total contacts for account ${accountId}`);
    return allContacts;
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
      this.logger.log(`Creating/Finding conversation for contact ${contactId} in inbox ${inboxId}`);
      
      // inbox_id é o campo correto na API v1 do Chatwoot
      const response = await this.httpClient.post(
        `/api/v1/accounts/${accountId}/conversations`,
        {
          inbox_id: inboxId,
          contact_id: contactId,
        },
      );
      return response.data;
    } catch (error) {
      // Se a conversa já existe (409 Conflict), tenta buscar a existente
      if (error.response?.status === 409 || error.response?.data?.error?.includes('already')) {
        this.logger.warn(`Conversation may already exist for contact ${contactId}. Trying to find it.`);
        const existing = await this.httpClient.get(
          `/api/v1/accounts/${accountId}/contacts/${contactId}/conversations`,
        );
        const conversations = existing.data?.payload || [];
        const match = conversations.find((c: any) => c.inbox_id === inboxId);
        if (match) return match;
      }
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
