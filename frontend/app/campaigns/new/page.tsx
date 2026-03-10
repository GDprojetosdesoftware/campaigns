"use client";

import { useState } from "react";
import { ArrowLeft, Send, Users, MessageSquare, Settings, CheckCircle2, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function NewCampaignPage() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: "",
        message: "",
        tags: "",
        inboxId: "",
        instance: "default",
    });

    const router = useRouter();

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Submitting campaign:", formData);
        alert("Campanha criada com sucesso! Redirecionando para o Dashboard.");
        router.push("/campaigns");
    };

    const nextStep = () => setStep(step + 1);
    const prevStep = () => setStep(step - 1);

    return (
        <div className="min-h-screen bg-[#09090b] text-white font-sans selection:bg-blue-500/30 pb-20">
            <div className="max-w-3xl mx-auto px-6 py-12">
                <header className="mb-12 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <Link href="/campaigns" className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center transition-all group overflow-hidden border border-white/5">
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
                            <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
                                <div className="mb-8">
                                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-4 border border-blue-500/20">
                                        <Settings className="text-blue-500" size={24} />
                                    </div>
                                    <h2 className="text-xl font-bold">Identificação</h2>
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
                                            className="w-full bg-[#09090b] border border-white/10 rounded-2xl px-6 py-4 text-lg focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all placeholder:text-gray-800"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1 mb-2 block">Instância Evolution (WhatsApp)</label>
                                        <div className="relative">
                                            <select
                                                className="w-full bg-[#09090b] border border-white/10 rounded-2xl px-6 py-4 text-lg focus:border-blue-500/50 outline-none transition-all appearance-none cursor-pointer"
                                                value={formData.instance}
                                                onChange={(e) => setFormData({ ...formData, instance: e.target.value })}
                                            >
                                                <option value="default">Canal Principal (Default)</option>
                                                <option value="atendimento">Departamento de Atendimento</option>
                                                <option value="vendas">Time de SDR / Vendas</option>
                                            </select>
                                            <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-gray-600 pointer-events-none" size={20} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <button type="button" onClick={nextStep} className="bg-white text-black px-10 py-4 rounded-full font-bold shadow-xl hover:bg-gray-200 transition-all flex items-center gap-2">
                                    Próximo Passo <ChevronRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Público */}
                    {step === 2 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                            <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
                                <div className="mb-8">
                                    <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4 border border-green-500/20">
                                        <Users className="text-green-500" size={24} />
                                    </div>
                                    <h2 className="text-xl font-bold">Filtro de Audiência</h2>
                                    <p className="text-gray-500 text-sm mt-1">Conectado em tempo real com seu Chatwoot.</p>
                                </div>

                                <div className="grid grid-cols-1 gap-8">
                                    <div className="group">
                                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1 mb-2 block">Etiquetas (Separe por vírgula)</label>
                                        <input
                                            type="text"
                                            placeholder="Ex: vip, hot_lead, lead_frio"
                                            className="w-full bg-[#09090b] border border-white/10 rounded-2xl px-6 py-4 text-lg focus:border-green-500/50 focus:ring-4 focus:ring-green-500/5 outline-none transition-all placeholder:text-gray-800"
                                            value={formData.tags}
                                            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                                        />
                                    </div>
                                    <div className="group">
                                        <label className="text-[10px] uppercase font-bold text-gray-500 tracking-widest pl-1 mb-2 block">ID da Caixa de Entrada (Chatwoot)</label>
                                        <input
                                            type="number"
                                            required
                                            placeholder="Ex: 56"
                                            className="w-full bg-[#09090b] border border-white/10 rounded-2xl px-6 py-4 text-lg focus:border-green-500/50 focus:ring-4 focus:ring-green-500/5 outline-none transition-all placeholder:text-gray-800"
                                            value={formData.inboxId}
                                            onChange={(e) => setFormData({ ...formData, inboxId: e.target.value })}
                                        />
                                        <p className="text-[9px] text-gray-600 mt-3 font-bold uppercase tracking-wider pl-1">O ID do Inbox onde as novas conversas serão iniciadas.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between pt-4">
                                <button type="button" onClick={prevStep} className="bg-white/5 text-white border border-white/10 px-8 py-4 rounded-full font-bold hover:bg-white/10 transition-all">
                                    Voltar
                                </button>
                                <button type="button" onClick={nextStep} className="bg-white text-black px-10 py-4 rounded-full font-bold shadow-xl hover:bg-gray-200 transition-all flex items-center gap-2">
                                    Configurar Mensagem <ChevronRight size={18} />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Mensagem */}
                    {step === 3 && (
                        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                            <div className="bg-[#121214] border border-white/5 rounded-[2.5rem] p-10 shadow-2xl">
                                <div className="mb-8">
                                    <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-4 border border-purple-500/20">
                                        <MessageSquare className="text-purple-500" size={24} />
                                    </div>
                                    <h2 className="text-xl font-bold">Conteúdo do Disparo</h2>
                                    <p className="text-gray-500 text-sm mt-1">Escreva a mensagem que seus clientes receberão.</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="group text-right">
                                        <textarea
                                            required
                                            rows={8}
                                            autoFocus
                                            placeholder="Olá {{name}}, temos uma oferta especial..."
                                            className="w-full bg-[#09090b] border border-white/10 rounded-[2rem] p-8 text-lg focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/5 outline-none transition-all resize-none shadow-inner"
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                        />
                                        <div className="mt-4 flex gap-2 justify-end">
                                            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] text-gray-500 font-bold uppercase hover:text-white cursor-help">Variáveis: {'{{name}}'}</span>
                                            <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] text-gray-500 font-bold uppercase hover:text-white cursor-help">Spinning syntax support</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-between pt-4">
                                <button type="button" onClick={prevStep} className="bg-white/5 text-white border border-white/10 px-8 py-4 rounded-full font-bold hover:bg-white/10 transition-all">
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
