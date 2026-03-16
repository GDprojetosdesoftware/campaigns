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

      this.logger.log(`Filtering contacts via CONVERSATIONS for account ${accountId} with labels: ${filters.join(', ')}`);

      // ── ESTRATÉGIA: Labels pertencem a CONVERSAS, não a contatos ──
      // 1. Buscar conversas que possuem essas labels
      const conversations = await this.getConversationsByLabels(accountId, filters);
      this.logger.log(`Found ${conversations.length} conversations with labels: ${filters.join(', ')}`);

      // 2. Extrair IDs de contatos únicos das conversas
      const contactIds = new Set<number>();
      for (const conversation of conversations) {
        const senderId = conversation.meta?.sender?.id;
        if (senderId) {
          contactIds.add(senderId);
        }
      }
      this.logger.log(`Extracted ${contactIds.size} unique contact IDs from conversations`);

      // 3. Buscar dados completos de cada contato (meta.sender NÃO traz phone_number)
      const contacts: any[] = [];
      for (const contactId of contactIds) {
        try {
          const res = await this.httpClient.get(
            `/api/v1/accounts/${accountId}/contacts/${contactId}`,
          );
          const contact = res.data;
          if (contact?.phone_number) {
            contacts.push({
              id: contact.id,
              name: contact.name || '',
              phone_number: contact.phone_number,
              email: contact.email || '',
            });
          }
        } catch (err) {
          this.logger.warn(`Could not fetch contact ${contactId}: ${err.message}`);
        }
      }

      this.logger.log(`${contacts.length} contacts with valid phone number`);

      if (contacts.length === 0) {
        this.logger.warn(`No contacts with phone found for account ${accountId} with labels: ${filters.join(', ')}`);
      }

      return contacts;
    } catch (error) {
      const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`Error filtering contacts in account ${accountId}: ${errorDetail}`);
      throw error;
    }
  }

  /** Busca conversas paginadas filtrando por label */
  private async getConversationsByLabels(accountId: number, labels: string[]): Promise<any[]> {
    const allConversations: any[] = [];
    let page = 1;

    while (true) {
      // Chatwoot exige que o último item tenha query_operator: null
      const payload = labels.map((label, index) => ({
        attribute_key: 'labels',
        filter_operator: 'contains',
        values: [label],
        query_operator: index < labels.length - 1 ? 'AND' : null,
        attribute_model: 'standard',
      }));

      this.logger.debug(`Conversations filter payload (page ${page}): ${JSON.stringify({ payload })}`);

      const response = await this.httpClient.post(
        `/api/v1/accounts/${accountId}/conversations/filter`,
        { payload },
        { params: { page } },
      );

      // Chatwoot pode retornar em response.data.data.payload OU response.data.payload
      const responseData = response.data?.data || response.data;
      const conversations = responseData?.payload || [];
      allConversations.push(...conversations);

      const totalCount = responseData?.meta?.all_count || 0;
      const totalPages = Math.ceil(totalCount / 25) || 1;

      this.logger.debug(`Page ${page}/${totalPages} — got ${conversations.length} conversations (total: ${totalCount})`);

      if (page >= totalPages || conversations.length === 0) break;
      page++;
    }

    return allConversations;
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
