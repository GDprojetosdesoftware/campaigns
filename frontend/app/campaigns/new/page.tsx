"use client";

export const dynamic = 'force-dynamic';

import React, { useState } from "react";
import { ArrowLeft, Send, Users, MessageSquare, Settings, CheckCircle2, ChevronRight, FileText, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
    const [labels, setLabels] = useState<any[]>([]);
    const [isLoadingInboxes, setIsLoadingInboxes] = useState(false);
    const [isLoadingInstances, setIsLoadingInstances] = useState(false);
    const [isLoadingLabels, setIsLoadingLabels] = useState(false);
    const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
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

        const fetchLabels = async () => {
            setIsLoadingLabels(true);
            try {
                const response = await apiFetch('/campaigns/labels');
                if (response.ok) {
                    const data = await response.json();
                    setLabels(data);
                }
            } catch (error) {
                console.error("Error fetching labels:", error);
            } finally {
                setIsLoadingLabels(false);
            }
        };

        fetchInboxes();
        fetchInstances();
        fetchLabels();
    }, []);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setSubmitError(null);
        try {
            const response = await apiFetch('/campaigns', {
                method: "POST",
                body: JSON.stringify({
                    name: formData.name,
                    message: formData.message,
                    filters: selectedLabels,
                    inboxId: parseInt(formData.inboxId),
                    evolutionInstance: formData.instance
                }),
            });

            if (response.ok) {
                alert("Campanha criada com sucesso! Redirecionando para o Dashboard.");
                router.push("/campaigns");
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || errorData.error || "Erro ao criar campanha. Verifique os dados.";
                setSubmitError(errorMessage);
                alert(`Erro: ${errorMessage}`);
            }
        } catch (error) {
            console.error("Error submitting campaign:", error);
            setSubmitError("Erro de conexão com o servidor.");
            alert("Erro de conexão com o servidor.");
        } finally {
            setIsSubmitting(false);
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
                <div className="flex items-center justify-between mb-16 px-4 relative">
                    {/* Background track */}
                    <div className="absolute top-5 left-0 w-full h-[1px] bg-gray-200 dark:bg-gray-800 -z-10" />
                    
                    {[
                        { id: 1, label: "Definição", icon: Settings },
                        { id: 2, label: "Audiência", icon: Users },
                        { id: 3, label: "Mensagem", icon: MessageSquare },
                        { id: 4, label: "Revisão", icon: CheckCircle2 }
                    ].map((s, i) => (
                        <div key={s.id} className="flex flex-col items-center gap-3 relative z-10">
                            <motion.div 
                                initial={false}
                                animate={{ 
                                    scale: step === s.id ? 1.2 : 1,
                                    backgroundColor: step === s.id ? "#2563eb" : step > s.id ? "#10b981" : "var(--tw-inherit)",
                                }}
                                className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 ${
                                    step === s.id 
                                        ? "border-blue-600 shadow-[0_0_20px_rgba(37,99,235,0.3)] text-white" 
                                        : step > s.id 
                                            ? "border-green-500 text-white" 
                                            : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-400"
                                }`}
                            >
                                {step > s.id ? <CheckCircle2 size={18} /> : <s.icon size={18} />}
                            </motion.div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                step === s.id ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-600"
                            }`}>
                                {s.label}
                            </span>
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="relative">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div 
                                key="step1"
                                initial={{ opacity: 0, y: 20 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-8"
                            >
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-10 shadow-xl">
                                    <div className="mb-8">
                                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-800">
                                            <Settings className="text-blue-600" size={24} />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Identificação da Campanha</h2>
                                        <p className="text-gray-500 text-sm mt-1">Como essa campanha será identificada nos relatórios.</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="group">
                                            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest pl-1 mb-2 block group-focus-within:text-blue-500 transition-colors">Nome da Campanha</label>
                                            <input
                                                type="text"
                                                required
                                                autoFocus
                                                placeholder="Ex: Reativação de Clientes Inativos"
                                                className="w-full bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl px-6 py-4 text-lg focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="group">
                                            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest pl-1 mb-2 block group-focus-within:text-blue-500 transition-colors">Instância Evolution (WhatsApp)</label>
                                            <div className="relative">
                                                <select
                                                    required
                                                    className="w-full bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl px-6 py-4 text-lg focus:border-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
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
                                    <button 
                                        type="button" 
                                        onClick={nextStep} 
                                        disabled={!formData.name || !formData.instance}
                                        className="bg-blue-600 dark:bg-blue-600 text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 disabled:grayscale transition-all flex items-center gap-2 group"
                                    >
                                        Próximo Passo <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Público */}
                        {step === 2 && (
                            <motion.div 
                                key="step2"
                                initial={{ opacity: 0, y: 20 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-8"
                            >
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-10 shadow-xl">
                                    <div className="mb-8">
                                        <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center mb-4 border border-green-100 dark:border-green-800">
                                            <Users className="text-green-600" size={24} />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Filtro de Audiência</h2>
                                        <p className="text-gray-500 text-sm mt-1">Defina quem receberá esta transmissão.</p>
                                    </div>

                                    <div className="grid grid-cols-1 gap-8">
                                        <div className="group">
                                            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest pl-1 mb-2 block group-focus-within:text-green-500 transition-colors">Etiquetas (Chatwoot)</label>
                                            <div className="flex flex-wrap gap-2 mb-4 min-h-[40px] p-3 bg-gray-50/50 dark:bg-gray-800/20 rounded-xl border border-dashed border-gray-200 dark:border-gray-800">
                                                {selectedLabels.length === 0 && <span className="text-gray-400 text-xs italic py-1 px-1">Nenhuma etiqueta selecionada</span>}
                                                {selectedLabels.map(label => (
                                                    <motion.span 
                                                        layout
                                                        initial={{ scale: 0.8, opacity: 0 }}
                                                        animate={{ scale: 1, opacity: 1 }}
                                                        key={label} 
                                                        className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 border border-green-200 dark:border-green-800 shadow-sm"
                                                    >
                                                        {label}
                                                        <button type="button" onClick={() => setSelectedLabels(selectedLabels.filter(l => l !== label))} className="hover:text-red-500 transition-colors">×</button>
                                                    </motion.span>
                                                ))}
                                            </div>
                                            <div className="relative">
                                                <select
                                                    className="w-full bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl px-6 py-4 text-lg focus:border-green-500/50 outline-none transition-all appearance-none cursor-pointer"
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val && !selectedLabels.includes(val)) {
                                                            setSelectedLabels([...selectedLabels, val]);
                                                        }
                                                        e.target.value = "";
                                                    }}
                                                >
                                                    <option value="">Adicionar etiqueta...</option>
                                                    {isLoadingLabels ? (
                                                        <option disabled>Carregando etiquetas...</option>
                                                    ) : (
                                                        labels.map((label: any) => (
                                                            <option key={label.id} value={label.title}>
                                                                {label.title}
                                                            </option>
                                                        ))
                                                    )}
                                                </select>
                                                <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={20} />
                                            </div>
                                        </div>
                                        <div className="group">
                                            <label className="text-[10px] uppercase font-bold text-gray-400 tracking-widest pl-1 mb-2 block group-focus-within:text-green-500 transition-colors">Caixa de Entrada</label>
                                            <div className="relative">
                                                <select
                                                    required
                                                    className="w-full bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-2xl px-6 py-4 text-lg focus:border-green-500/50 outline-none transition-all appearance-none cursor-pointer"
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
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between pt-4">
                                    <button type="button" onClick={prevStep} className="text-gray-500 font-bold px-8 hover:text-gray-900 dark:hover:text-white transition-colors">
                                        Voltar
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={nextStep} 
                                        disabled={selectedLabels.length === 0 || !formData.inboxId}
                                        className="bg-green-600 text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-green-500/20 hover:bg-green-700 disabled:opacity-50 disabled:grayscale transition-all flex items-center gap-2 group"
                                    >
                                        Próximo Passo <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Mensagem */}
                        {step === 3 && (
                            <motion.div 
                                key="step3"
                                initial={{ opacity: 0, y: 20 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-8"
                            >
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-10 shadow-xl">
                                    <div className="mb-8">
                                        <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mb-4 border border-purple-100 dark:border-purple-800">
                                            <MessageSquare className="text-purple-600" size={24} />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Conteúdo do Disparo</h2>
                                        <p className="text-gray-500 text-sm mt-1">Use {'{{name}}'} para personalizar a mensagem.</p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="group">
                                            <textarea
                                                required
                                                rows={8}
                                                autoFocus
                                                placeholder="Olá {{name}}, tudo bem? Estamos com uma promoção especial..."
                                                className="w-full bg-gray-50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white rounded-[2rem] p-8 text-lg focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/5 outline-none transition-all resize-none placeholder:text-gray-400 dark:placeholder:text-gray-600"
                                                value={formData.message}
                                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            />
                                            <div className="mt-4 flex flex-wrap gap-2">
                                                <button type="button" onClick={() => setFormData({...formData, message: formData.message + ' {{name}}'})} className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-[10px] text-gray-600 dark:text-gray-400 font-black uppercase tracking-wider transition-colors border border-gray-200 dark:border-gray-700">Inserir Nome</button>
                                                <div className="flex-1"></div>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1">
                                                    <CheckCircle2 size={12} className="text-green-500" />
                                                    Suporta Spintax
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-between pt-4">
                                    <button type="button" onClick={prevStep} className="text-gray-500 font-bold px-8 hover:text-gray-900 dark:hover:text-white transition-colors">
                                        Voltar
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={nextStep} 
                                        disabled={!formData.message}
                                        className="bg-purple-600 text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-purple-500/20 hover:bg-purple-700 disabled:opacity-50 disabled:grayscale transition-all flex items-center gap-2 group"
                                    >
                                        Revisar e Lançar <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 4: Revisão */}
                        {step === 4 && (
                            <motion.div 
                                key="step4"
                                initial={{ opacity: 0, y: 20 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, y: -20 }}
                                className="space-y-8"
                            >
                                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-[2.5rem] p-10 shadow-xl overflow-hidden relative">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-3xl -mr-10 -mt-10"></div>
                                    <div className="mb-8">
                                        <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-800">
                                            <CheckCircle2 className="text-blue-600" size={24} />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Confirmar Lançamento</h2>
                                        <p className="text-gray-500 text-sm mt-1">Tudo pronto para iniciar sua campanha.</p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                        <div className="space-y-6">
                                            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800/20 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                                                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                                                    <FileText size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Nome e Canal</p>
                                                    <p className="font-bold text-gray-900 dark:text-white">{formData.name}</p>
                                                    <p className="text-xs text-gray-500">via Instância: {formData.instance}</p>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800/20 rounded-2xl border border-gray-100 dark:border-gray-800/50">
                                                <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                                                    <Users size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Público-alvo</p>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {selectedLabels.map(l => (
                                                            <span key={l} className="text-[10px] px-2 py-0.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-md font-bold">{l}</span>
                                                        ))}
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-2">Inbox ID: {formData.inboxId}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-4 p-5 bg-blue-600 rounded-[2rem] text-white shadow-xl shadow-blue-500/10">
                                            <div className="p-2 bg-white/20 rounded-lg">
                                                <Smartphone size={18} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[10px] text-white/60 font-bold uppercase tracking-widest mb-2">Mensagem do Cliente</p>
                                                <div className="bg-white/10 p-4 rounded-xl text-xs leading-relaxed italic border border-white/5">
                                                    "{formData.message}"
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-10 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-2xl flex items-center gap-4">
                                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                                        <p className="text-xs text-yellow-800 dark:text-yellow-500 font-medium">Ao clicar em confirmar, o servidor começará a enviar as mensagens imediatamente conforme a fila.</p>
                                    </div>
                                </div>
                                <div className="flex justify-between pt-4">
                                    <button type="button" onClick={prevStep} className="text-gray-500 font-bold px-8 hover:text-gray-900 dark:hover:text-white transition-colors">
                                        Ajustar Dados
                                    </button>
                                    <button 
                                        type="submit" 
                                        className="bg-blue-600 text-white px-12 py-4 rounded-full font-black shadow-[0_20px_40px_rgba(37,99,235,0.3)] hover:bg-blue-500 transition-all flex items-center gap-3 active:scale-95"
                                    >
                                        <Send size={20} />
                                        RECONFIRMAR E LANÇAR
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </form>
            </div>
        </div>
    );
}
