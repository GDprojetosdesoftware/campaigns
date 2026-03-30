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

        // Suporte ao formato do seu script customizado
        if (data.type === 'AUTH_TOKEN' && data.payload) {
            const auth = data.payload;
            const token = auth['access-token'] || auth.token;
            const accountId = auth.accountId || auth.account_id;

            if (token) sessionStorage.setItem('chatwootToken', token);
            if (accountId) sessionStorage.setItem('chatwootAccountId', String(accountId));
            
            console.log('%c[API] Sessão capturada do Chatwoot ✅', 'color: #00ff00; font-weight: bold');
            return;
        }

        // Formatos padrões do Chatwoot
        const isAuthMessage = data.event === 'appContext' || data.type === 'chatwoot_ready' || data.token;
        
        if (isAuthMessage) {
            const token = data.token || data.api_access_token || data.data?.token;
            const accountId = data.accountId || data.account_id || data.data?.accountId;

            if (token) sessionStorage.setItem('chatwootToken', token);
            if (accountId) sessionStorage.setItem('chatwootAccountId', String(accountId));
            console.log('[API] Dados capturados via postMessage padrão');
        }
    });
}

/**
 * Tenta capturar a sessão do Chatwoot de várias fontes.
 * Aguarda até 1.5s pelo postMessage se não encontrar na URL.
 */
export const initChatwootSession = async (timeoutMs = 1500): Promise<boolean> => {
    if (typeof window === 'undefined') return false;

    const check = () => {
        // Tenta da URL primeiro
        const searchParams = new URLSearchParams(window.location.search);
        const urlId = searchParams.get('account_id') || searchParams.get('accountId');
        const urlToken = searchParams.get('token');
        if (urlId) sessionStorage.setItem('chatwootAccountId', urlId);
        if (urlToken) sessionStorage.setItem('chatwootToken', urlToken);

        // Tenta do Referer
        if (!sessionStorage.getItem('chatwootAccountId')) {
            const aidFromPath = extractAccountIdFromUrl(window.location.pathname) || 
                              extractAccountIdFromUrl(document.referrer);
            if (aidFromPath) sessionStorage.setItem('chatwootAccountId', aidFromPath);
        }

        return !!(sessionStorage.getItem('chatwootAccountId') && sessionStorage.getItem('chatwootToken'));
    };

    if (check()) return true;

    // Se não encontrou, aguarda o postMessage (polling curto)
    return new Promise((resolve) => {
        const start = Date.now();
        const interval = setInterval(() => {
            if (check()) {
                clearInterval(interval);
                resolve(true);
            } else if (Date.now() - start > timeoutMs) {
                clearInterval(interval);
                console.warn('[API] Timeout aguardando sessão do Chatwoot');
                resolve(false);
            }
        }, 100);
    });
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
        
        if (aid) {
            headers.set('X-Account-Id', aid);
        }
        if (token) {
            headers.set('X-Auth-Token', token);
        }

        // Log técnico crucial para o dashboard
        console.log(`[API Request] ${options?.method || 'GET'} ${url}`, {
            aid: aid || 'MISSING',
            token: token ? 'PRESENT' : 'MISSING'
        });
    }

    if (!(options?.body instanceof FormData) && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
    }

    return fetch(url, { ...options, headers });
};
