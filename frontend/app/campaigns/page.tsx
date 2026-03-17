"use client";

export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef } from "react";
import { Plus, Send, AlertCircle, CheckCircle2, Clock, MoreVertical, LayoutGrid, List, Search, Bell, Play, Trash2, Copy, Pencil, X, RefreshCcw, Mail } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

interface Campaign {
    id: string;
    name: string;
    status: 'completed' | 'processing' | 'pending' | 'failed' | 'cancelled';
    total: number;
    sent: number;
    error: number;
    date: string;
    type: string;
    instance_name?: string;
}

interface CampaignData {
    id: string;
    name: string;
    status: 'completed' | 'processing' | 'pending' | 'failed' | 'cancelled';
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
    const [actionMenu, setActionMenu] = useState<string | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showNotifications, setShowNotifications] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const notificationRef = useRef<HTMLDivElement>(null);
    
    const totalSent = campaigns.reduce((acc, camp) => acc + camp.sent, 0);
    const totalContacts = campaigns.reduce((acc, camp) => acc + camp.total, 0);
    const deliveryRate = totalContacts > 0 ? (totalSent / totalContacts) * 100 : 0;
    const activeCampaigns = campaigns.filter(c => c.status === 'processing').length;

    const fetchCampaigns = async () => {
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
                date: new Date(camp.createdAt).toLocaleDateString('pt-BR'),
                type: 'WhatsApp',
                instance_name: camp.evolutionInstance || (camp as any).evolution_instance || "default"
            }));
            
            setCampaigns(formattedCampaigns);
        } catch (err) {
            console.error(err);
            setError('Não foi possível carregar as campanhas. Verifique sua conexão.');
            setCampaigns([]);
        }
    };

    useEffect(() => {
        fetchCampaigns();
        setLoading(false);

        // Auto-refresh a cada 3 segundos para atualizar o contador "Campanhas Ativas" em tempo real
        const interval = setInterval(() => {
            // Fetch silencioso sem mostrar loading
            apiFetch('/campaigns')
                .then(res => res.ok ? res.json() : null)
                .then(data => {
                    if (data) {
                        const formattedCampaigns: Campaign[] = data.map((camp: CampaignData) => ({
                            id: camp.id,
                            name: camp.name,
                            status: camp.status,
                            total: camp.totalContacts || 0,
                            sent: camp.sentSuccess || 0,
                            error: camp.sentError || 0,
                            date: new Date(camp.createdAt).toLocaleDateString('pt-BR'),
                            type: 'WhatsApp',
                            instance_name: camp.evolutionInstance || (camp as any).evolution_instance || "default"
                        }));
                        setCampaigns(formattedCampaigns);
                    }
                })
                .catch(err => console.error('Auto-refresh error:', err));
        }, 3000);
        
        return () => clearInterval(interval);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setActionMenu(null);
            }
            if (notificationRef.current && !notificationRef.current.contains(e.target as Node)) {
                setShowNotifications(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleStartCampaign = async (id: string) => {
        setActionLoading(id + '-start');
        try {
            const res = await apiFetch(`/campaigns/${id}/start`, { method: 'POST' });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.message || 'Falha ao iniciar campanha');
            }
            await fetchCampaigns();
        } catch (error: any) {
            alert(`Erro ao iniciar campanha: ${error.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDuplicate = async (id: string) => {
        setActionMenu(null);
        setActionLoading(id + '-dup');
        try {
            const res = await apiFetch(`/campaigns/${id}/duplicate`, { method: 'POST' });
            if (!res.ok) throw new Error('Falha ao duplicar campanha');
            await fetchCampaigns();
        } catch (error: any) {
            alert(`Erro ao duplicar: ${error.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (id: string) => {
        setDeleteConfirm(null);
        setActionLoading(id + '-del');
        try {
            const res = await apiFetch(`/campaigns/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Falha ao excluir campanha');
            setCampaigns(prev => prev.filter(c => c.id !== id));
        } catch (error: any) {
            alert(`Erro ao excluir: ${error.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#09090b] text-gray-900 dark:text-white font-sans selection:bg-blue-500/30 transition-colors duration-300">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-20 bg-white dark:bg-[#121214] border-r border-gray-200 dark:border-white/5 flex flex-col items-center py-8 gap-8 z-50 transition-colors duration-300">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20 cursor-pointer hover:shadow-lg hover:shadow-blue-600/40 transition-all">
                    <Send size={22} className="text-white" />
                </div>
                <nav className="flex flex-col gap-6">
                    <div className={`p-3 rounded-xl cursor-pointer transition-colors ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-white/5 text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`} onClick={() => setViewMode('grid')} title="Visualização em grid">
                        <LayoutGrid size={22} />
                    </div>
                    <div 
                        onClick={() => setViewMode('list')}
                        className={`p-3 rounded-xl cursor-pointer transition-colors ${viewMode === 'list' ? 'bg-gray-100 dark:bg-white/5 text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5'}`}
                        title="Visualização em lista"
                    >
                        <List size={22} />
                    </div>
                    <div className="relative">
                        <div 
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-3 text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer rounded-xl hover:bg-gray-100 dark:hover:bg-white/5" 
                            title="Notificações"
                        >
                            {activeCampaigns > 0 && <div className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>}
                            <Bell size={22} />
                        </div>
                        {/* Notifications Panel */}
                        {showNotifications && (
                            <div ref={notificationRef} className="absolute left-24 top-0 w-80 bg-white dark:bg-[#121214] rounded-2xl shadow-2xl border border-gray-200 dark:border-white/5 p-4 z-50">
                                <h3 className="font-bold text-gray-900 dark:text-white mb-3">Notificações</h3>
                                {activeCampaigns > 0 ? (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {campaigns.filter(c => c.status === 'processing').map(campaign => (
                                            <div key={campaign.id} className="bg-gray-50 dark:bg-white/5 p-3 rounded-lg border-l-4 border-orange-500">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{campaign.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                                    Enviado: {campaign.sent}/{campaign.total}
                                                </p>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 mt-2">
                                                    <div 
                                                        className="bg-blue-600 h-1 rounded-full transition-all" 
                                                        style={{width: `${(campaign.sent / campaign.total) * 100}%`}}
                                                    ></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">Nenhuma campanha processando</p>
                                )}
                            </div>
                        )}
                    </div>
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
                        <button
                            onClick={fetchCampaigns}
                            className="p-2.5 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
                            title="Atualizar"
                        >
                            <RefreshCcw size={18} />
                        </button>
                        <Link href="/campaigns/new" className="flex items-center gap-2 bg-gray-900 text-white dark:bg-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200 transition-all px-5 py-2.5 rounded-full text-sm font-bold shadow-xl">
                            <Plus size={18} />
                            Nova Campanha
                        </Link>
                    </div>
                </header>

                <section className="p-10 max-w-[1600px] mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                        {[
                            { label: "Total de Envio", value: totalSent > 1000 ? `${(totalSent/1000).toFixed(1)}K` : totalSent.toString(), color: "blue" },
                            { label: "Taxa de Entrega", value: `${deliveryRate.toFixed(1)}%`, color: "green" },
                            { label: "Contatos Totais", value: totalContacts.toString(), color: "purple" },
                            { label: "Campanhas Ativas", value: activeCampaigns.toString(), color: "orange" },
                        ].map((stat, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                                key={i} className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/5 p-6 rounded-3xl shadow-sm hover:border-gray-300 dark:hover:border-white/10 transition-colors"
                            >
                                <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
                                <h2 className="text-3xl font-bold tracking-tighter text-gray-900 dark:text-white">{stat.value}</h2>
                            </motion.div>
                        ))}
                    </div>

                    <h2 className="text-sm uppercase font-bold tracking-[0.2em] text-gray-400 dark:text-gray-600 mb-6 px-1">Atividade Recente</h2>

                    <div className={viewMode === 'grid' ? "grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8" : "space-y-4"}>
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
                                        onClick={fetchCampaigns}
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
                                campaigns.map((camp, i) => 
                                    viewMode === 'grid' ? (
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
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-md">
                                                        {camp.type}
                                                    </span>
                                                    {camp.instance_name && camp.instance_name !== "" && (
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md border border-gray-200 dark:border-white/5">
                                                            {camp.instance_name}
                                                        </span>
                                                    )}
                                                </div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{camp.name}</h3>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {/* Start / Re-run Button */}
                                                {(camp.status === 'pending' || camp.status === 'failed' || camp.status === 'completed') && (
                                                    <button 
                                                        onClick={() => handleStartCampaign(camp.id)}
                                                        disabled={actionLoading === camp.id + '-start'}
                                                        className="bg-blue-600 text-white p-2.5 rounded-full shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95 flex items-center justify-center disabled:opacity-50"
                                                        title={camp.status === 'pending' ? 'Iniciar Disparo' : 'Re-executar Campanha'}
                                                    >
                                                        {actionLoading === camp.id + '-start'
                                                            ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                                                            : <Play fill="currentColor" size={14} />
                                                        }
                                                    </button>
                                                )}

                                                {/* Action Menu */}
                                                <div className="relative" ref={actionMenu === camp.id ? menuRef : undefined}>
                                                    <button
                                                        className="p-2.5 text-gray-400 dark:text-gray-600 hover:text-black dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent hover:border-gray-200 dark:hover:border-white/10"
                                                        onClick={() => setActionMenu(prev => prev === camp.id ? null : camp.id)}
                                                    >
                                                        <MoreVertical size={20} />
                                                    </button>

                                                    <AnimatePresence>
                                                        {actionMenu === camp.id && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                                                transition={{ duration: 0.15 }}
                                                                className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1c1c1f] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                                                            >
                                                                <Link
                                                                    href={`/campaigns/${camp.id}/edit`}
                                                                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                                                    onClick={() => setActionMenu(null)}
                                                                >
                                                                    <Pencil size={15} className="text-blue-500" />
                                                                    Editar
                                                                </Link>
                                                                <button
                                                                    onClick={() => handleDuplicate(camp.id)}
                                                                    disabled={actionLoading === camp.id + '-dup'}
                                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 text-left"
                                                                >
                                                                    <Copy size={15} className="text-green-500" />
                                                                    {actionLoading === camp.id + '-dup' ? 'Duplicando...' : 'Duplicar'}
                                                                </button>
                                                                <div className="border-t border-gray-100 dark:border-white/5" />
                                                                <button
                                                                    onClick={() => { setDeleteConfirm(camp.id); setActionMenu(null); }}
                                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
                                                                >
                                                                    <Trash2 size={15} />
                                                                    Excluir
                                                                </button>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-3 gap-4 mb-6">
                                            <div className="bg-gray-50 dark:bg-white/5 p-3 rounded-2xl border border-gray-100 dark:border-white/5 transition-colors group-hover:bg-white dark:group-hover:bg-white/10">
                                                <p className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 tracking-wider mb-1">Total</p>
                                                <p className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">{camp.total}</p>
                                            </div>
                                            <div className="bg-green-50/50 dark:bg-green-500/5 p-3 rounded-2xl border border-green-100/50 dark:border-green-500/10 transition-colors group-hover:bg-green-50 dark:group-hover:bg-green-500/10">
                                                <p className="text-[10px] uppercase font-bold tracking-wider mb-1 text-green-600 dark:text-green-500/70">Sucesso</p>
                                                <p className="text-xl font-bold tracking-tight text-green-600 dark:text-green-400">{camp.sent}</p>
                                            </div>
                                            <div className={`${camp.error > 0 ? 'bg-red-50/50 dark:bg-red-500/5 border-red-100/50 dark:border-red-500/10' : 'bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5'} p-3 rounded-2xl border transition-colors group-hover:bg-red-50 dark:group-hover:bg-red-500/10`}>
                                                <p className={`text-[10px] uppercase font-bold tracking-wider mb-1 ${camp.error > 0 ? 'text-red-600 dark:text-red-500/70' : 'text-gray-400 dark:text-gray-500'}`}>Falhas</p>
                                                <p className={`text-xl font-bold tracking-tight ${camp.error > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'}`}>{camp.error}</p>
                                            </div>
                                        </div>

                                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 flex justify-between items-center text-xs font-medium">
                                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                                                <div className="p-1 bg-gray-100 dark:bg-white/5 rounded-full">
                                                    <StatusIcon status={camp.status} />
                                                </div>
                                                {camp.date}
                                            </div>
                                            <StatusBadge status={camp.status} />
                                        </div>
                                    </motion.div>
                                    ) : (
                                        // List view
                                        <motion.div
                                            layout
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ duration: 0.3, delay: i * 0.05 }}
                                            key={camp.id}
                                            className="group bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/5 rounded-2xl p-5 transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-500/20 flex items-center justify-between gap-6"
                                        >
                                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                                <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl">
                                                    <Mail size={20} className="text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-bold text-gray-900 dark:text-white truncate">{camp.name}</h3>
                                                    <div className="flex items-center gap-2 mt-1 text-xs">
                                                        <span className="text-gray-500 dark:text-gray-400">{camp.type}</span>
                                                        {camp.instance_name && camp.instance_name !== "" && (
                                                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 rounded text-xs">{camp.instance_name}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4">
                                                <div className="text-center">
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Progresso</p>
                                                    <p className="font-bold text-gray-900 dark:text-white">{camp.sent}/{camp.total}</p>
                                                </div>
                                                <div className="w-20">
                                                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all" 
                                                            style={{width: `${camp.total > 0 ? (camp.sent / camp.total) * 100 : 0}%`}}
                                                        ></div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="flex items-center gap-1 mb-1">
                                                        <StatusIcon status={camp.status} />
                                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{camp.date}</span>
                                                    </div>
                                                    <StatusBadge status={camp.status} />
                                                </div>

                                                {(camp.status === 'pending' || camp.status === 'failed' || camp.status === 'completed') && (
                                                    <button 
                                                        onClick={() => handleStartCampaign(camp.id)}
                                                        disabled={actionLoading === camp.id + '-start'}
                                                        className="bg-blue-600 text-white p-2 rounded-full shadow-lg shadow-blue-600/20 hover:bg-blue-500 transition-all active:scale-95 flex items-center justify-center disabled:opacity-50"
                                                        title={camp.status === 'pending' ? 'Iniciar Disparo' : 'Re-executar Campanha'}
                                                    >
                                                        {actionLoading === camp.id + '-start'
                                                            ? <div className="w-3 h-3 border-2 border-white border-t-transparent animate-spin rounded-full" />
                                                            : <Play fill="currentColor" size={12} />
                                                        }
                                                    </button>
                                                )}

                                                {/* Action Menu for List */}
                                                <div className="relative" ref={actionMenu === camp.id ? menuRef : undefined}>
                                                    <button
                                                        className="p-2 text-gray-400 dark:text-gray-600 hover:text-black dark:hover:text-white transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-white/5"
                                                        onClick={() => setActionMenu(prev => prev === camp.id ? null : camp.id)}
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>

                                                    <AnimatePresence>
                                                        {actionMenu === camp.id && (
                                                            <motion.div
                                                                initial={{ opacity: 0, scale: 0.95, y: -8 }}
                                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                exit={{ opacity: 0, scale: 0.95, y: -8 }}
                                                                transition={{ duration: 0.15 }}
                                                                className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1c1c1f] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl"
                                                            >
                                                                <Link
                                                                    href={`/campaigns/${camp.id}/edit`}
                                                                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                                                                    onClick={() => setActionMenu(null)}
                                                                >
                                                                    <Pencil size={15} className="text-blue-500" />
                                                                    Editar
                                                                </Link>
                                                                <button
                                                                    onClick={() => handleDuplicate(camp.id)}
                                                                    disabled={actionLoading === camp.id + '-dup'}
                                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 text-left"
                                                                >
                                                                    <Copy size={15} className="text-green-500" />
                                                                    {actionLoading === camp.id + '-dup' ? 'Duplicando...' : 'Duplicar'}
                                                                </button>
                                                                <div className="border-t border-gray-100 dark:border-white/5" />
                                                                <button
                                                                    onClick={() => { setDeleteConfirm(camp.id); setActionMenu(null); }}
                                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
                                                                >
                                                                    <Trash2 size={15} />
                                                                    Excluir
                                                                </button>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                )
                            )}
                        </AnimatePresence>
                    </div>
                </section>
            </main>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                        onClick={() => setDeleteConfirm(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ type: 'spring', duration: 0.4 }}
                            className="bg-white dark:bg-[#1c1c1f] rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-gray-200 dark:border-white/10"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="w-14 h-14 bg-red-100 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                                <Trash2 size={28} className="text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-xl font-bold text-center mb-2">Excluir Campanha?</h2>
                            <p className="text-gray-500 text-center text-sm mb-8">Esta ação é irreversível. A campanha será permanentemente removida.</p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 font-semibold hover:bg-gray-50 dark:hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
                                >
                                    <X size={16} />
                                    Cancelar
                                </button>
                                <button
                                    onClick={() => handleDelete(deleteConfirm)}
                                    disabled={actionLoading === deleteConfirm + '-del'}
                                    className="flex-1 px-4 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {actionLoading === deleteConfirm + '-del'
                                        ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                                        : <Trash2 size={16} />
                                    }
                                    Excluir
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatusIcon({ status }: { status: Campaign['status'] }) {
    if (status === 'completed') return <CheckCircle2 size={14} className="text-green-500" />;
    if (status === 'processing') return <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent animate-spin rounded-full" />;
    if (status === 'failed') return <AlertCircle size={14} className="text-red-500" />;
    return <Clock size={14} className="text-yellow-500" />;
}

function StatusBadge({ status }: { status: Campaign['status'] }) {
    const configs = {
        completed: { color: "text-green-600 dark:text-green-400 bg-green-500/10", label: "Finalizado" },
        processing: { color: "text-blue-600 dark:text-blue-400 bg-blue-500/10", label: "Em disparo" },
        pending: { color: "text-yellow-600 dark:text-yellow-400 bg-yellow-500/10", label: "Pendente" },
        failed: { color: "text-red-600 dark:text-red-400 bg-red-500/10", label: "Erro Crítico" },
        cancelled: { color: "text-gray-600 dark:text-gray-400 bg-gray-500/10", label: "Cancelada" },
    };

    const config = configs[status] || configs.pending;

    return (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border border-current shadow-sm ${config.color}`}>
            {config.label}
        </span>
    );
}
