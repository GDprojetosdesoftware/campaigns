"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
    const router = useRouter();

    useEffect(() => {
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
