import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

@Injectable()
export class ChatwootService {
  private readonly logger = new Logger(ChatwootService.name);
  private readonly httpClient: AxiosInstance;

  constructor(private configService: ConfigService) {
    let baseUrl = this.configService.get<string>('CHATWOOT_API_URL') || '';
    if (baseUrl.endsWith('/')) {
      baseUrl = baseUrl.slice(0, -1);
    }
    const apiToken = this.configService.get<string>('CHATWOOT_API_TOKEN');

    this.httpClient = axios.create({
      baseURL: baseUrl,
      headers: {
        api_access_token: apiToken,
        'Content-Type': 'application/json',
      },
    });
  }

  private getRequestConfig(token?: string, extra: any = {}) {
    const config: any = { ...extra };
    if (token) {
      if (token.startsWith('devise|')) {
        const parts = token.split('|');
        config.headers = {
          ...config.headers,
          'access-token': parts[1],
          client: parts[2],
          uid: parts[3],
        };
      } else {
        config.headers = {
          ...config.headers,
          api_access_token: token,
        };
      }
    }
    return config;
  }

  async filterContacts(accountId: number, filters: string[], token?: string) {
    try {
      if (!this.httpClient.defaults.baseURL || (!this.httpClient.defaults.headers['api_access_token'] && !token)) {
        throw new Error('Chatwoot API URL or Token not configured. Check environment variables.');
      }

      // Se não há filtros, busca TODOS os contatos paginados
      if (!filters || filters.length === 0) {
        this.logger.log(`No filters provided for account ${accountId}. Fetching ALL contacts.`);
        return this.getAllContacts(accountId, token);
      }

      this.logger.log(`Filtering contacts via CONVERSATIONS for account ${accountId} with labels: ${filters.join(', ')}`);

      // ── ESTRATÉGIA: Labels pertencem a CONVERSAS, não a contatos ──
      const conversations = await this.getConversationsByLabels(accountId, filters, token);
      this.logger.log(`Found ${conversations.length} conversations with labels: ${filters.join(', ')}`);

      const contactMap = new Map<number, { phone?: string; name?: string }>();
      for (const conversation of conversations) {
        const senderId = conversation.meta?.sender?.id;
        if (senderId && !contactMap.has(senderId)) {
          const senderPhone = conversation.meta?.sender?.phone_number || null;
          const senderName = conversation.meta?.sender?.name || null;
          contactMap.set(senderId, { phone: senderPhone, name: senderName });
        }
      }
      this.logger.log(`Extracted ${contactMap.size} unique contact IDs from conversations`);

      const contacts: any[] = [];
      for (const [contactId, cached] of contactMap) {
        try {
          const res = await this.httpClient.get(
            `/api/v1/accounts/${accountId}/contacts/${contactId}`,
            this.getRequestConfig(token)
          );
          let raw = res.data;
          
          if (raw && !raw.id && (raw.payload || raw.contact)) {
            raw = raw.payload || raw.contact;
          }
          
          this.logger.log(`Contact ${contactId} raw keys: ${JSON.stringify(Object.keys(raw || {}))}`);

          const phoneNumber =
            raw?.phone_number ||
            raw?.identifier ||
            cached.phone ||
            null;

          const contactName =
            raw?.name ||
            cached.name ||
            raw?.available_name ||
            '';

          if (phoneNumber) {
            contacts.push({
              id: raw?.id || contactId,
              name: contactName,
              phone_number: phoneNumber,
              email: raw?.email || '',
            });
          }
        } catch (err) {
          this.logger.warn(`Could not fetch contact ${contactId}: ${err.message}`);
        }
      }

      this.logger.log(`${contacts.length} contacts with valid phone number`);
      return contacts;
    } catch (error) {
      const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`Error filtering contacts in account ${accountId}: ${errorDetail}`);
      throw error;
    }
  }

  /** Busca conversas paginadas filtrando por label */
  private async getConversationsByLabels(accountId: number, labels: string[], token?: string): Promise<any[]> {
    try {
      this.logger.log(`Trying POST /conversations/filter for labels: ${labels.join(', ')}`);
      const result = await this.fetchConversationsViaFilter(accountId, labels, token);
      if (result.length > 0) return result;
      this.logger.warn(`POST filter returned 0 conversations, trying GET fallback...`);
    } catch (err) {
      this.logger.warn(`POST filter failed (${err.response?.status || err.message}), trying GET fallback...`);
    }

    try {
      this.logger.log(`Trying GET /conversations?labels[] for labels: ${labels.join(', ')}`);
      const result = await this.fetchConversationsViaGet(accountId, labels, token);
      return result;
    } catch (err) {
      this.logger.error(`GET fallback also failed: ${err.message}`);
      return [];
    }
  }

  private async fetchConversationsViaFilter(accountId: number, labels: string[], token?: string): Promise<any[]> {
    const allConversations: any[] = [];
    let page = 1;

    while (true) {
      const payload = labels.map((label, index) => ({
        attribute_key: 'labels',
        filter_operator: 'equal_to',
        values: [label],
        query_operator: index < labels.length - 1 ? 'AND' : null,
      }));

      const response = await this.httpClient.post(
        `/api/v1/accounts/${accountId}/conversations/filter`,
        { payload },
        this.getRequestConfig(token, { params: { page } }),
      );

      const responseData = response.data?.data || response.data;
      const conversations = responseData?.payload || [];
      allConversations.push(...conversations);

      const totalCount = responseData?.meta?.all_count ?? conversations.length;
      const totalPages = Math.ceil(totalCount / 25) || 1;

      if (page >= totalPages || conversations.length === 0) break;
      page++;
    }

    return allConversations;
  }

  private async fetchConversationsViaGet(accountId: number, labels: string[], token?: string): Promise<any[]> {
    const allConversations: any[] = [];
    let page = 1;

    while (true) {
      const response = await this.httpClient.get(
        `/api/v1/accounts/${accountId}/conversations`,
        this.getRequestConfig(token, { params: { page, 'labels[]': labels } })
      );

      const responseData = response.data?.data || response.data;
      const conversations = responseData?.payload || [];
      allConversations.push(...conversations);

      const totalCount = responseData?.meta?.all_count ?? conversations.length;
      const totalPages = Math.ceil(totalCount / 25) || 1;

      if (page >= totalPages || conversations.length === 0) break;
      page++;
    }

    return allConversations;
  }

  /** Busca todos os contatos paginando até o fim */
  private async getAllContacts(accountId: number, token?: string): Promise<any[]> {
    const allContacts: any[] = [];
    let page = 1;
    const pageSize = 100;

    while (true) {
      const response = await this.httpClient.get(
        `/api/v1/accounts/${accountId}/contacts`,
        this.getRequestConfig(token, { params: { page, include_contacts: true } })
      );

      const contacts = response.data?.payload || [];
      allContacts.push(...contacts);

      if (contacts.length < pageSize) break;
      page++;
    }

    this.logger.log(`Fetched ${allContacts.length} total contacts for account ${accountId}`);
    return allContacts;
  }

  async getLabels(accountId: number, token?: string) {
    try {
      this.logger.log(`[Diagnostic] Fetching labels for account ${accountId} (Token length: ${token?.length || 0})`);
      const url = `/api/v1/accounts/${accountId}/labels`;
      const config = this.getRequestConfig(token);
      
      const response = await this.httpClient.get(url, config);
      
      if (!response.data || !response.data.payload) {
        this.logger.warn(`[Diagnostic] No payload found in labels response for account ${accountId}`);
        return [];
      }

      this.logger.log(`[Diagnostic] Successfully fetched ${response.data.payload.length} labels for account ${accountId}`);
      return response.data.payload;
    } catch (error) {
      this.logger.error(`[Diagnostic] Error fetching labels for account ${accountId}: ${error.message}`);
      if (error.response) {
        this.logger.error(`[Diagnostic] Response status: ${error.response.status}`);
        this.logger.error(`[Diagnostic] Response detail: ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  async getOrCreateConversation(accountId: number, inboxId: number, contactId: number, token?: string) {
    try {
      this.logger.log(`Creating/Finding conversation for contact ${contactId} in inbox ${inboxId}`);
      
      // 1. PRIMEIRO: Busca conversas existentes deste contato
      const existing = await this.httpClient.get(
        `/api/v1/accounts/${accountId}/contacts/${contactId}/conversations`,
        this.getRequestConfig(token)
      );
      
      const conversations = existing.data?.payload || [];
      // Filtra por conversas na mesma caixa de entrada que NÃO estejam resolvidas (pendentes ou abertas)
      const activeConversation = conversations.find(
        (c: any) => c.inbox_id === inboxId && c.status !== 'resolved'
      );

      if (activeConversation) {
        this.logger.log(`Using existing active conversation ${activeConversation.id} for contact ${contactId}`);
        return activeConversation;
      }

      // 2. SEGUNDO: Se não houver conversa ativa ou na mesma inbox, cria uma nova
      const response = await this.httpClient.post(
        `/api/v1/accounts/${accountId}/conversations`,
        {
          inbox_id: inboxId,
          contact_id: contactId,
        },
        this.getRequestConfig(token)
      );
      return response.data;
    } catch (error) {
      if (error.response?.status === 409 || error.response?.data?.error?.includes('already')) {
        this.logger.warn(`Conversation may already exist for contact ${contactId}. Handling overlap.`);
        // Se houver conflito mesmo com o check, busca a primeira compatível
        const existing = await this.httpClient.get(
          `/api/v1/accounts/${accountId}/contacts/${contactId}/conversations`,
          this.getRequestConfig(token)
        );
        const conversations = existing.data?.payload || [];
        const match = conversations.find((c: any) => c.inbox_id === inboxId);
        if (match) return match;
      }
      this.logger.error(`Error creating/finding conversation: ${error.message}`);
      throw error;
    }
  }

  async updateKanbanStatus(accountId: number, conversationId: number, statusLabel: string, token?: string) {
    try {
      this.logger.log(`Updating Kanban status for conversation ${conversationId} to ${statusLabel}`);
      
      await this.httpClient.post(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/labels`,
        { labels: [statusLabel] },
        this.getRequestConfig(token)
      );
    } catch (error) {
      this.logger.error(`Error updating Kanban status: ${error.message}`);
    }
  }

  async getInboxes(accountId: number, token?: string) {
    try {
      this.logger.log(`Fetching inboxes for account ${accountId}`);
      const response = await this.httpClient.get(
        `/api/v1/accounts/${accountId}/inboxes`,
        this.getRequestConfig(token)
      );
      return response.data.payload;
    } catch (error) {
      this.logger.error(`Error fetching inboxes: ${error.message}`);
      throw error;
    }
  }

  async sendMessage(accountId: number, conversationId: number, content: string, token?: string) {
    try {
      this.logger.log(`Sending message to conversation ${conversationId} for account ${accountId}`);
      const response = await this.httpClient.post(
        `/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
        {
          content,
          message_type: 'outgoing',
        },
        this.getRequestConfig(token)
      );
      return response.data;
    } catch (error) {
      const errorDetail = error.response?.data ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`Error sending message in conversation ${conversationId}: ${errorDetail}`);
      throw error;
    }
  }

  async sendMediaWithAttachment(accountId: number, conversationId: number, content: string, fileUrl: string, token?: string) {
    try {
      this.logger.log(`Sending media message to conversation ${conversationId} for account ${accountId}. URL: ${fileUrl}`);
      // No Chatwoot, para enviar uma URL como anexo via API oficial sem FormData (upload),
      // a forma mais comum em campanhas é enviar o conteúdo + link, 
      // ou usar o campo attachments se o chatwoot suportar processar a URL.
      // Caso mais simples e robusto para campanhas de massa: 
      const finalContent = content ? `${content}\n\n${fileUrl}` : fileUrl;
      
      return this.sendMessage(accountId, conversationId, finalContent, token);
    } catch (error) {
      this.logger.error(`Error in sendMediaWithAttachment: ${error.message}`);
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
