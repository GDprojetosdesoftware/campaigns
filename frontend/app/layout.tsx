import type { Metadata } from "next";
import { Inter } from "next/font/google";
import React from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Chatwoot Campaign Manager",
    description: "Gerencie suas campanhas de transmissão de forma eficiente",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-br">
            <head>
                <script dangerouslySetInnerHTML={{ __html: `
                    (function() {
                        if (typeof window === 'undefined') return;
                        window.addEventListener('message', function(event) {
                            var data = event.data;
                            if (!data) return;
                            if (typeof data === 'string') {
                                try { data = JSON.parse(data); } catch(e) {}
                            }
                            
                            var token = data.token || (data.data && data.data.token) ||
                                        (data.currentUser && data.currentUser.access_token) || 
                                        (data.data && data.data.currentUser && data.data.currentUser.access_token) || null;
                            var aid = data.accountId || (data.data && data.data.accountId) || 
                                      data.account_id || (data.data && data.data.account_id) || null;

                            if (token) sessionStorage.setItem('chatwootToken', String(token));
                            if (aid) sessionStorage.setItem('chatwootAccountId', String(aid));
                            
                            if (token || aid) {
                                console.log('[Fast-Catch] Sessão capturada via script de layout estático.');
                            }
                        });
                    })();
                ` }} />
            </head>
            <body className={inter.className}>
                {children}
            </body>
        </html>
    );
}
