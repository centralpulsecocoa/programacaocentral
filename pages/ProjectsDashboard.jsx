import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, TrendingUp, CheckCircle2, AlertTriangle, DollarSign, Search } from "lucide-react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const STATUS_COLORS = {
  "Não Iniciado": "#9ca3af",
  "Em Andamento": "#3b82f6",
  "Pausado":      "#eab308",
  "Concluído":    "#22c55e",
  "Cancelado":    "#ef4444",
};

const PRIORITY_COLORS = {
  "Baixa": "#60a5fa", "Média": "#facc15", "Alta": "#f97316", "Crítica": "#ef4444"
};

export default function ProjectsDashboardPage() {
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAnoBudget, setFilterAnoBudget] = useState("all");
  const [filterArea, setFilterArea] = useState("all");
  const [search, setSearch] = useState("");

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
  });

  const anosDisponiveis = useMemo(() => {
    return [...new Set(projects.map(p => p.ano_budget).filter(Boolean))].sort((a, b) => b - a);
  }, [projects]);

  const areasDisponiveis = useMemo(() => {
    return [...new Set(projects.map(p => p.area).filter(Boolean))].sort();
  }, [projects]);

  const stats = useMemo(() => {
    const subprojectIds = new Set(projects.filter(p => p.tipo === "Subprojeto" && p.projeto_pai_id).map(p => p.projeto_pai_id));
    const allCountable = projects.filter(p => !(p.tipo === "Macro" && subprojectIds.has(p.id)));

    // Apply filters
    const countable = allCountable.filter(p => {
      const matchSearch = !search || p.projeto?.toLowerCase().includes(search.toLowerCase()) || p.responsavel?.toLowerCase().includes(search.toLowerCase()) || p.area?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || p.status === filterStatus;
      const matchPriority = filterPriority === "all" || p.prioridade === filterPriority;
      const matchAno = filterAnoBudget === "all" || String(p.ano_budget || "") === filterAnoBudget;
      const matchArea = filterArea === "all" || p.area === filterArea;
      return matchSearch && matchStatus && matchPriority && matchAno && matchArea;
    });

    const byStatus = Object.keys(STATUS_COLORS).map(s => ({
      name: s, value: countable.filter(p => p.status === s).length, color: STATUS_COLORS[s]
    })).filter(s => s.value > 0);

    const byPriority = ["Baixa", "Média", "Alta", "Crítica"].map(p => ({
      name: p, value: countable.filter(pr => pr.prioridade === p).length, color: PRIORITY_COLORS[p]
    })).filter(p => p.value > 0);

    const byArea = Object.entries(
      countable.reduce((acc, p) => { const a = p.area || "Sem Área"; acc[a] = (acc[a] || 0) + 1; return acc; }, {})
    ).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);

    const budgetData = countable
      .filter(p => p.valor_previsto)
      .map(p => ({ name: p.projeto?.slice(0, 20), previsto: p.valor_previsto || 0, gasto: p.valor_gasto || 0 }))
      .sort((a, b) => b.previsto - a.previsto)
      .slice(0, 8);

    const orcamentoTotal = countable.reduce((s, p) => s + (p.valor_previsto || 0), 0);
    const gastoTotal = countable.reduce((s, p) => s + (p.valor_gasto || 0), 0);
    const saldo = orcamentoTotal - gastoTotal;

    // Progresso médio: concluídos / total de projetos contabilizáveis
    const concluidos = countable.filter(p => p.status === "Concluído").length;
    const progressoMedio = countable.length ? Math.round((concluidos / countable.length) * 100) : 0;

    const atrasados = countable.filter(p => {
      if (!p.data_fim_planejada || p.status === "Concluído" || p.status === "Cancelado") return false;
      return new Date(p.data_fim_planejada) < new Date();
    });

    return { byStatus, byPriority, byArea, budgetData, orcamentoTotal, gastoTotal, saldo, progressoMedio, atrasados, total: countable.length };
  }, [projects, filterStatus, filterPriority, filterAnoBudget, filterArea, search]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#860063]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 md:p-5">
      <div className="max-w-7xl mx-auto space-y-3">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="flex items-center gap-3">
            <Link to={createPageUrl("Projects")}>
              <Button variant="outline" size="sm"><ArrowLeft className="w-4 h-4 mr-1" /> Voltar</Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard de Projetos</h1>
              <p className="text-gray-500 text-sm mt-0.5">Visão geral e análise dos projetos</p>
            </div>
          </div>
          {/* Filters */}
          <Card>
            <CardContent className="p-3">
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input className="pl-9 h-9" placeholder="Buscar projeto..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    {Object.keys(STATUS_COLORS).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Prioridade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {["Baixa", "Média", "Alta", "Crítica"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterAnoBudget} onValueChange={setFilterAnoBudget}>
                  <SelectTrigger className="w-44 h-9"><SelectValue placeholder="Ano Budget" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Anos</SelectItem>
                    {anosDisponiveis.map(ano => (
                      <SelectItem key={ano} value={String(ano)}>
                        {ano <= 2025 ? `📦 Histórico ${ano}` : `🟢 ${ano}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterArea} onValueChange={setFilterArea}>
                  <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Área" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Áreas</SelectItem>
                    {areasDisponiveis.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Total de Projetos", value: stats.total, icon: TrendingUp, color: "from-[#860063] to-[#F88D2A]", text: "text-white" },
            { label: "Progresso Médio", value: `${stats.progressoMedio}%`, icon: CheckCircle2, color: "from-blue-500 to-blue-700", text: "text-white" },
            { label: "Projetos Atrasados", value: stats.atrasados.length, icon: AlertTriangle, color: "from-red-500 to-red-700", text: "text-white" },
            { label: "Saldo Orçamentário", value: fmt(stats.saldo), icon: DollarSign, color: stats.saldo >= 0 ? "from-green-500 to-green-700" : "from-red-500 to-red-700", text: "text-white", small: true },
          ].map((k, i) => (
            <motion.div key={k.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
              <Card className="overflow-hidden">
                <div className={`bg-gradient-to-r ${k.color} p-3`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-xs mb-1">{k.label}</p>
                      <p className={`font-bold ${k.text} ${k.small ? "text-lg" : "text-3xl"}`}>{k.value}</p>
                    </div>
                    <k.icon className="w-8 h-8 text-white/40" />
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Budget summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: "Orçamento Total", value: fmt(stats.orcamentoTotal), bg: "bg-blue-50 border-blue-200", text: "text-blue-800" },
            { label: "Total Gasto", value: fmt(stats.gastoTotal), bg: "bg-orange-50 border-orange-200", text: "text-orange-800" },
            { label: "Saldo Restante", value: fmt(stats.saldo), bg: stats.saldo >= 0 ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200", text: stats.saldo >= 0 ? "text-green-800" : "text-red-800" },
          ].map(b => (
            <Card key={b.label} className={`border ${b.bg}`}>
              <CardContent className="p-3 text-center">
                <p className={`text-xs font-medium mb-1 ${b.text}`}>{b.label}</p>
                <p className={`text-xl font-bold ${b.text}`}>{b.value}</p>
                {stats.orcamentoTotal > 0 && b.label === "Total Gasto" && (
                  <div className="mt-2">
                    <div className="w-full bg-white rounded-full h-2">
                      <div className={`h-2 rounded-full ${stats.gastoTotal > stats.orcamentoTotal ? 'bg-red-500' : 'bg-orange-500'}`}
                        style={{ width: `${Math.min(100, stats.gastoTotal / stats.orcamentoTotal * 100)}%` }} />
                    </div>
                    <p className="text-xs text-orange-600 mt-1">{Math.round(stats.gastoTotal / stats.orcamentoTotal * 100)}% do orçamento</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Status Pie */}
          <Card>
            <CardHeader><CardTitle className="text-sm text-gray-700">Projetos por Status</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={stats.byStatus} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {stats.byStatus.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {stats.byStatus.map(s => (
                  <span key={s.name} className="flex items-center gap-1 text-xs text-gray-600">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: s.color }} />
                    {s.name} ({s.value})
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Priority Pie */}
          <Card>
            <CardHeader><CardTitle className="text-sm text-gray-700">Projetos por Prioridade</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={stats.byPriority} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {stats.byPriority.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {stats.byPriority.map(p => (
                  <span key={p.name} className="flex items-center gap-1 text-xs text-gray-600">
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: p.color }} />
                    {p.name} ({p.value})
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* By Area */}
          <Card>
            <CardHeader><CardTitle className="text-sm text-gray-700">Projetos por Área</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.byArea} layout="vertical" margin={{ left: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#860063" radius={[0, 4, 4, 0]} name="Projetos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Budget per project */}
          <Card>
            <CardHeader><CardTitle className="text-sm text-gray-700">Orçamento vs Gasto por Projeto</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.budgetData} margin={{ left: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend />
                  <Bar dataKey="previsto" fill="#860063" name="Previsto" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gasto" fill="#F88D2A" name="Gasto" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Atrasados */}
        {stats.atrasados.length > 0 && (
          <Card className="border-red-200">
            <CardHeader><CardTitle className="text-sm text-red-700 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Projetos Atrasados ({stats.atrasados.length})</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.atrasados.map(p => {
                  const diasAtraso = Math.floor((new Date() - new Date(p.data_fim_planejada)) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={p.id} className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                      <div>
                        <p className="font-semibold text-sm text-gray-800">{p.projeto}</p>
                        <p className="text-xs text-gray-500">{p.responsavel} · {p.area}</p>
                      </div>
                      <div className="text-right">
                        <Badge className="bg-red-100 text-red-700 text-xs">{diasAtraso} dias de atraso</Badge>
                        <p className="text-xs text-gray-400 mt-0.5">Previsto: {new Date(p.data_fim_planejada).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}