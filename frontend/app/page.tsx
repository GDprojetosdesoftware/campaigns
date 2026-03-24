"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter();

    useEffect(() => {
        // 🔑 CRÍTICO: Salvar accountId e token ANTES do redirect para /campaigns.
        // Quando o Chatwoot abre o iframe com ?accountId=X&token=Y nesta URL raiz,
        // o Next.js faria um redirect descartando esses params. Salvamos aqui.
        const searchParams = new URLSearchParams(window.location.search);
        const urlAccountId = searchParams.get('accountId');
        const urlToken = searchParams.get('token');
        
        if (urlAccountId) {
            sessionStorage.setItem('chatwootAccountId', urlAccountId);
            console.log('[Campanhas] AccountId capturado na raiz antes do redirect:', urlAccountId);
        }
        if (urlToken) {
            sessionStorage.setItem('chatwootToken', urlToken);
            console.log('[Campanhas] Token capturado na raiz antes do redirect.');
        }

        router.push("/campaigns");
    }, [router]);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-black text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent animate-spin rounded-full"></div>
                <p className="text-gray-400 font-medium tracking-widest uppercase text-xs">Redirecionando para o Dashboard...</p>
            </div>
        </main>
    );
}
