"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { Plus, Send, AlertCircle, CheckCircle2, Clock, MoreVertical, LayoutGrid, List, Search, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface Campaign {
    id: string;
    name: string;
    status: 'completed' | 'processing' | 'pending' | 'failed';
    total: number;
    sent: number;
    error: number;
    date: string;
    type: string;
}

interface CampaignData {
    id: string;
    name: string;
    status: 'completed' | 'processing' | 'pending' | 'failed';
    totalContacts?: number;
    sentSuccess?: number;
    sentError?: number;
    createdAt: string;
    evolutionInstance: string;
}

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const totalSent = campaigns.reduce((acc, camp) => acc + camp.sent, 0);
    const totalContacts = campaigns.reduce((acc, camp) => acc + camp.total, 0);
    const deliveryRate = totalContacts > 0 ? (totalSent / totalContacts) * 100 : 0;
    const activeCampaigns = campaigns.filter(c => c.status === 'processing').length;

    useEffect(() => {
        async function fetchCampaigns() {
            setLoading(true);
            setError(null);
            try {
                const res = await apiFetch('/campaigns');
                if (!res.ok) throw new Error('Falha ao buscar campanhas');
                const data = await res.json();
                
                const formattedCampaigns: Campaign[] = data.map((camp: CampaignData) => ({
                    id: camp.id,
                    name: camp.name,
                    status: camp.status,
                    total: camp.totalContacts || 0,
                    sent: camp.sentSuccess || 0,
                    error: camp.sentError || 0,
                    date: new Date(camp.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                    type: camp.evolutionInstance === 'default' ? 'Broadcast' : camp.evolutionInstance
                }));
                
                setCampaigns(formattedCampaigns);
            } catch (err) {
                console.error(err);
                setError('Não foi possível carregar as campanhas. Verifique sua conexão.');
                setCampaigns([]);
            } finally {
                setLoading(false);
            }
        }

        fetchCampaigns();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#09090b] text-gray-900 dark:text-white font-sans selection:bg-blue-500/30 transition-colors duration-300">
            {/* Sidebar Simulação */}
            <aside className="fixed left-0 top-0 h-full w-20 bg-white dark:bg-[#121214] border-r border-gray-200 dark:border-white/5 flex flex-col items-center py-8 gap-8 z-50 transition-colors duration-300">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <Send size={22} className="text-white" />
                </div>
                <nav className="flex flex-col gap-6">
                    <div className="p-3 bg-gray-100 dark:bg-white/5 rounded-xl text-blue-600 dark:text-blue-400"><LayoutGrid size={22} /></div>
                    <div className="p-3 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"><List size={22} /></div>
                    <div className="p-3 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"><Bell size={22} /></div>
                </nav>
            </aside>

            <main className="pl-20">
                <header className="sticky top-0 z-40 bg-gray-50/80 dark:bg-[#09090b]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 px-10 py-6 flex justify-between items-center transition-colors duration-300">
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                            Campanhas de Transmissão
                        </h1>
                        <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Sistema Operacional
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group hidden md:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar campanha..."
                                className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-full pl-10 pr-4 py-2 text-sm w-64 outline-none focus:border-blue-500/50 dark:focus:border-blue-500/50 transition-all text-gray-900 dark:text-white"
                            />
                        </div>
                        <Link href="/campaigns/new" className="flex items-center gap-2 bg-gray-900 text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-all px-5 py-2.5 rounded-full text-sm font-bold shadow-xl">
                            <Plus size={18} />
                            Nova Campanha
                        </Link>
                    </div>
                </header>
                <section className="p-10 max-w-[1600px] mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                            {[
                                { label: "Total de Envio", value: totalSent > 1000 ? `${(totalSent/1000).toFixed(1)}K` : totalSent.toString(), change: "", color: "blue" },
                                { label: "Taxa de Entrega", value: `${deliveryRate.toFixed(1)}%`, change: "", color: "green" },
                                { label: "Contatos Totais", value: totalContacts.toString(), change: "", color: "purple" },
                                { label: "Campanhas Ativas", value: activeCampaigns.toString(), sub: "Atualmente", color: "orange" },
                            ].map((stat, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                key={i} className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/5 p-6 rounded-3xl shadow-sm hover:border-gray-300 dark:hover:border-white/10 transition-colors"
                            >
                                <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
                                <div className="flex items-end justify-between">
                                    <h2 className="text-3xl font-bold tracking-tighter text-gray-900 dark:text-white">{stat.value}</h2>
                                    {stat.change && <span className="text-xs font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-400/10 px-2 py-1 rounded-md">{stat.change}</span>}
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <h2 className="text-sm uppercase font-bold tracking-[0.2em] text-gray-400 dark:text-gray-600 mb-6 px-1">Atividade Recente</h2>

                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                        <AnimatePresence>
                            {loading ? (
                                Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="h-64 bg-gray-200 dark:bg-white/5 animate-pulse rounded-[2rem]" />
                                ))
                            ) : error ? (
                                <div className="col-span-full py-20 flex flex-col items-center text-center">
                                    <div className="w-16 h-16 bg-red-100 dark:bg-red-500/10 rounded-full flex items-center justify-center text-red-600 mb-4">
                                        <AlertCircle size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold mb-2">Ops! Algo deu errado</h3>
                                    <p className="text-gray-500 max-w-sm mb-8">{error}</p>
                                    <button 
                                        onClick={() => window.location.reload()}
                                        className="bg-gray-900 dark:bg-white text-white dark:text-black px-6 py-2 rounded-full font-bold transition-all hover:scale-105"
                                    >
                                        Tentar Novamente
                                    </button>
                                </div>
                            ) : campaigns.length === 0 ? (
                                <div className="col-span-full py-20 flex flex-col items-center text-center">
                                    <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-[2rem] flex items-center justify-center text-gray-300 dark:text-gray-600 mb-6">
                                        <Send size={40} />
                                    </div>
                                    <h3 className="text-2xl font-bold mb-2">Nenhuma campanha encontrada</h3>
                                    <p className="text-gray-500 max-w-sm mb-8">Comece criando sua primeira campanha de disparos para alcançar seus clientes.</p>
                                    <Link href="/campaigns/new" className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95">
                                        Criar Primeira Campanha
                                    </Link>
                                </div>
                            ) : (
                                campaigns.map((camp, i) => (
                                    <motion.div
                                        layout
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.4, delay: i * 0.1 }}
                                        key={camp.id}
                                        className="group bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/5 rounded-[2rem] p-7 transition-all hover:shadow-xl hover:shadow-gray-200 dark:hover:shadow-2xl dark:hover:shadow-blue-500/5 hover:border-blue-300 dark:hover:border-blue-500/20 relative"
                                    >
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-500 mb-1 block">
                                                    {camp.type}
                                                </span>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{camp.name}</h3>
                                            </div>
                                            <button className="p-2 text-gray-400 dark:text-gray-600 hover:text-black dark:hover:text-white transition-colors">
                                                <MoreVertical size={20} />
                                            </button>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <div className="flex justify-between text-xs mb-2 text-gray-500 font-bold uppercase tracking-wider">
                                                    <span>Progresso do Disparo</span>
                                                    <span className="text-gray-900 dark:text-white">{Math.round((camp.sent / (camp.total || 1)) * 100)}%</span>
                                                </div>
                                                <div className="w-full bg-gray-100 dark:bg-[#1c1c1f] rounded-full h-3 overflow-hidden border border-gray-200 dark:border-white/5">
                                                    <motion.div
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${(camp.sent / (camp.total || 1)) * 100}%` }}
                                                        transition={{ duration: 1.5, ease: "easeOut" }}
                                                        className={`h-full ${camp.status === 'processing' ? 'bg-gradient-to-r from-blue-500 to-indigo-500 shadow-[0_0_10px_rgba(59,130,246,0.3)] dark:shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-green-500/80 hover:bg-green-400'}`}
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-10">
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-0.5">Total</p>
                                                    <p className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100">{camp.total}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] uppercase font-bold tracking-wider mb-0.5 text-green-600 dark:text-green-500/70">Sucesso</p>
                                                    <p className="text-lg font-bold tracking-tight text-green-600 dark:text-green-400">{camp.sent}</p>
                                                </div>
                                                {camp.error > 0 && (
                                                    <div>
                                                        <p className="text-[10px] uppercase font-bold tracking-wider mb-0.5 text-red-600 dark:text-red-500/70">Falhas</p>
                                                        <p className="text-lg font-bold tracking-tight text-red-600 dark:text-red-400">{camp.error}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 flex justify-between items-center text-xs font-medium">
                                            <div className="flex items-center gap-2 text-gray-500">
                                                <StatusIcon status={camp.status} />
                                                {camp.date}
                                            </div>
                                            <StatusBadge status={camp.status} />
                                        </div>
                                    </motion.div>
                                ))
                            )}
                        </AnimatePresence>
                    </div>
                </section>
            </main>
        </div>
    );
}

function StatusIcon({ status }: { status: Campaign['status'] }) {
    if (status === 'completed') return <CheckCircle2 size={14} className="text-green-500" />;
    if (status === 'processing') return <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent animate-spin rounded-full" />;
    return <Clock size={14} className="text-yellow-500" />;
}

function StatusBadge({ status }: { status: Campaign['status'] }) {
    const configs = {
        completed: { color: "text-green-600 dark:text-green-400 bg-green-500/10", label: "Finalizado" },
        processing: { color: "text-blue-600 dark:text-blue-400 bg-blue-500/10", label: "Em disparo" },
        pending: { color: "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10", label: "Pendente" },
        failed: { color: "text-red-600 dark:text-red-400 bg-red-500/10", label: "Erro Crítico" },
    };

    const config = configs[status] || configs.pending;

    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border border-current shadow-sm ${config.color}`}>
            {config.label}
        </span>
    );
}
