"use client";

export const dynamic = 'force-dynamic';

import React, { useState, useEffect } from "react";
import { ArrowLeft, Send, Users, MessageSquare, Settings, CheckCircle2, ChevronRight, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { apiFetch } from "@/lib/api";

export default function EditCampaignPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: "",
        message: "",
        inboxId: "",
        instance: "",
        scheduledAt: "",
    });

    const [inboxes, setInboxes] = useState<any[]>([]);
    const [instances, setInstances] = useState<any[]>([]);
    const [labels, setLabels] = useState<any[]>([]);
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
    const [isLoadingInboxes, setIsLoadingInboxes] = useState(false);
    const [isLoadingInstances, setIsLoadingInstances] = useState(false);
    const [isLoadingLabels, setIsLoadingLabels] = useState(false);
    const [isLoadingCampaign, setIsLoadingCampaign] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const [campRes, inboxRes, instanceRes, labelRes] = await Promise.all([
                    apiFetch(`/campaigns/${id}`),
                    apiFetch('/campaigns/inboxes'),
                    apiFetch('/campaigns/instances'),
                    apiFetch('/campaigns/labels'),
                ]);

                if (campRes.ok) {
                    const camp = await campRes.json();
                    setFormData({
                        name: camp.name || "",
                        message: camp.message || "",
                        inboxId: camp.inboxId?.toString() || "",
                        instance: camp.evolutionInstance || "",
                        scheduledAt: camp.scheduledAt ? new Date(camp.scheduledAt).toISOString().slice(0, 16) : "",
                    });
                    setSelectedLabels(Array.isArray(camp.filters) ? camp.filters : []);
                }

                if (inboxRes.ok) setInboxes(await inboxRes.json());
                if (instanceRes.ok) setInstances(await instanceRes.json());
                if (labelRes.ok) setLabels(await labelRes.json());
            } catch (err) {
                setError('Não foi possível carregar os dados da campanha.');
            } finally {
                setIsLoadingCampaign(false);
                setIsLoadingInboxes(false);
                setIsLoadingInstances(false);
                setIsLoadingLabels(false);
            }
        };

        if (id) fetchAll();
    }, [id]);

    const toggleLabel = (label: string) => {
        setSelectedLabels(prev =>
            prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]
        );
    };

    const handleUpdate = async () => {
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await apiFetch(`/campaigns/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formData.name,
                    message: formData.message,
                    filters: selectedLabels,
                    inboxId: formData.inboxId,
                    evolutionInstance: formData.instance,
                    scheduledAt: formData.scheduledAt || null,
                }),
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                throw new Error(errData.message || 'Erro ao atualizar campanha');
            }

            router.push('/campaigns');
        } catch (err: any) {
            setError(err.message || 'Erro ao salvar alterações');
        } finally {
            setIsSubmitting(false);
        }
    };

    const steps = [
        { num: 1, label: "Configuração", icon: Settings },
        { num: 2, label: "Audiência", icon: Users },
        { num: 3, label: "Mensagem", icon: MessageSquare },
        { num: 4, label: "Revisão", icon: CheckCircle2 },
    ];

    if (isLoadingCampaign) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-[#09090b] flex items-center justify-center">
                <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent animate-spin rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#09090b] text-gray-900 dark:text-white font-sans transition-colors duration-300">
            <aside className="fixed left-0 top-0 h-full w-20 bg-white dark:bg-[#121214] border-r border-gray-200 dark:border-white/5 flex flex-col items-center py-8 gap-8 z-50">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-600/20">
                    <Send size={22} className="text-white" />
                </div>
            </aside>

            <main className="pl-20">
                <header className="sticky top-0 z-40 bg-gray-50/80 dark:bg-[#09090b]/80 backdrop-blur-xl border-b border-gray-200 dark:border-white/5 px-10 py-5 flex items-center gap-6">
                    <Link href="/campaigns" className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white">
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold">Editar Campanha</h1>
                        <p className="text-sm text-gray-500">{formData.name}</p>
                    </div>
                </header>

                <div className="max-w-4xl mx-auto p-10">
                    {/* Step indicator */}
                    <div className="flex items-center gap-2 mb-12">
                        {steps.map((s, i) => {
                            const Icon = s.icon;
                            const isActive = step === s.num;
                            const isDone = step > s.num;
                            return (
                                <React.Fragment key={s.num}>
                                    <button
                                        onClick={() => setStep(s.num)}
                                        className={`flex items-center gap-2.5 px-4 py-2.5 rounded-2xl font-semibold text-sm transition-all ${
                                            isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' :
                                            isDone ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400' :
                                            'text-gray-400 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        <Icon size={16} />
                                        <span className="hidden sm:inline">{s.label}</span>
                                    </button>
                                    {i < steps.length - 1 && <ChevronRight size={16} className="text-gray-300 dark:text-gray-700 flex-shrink-0" />}
                                </React.Fragment>
                            );
                        })}
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-2xl text-red-600 dark:text-red-400 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <h2 className="text-2xl font-bold mb-8">Configuração Básica</h2>
                                <div>
                                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Nome da Campanha</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                                        placeholder="Nome da campanha"
                                        className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-blue-500/50 transition-all text-gray-900 dark:text-white placeholder-gray-400"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Inbox (Canal de Envio)</label>
                                    <select
                                        value={formData.inboxId}
                                        onChange={e => setFormData(p => ({ ...p, inboxId: e.target.value }))}
                                        className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-blue-500/50 transition-all text-gray-900 dark:text-white"
                                    >
                                        <option value="">{isLoadingInboxes ? 'Carregando...' : 'Selecionar Inbox'}</option>
                                        {inboxes.map((inbox: any) => (
                                            <option key={inbox.id} value={inbox.id}>{inbox.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Instância Evolution</label>
                                    <select
                                        value={formData.instance}
                                        onChange={e => setFormData(p => ({ ...p, instance: e.target.value }))}
                                        className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-blue-500/50 transition-all text-gray-900 dark:text-white"
                                    >
                                        <option value="">{isLoadingInstances ? 'Carregando...' : 'Selecionar Instância'}</option>
                                        {instances.map((inst: any) => (
                                            <option key={inst.instance?.instanceName || inst.id} value={inst.instance?.instanceName || inst.id}>
                                                {inst.instance?.instanceName || inst.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                                        Agendamento <span className="text-gray-400 font-normal">(opcional)</span>
                                    </label>
                                    <input
                                        type="datetime-local"
                                        value={formData.scheduledAt}
                                        onChange={e => setFormData(p => ({ ...p, scheduledAt: e.target.value }))}
                                        className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-blue-500/50 transition-all text-gray-900 dark:text-white"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">Deixe em branco para disparar manualmente.</p>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <h2 className="text-2xl font-bold mb-8">Audiência</h2>
                                <p className="text-gray-500 text-sm">Selecione as etiquetas para filtrar os contatos. Deixe em branco para enviar para <strong>todos os contatos</strong>.</p>

                                {isLoadingLabels ? (
                                    <div className="flex gap-2 flex-wrap">
                                        {Array(6).fill(0).map((_, i) => (
                                            <div key={i} className="h-9 w-24 bg-gray-200 dark:bg-white/5 animate-pulse rounded-full" />
                                        ))}
                                    </div>
                                ) : labels.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500 border border-dashed border-gray-200 dark:border-white/10 rounded-2xl">
                                        Nenhuma etiqueta encontrada no Chatwoot.
                                    </div>
                                ) : (
                                    <div className="flex flex-wrap gap-3">
                                        {labels.map((label: any) => {
                                            const name = label.title || label.name || label;
                                            const selected = selectedLabels.includes(name);
                                            return (
                                                <button
                                                    key={name}
                                                    onClick={() => toggleLabel(name)}
                                                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                                                        selected
                                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20'
                                                            : 'bg-white dark:bg-white/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-white/10 hover:border-blue-400 dark:hover:border-blue-500/50'
                                                    }`}
                                                >
                                                    {name}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}

                                {selectedLabels.length > 0 && (
                                    <div className="p-4 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl text-blue-600 dark:text-blue-400 text-sm">
                                        <strong>{selectedLabels.length}</strong> etiqueta{selectedLabels.length > 1 ? 's' : ''} selecionada{selectedLabels.length > 1 ? 's' : ''}: {selectedLabels.join(', ')}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <h2 className="text-2xl font-bold mb-8">Mensagem</h2>
                                <div>
                                    <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                                        Conteúdo da Mensagem
                                    </label>
                                    <textarea
                                        value={formData.message}
                                        onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                                        placeholder="Digite sua mensagem..."
                                        rows={10}
                                        className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-blue-500/50 transition-all text-gray-900 dark:text-white placeholder-gray-400 font-mono text-sm resize-y"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                                        <span>Suporte a emojis e formatação WhatsApp (*bold*, _italics_)</span>
                                        <span>{formData.message.length} caracteres</span>
                                    </div>
                                </div>

                                {/* Preview Card */}
                                {formData.message && (
                                    <div className="p-5 bg-gray-100 dark:bg-[#1c1c1f] rounded-3xl">
                                        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-gray-500">
                                            <Smartphone size={16} />
                                            Preview
                                        </div>
                                        <div className="max-w-xs bg-green-500 text-white rounded-2xl rounded-tl-sm px-4 py-3 text-sm shadow-md">
                                            <p className="whitespace-pre-wrap">{formData.message}</p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <h2 className="text-2xl font-bold mb-8">Confirmar Alterações</h2>
                                <div className="bg-white dark:bg-[#121214] border border-gray-200 dark:border-white/5 rounded-3xl p-8 space-y-5">
                                    <ReviewRow label="Nome" value={formData.name} />
                                    <ReviewRow label="Inbox" value={inboxes.find(i => i.id?.toString() === formData.inboxId)?.name || formData.inboxId || '—'} />
                                    <ReviewRow label="Instância" value={formData.instance || '—'} />
                                    <ReviewRow label="Etiquetas" value={selectedLabels.length > 0 ? selectedLabels.join(', ') : 'Todos os contatos'} />
                                    <ReviewRow label="Agendamento" value={formData.scheduledAt ? new Date(formData.scheduledAt).toLocaleString('pt-BR') : 'Manual'} />
                                    <div className="pt-4 border-t border-gray-100 dark:border-white/5">
                                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Mensagem</p>
                                        <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap bg-gray-50 dark:bg-white/5 rounded-2xl p-4">{formData.message}</p>
                                    </div>
                                </div>

                                <button
                                    onClick={handleUpdate}
                                    disabled={isSubmitting || !formData.name || !formData.message || !formData.inboxId || !formData.instance}
                                    className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-xl shadow-blue-600/20"
                                >
                                    {isSubmitting ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent animate-spin rounded-full" />
                                    ) : (
                                        <CheckCircle2 size={22} />
                                    )}
                                    {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Nav Buttons */}
                    <div className="flex justify-between mt-10">
                        <button
                            onClick={() => setStep(s => Math.max(1, s - 1))}
                            disabled={step === 1}
                            className="px-6 py-3 rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                        >
                            Anterior
                        </button>

                        {step < 4 ? (
                            <button
                                onClick={() => setStep(s => Math.min(4, s + 1))}
                                className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-600/20"
                            >
                                Próximo
                                <ChevronRight size={16} />
                            </button>
                        ) : null}
                    </div>
                </div>
            </main>
        </div>
    );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex justify-between items-start gap-4">
            <span className="text-sm font-semibold text-gray-500 flex-shrink-0">{label}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white text-right">{value}</span>
        </div>
    );
}
