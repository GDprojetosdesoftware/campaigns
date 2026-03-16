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
    // Tenta POST /conversations/filter primeiro (formato UI do Chatwoot — SEM attribute_model)
    try {
      this.logger.log(`Trying POST /conversations/filter for labels: ${labels.join(', ')}`);
      const result = await this.fetchConversationsViaFilter(accountId, labels);
      if (result.length > 0) return result;
      this.logger.warn(`POST filter returned 0 conversations, trying GET fallback...`);
    } catch (err) {
      this.logger.warn(`POST filter failed (${err.response?.status || err.message}), trying GET fallback...`);
    }

    // Fallback: GET /conversations?labels[]=...
    try {
      this.logger.log(`Trying GET /conversations?labels[] for labels: ${labels.join(', ')}`);
      const result = await this.fetchConversationsViaGet(accountId, labels);
      return result;
    } catch (err) {
      this.logger.error(`GET fallback also failed: ${err.message}`);
      return [];
    }
  }

  private async fetchConversationsViaFilter(accountId: number, labels: string[]): Promise<any[]> {
    const allConversations: any[] = [];
    let page = 1;

    while (true) {
      // Formato exato que o Chatwoot UI envia — SEM attribute_model
      const payload = labels.map((label, index) => ({
        attribute_key: 'labels',
        filter_operator: 'equal_to',
        values: [label],
        query_operator: index < labels.length - 1 ? 'AND' : null,
      }));

      this.logger.log(`POST filter page ${page}, payload: ${JSON.stringify({ payload })}`);

      const response = await this.httpClient.post(
        `/api/v1/accounts/${accountId}/conversations/filter`,
        { payload },
        { params: { page } },
      );

      // Log da resposta bruta para debug
      this.logger.log(`POST filter response keys: ${JSON.stringify(Object.keys(response.data || {}))}`);
      if (response.data?.data) {
        this.logger.log(`response.data.data keys: ${JSON.stringify(Object.keys(response.data.data))}`);
      }

      const responseData = response.data?.data || response.data;
      const conversations = responseData?.payload || [];
      allConversations.push(...conversations);

      const totalCount = responseData?.meta?.all_count ?? conversations.length;
      const totalPages = Math.ceil(totalCount / 25) || 1;
      this.logger.log(`POST filter page ${page}/${totalPages}: ${conversations.length} conversations (total: ${totalCount})`);

      if (page >= totalPages || conversations.length === 0) break;
      page++;
    }

    return allConversations;
  }

  private async fetchConversationsViaGet(accountId: number, labels: string[]): Promise<any[]> {
    const allConversations: any[] = [];
    let page = 1;

    while (true) {
      this.logger.log(`GET conversations page ${page} with labels: ${labels.join(',')}`);

      const response = await this.httpClient.get(
        `/api/v1/accounts/${accountId}/conversations`,
        {
          params: { page, 'labels[]': labels },
        },
      );

      // Log da resposta bruta para debug
      this.logger.log(`GET conversations response keys: ${JSON.stringify(Object.keys(response.data || {}))}`);
      if (response.data?.data) {
        this.logger.log(`GET response.data.data keys: ${JSON.stringify(Object.keys(response.data.data))}`);
      }

      const responseData = response.data?.data || response.data;
      const conversations = responseData?.payload || [];
      allConversations.push(...conversations);

      const totalCount = responseData?.meta?.all_count ?? conversations.length;
      const totalPages = Math.ceil(totalCount / 25) || 1;
      this.logger.log(`GET page ${page}/${totalPages}: ${conversations.length} conversations (total: ${totalCount})`);

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

  /** Endpoint de debug temporário — testa a API de filtro de conversas */
  async debugFilterApi(accountId: number, labelName: string) {
    const results: any = {
      baseURL: this.httpClient.defaults.baseURL,
      accountId,
      labelName,
      tests: {},
    };

    // Teste 1: POST /conversations/filter SEM attribute_model
    try {
      const payload = [
        {
          attribute_key: 'labels',
          filter_operator: 'equal_to',
          values: [labelName],
          query_operator: null,
        },
      ];
      const res = await this.httpClient.post(
        `/api/v1/accounts/${accountId}/conversations/filter`,
        { payload },
        { params: { page: 1 } },
      );
      results.tests['POST_filter_no_model'] = {
        status: res.status,
        dataKeys: Object.keys(res.data || {}),
        dataDataKeys: res.data?.data ? Object.keys(res.data.data) : null,
        meta: res.data?.data?.meta || res.data?.meta || null,
        payloadCount: (res.data?.data?.payload || res.data?.payload || []).length,
        firstItem: (res.data?.data?.payload || res.data?.payload || [])[0] || null,
      };
    } catch (err) {
      results.tests['POST_filter_no_model'] = {
        error: true,
        status: err.response?.status,
        message: err.message,
        responseData: err.response?.data,
      };
    }

    // Teste 2: POST /conversations/filter COM attribute_model
    try {
      const payload = [
        {
          attribute_key: 'labels',
          filter_operator: 'equal_to',
          values: [labelName],
          query_operator: null,
          attribute_model: 'standard',
        },
      ];
      const res = await this.httpClient.post(
        `/api/v1/accounts/${accountId}/conversations/filter`,
        { payload },
        { params: { page: 1 } },
      );
      results.tests['POST_filter_with_model'] = {
        status: res.status,
        payloadCount: (res.data?.data?.payload || res.data?.payload || []).length,
        meta: res.data?.data?.meta || res.data?.meta || null,
      };
    } catch (err) {
      results.tests['POST_filter_with_model'] = {
        error: true,
        status: err.response?.status,
        message: err.message,
        responseData: err.response?.data,
      };
    }

    // Teste 3: GET /conversations?labels[]=...
    try {
      const res = await this.httpClient.get(
        `/api/v1/accounts/${accountId}/conversations`,
        { params: { page: 1, 'labels[]': labelName } },
      );
      results.tests['GET_conversations_labels'] = {
        status: res.status,
        dataKeys: Object.keys(res.data || {}),
        dataDataKeys: res.data?.data ? Object.keys(res.data.data) : null,
        meta: res.data?.data?.meta || res.data?.meta || null,
        payloadCount: (res.data?.data?.payload || res.data?.payload || []).length,
      };
    } catch (err) {
      results.tests['GET_conversations_labels'] = {
        error: true,
        status: err.response?.status,
        message: err.message,
      };
    }

    // Teste 4: GET /conversations SEM filtro (para ver se tem conversas)
    try {
      const res = await this.httpClient.get(
        `/api/v1/accounts/${accountId}/conversations`,
        { params: { page: 1 } },
      );
      results.tests['GET_conversations_all'] = {
        status: res.status,
        meta: res.data?.data?.meta || res.data?.meta || null,
        payloadCount: (res.data?.data?.payload || res.data?.payload || []).length,
        firstConvLabels: (res.data?.data?.payload || res.data?.payload || [])[0]?.labels || null,
      };
    } catch (err) {
      results.tests['GET_conversations_all'] = {
        error: true,
        status: err.response?.status,
        message: err.message,
      };
    }

    return results;
  }
}
