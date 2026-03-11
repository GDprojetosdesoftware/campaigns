"use client";

export const dynamic = 'force-dynamic';

import React, { useState } from "react";
import { ArrowLeft, Send, Users, MessageSquare, Settings, CheckCircle2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function NewCampaignPage() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: "",
        message: "",
        tags: "",
        inboxId: "",
        instance: "",
    });

    const [inboxes, setInboxes] = useState<any[]>([]);
    const [instances, setInstances] = useState<any[]>([]);
    const [isLoadingInboxes, setIsLoadingInboxes] = useState(false);
    const [isLoadingInstances, setIsLoadingInstances] = useState(false);
    const router = useRouter();

    React.useEffect(() => {
        const fetchInboxes = async () => {
            setIsLoadingInboxes(true);
            try {
                const response = await apiFetch('/campaigns/inboxes');
                if (response.ok) {
                    const data = await response.json();
                    setInboxes(data);
                }
            } catch (error) {
                console.error("Error fetching inboxes:", error);
            } finally {
                setIsLoadingInboxes(false);
            }
        };

        const fetchInstances = async () => {
            setIsLoadingInstances(true);
            try {
                const response = await apiFetch('/campaigns/instances');
                if (response.ok) {
                    const data = await response.json();
                    setInstances(data);
                }
            } catch (error) {
                console.error("Error fetching instances:", error);
            } finally {
                setIsLoadingInstances(false);
            }
        };

        fetchInboxes();
        fetchInstances();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const response = await apiFetch('/campaigns', {
                method: "POST",
                body: JSON.stringify({
                    name: formData.name,
                    message: formData.message,
                    filters: formData.tags.split(",").map(t => t.trim()),
                    inboxId: parseInt(formData.inboxId),
                    evolutionInstance: formData.instance
                }),
            });

            if (response.ok) {
                alert("Campanha criada com sucesso! Redirecionando para o Dashboard.");
                router.push("/campaigns");
            } else {
                alert("Erro ao criar campanha. Verifique os dados.");
            }
        } catch (error) {
            console.error("Error submitting campaign:", error);
            alert("Erro de conexão com o servidor.");
        }
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-500/30 pb-20 transition-colors duration-500">
            <div className="max-w-3xl mx-auto px-6 py-12">
                <header className="mb-12 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/campaigns" className="w-12 h-12 bg-white dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-2xl flex items-center justify-center transition-all group overflow-hidden border border-gray-200 dark:border-gray-800">
                            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        </Link>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Setup de Campanha</h1>
                            <p className="text-gray-500">Configure os parâmetros de transmissão proativa.</p>
                        </div>
                    </div>
                </header>

                {/* Stepper Progress */}
                <div className="flex items-center gap-3 mb-10 px-2 text-xs font-black uppercase tracking-widest">
                    <span className={step >= 1 ? "text-blue-500" : "text-gray-600"}>Definição</span>
                    <ChevronRight size={14} className="text-gray-700" />
                    <span className={step >= 2 ? "text-blue-500" : "text-gray-600"}>Segmentação</span>
                    <ChevronRight size={14} className="text-gray-700" />
                    <span className={step >= 3 ? "text-blue-500" : "text-gray-600"}>Mensagem</span>
                </div>

                <form onSubmit={handleSubmit} className="relative">
                    {/* Step 1: Geral */}
                    {step === 1 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-10 shadow-lg">
                                <div className="mb-8">
                                    <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center mb-4 border border-blue-100">
                                        <Settings className="text-blue-600" size={24} />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Identificação</h2>
                                    <p className="text-gray-500 text-sm mt-1">Como essa campanha será identificada nos relatórios.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="group">
                                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1 mb-2 block">Nome da Campanha</label>
                                        <input
                                            type="text"
                                            required
                                            autoFocus
                                            placeholder="Ex: Vendas High Ticket - Junho"
                                            className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl px-6 py-4 text-lg focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1 mb-2 block">Instância Evolution (WhatsApp)</label>
                                        <div className="relative">
                                            <select
                                                required
                                                className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl px-6 py-4 text-lg focus:border-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
                                                value={formData.instance}
                                                onChange={(e) => setFormData({ ...formData, instance: e.target.value })}
                                            >
                                                <option value="" disabled hidden>Selecione uma instância...</option>
                                                {isLoadingInstances ? (
                                                    <option disabled>Carregando instâncias...</option>
                                                ) : (
                                                    instances.map((inst: any, idx: number) => {
                                                        const name = inst?.instance?.instanceName || inst?.name || inst?.instanceName || (typeof inst === 'string' ? inst : `Instância ${idx + 1}`);
                                                        const status = inst?.instance?.status || inst?.status || inst?.connectionStatus || "";
                                                        return (
                                                            <option key={name + idx} value={name}>
                                                                {name} {status ? `(${status})` : ''}
                                                            </option>
                                                        );
                                                    })
                                                )}
                                            </select>
                                            <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={20} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <button type="button" onClick={nextStep} className="bg-gray-900 text-white px-10 py-4 rounded-full font-bold shadow-xl hover:bg-gray-800 transition-all flex items-center gap-2">
                                    Próximo Passo <ChevronRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Público */}
                    {step === 2 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-10 shadow-lg">
                                <div className="mb-8">
                                    <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center mb-4 border border-green-100">
                                        <Users className="text-green-600" size={24} />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Filtro de Audiência</h2>
                                    <p className="text-gray-500 text-sm mt-1">Conectado em tempo real com seu Chatwoot.</p>
                                </div>

                                <div className="grid grid-cols-1 gap-8">
                                    <div className="group">
                                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1 mb-2 block">Etiquetas (Separe por vírgula)</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: vip, hot_lead, lead_frio"
                                            className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl px-6 py-4 text-lg focus:border-green-500/50 focus:ring-4 focus:ring-green-500/5 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                            value={formData.tags}
                                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1 mb-2 block">Caixa de Entrada (Chatwoot)</label>
                                        <div className="relative">
                                            <select
                                                required
                                                className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl px-6 py-4 text-lg focus:border-green-500/50 outline-none transition-all appearance-none cursor-pointer"
                                                value={formData.inboxId}
                                                onChange={(e) => setFormData({ ...formData, inboxId: e.target.value })}
                                            >
                                                <option value="">Selecione uma caixa de entrada...</option>
                                                {isLoadingInboxes ? (
                                                    <option disabled>Carregando caixas de entrada...</option>
                                                ) : (
                                                    inboxes.map((inbox) => (
                                                        <option key={inbox.id} value={inbox.id}>
                                                            {inbox.name} ({inbox.channel_type})
                                                        </option>
                                                    ))
                                                )}
                                            </select>
                                            <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={20} />
                                        </div>
                                        <p className="text-[9px] text-gray-500 mt-3 font-bold uppercase tracking-wider pl-1">As conversas serão iniciadas através desta caixa de entrada.</p>
                                    </div>

                                </div>
                            </div>
                            <div className="flex justify-between pt-4">
                                <button type="button" onClick={prevStep} className="bg-gray-100 text-gray-700 border border-gray-200 px-8 py-4 rounded-full font-bold hover:bg-gray-200 transition-all">
                                    Voltar
                                </button>
                                <button type="button" onClick={nextStep} className="bg-gray-900 text-white px-10 py-4 rounded-full font-bold shadow-xl hover:bg-gray-800 transition-all flex items-center gap-2">
                                    Configurar Mensagem <ChevronRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Mensagem */}
                    {step === 3 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-10 shadow-lg">
                                <div className="mb-8">
                                    <div className="w-12 h-12 bg-purple-50 rounded-2xl flex items-center justify-center mb-4 border border-purple-100">
                                        <MessageSquare className="text-purple-600" size={24} />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Conteúdo do Disparo</h2>
                                    <p className="text-gray-500 text-sm mt-1">Escreva a mensagem que seus clientes receberão.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="group text-right">
                                        <textarea
                                            required
                                            rows={8}
                                            autoFocus
                                            placeholder="Olá {{name}}, temos uma oferta especial..."
                                            className="w-full bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-[2rem] p-8 text-lg focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/5 outline-none transition-all resize-none shadow-inner placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        />
                                        <div className="mt-4 flex gap-2 justify-end">
                                            <span className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-md text-[10px] text-gray-500 font-bold uppercase hover:bg-gray-200 cursor-help">Variáveis: {'{{name}}'}</span>
                                            <span className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-md text-[10px] text-gray-500 font-bold uppercase hover:bg-gray-200 cursor-help">Spinning syntax support</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between pt-4">
                                <button type="button" onClick={prevStep} className="bg-gray-100 text-gray-700 border border-gray-200 px-8 py-4 rounded-full font-bold hover:bg-gray-200 transition-all">
                                    Voltar
                                </button>
                                <button type="submit" className="bg-blue-600 text-white px-12 py-4 rounded-full font-black shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:bg-blue-500 transition-all flex items-center gap-3">
                                    <Send size={20} />
                                    INICIAR TRANSMISSÃO AGORA
                                </button>
                            </div>
                        </motion.div>
                    )}
                </form>
            </div>
        </div>
    );
}
