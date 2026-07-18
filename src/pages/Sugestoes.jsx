import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lightbulb, MessageSquare, ClipboardList, CheckCircle2, Send, Target, Zap } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const OFI_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6905526da166967415597099/3c8ad4e27_ofi_logo_RGB2.jpg";

const TIPOS = [
  { value: "Sugestão", icon: MessageSquare, color: "text-blue-600", bg: "bg-blue-50 border-blue-200", desc: "Compartilhe uma sugestão de melhoria" },
  { value: "Ideia", icon: Lightbulb, color: "text-yellow-600", bg: "bg-yellow-50 border-yellow-200", desc: "Proponha uma nova ideia" },
  { value: "Requerimento", icon: ClipboardList, color: "text-purple-600", bg: "bg-purple-50 border-purple-200", desc: "Solicite algo necessário" },
];

const DEPARTAMENTOS = [
  "Originação", "Qualidade", "Logística", "Compras", "Fiscal",
  "Sustentabilidade", "Controladoria", "Produção", "Comercial", "Administrativo", "Outro"
];

function Splash({ onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#860063] via-[#a0004f] to-[#F88D2A]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6 }}
    >
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "backOut" }}
        className="flex flex-col items-center gap-6"
      >
        <div className="w-28 h-28 bg-white rounded-3xl flex items-center justify-center p-3 shadow-2xl">
          <img src={OFI_LOGO_URL} alt="OFI" className="w-full h-full object-contain" />
        </div>
        <div className="text-center">
          <motion.h1
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-4xl font-bold text-white tracking-tight"
          >
            Central Pulse
          </motion.h1>
          <motion.p
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-white/80 text-lg mt-2"
          >
            Continuous Improvement
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.5 }}
          className="flex gap-1.5 mt-4"
        >
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-white/60 rounded-full"
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export default function Sugestoes() {
  const [showSplash, setShowSplash] = useState(true);
  const [form, setForm] = useState({ nome: "", departamento: "", tipo: "", descricao: "", objetivo: "", impacto: "", tipo_requerimento: "", nome_projeto: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const tipoSelecionado = TIPOS.find(t => t.value === form.tipo);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nome || !form.departamento || !form.tipo || !form.descricao || !form.objetivo || !form.impacto ||
        (form.tipo === "Requerimento" && (!form.tipo_requerimento || !form.nome_projeto))) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setSubmitting(true);
    await base44.entities.Sugestao.create(form);
    setSubmitted(true);
    setSubmitting(false);
  };

  return (
    <>
      <AnimatePresence>
        {showSplash && <Splash onDone={() => setShowSplash(false)} />}
      </AnimatePresence>

      <div className="min-h-screen bg-gradient-to-br from-[#860063] via-[#a0004f] to-[#F88D2A]">
        {submitted ? (
          <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-2xl">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Enviado com sucesso!</h2>
                <p className="text-gray-500">Sua {form.tipo.toLowerCase()} foi registrada e será analisada pela equipe responsável.</p>
                <Button
                  onClick={() => { setSubmitted(false); setForm({ nome: "", departamento: "", tipo: "", descricao: "", objetivo: "", impacto: "", tipo_requerimento: "", nome_projeto: "" }); }}
                  className="w-full bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824] text-white"
                >
                  Enviar outra
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="pt-8 pb-6 px-4 text-center">
              <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center p-2 shadow-lg mx-auto mb-4">
                <img src={OFI_LOGO_URL} alt="OFI" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-3xl font-bold text-white">Central Pulse</h1>
              <p className="text-white/80 text-sm mt-1">Hub de Inovação</p>
            </div>

            {/* Form */}
            <div className="max-w-lg mx-auto px-4 pb-12">
              <Card className="shadow-2xl border-0">
                <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5 pb-4">
                  <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Send className="w-5 h-5 text-[#860063]" />
                    Continuous Improvement
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <form onSubmit={handleSubmit} className="space-y-5">

                    {/* Tipo */}
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold text-gray-700">Tipo *</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {TIPOS.map(({ value, icon: Icon, color, bg }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setForm({ ...form, tipo: value })}
                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                              form.tipo === value
                                ? `${bg} border-current ${color} font-semibold shadow-md scale-105`
                                : "border-gray-200 hover:border-gray-300 text-gray-500 hover:bg-gray-50"
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${form.tipo === value ? color : "text-gray-400"}`} />
                            <span className="text-xs leading-tight">{value}</span>
                          </button>
                        ))}
                      </div>
                      {tipoSelecionado && (
                        <p className="text-xs text-gray-500 italic">{tipoSelecionado.desc}</p>
                      )}
                    </div>

                    {/* Tipo Requerimento + Nome Projeto — apenas para Requerimento */}
                    {form.tipo === "Requerimento" && (
                      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 space-y-4">
                        <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">Detalhes do Requerimento</p>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-gray-700">Natureza *</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {["Melhoria", "Desenvolvimento"].map(opt => (
                              <button
                                key={opt}
                                type="button"
                                onClick={() => setForm({ ...form, tipo_requerimento: opt })}
                                className={`py-2.5 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                                  form.tipo_requerimento === opt
                                    ? "bg-[#860063] border-[#860063] text-white shadow-md"
                                    : "border-gray-200 text-gray-500 hover:border-purple-300 hover:bg-purple-50"
                                }`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-sm font-semibold text-gray-700">Nome do Projeto *</Label>
                          <Input
                            value={form.nome_projeto}
                            onChange={e => setForm({ ...form, nome_projeto: e.target.value })}
                            placeholder="Ex: Automação de Relatórios"
                            className="border-gray-300 focus:border-[#860063]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Nome */}
                    <div className="space-y-1.5">
                      <Label htmlFor="nome" className="text-sm font-semibold text-gray-700">Nome *</Label>
                      <Input
                        id="nome"
                        value={form.nome}
                        onChange={e => setForm({ ...form, nome: e.target.value })}
                        placeholder="Seu nome completo"
                        className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                      />
                    </div>

                    {/* Departamento */}
                    <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-gray-700">Departamento *</Label>
                      <Select value={form.departamento} onValueChange={v => setForm({ ...form, departamento: v })}>
                        <SelectTrigger className="border-gray-300 focus:border-[#860063]">
                          <SelectValue placeholder="Selecione seu departamento" />
                        </SelectTrigger>
                        <SelectContent>
                          {DEPARTAMENTOS.map(d => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Objetivo */}
                    <div className="space-y-1.5">
                      <Label htmlFor="objetivo" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-blue-500" /> Objetivo *
                      </Label>
                      <Textarea
                        id="objetivo"
                        value={form.objetivo}
                        onChange={e => setForm({ ...form, objetivo: e.target.value })}
                        placeholder="Qual é o objetivo desta solicitação?"
                        rows={2}
                        className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] resize-none"
                      />
                    </div>

                    {/* Impacto */}
                    <div className="space-y-1.5">
                      <Label htmlFor="impacto" className="text-sm font-semibold text-gray-700 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-orange-500" /> Impacto / Benefícios *
                      </Label>
                      <Textarea
                        id="impacto"
                        value={form.impacto}
                        onChange={e => setForm({ ...form, impacto: e.target.value })}
                        placeholder="Quais serão os benefícios esperados?"
                        rows={2}
                        className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] resize-none"
                      />
                    </div>

                    {/* Descrição */}
                    <div className="space-y-1.5">
                      <Label htmlFor="descricao" className="text-sm font-semibold text-gray-700">
                        {form.tipo ? `Descreva sua ${form.tipo.toLowerCase()} *` : "Descrição *"}
                      </Label>
                      <Textarea
                        id="descricao"
                        value={form.descricao}
                        onChange={e => setForm({ ...form, descricao: e.target.value })}
                        placeholder={
                          form.tipo === "Ideia" ? "Descreva sua ideia em detalhes..." :
                          form.tipo === "Sugestão" ? "O que você gostaria de melhorar?" :
                          form.tipo === "Requerimento" ? "O que você precisa? Por quê é necessário?" :
                          "Descreva com detalhes..."
                        }
                        rows={4}
                        className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] resize-none"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824] text-white h-12 text-base font-semibold"
                    >
                      {submitting ? "Enviando..." : (
                        <><Send className="w-4 h-4 mr-2" /> Enviar</>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </>
  );
}