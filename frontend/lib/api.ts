const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
        const envUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!envUrl || envUrl.includes('localhost')) {
            return '/api';
        }
        return envUrl;
    }
    return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://backend:3000';
};

export const API_BASE_URL = getBaseUrl();

/**
 * Extrai o accountId de uma URL no formato /app/accounts/{id}/...
 * Ex: https://crm.example.com/app/accounts/2/campaigns/whatsapp -> 2
 */
function extractAccountIdFromUrl(url: string): string | null {
    const match = url.match(/\/accounts\/(\d+)\//);
    return match ? match[1] : null;
}

/**
 * Inicializa a sessão multi-tenant do Chatwoot.
 * Combina 3 estratégias em ordem de prioridade:
 *  1. Parâmetros diretos na URL (?accountId=X&token=Y)
 *  2. PostMessage enviado pelo Chatwoot ao iframe
 *  3. document.referrer para extrair o accountId
 */
export function initChatwootSession() {
    if (typeof window === 'undefined') return;

    // Estratégia 1: URL params explícitos
    const searchParams = new URLSearchParams(window.location.search);
    const urlAccountId = searchParams.get('accountId');
    const urlToken = searchParams.get('token');
    if (urlAccountId) sessionStorage.setItem('chatwootAccountId', urlAccountId);
    if (urlToken) sessionStorage.setItem('chatwootToken', urlToken);

    // Estratégia 2: Extrai accountId do referrer (quando embutido como iframe no Chatwoot)
    if (!sessionStorage.getItem('chatwootAccountId') && document.referrer) {
        const aidFromReferrer = extractAccountIdFromUrl(document.referrer);
        if (aidFromReferrer) sessionStorage.setItem('chatwootAccountId', aidFromReferrer);
    }

    // Estratégia 3: Escuta postMessage do Chatwoot ([CW Menu] Enviando token para iframe...)
    // O Chatwoot envia o token via postMessage ao Dashboard App (iframe)
    function handleChatwootMessage(event: MessageEvent) {
        const data = event.data;
        if (!data) return;

        // Formato do Chatwoot Dashboard App
        // { event: 'cw.ready', data: { ... } }
        // ou outros formatos dependendo da versão

        // Token no campo 'token' ou 'api_access_token' ou dentro de 'currentUser'
        const token =
            data?.token ||
            data?.data?.token ||
            data?.currentUser?.access_token ||
            data?.data?.currentUser?.access_token ||
            data?.user?.access_token ||
            null;

        // AccountId no campo 'accountId' ou dentro de 'currentAccount' 
        const accountId =
            data?.accountId ||
            data?.data?.accountId ||
            data?.currentAccount?.id ||
            data?.data?.currentAccount?.id ||
            null;

        if (token) {
            sessionStorage.setItem('chatwootToken', String(token));
            console.log('[Campanhas] Token recebido via postMessage do Chatwoot.');
        }
        if (accountId) {
            sessionStorage.setItem('chatwootAccountId', String(accountId));
            console.log('[Campanhas] AccountId recebido via postMessage:', accountId);
        }
    }

    window.addEventListener('message', handleChatwootMessage);
}

export const apiFetch = async (endpoint: string, options?: RequestInit) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${API_BASE_URL}/${cleanEndpoint}`;
    
    const getAuthHeaders = () => {
        if (typeof window !== 'undefined') {
            const aid = sessionStorage.getItem('chatwootAccountId');
            const token = sessionStorage.getItem('chatwootToken');
            const h: any = {};
            if (aid) h['X-Account-Id'] = aid;
            if (token) h['X-Auth-Token'] = token;
            return h;
        }
        return {};
    };

    const defaultHeaders = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
    };

    return fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options?.headers,
        },
    });
};
