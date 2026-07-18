import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lightbulb, MessageSquare, ClipboardList, Pencil, Trash2, CheckCircle2, Target, Zap, AlertTriangle, Clock, TrendingUp, BarChart2, Plus } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";

const OFI_LOGO_URL = "https://ofiturkey.com.tr/Content/images/ofi-logo-reverse.svg";

const STATUS_COLORS = {
  aguardando: "bg-yellow-100 text-yellow-800 border-yellow-200",
  em_analise: "bg-blue-100 text-blue-800 border-blue-200",
  em_execucao: "bg-purple-100 text-purple-800 border-purple-200",
  concluido: "bg-gray-100 text-gray-600 border-gray-200",
};
const STATUS_LABELS = {
  aguardando: "Aguardando",
  em_analise: "Em Análise",
  em_execucao: "Em Execução",
  concluido: "Concluído",
};
const STATUS_BG_COLORS = {
  aguardando: "#a855f7",
  em_analise: "#a855f7",
  em_execucao: "#a855f7",
  concluido: "#a855f7",
};

const CRITICIDADE_CONFIG = {
  baixa:  { label: "Baixa",  color: "bg-green-100 text-green-800 border-green-300",  bar: "#22c55e", desc: "até 15 dias" },
  media:  { label: "Média",  color: "bg-yellow-100 text-yellow-800 border-yellow-300", bar: "#eab308", desc: "15–30 dias" },
  alta:   { label: "Alta",   color: "bg-red-100 text-red-800 border-red-300",          bar: "#ef4444", desc: "> 30 dias" },
};

const getCriticidadeFromDias = (dias) => {
  if (!dias || dias <= 0) return null;
  if (dias <= 15) return "baixa";
  if (dias <= 30) return "media";
  return "alta";
};

const TIPO_ICONS = { "Sugestão": MessageSquare, "Ideia": Lightbulb, "Requerimento": ClipboardList };
const TIPO_COLORS = { "Sugestão": "text-blue-600", "Ideia": "text-yellow-600", "Requerimento": "text-purple-600" };
const DEPARTAMENTOS = [
  "Produção", "Qualidade", "Logística", "Compras", "Financeiro",
  "Sustentabilidade", "Originação", "Comercial", "Controladoria", "Outro"
];

