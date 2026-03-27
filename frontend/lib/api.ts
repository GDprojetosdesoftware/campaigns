/**
 * Retorna a base URL para chamadas API.
 * 
 * REGRA PRINCIPAL: No navegador, SEMPRE usamos o proxy /api do Next.js
 * para evitar problemas de CORS com headers customizados (x-account-id, x-auth-token).
 * 
 * No servidor (SSR), usamos API_URL que aponta para a rede interna Docker.
 */
const getBaseUrl = () => {
    // No servidor (SSR/build), usa rede interna Docker
    if (typeof window === 'undefined') {
        return process.env.API_URL || 'http://campaign-backend:3000';
    }

    // No navegador: SEMPRE usa o proxy local /api
    // Isso evita CORS e garante que headers customizados sejam enviados corretamente.
    // O proxy está configurado em next.config.mjs para redirecionar ao backend.
    return '/api';
};

export const API_BASE_URL = getBaseUrl();

/**
 * Extrai o accountId de uma URL no formato /app/accounts/{id}/...
 */
function extractAccountIdFromUrl(url: string): string | null {
    const match = url.match(/\/accounts\/(\d+)\//);
    return match ? match[1] : null;
}

/**
 * Extrai token e accountId de um objeto de postMessage do Chatwoot.
 * Tenta vários formatos pois o Chatwoot mudou o formato em versões diferentes.
 */
function extractFromMessageData(data: any): { token?: string; accountId?: string } {
    if (!data) return {};

    // Chatwoot pode enviar string JSON ou objeto direto
    let parsed = data;
    if (typeof data === 'string') {
        try { parsed = JSON.parse(data); } catch { return {}; }
    }

    // Detecta qualquer campo com token ou account_id
    const token =
        parsed?.token ||
        parsed?.data?.token ||
        parsed?.api_access_token ||
        parsed?.data?.api_access_token ||
        parsed?.currentUser?.access_token ||
        parsed?.data?.currentUser?.access_token ||
        parsed?.user?.access_token ||
        parsed?.data?.user?.access_token ||
        parsed?.userData?.access_token ||
        null;

    const accountId =
        parsed?.accountId != null ? String(parsed.accountId) :
        parsed?.account_id != null ? String(parsed.account_id) :
        parsed?.data?.accountId != null ? String(parsed.data.accountId) :
        parsed?.data?.account_id != null ? String(parsed.data.account_id) :
        parsed?.currentAccount?.id != null ? String(parsed.currentAccount.id) :
        parsed?.data?.currentAccount?.id != null ? String(parsed.data.currentAccount.id) :
        parsed?.currentUser?.account_id != null ? String(parsed.currentUser.account_id) :
        parsed?.data?.currentUser?.account_id != null ? String(parsed.data.currentUser.account_id) :
        null;

    return { token: token ?? undefined, accountId: accountId ?? undefined };
}

/**
 * Inicializa a escuta global de postMessages do Chatwoot no módulo.
 * Deve estar no escopo raiz para não perder mensagens enviadas antes do React montar.
 */
if (typeof window !== 'undefined') {
    window.addEventListener('message', (event: MessageEvent) => {
        if (!event.data) return;
        
        // Evita spam visual se for de react/webpack
        const isReactLog = typeof event.data === 'string' && event.data.includes('react-refresh');
        if (!isReactLog && process.env.NODE_ENV !== 'production') {
            const preview = typeof event.data === 'object' ? JSON.stringify(event.data).substring(0, 150) : event.data;
            console.log(`[Campanhas Global] postMessage origin ${event.origin}:`, preview);
        }

        const { token, accountId } = extractFromMessageData(event.data);

        if (token) {
            sessionStorage.setItem('chatwootToken', token);
            console.log('[Campanhas Global] Token salvo no sessionStorage com sucesso!');
        }
        if (accountId) {
            sessionStorage.setItem('chatwootAccountId', accountId);
            console.log('[Campanhas Global] AccountId salvo com sucesso:', accountId);
        }
    });
}

/**
 * Inicializa a sessão multi-tenant.
 * Retorna uma Promise que resolve quando o token for obtido (ou após timeout).
 */
export function initChatwootSession(timeoutMs = 1500): Promise<boolean> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined') { resolve(false); return; }

        // Estratégia 1: URL params explícitos (?accountId=X&token=Y)
        const searchParams = new URLSearchParams(window.location.search);
        const urlAccountId = searchParams.get('accountId');
        const urlToken = searchParams.get('token');
        if (urlAccountId) sessionStorage.setItem('chatwootAccountId', urlAccountId);
        if (urlToken) sessionStorage.setItem('chatwootToken', urlToken);

        // Estratégia 2: Tenta extrair accountId do URL do parent (via referrer)
        if (!sessionStorage.getItem('chatwootAccountId')) {
            try {
                const parentUrl = window.parent?.location?.href || '';
                const aidFromParent = extractAccountIdFromUrl(parentUrl);
                if (aidFromParent) sessionStorage.setItem('chatwootAccountId', aidFromParent);
            } catch {
                const aidFromReferrer = extractAccountIdFromUrl(document.referrer || '');
                if (aidFromReferrer) sessionStorage.setItem('chatwootAccountId', aidFromReferrer);
            }
        }

        const checkSession = () => {
            return !!(sessionStorage.getItem('chatwootAccountId') && sessionStorage.getItem('chatwootToken'));
        };

        if (checkSession()) {
            console.log('[Campanhas] Sessão já disponível via URL params ou Listener Global.');
            resolve(true);
            return;
        }

        // Aguarda ativamente o listener global salvar os dados
        const maxAttempts = timeoutMs / 100;
        let attempts = 0;

        const interval = setInterval(() => {
            attempts++;
            if (checkSession()) {
                clearInterval(interval);
                resolve(true);
            } else if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.warn('[Campanhas] Timeout aguardando token. Prosseguindo sem credenciais explícitas.');
                resolve(false);
            }
        }, 100);
    });
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

    const h: any = { ...getAuthHeaders() };
    if (!(options?.body instanceof FormData)) {
        h['Content-Type'] = 'application/json';
    }

    return fetch(url, {
        ...options,
        headers: {
            ...h,
            ...options?.headers,
        },
    });
};
