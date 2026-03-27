/**
 * Retorna a base URL para chamadas API.
 * No navegador, usamos o proxy /api para evitar CORS.
 */
const getBaseUrl = () => {
    if (typeof window === 'undefined') {
        return process.env.API_URL || 'http://campaign-backend:3000';
    }
    return '/api';
};

export const API_BASE_URL = getBaseUrl();

/**
 * Extrai o accountId de uma URL no formato /app/accounts/{id}/...
 */
function extractAccountIdFromUrl(url: string): string | null {
    if (!url) return null;
    const match = url.match(/\/accounts\/(\d+)/);
    return match ? match[1] : null;
}

/**
 * Inicializa a escuta global de postMessages do Chatwoot.
 */
if (typeof window !== 'undefined') {
    window.addEventListener('message', (event: MessageEvent) => {
        const data = event.data;
        if (!data) return;

        // Chatwoot envia o token no evento 'appContext' ou similar
        if (data.event === 'appContext' || data.type === 'chatwoot_ready' || data.token) {
            const token = data.token || data.api_access_token;
            const accountId = data.accountId || data.account_id;

            if (token) sessionStorage.setItem('chatwootToken', token);
            if (accountId) sessionStorage.setItem('chatwootAccountId', String(accountId));
            
            console.log('[API] Dados capturados via postMessage:', { accountId, hasToken: !!token });
        }
    });
}

/**
 * Tenta capturar a sessão do Chatwoot de várias fontes (URL, Referer, etc)
 */
export const initChatwootSession = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    // 1. Tenta pegar da URL atual (iframe params)
    const searchParams = new URLSearchParams(window.location.search);
    const urlId = searchParams.get('account_id') || searchParams.get('accountId');
    const urlToken = searchParams.get('token');

    if (urlId) sessionStorage.setItem('chatwootAccountId', urlId);
    if (urlToken) sessionStorage.setItem('chatwootToken', urlToken);

    // 2. Tenta extrair da URL do "Pai" (Referer) se estiver em iframe
    if (!sessionStorage.getItem('chatwootAccountId')) {
        const aidFromPath = extractAccountIdFromUrl(window.location.pathname) || 
                          extractAccountIdFromUrl(document.referrer);
        if (aidFromPath) sessionStorage.setItem('chatwootAccountId', aidFromPath);
    }

    const hasId = !!sessionStorage.getItem('chatwootAccountId');
    const hasTok = !!sessionStorage.getItem('chatwootToken');

    console.log(`[API] Estado da Sessão - ID: ${hasId}, Token: ${hasTok}`);
    return hasId && hasTok;
};

/**
 * Wrapper de fetch que injeta os headers de autenticação
 */
export const apiFetch = async (endpoint: string, options?: RequestInit) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${API_BASE_URL}/${cleanEndpoint}`;

    const headers = new Headers(options?.headers || {});
    
    if (typeof window !== 'undefined') {
        const aid = sessionStorage.getItem('chatwootAccountId');
        const token = sessionStorage.getItem('chatwootToken');
        
        if (aid) headers.set('X-Account-Id', aid);
        if (token) headers.set('X-Auth-Token', token);
    }

    if (!(options?.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    return fetch(url, {
        ...options,
        headers
    });
};