export default function SugestoesAdmin() {
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    nome: "", departamento: "", tipo: "Requerimento", tipo_requerimento: "Desenvolvimento",
    nome_projeto: "", descricao: "", objetivo: "", impacto: "",
    prioridade: "", prazo_estimado_dias: "", criticidade: "", tempo_processo_atual_horas: "", tempo_novo_fluxo_horas: ""
  });
  const [saving, setSaving] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [criticidadeFilter, setCriticidadeFilter] = useState("all");
  const [showConcluidos, setShowConcluidos] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState("lista"); // "lista" | "dashboard"
  const queryClient = useQueryClient();

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const { data: me } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
  const isManager = me?.profile === "gerente_originacao" || me?.role === "admin";

  const { data: sugestoes = [] } = useQuery({
    queryKey: ["sugestoes"],
    queryFn: () => base44.entities.Sugestao.list("created_date", 200),
    refetchInterval: 30000,
  });

  // Apenas requerimentos
  const requerimentos = useMemo(() => sugestoes.filter(s => s.tipo === "Requerimento"), [sugestoes]);

  // Dashboard data
  const dashboardData = useMemo(() => {
    const porStatusRaw = Object.keys(STATUS_LABELS).map(key => ({
      name: STATUS_LABELS[key],
      value: requerimentos.filter(s => s.status === key).length,
    }));
    const maxStatus = Math.max(...porStatusRaw.map(d => d.value));
    const porStatus = porStatusRaw.map(d => ({ ...d, color: d.value === maxStatus && maxStatus > 0 ? "#F88D2A" : "#860063" }));

    const CRIT_COLORS = { baixa: "#22c55e", media: "#eab308", alta: "#ef4444" };
    const porCriticidade = Object.keys(CRITICIDADE_CONFIG).map(key => ({
      name: CRITICIDADE_CONFIG[key].label,
      value: requerimentos.filter(s => s.criticidade === key).length,
      color: CRIT_COLORS[key],
    }));

    // Por área (departamento) - todos os registros
    const deptCount = {};
    sugestoes.forEach(s => {
      if (s.departamento) deptCount[s.departamento] = (deptCount[s.departamento] || 0) + 1;
    });
    const maxDept = Math.max(...Object.values(deptCount), 0);
    const porDepartamento = Object.entries(deptCount)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value, color: value === maxDept ? "#F88D2A" : "#860063" }));

    // Por pessoa requerente - todos os registros
    const pessoaCount = {};
    sugestoes.forEach(s => {
      if (s.nome) pessoaCount[s.nome] = (pessoaCount[s.nome] || 0) + 1;
    });
    const maxPessoa = Math.max(...Object.values(pessoaCount), 0);
    const porPessoa = Object.entries(pessoaCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([name, value]) => ({ name, value, color: value === maxPessoa ? "#F88D2A" : "#860063" }));

    return { porStatus, porCriticidade, porDepartamento, porPessoa };
  }, [requerimentos, sugestoes]);

  const filteredSugestoes = sugestoes
    .filter(s => {
      if (showConcluidos) return s.status === "concluido";
      if (s.status === "concluido") return false;
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (tipoFilter !== "all" && s.tipo !== tipoFilter) return false;
      if (criticidadeFilter !== "all" && s.criticidade !== criticidadeFilter) return false;
      return true;
    })
    .sort((a, b) => (a.prioridade ?? Infinity) - (b.prioridade ?? Infinity));

  const totalConcluidos = sugestoes.filter(s => s.status === "concluido").length;
  const porTipo = ["Sugestão", "Ideia", "Requerimento"].map(tipo => ({
    tipo, count: sugestoes.filter(s => s.tipo === tipo).length
  }));

  const handleEdit = (s) => {
    setEditItem(s);
    setEditForm({
      nome: s.nome,
      departamento: s.departamento,
      tipo: s.tipo,
      tipo_requerimento: s.tipo_requerimento || "",
      nome_projeto: s.nome_projeto || "",
      descricao: s.descricao,
      objetivo: s.objetivo || "",
      impacto: s.impacto || "",
      status: s.status || "aguardando",
      prioridade: s.prioridade ?? "",
      prazo_estimado_dias: s.prazo_estimado_dias ?? "",
      criticidade: s.criticidade || "",
      tempo_processo_atual_horas: s.tempo_processo_atual_horas ?? "",
      tempo_novo_fluxo_horas: s.tempo_novo_fluxo_horas ?? "",
    });
  };

  // Quando prazo muda no form, recalcular criticidade automaticamente
  const handlePrazoChange = (value) => {
    const dias = value !== "" ? Number(value) : null;
    const crit = dias ? getCriticidadeFromDias(dias) : (editForm.criticidade || "");
    setEditForm(prev => ({ ...prev, prazo_estimado_dias: value, criticidade: crit || "" }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const dias = editForm.prazo_estimado_dias !== "" && editForm.prazo_estimado_dias != null
        ? Number(editForm.prazo_estimado_dias) : null;
      const crit = dias ? getCriticidadeFromDias(dias) : (editForm.criticidade || null);
      const data = {
        nome: editForm.nome,
        departamento: editForm.departamento,
        tipo: editForm.tipo,
        descricao: editForm.descricao,
        tipo_requerimento: editForm.tipo_requerimento || null,
        nome_projeto: editForm.nome_projeto || null,
        objetivo: editForm.objetivo || null,
        impacto: editForm.impacto || null,
        status: editForm.status,
        prioridade: editForm.prioridade !== "" && editForm.prioridade != null ? Number(editForm.prioridade) : null,
        prazo_estimado_dias: dias,
        criticidade: crit || null,
        tempo_processo_atual_horas: editForm.tempo_processo_atual_horas !== "" && editForm.tempo_processo_atual_horas != null ? Number(editForm.tempo_processo_atual_horas) : null,
        tempo_novo_fluxo_horas: editForm.tempo_novo_fluxo_horas !== "" && editForm.tempo_novo_fluxo_horas != null ? Number(editForm.tempo_novo_fluxo_horas) : null,
      };
      await base44.entities.Sugestao.update(editItem.id, data);
      queryClient.invalidateQueries({ queryKey: ["sugestoes"] });
      setEditItem(null);
      toast.success("✅ Atualizado com sucesso!");
    } catch (error) {
      toast.error("❌ Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir esta submissão?")) return;
    await base44.entities.Sugestao.delete(id);
    queryClient.invalidateQueries({ queryKey: ["sugestoes"] });
    toast.success("🗑️ Excluído!");
  };

  const handlePrioridadeChange = async (id, value) => {
    const num = value === "" ? null : Number(value);
    await base44.entities.Sugestao.update(id, { prioridade: num });
    queryClient.invalidateQueries({ queryKey: ["sugestoes"] });
  };

  const handleAddPrazoChange = (value) => {
    const dias = value !== "" ? Number(value) : null;
    const crit = dias ? getCriticidadeFromDias(dias) : "";
    setAddForm(prev => ({ ...prev, prazo_estimado_dias: value, criticidade: crit || "" }));
  };

  const handleAddSave = async () => {
    if (!addForm.nome || !addForm.departamento || !addForm.descricao) return toast.error("Preencha Nome, Departamento e Descrição.");
    setSaving(true);
    try {
      const dias = addForm.prazo_estimado_dias !== "" ? Number(addForm.prazo_estimado_dias) : null;
      await base44.entities.Sugestao.create({
        nome: addForm.nome,
        departamento: addForm.departamento,
        tipo: addForm.tipo,
        tipo_requerimento: addForm.tipo_requerimento || null,
        nome_projeto: addForm.nome_projeto || null,
        descricao: addForm.descricao,
        objetivo: addForm.objetivo || null,
        impacto: addForm.impacto || null,
        status: "aguardando",
        prioridade: addForm.prioridade !== "" ? Number(addForm.prioridade) : null,
        prazo_estimado_dias: dias,
        criticidade: dias ? getCriticidadeFromDias(dias) : (addForm.criticidade || null),
        tempo_processo_atual_horas: addForm.tempo_processo_atual_horas !== "" ? Number(addForm.tempo_processo_atual_horas) : null,
        tempo_novo_fluxo_horas: addForm.tempo_novo_fluxo_horas !== "" ? Number(addForm.tempo_novo_fluxo_horas) : null,
      });
      queryClient.invalidateQueries({ queryKey: ["sugestoes"] });
      setShowAddForm(false);
      setAddForm({ nome: "", departamento: "", tipo: "Requerimento", tipo_requerimento: "Desenvolvimento", nome_projeto: "", descricao: "", objetivo: "", impacto: "", prioridade: "", prazo_estimado_dias: "", criticidade: "", tempo_processo_atual_horas: "", tempo_novo_fluxo_horas: "" });
      toast.success("✅ Requerimento adicionado!");
    } catch (error) {
      toast.error("❌ Erro ao salvar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkConcluido = async (id) => {
    await base44.entities.Sugestao.update(id, { status: "concluido" });
    queryClient.invalidateQueries({ queryKey: ["sugestoes"] });
    setViewItem(null);
    toast.success("✅ Marcado como concluído!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="relative overflow-hidden shadow-xl">
        <div className="bg-gradient-to-r from-[#860063] via-[#a0007d] to-[#860063] h-[90%] absolute top-0 left-0 right-0" />
        <div className="bg-gradient-to-r from-white via-gray-100 to-white h-[6%] absolute left-0 right-0" style={{ top: '90%' }} />
        <div className="bg-gradient-to-r from-[#F88D2A] via-[#ff9d3d] to-[#F88D2A] h-[4%] absolute bottom-0 left-0 right-0" />
        <div className="relative z-10 max-w-full mx-auto px-4 md:px-6 py-2 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-16 h-12 md:w-20 md:h-14 flex items-center justify-center">
              <img src={OFI_LOGO_URL} alt="OFI Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-base md:text-xl font-black text-white tracking-tight drop-shadow-lg">Central Pulse</h1>
              <p className="text-xs text-white/90 font-medium drop-shadow-md">Hub de Inovação</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("lista")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === "lista" ? "bg-white text-[#860063] shadow" : "bg-white/20 text-white hover:bg-white/30"}`}
              >
                <ClipboardList className="w-3.5 h-3.5" /> Lista
              </button>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${activeTab === "dashboard" ? "bg-white text-[#860063] shadow" : "bg-white/20 text-white hover:bg-white/30"}`}
              >
                <BarChart2 className="w-3.5 h-3.5" /> Dashboard
              </button>
            </div>
            <div className="text-center md:text-right">
              <div className="text-white/90 text-xs drop-shadow-md">{format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}</div>
              <div className="text-lg md:text-xl font-bold text-white font-mono drop-shadow-lg">{format(currentTime, 'HH:mm:ss')}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6">
        {/* ===== DASHBOARD ===== */}
        {activeTab === "dashboard" && (
          <div className="space-y-3">
            {/* Cards rápidos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.keys(STATUS_LABELS).map(key => (
                <Card key={key} className="shadow-sm">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: STATUS_BG_COLORS[key] + "20" }}>
                      <Clock className="w-5 h-5" style={{ color: STATUS_BG_COLORS[key] }} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{requerimentos.filter(s => s.status === key).length}</p>
                      <p className="text-xs text-gray-500">{STATUS_LABELS[key]}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Cards criticidade */}
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(CRITICIDADE_CONFIG).map(([key, cfg]) => (
                <Card key={key} className={`shadow-sm border-2 ${key === 'alta' ? 'border-red-200' : key === 'media' ? 'border-yellow-200' : 'border-green-200'}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${key === 'alta' ? 'bg-red-50' : key === 'media' ? 'bg-yellow-50' : 'bg-green-50'}`}>
                      <AlertTriangle className={`w-5 h-5 ${key === 'alta' ? 'text-red-500' : key === 'media' ? 'text-yellow-500' : 'text-green-500'}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-gray-800">{requerimentos.filter(s => s.criticidade === key).length}</p>
                      <p className="text-xs text-gray-500">Criticidade {cfg.label} <span className="text-gray-400">({cfg.desc})</span></p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card className="shadow-sm">
                <CardHeader className="py-2 px-4 border-b">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#860063]" /> Requerimentos por Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={dashboardData.porStatus} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" name="Qtd" radius={[4, 4, 0, 0]} label={{ position: "top", fontSize: 13, fontWeight: "bold", fill: "#374151" }}>
                        {dashboardData.porStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="py-2 px-4 border-b">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#F88D2A]" /> Requerimentos por Criticidade
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 flex items-center justify-center">
                  {dashboardData.porCriticidade.every(d => d.value === 0) ? (
                    <p className="text-center text-gray-400 text-xs py-8">Nenhum dado disponível.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={dashboardData.porCriticidade.filter(d => d.value > 0)}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="45%"
                          outerRadius={70}
                          labelLine={false}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, value, name, percent }) => {
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={11} fontWeight="bold">
                                <tspan x={x} dy="-6">{name}</tspan>
                                <tspan x={x} dy="14">{value} ({(percent * 100).toFixed(0)}%)</tspan>
                              </text>
                            );
                          }}
                        >
                          {dashboardData.porCriticidade.filter(d => d.value > 0).map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [value, name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Gráficos por Área e por Pessoa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Card className="shadow-sm">
                <CardHeader className="py-2 px-4 border-b">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-[#860063]" /> Submissões por Área Requisitante
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  {dashboardData.porDepartamento.length === 0 ? (
                    <p className="text-center text-gray-400 text-xs py-8">Nenhum dado disponível.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(200, dashboardData.porDepartamento.length * 36)}>
                      <BarChart data={dashboardData.porDepartamento} layout="vertical" margin={{ left: 8, right: 32 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                        <Tooltip />
                        <Bar dataKey="value" name="Qtd" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 12, fontWeight: "bold", fill: "#374151" }}>
                          {dashboardData.porDepartamento.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="py-2 px-4 border-b">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-[#860063]" /> Submissões por Pessoa Requerente
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3">
                  {dashboardData.porPessoa.length === 0 ? (
                    <p className="text-center text-gray-400 text-xs py-8">Nenhum dado disponível.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={Math.max(200, dashboardData.porPessoa.length * 36)}>
                      <BarChart data={dashboardData.porPessoa} layout="vertical" margin={{ left: 8, right: 32 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={110} />
                        <Tooltip />
                        <Bar dataKey="value" name="Qtd" radius={[0, 4, 4, 0]} label={{ position: "right", fontSize: 12, fontWeight: "bold", fill: "#374151" }}>
                          {dashboardData.porPessoa.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Lista compacta de requerimentos */}
            <Card className="shadow-sm">
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#860063]" /> Todos os Requerimentos
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {requerimentos.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-8">Nenhum requerimento cadastrado.</p>
                ) : (
                  <div className="divide-y">
                    {requerimentos.sort((a, b) => (a.prioridade ?? Infinity) - (b.prioridade ?? Infinity)).map(s => (
                      <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer" onClick={() => setViewItem(s)}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            {s.tipo_requerimento && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F88D2A] text-white">
                                {s.tipo_requerimento}
                              </span>
                            )}
                            <span className="text-sm font-semibold text-gray-800 truncate">{s.nome}</span>
                            {s.nome_projeto && (
                              <span className="text-xs text-gray-500 italic truncate">· {s.nome_projeto}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {s.prazo_estimado_dias && (
                            <span className="text-xs text-gray-500 font-medium">{s.prazo_estimado_dias}d</span>
                          )}
                          {s.prioridade && (
                            <span className="text-xs font-bold text-[#860063]">#{String(s.prioridade).padStart(2,"0")}</span>
                          )}
                          {s.criticidade && (
                            <Badge className={`border text-[10px] px-1.5 py-0 ${CRITICIDADE_CONFIG[s.criticidade]?.color}`}>
                              {CRITICIDADE_CONFIG[s.criticidade]?.label}
                            </Badge>
                          )}
                          <Badge className={`border text-[10px] px-1.5 py-0 ${STATUS_COLORS[s.status] || ""}`}>
                            {STATUS_LABELS[s.status] || s.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ===== LISTA ===== */}
        {activeTab === "lista" && (
          <>
            {/* Cards quantitativos */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {porTipo.map(({ tipo, count }) => {
                const Icon = TIPO_ICONS[tipo];
                const color = TIPO_COLORS[tipo];
                return (
                  <Card key={tipo} className="shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gray-50 border flex items-center justify-center">
                        <Icon className={`w-5 h-5 ${color}`} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-800">{count}</p>
                        <p className="text-xs text-gray-500">{tipo}s</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              <Card className="shadow-sm border border-gray-300">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gray-100 border flex items-center justify-center">
                    <CheckCircle2 className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-700">{totalConcluidos}</p>
                    <p className="text-xs text-gray-500">Concluídos</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Botão Adicionar */}
            {isManager && (
              <div className="flex justify-end mb-4">
                <Button onClick={() => {
                  const usedPriorities = new Set(sugestoes.map(s => s.prioridade).filter(p => p != null));
                  let next = 1;
                  while (usedPriorities.has(next)) next++;
                  setAddForm(p => ({ ...p, prioridade: String(next) }));
                  setShowAddForm(true);
                }} className="bg-[#860063] hover:bg-[#6b004f] text-white gap-2">
                  <Plus className="w-4 h-4" /> Adicionar Requerimento
                </Button>
              </div>
            )}

            {/* Filtros */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <select
                value={tipoFilter}
                onChange={e => setTipoFilter(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#860063]"
              >
                <option value="all">Todos os tipos</option>
                <option value="Sugestão">Sugestão</option>
                <option value="Ideia">Ideia</option>
                <option value="Requerimento">Requerimento</option>
              </select>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#860063]"
                disabled={showConcluidos}
              >
                <option value="all">Todos os status</option>
                <option value="aguardando">Aguardando</option>
                <option value="em_analise">Em Análise</option>
                <option value="em_execucao">Em Execução</option>
              </select>
              <select
                value={criticidadeFilter}
                onChange={e => setCriticidadeFilter(e.target.value)}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#860063]"
              >
                <option value="all">Todas as criticidades</option>
                <option value="baixa">Baixa (até 15d)</option>
                <option value="media">Média (15–30d)</option>
                <option value="alta">Alta (&gt;30d)</option>
              </select>
              <button
                onClick={() => setShowConcluidos(!showConcluidos)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${showConcluidos ? "bg-gray-700 text-white border-gray-700" : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"}`}
              >
                {showConcluidos ? "✓ Exibindo Concluídos" : "Exibir Concluídos"}
              </button>
              <span className="ml-auto text-xs text-gray-400">{filteredSugestoes.length} registros</span>
            </div>

            {/* Lista */}
            <div className="space-y-3">
              {filteredSugestoes.length === 0 && (
                <Card className="shadow-sm border-dashed border-2 border-gray-200">
                  <CardContent className="p-8 text-center text-gray-400">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhuma submissão encontrada.</p>
                  </CardContent>
                </Card>
              )}
              {filteredSugestoes.map((s) => {
                const Icon = TIPO_ICONS[s.tipo] || MessageSquare;
                const color = TIPO_COLORS[s.tipo] || "text-gray-500";
                const critCfg = s.criticidade ? CRITICIDADE_CONFIG[s.criticidade] : null;
                return (
                  <Card key={s.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewItem(s)}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-gray-50 border flex items-center justify-center shrink-0 mt-0.5">
                          <Icon className={`w-4 h-4 ${color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {s.tipo_requerimento && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#860063] text-white shrink-0">
                                {s.tipo_requerimento}
                              </span>
                            )}
                            <span className="font-semibold text-gray-800 text-sm">{s.nome}</span>
                            {s.nome_projeto && (
                              <span className="text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">{s.nome_projeto}</span>
                            )}
                            <span className="text-xs text-gray-400">·</span>
                            <span className="text-xs text-gray-500">{s.departamento}</span>
                            <div className="ml-auto flex items-center gap-2 flex-wrap" onClick={e => e.stopPropagation()}>
                              {critCfg && (
                                <Badge className={`border text-[10px] px-1.5 py-0 ${critCfg.color}`}>
                                  {critCfg.label}
                                </Badge>
                              )}
                              {s.prazo_estimado_dias && (
                                <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5">
                                  <Clock className="w-3 h-3" />{s.prazo_estimado_dias}d
                                </span>
                              )}
                              <Badge className={`border text-[10px] px-1.5 py-0 ${STATUS_COLORS[s.status] || ""}`}>
                                {STATUS_LABELS[s.status] || s.status}
                              </Badge>
                              {isManager && (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-gray-400 font-medium">Prio.</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={s.prioridade ?? ""}
                                    onChange={e => handlePrioridadeChange(s.id, e.target.value)}
                                    onClick={e => e.stopPropagation()}
                                    placeholder="—"
                                    className="w-12 h-6 text-xs text-center border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#860063] font-bold text-[#860063]"
                                  />
                                </div>
                              )}
                              {s.prioridade && !isManager && (
                                <span className="text-xs font-bold text-[#860063] bg-[#860063]/10 px-2 py-0.5 rounded-md">
                                  #{String(s.prioridade).padStart(2, "0")}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-xs font-medium text-[#860063] mb-1.5">{s.tipo}</p>
                          {s.objetivo && (
                            <div className="flex items-start gap-1.5 mb-1">
                              <Target className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-gray-700 leading-relaxed line-clamp-1">
                                <span className="font-semibold text-gray-600">Objetivo:</span> {s.objetivo}
                              </p>
                            </div>
                          )}
                          {s.impacto && (
                            <div className="flex items-start gap-1.5 mb-1">
                              <Zap className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                              <p className="text-xs text-gray-700 leading-relaxed line-clamp-1">
                                <span className="font-semibold text-gray-600">Impacto:</span> {s.impacto}
                              </p>
                            </div>
                          )}
                          <p className="text-[10px] text-gray-400 mt-1.5">
                            {s.created_date ? new Date(s.created_date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                          </p>
                        </div>
                        {isManager && (
                          <div className="flex flex-col gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                            <button onClick={() => handleEdit(s)} className="p-1.5 rounded-lg text-gray-400 hover:text-[#860063] hover:bg-[#860063]/10 transition-colors" title="Editar">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDelete(s.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Excluir">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewItem && (() => { const Icon = TIPO_ICONS[viewItem.tipo] || MessageSquare; const color = TIPO_COLORS[viewItem.tipo] || 'text-gray-500'; return <Icon className={`w-5 h-5 ${color}`} />; })()}
              <span className="text-gray-800">{viewItem?.tipo}</span>
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-gray-800">{viewItem.nome}</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-sm text-gray-500">{viewItem.departamento}</span>
                <Badge className={`ml-auto border text-xs px-2 py-0.5 ${STATUS_COLORS[viewItem.status] || ""}`}>
                  {STATUS_LABELS[viewItem.status] || viewItem.status}
                </Badge>
              </div>

              {/* Criticidade e Prazo */}
              {viewItem.tipo === "Requerimento" && (viewItem.criticidade || viewItem.prazo_estimado_dias) && (
                <div className="flex items-center gap-3 flex-wrap">
                  {viewItem.prazo_estimado_dias && (
                    <div className="flex items-center gap-1.5 bg-gray-50 border rounded-lg px-3 py-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-700">Prazo: {viewItem.prazo_estimado_dias} dias</span>
                    </div>
                  )}
                  {viewItem.criticidade && (
                    <Badge className={`border text-sm px-3 py-1 ${CRITICIDADE_CONFIG[viewItem.criticidade]?.color}`}>
                      Criticidade {CRITICIDADE_CONFIG[viewItem.criticidade]?.label} — {CRITICIDADE_CONFIG[viewItem.criticidade]?.desc}
                    </Badge>
                  )}
                </div>
              )}

              {/* Tempo ao ano */}
              {(viewItem.tempo_processo_atual_horas || viewItem.tempo_novo_fluxo_horas) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">⏱️ Tempo ao Ano</p>
                  <div className="flex items-center gap-4 flex-wrap">
                    {viewItem.tempo_processo_atual_horas && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Processo Atual</p>
                        <p className="text-lg font-bold text-red-600">{viewItem.tempo_processo_atual_horas}h</p>
                      </div>
                    )}
                    {viewItem.tempo_processo_atual_horas && viewItem.tempo_novo_fluxo_horas && (
                      <div className="text-gray-400 text-xl font-light">→</div>
                    )}
                    {viewItem.tempo_novo_fluxo_horas && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Novo Fluxo</p>
                        <p className="text-lg font-bold text-green-600">{viewItem.tempo_novo_fluxo_horas}h</p>
                      </div>
                    )}
                    {viewItem.tempo_processo_atual_horas && viewItem.tempo_novo_fluxo_horas && (
                      <div className="text-center ml-2 bg-white border border-blue-300 rounded-lg px-3 py-1">
                        <p className="text-xs text-gray-500">Economia</p>
                        <p className="text-lg font-bold text-blue-700">{Math.max(0, viewItem.tempo_processo_atual_horas - viewItem.tempo_novo_fluxo_horas).toFixed(1)}h/ano</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(viewItem.objetivo || viewItem.impacto) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {viewItem.objetivo && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex flex-col">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Target className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Objetivo</span>
                      </div>
                      <div className="overflow-y-auto max-h-32">
                        <p className="text-sm text-blue-900 leading-relaxed">{viewItem.objetivo}</p>
                      </div>
                    </div>
                  )}
                  {viewItem.impacto && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex flex-col">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Zap className="w-3.5 h-3.5 text-orange-600" />
                        <span className="text-xs font-bold text-orange-700 uppercase tracking-wide">Impacto / Benefícios</span>
                      </div>
                      <div className="overflow-y-auto max-h-32">
                        <p className="text-sm text-orange-900 leading-relaxed">{viewItem.impacto}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Descrição</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-[40vh] overflow-y-auto">
                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{viewItem.descricao}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {viewItem.created_date ? new Date(viewItem.created_date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
                {viewItem.status !== "concluido" && isManager && (
                  <Button size="sm" onClick={() => handleMarkConcluido(viewItem.id)} className="bg-gray-700 hover:bg-gray-800 text-white text-xs">
                    ✓ Marcar como Concluído
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Dialog */}
      <Dialog open={showAddForm} onOpenChange={setShowAddForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#860063]">
              <Plus className="w-4 h-4" /> Novo Requerimento
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Prioridade</Label>
              <Input type="number" min="1" value={addForm.prioridade} onChange={e => setAddForm(p => ({ ...p, prioridade: e.target.value }))} placeholder="Ex: 1, 2, 3..." />
              <p className="text-[10px] text-gray-400">Número sugerido automaticamente — sem repetição.</p>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Nome *</Label>
              <Input value={addForm.nome} onChange={e => setAddForm(p => ({ ...p, nome: e.target.value }))} placeholder="Seu nome" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Departamento *</Label>
              <Select value={addForm.departamento} onValueChange={v => setAddForm(p => ({ ...p, departamento: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{DEPARTAMENTOS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-3">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">Detalhes do Requerimento</p>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Natureza</Label>
                <div className="grid grid-cols-2 gap-2">
                  {["Melhoria", "Desenvolvimento"].map(opt => (
                    <button key={opt} type="button" onClick={() => setAddForm(p => ({ ...p, tipo_requerimento: opt }))}
                      className={`py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all ${addForm.tipo_requerimento === opt ? "bg-[#860063] border-[#860063] text-white" : "border-gray-200 text-gray-500 hover:border-purple-300"}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold">Nome do Projeto</Label>
                <Input value={addForm.nome_projeto} onChange={e => setAddForm(p => ({ ...p, nome_projeto: e.target.value }))} placeholder="Ex: Automação de Relatórios" />
              </div>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-3">
              <p className="text-xs font-bold text-purple-700 uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Prazo & Criticidade
              </p>
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-gray-500" /> Prazo Estimado (dias)</Label>
                <Input type="number" min="1" value={addForm.prazo_estimado_dias} onChange={e => handleAddPrazoChange(e.target.value)} placeholder="Ex: 10, 25, 45..." />
                <p className="text-[10px] text-gray-400">A criticidade será calculada automaticamente pelo prazo.</p>
              </div>
              <div className="flex gap-2">
                {Object.entries(CRITICIDADE_CONFIG).map(([key, cfg]) => (
                  <button key={key} type="button" onClick={() => setAddForm(p => ({ ...p, criticidade: key }))}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-lg border-2 transition-colors ${addForm.criticidade === key ? cfg.color + ' border-current' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}>
                    {cfg.label}<br /><span className="font-normal text-[10px]">{cfg.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">⏱️ Tempo ao Ano</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-700">Processo Atual (h/ano)</Label>
                  <Input type="number" min="0" step="0.5" value={addForm.tempo_processo_atual_horas} onChange={e => setAddForm(p => ({ ...p, tempo_processo_atual_horas: e.target.value }))} placeholder="Ex: 120" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-700">Novo Fluxo (h/ano)</Label>
                  <Input type="number" min="0" step="0.5" value={addForm.tempo_novo_fluxo_horas} onChange={e => setAddForm(p => ({ ...p, tempo_novo_fluxo_horas: e.target.value }))} placeholder="Ex: 20" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-blue-500" /> Objetivo</Label>
              <Textarea value={addForm.objetivo} onChange={e => setAddForm(p => ({ ...p, objetivo: e.target.value }))} rows={2} className="resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-orange-500" /> Impacto / Benefícios</Label>
              <Textarea value={addForm.impacto} onChange={e => setAddForm(p => ({ ...p, impacto: e.target.value }))} rows={2} className="resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Descrição *</Label>
              <Textarea value={addForm.descricao} onChange={e => setAddForm(p => ({ ...p, descricao: e.target.value }))} rows={4} className="resize-none" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddForm(false)}>Cancelar</Button>
              <Button disabled={saving} onClick={handleAddSave} className="flex-1 bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824] text-white">
                {saving ? "Salvando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#860063]">
              <Pencil className="w-4 h-4" /> Editar Submissão
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Nome</Label>
              <Input value={editForm.nome || ""} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Departamento</Label>
              <Select value={editForm.departamento} onValueChange={v => setEditForm({ ...editForm, departamento: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DEPARTAMENTOS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Tipo</Label>
              <Select value={editForm.tipo} onValueChange={v => setEditForm({ ...editForm, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sugestão">Sugestão</SelectItem>
                  <SelectItem value="Ideia">Ideia</SelectItem>
                  <SelectItem value="Requerimento">Requerimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Natureza + Nome do Projeto — apenas Requerimento */}
            {editForm.tipo === "Requerimento" && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-3">
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">Detalhes do Requerimento</p>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Natureza</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {["Melhoria", "Desenvolvimento"].map(opt => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, tipo_requerimento: opt }))}
                        className={`py-2 px-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                          editForm.tipo_requerimento === opt
                            ? "bg-[#860063] border-[#860063] text-white"
                            : "border-gray-200 text-gray-500 hover:border-purple-300"
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Nome do Projeto</Label>
                  <Input
                    value={editForm.nome_projeto || ""}
                    onChange={e => setEditForm({ ...editForm, nome_projeto: e.target.value })}
                    placeholder="Ex: Automação de Relatórios"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aguardando">Aguardando</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="em_execucao">Em Execução</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Prioridade</Label>
              <Input type="number" min="1" value={editForm.prioridade ?? ""} onChange={e => setEditForm({ ...editForm, prioridade: e.target.value })} placeholder="Ex: 1, 2, 3..." />
            </div>

            {/* Prazo e Criticidade - apenas Requerimentos */}
            {editForm.tipo === "Requerimento" && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-3">
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wide flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Prazo & Criticidade
                </p>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-500" /> Prazo Estimado (dias)
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={editForm.prazo_estimado_dias ?? ""}
                    onChange={e => handlePrazoChange(e.target.value)}
                    placeholder="Ex: 10, 25, 45..."
                  />
                  <p className="text-[10px] text-gray-400">A criticidade será calculada automaticamente pelo prazo.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-semibold">Criticidade</Label>
                  <div className="flex gap-2">
                    {Object.entries(CRITICIDADE_CONFIG).map(([key, cfg]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setEditForm(prev => ({ ...prev, criticidade: key }))}
                        className={`flex-1 py-1.5 text-xs font-bold rounded-lg border-2 transition-colors ${editForm.criticidade === key ? cfg.color + ' border-current' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                      >
                        {cfg.label}<br /><span className="font-normal text-[10px]">{cfg.desc}</span>
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-gray-400">Você pode substituir manualmente se necessário.</p>
                </div>
              </div>
            )}

            {/* Tempo processo atual / novo fluxo */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-3">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
                ⏱️ Tempo ao Ano
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-700">Processo Atual (h/ano)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={editForm.tempo_processo_atual_horas ?? ""}
                    onChange={e => setEditForm({ ...editForm, tempo_processo_atual_horas: e.target.value })}
                    placeholder="Ex: 120"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold text-gray-700">Novo Fluxo (h/ano)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={editForm.tempo_novo_fluxo_horas ?? ""}
                    onChange={e => setEditForm({ ...editForm, tempo_novo_fluxo_horas: e.target.value })}
                    placeholder="Ex: 20"
                  />
                </div>
              </div>
              {editForm.tempo_processo_atual_horas && editForm.tempo_novo_fluxo_horas && (
                <p className="text-xs text-blue-800 font-semibold">
                  💡 Economia estimada: {Math.max(0, Number(editForm.tempo_processo_atual_horas) - Number(editForm.tempo_novo_fluxo_horas)).toFixed(1)} h/ano
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-blue-500" /> Objetivo</Label>
              <Textarea value={editForm.objetivo || ""} onChange={e => setEditForm({ ...editForm, objetivo: e.target.value })} rows={2} className="resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-orange-500" /> Impacto / Benefícios</Label>
              <Textarea value={editForm.impacto || ""} onChange={e => setEditForm({ ...editForm, impacto: e.target.value })} rows={2} className="resize-none" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Descrição</Label>
              <Textarea value={editForm.descricao || ""} onChange={e => setEditForm({ ...editForm, descricao: e.target.value })} rows={4} className="resize-none" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditItem(null)}>Cancelar</Button>
              <Button disabled={saving} onClick={handleSave} className="flex-1 bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824] text-white">
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}