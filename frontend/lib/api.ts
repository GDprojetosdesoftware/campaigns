const getBaseUrl = () => {
    if (typeof window !== 'undefined') {
        const envUrl = process.env.NEXT_PUBLIC_API_URL;
        // If not set, or if it got accidentally baked with localhost during docker build, use our /api proxy
        if (!envUrl || envUrl.includes('localhost')) {
            return '/api';
        }
        return envUrl;
    }
    // Server-side fallback for SSR
    return process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://backend:3000';
};

export const API_BASE_URL = getBaseUrl();

export const apiFetch = async (endpoint: string, options?: RequestInit) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const url = `${API_BASE_URL}/${cleanEndpoint}`;
    
    const defaultHeaders = {
        'Content-Type': 'application/json',
    };

    return fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options?.headers,
        },
    });
};
