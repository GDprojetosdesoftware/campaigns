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
 * Inicializa a sessão multi-tenant.
 * Retorna uma Promise que resolve quando o token for obtido (ou após timeout).
 */
export function initChatwootSession(timeoutMs = 3000): Promise<boolean> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined') { resolve(false); return; }

        // Estratégia 1: URL params explícitos (?accountId=X&token=Y)
        const searchParams = new URLSearchParams(window.location.search);
        const urlAccountId = searchParams.get('accountId');
        const urlToken = searchParams.get('token');
        if (urlAccountId) sessionStorage.setItem('chatwootAccountId', urlAccountId);
        if (urlToken) sessionStorage.setItem('chatwootToken', urlToken);

        if (urlAccountId && urlToken) {
            console.log('[Campanhas] Sessão via URL params:', urlAccountId);
            resolve(true);
            return;
        }

        // Se já foi coletado pelo script estático do layout, resolve na hora!
        if (sessionStorage.getItem('chatwootAccountId') && sessionStorage.getItem('chatwootToken')) {
            console.log('[Campanhas] Sessão já resolvida via script estático do layout.');
            resolve(true);
            return;
        }

        // Estratégia 2: Tenta extrair accountId do URL do parent (via referrer)
        try {
            // Tenta acessar parent.location (funciona se mesmo domínio)
            const parentUrl = window.parent?.location?.href || '';
            const aidFromParent = extractAccountIdFromUrl(parentUrl);
            if (aidFromParent) {
                sessionStorage.setItem('chatwootAccountId', aidFromParent);
                console.log('[Campanhas] AccountId extraído do parent URL:', aidFromParent);
            }
        } catch {
            // Cross-origin: tenta via referrer
            const aidFromReferrer = extractAccountIdFromUrl(document.referrer || '');
            if (aidFromReferrer) {
                sessionStorage.setItem('chatwootAccountId', aidFromReferrer);
                console.log('[Campanhas] AccountId extraído do referrer:', aidFromReferrer);
            }
        }

        // Estratégia 3: PostMessage do Chatwoot
        let resolved = false;

        const timeout = setTimeout(() => {
            if (!resolved) {
                resolved = true;
                const hasSession = !!(sessionStorage.getItem('chatwootAccountId') && sessionStorage.getItem('chatwootToken'));
                console.warn('[Campanhas] Timeout aguardando postMessage. Sessão disponível:', hasSession);
                resolve(hasSession);
            }
        }, timeoutMs);

        function handleMessage(event: MessageEvent) {
            // Log TUDO para diagnóstico
            console.log('[Campanhas] postMessage recebido. Origin:', event.origin, '| Tipo:', typeof event.data, '| Dados:', JSON.stringify(event.data)?.substring(0, 300));

            const { token, accountId } = extractFromMessageData(event.data);

            if (token) sessionStorage.setItem('chatwootToken', token);
            if (accountId) sessionStorage.setItem('chatwootAccountId', accountId);

            if (token || accountId) {
                console.log('[Campanhas] Sessão capturada via postMessage. accountId:', accountId, '| token recebido:', !!token);
            }

            // Resolve se tiver ambos
            if (!resolved && sessionStorage.getItem('chatwootAccountId') && sessionStorage.getItem('chatwootToken')) {
                resolved = true;
                clearTimeout(timeout);
                window.removeEventListener('message', handleMessage);
                resolve(true);
            }
        }

        window.addEventListener('message', handleMessage);
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
