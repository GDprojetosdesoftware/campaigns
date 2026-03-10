import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Chatwoot Campaign Manager",
    description: "Gerencie suas campanhas de transmissão de forma eficiente",
};

import { ThemeToggle } from "../components/ThemeToggle";
import { ThemeProvider } from "../components/ThemeProvider";

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-br" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
                    {children}
                    <ThemeToggle />
                </ThemeProvider>
            </body>
        </html>
    );
}
