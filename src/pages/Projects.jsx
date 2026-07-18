import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, DollarSign, Search, TrendingUp, CheckCircle2, Clock, AlertTriangle, XCircle, PauseCircle, LayoutDashboard, ChevronDown, ChevronRight, GitBranch, Layers } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ProjectForm from "@/components/projects/ProjectForm";
import ProjectExpenseDialog from "@/components/projects/ProjectExpenseDialog";

const STATUS_CONFIG = {
  "Não Iniciado": { color: "bg-gray-100 text-gray-700", icon: Clock },
  "Em Andamento": { color: "bg-blue-100 text-blue-700", icon: TrendingUp },
  "Pausado":      { color: "bg-yellow-100 text-yellow-700", icon: PauseCircle },
  "Concluído":    { color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  "Cancelado":    { color: "bg-red-100 text-red-700", icon: XCircle },
};

const PRIORITY_CONFIG = {
  "Baixa":   "bg-blue-100 text-blue-700",
  "Média":   "bg-yellow-100 text-yellow-700",
  "Alta":    "bg-orange-100 text-orange-700",
  "Crítica": "bg-red-100 text-red-700",
};

const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

function ProjectRow({ p, isMacro, isSubprojeto, isNested, subCount, isExpanded, onToggle, onEdit, onExpense, parentName, subprojects }) {
  const StatusIcon = STATUS_CONFIG[p.status]?.icon || Clock;

  // Para projetos Macro, orçamento é a soma dos subprojetos
  const valorPrevisto = isMacro && subprojects?.length > 0
    ? subprojects.reduce((s, sub) => s + (sub.valor_previsto || 0), 0)
    : (p.valor_previsto || 0);
  const valorGasto = isMacro && subprojects?.length > 0
    ? subprojects.reduce((s, sub) => s + (sub.valor_gasto || 0), 0)
    : (p.valor_gasto || 0);
  const progresso = p.status === "Concluído" ? 100
    : isMacro && subprojects?.length > 0
    ? Math.round(subprojects.reduce((s, sub) => s + (sub.progresso || 0), 0) / subprojects.length)
    : (p.progresso || 0);

  const pct = valorPrevisto ? Math.min(100, Math.round(valorGasto / valorPrevisto * 100)) : 0;
  const overBudget = valorGasto > valorPrevisto && valorPrevisto > 0;

  const isAtrasado = p.data_fim_planejada && p.status !== "Concluído" && p.status !== "Cancelado" && new Date(p.data_fim_planejada) < new Date();

  const rowBg = isNested
    ? "bg-slate-50/80"
    : p.status === "Concluído"
    ? "bg-green-50"
    : isAtrasado
    ? "bg-red-50/60"
    : p.status === "Em Andamento"
    ? "bg-blue-50"
    : isMacro
    ? "bg-purple-50"
    : "";

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`hover:brightness-95 transition-colors ${rowBg} ${isMacro ? "border-l-4 border-l-purple-400" : isNested ? "border-l-4 border-l-purple-200 opacity-90" : ""}`}
    >
      <td className="px-3 py-2">
        <span className="text-xs font-mono text-gray-400">#{p.id?.slice(-6).toUpperCase()}</span>
        {(p.filial || p.numero_projeto) && (
          <p className="text-xs"><span className="text-gray-500">{p.filial}</span>{p.filial && p.numero_projeto && " - "}<span className={`font-bold ${!isNested ? "text-red-600" : "text-gray-500"}`}>{p.numero_projeto}</span></p>
        )}
      </td>
      <td className="px-3 py-2">
        <div className={`flex items-start gap-2 ${isNested ? "pl-5" : ""}`}>
          {isNested && <GitBranch className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />}
          {isMacro && (
            <button onClick={onToggle} className="mt-0.5 shrink-0 text-purple-600 hover:text-purple-800">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              {isMacro && <span className="inline-flex items-center gap-0.5 text-[10px] bg-purple-100 text-purple-700 font-semibold px-1.5 py-0.5 rounded"><Layers className="w-2.5 h-2.5" /> MACRO</span>}
              <p className="font-semibold text-gray-900 text-sm">{p.projeto}</p>
            </div>
            {isMacro && subCount > 0 && <p className="text-[10px] text-purple-500 mt-0.5">{subCount} subprojeto{subCount > 1 ? "s" : ""}</p>}
            {isSubprojeto && parentName && <p className="text-[10px] text-blue-500 mt-0.5">↑ {parentName}</p>}
            {p.descricao && <p className="text-xs text-gray-400 truncate max-w-[200px]">{p.descricao}</p>}
          </div>
        </div>
      </td>
      <td className="px-3 py-2">
        <p className="text-sm text-gray-700">{p.area || "—"}</p>
        <p className="text-xs text-gray-500">{p.responsavel}</p>
      </td>
      <td className="px-3 py-2">
        <Badge className={`text-xs ${PRIORITY_CONFIG[p.prioridade]}`}>{p.prioridade || "—"}</Badge>
      </td>
      <td className="px-3 py-2 min-w-[140px]">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">{fmt(valorGasto)}</span>
            <span className="text-gray-400">/ {fmt(valorPrevisto)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${overBudget ? "bg-red-500" : "bg-[#860063]"}`} style={{ width: `${Math.min(100, pct)}%` }} />
          </div>
          {isMacro && subprojects?.length > 0 && <p className="text-[10px] text-purple-500">∑ consolidado</p>}
          {overBudget && <p className="text-[10px] text-red-600 font-semibold">⚠️ Acima do orçamento</p>}
        </div>
      </td>
      <td className="px-3 py-2 min-w-[120px]">
        <div className="space-y-1">
          <span className="text-xs text-gray-600">{progresso}%</span>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${progresso >= 100 ? "bg-green-500" : "bg-[#F88D2A]"}`} style={{ width: `${progresso}%` }} />
          </div>
          {isMacro && subprojects?.length > 0 && <p className="text-[10px] text-purple-500">média</p>}
        </div>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <p className="text-xs text-gray-700">{p.data_inicio_planejada ? new Date(p.data_inicio_planejada).toLocaleDateString("pt-BR") : "—"}</p>
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <p className={`text-xs font-medium ${isAtrasado ? "text-red-600" : "text-gray-700"}`}>
          {p.data_fim_planejada ? new Date(p.data_fim_planejada).toLocaleDateString("pt-BR") : "—"}
          {isAtrasado && <span className="block text-[10px] text-red-500">atrasado</span>}
        </p>
      </td>
      <td className="px-3 py-2">
        <Badge className={`text-xs flex items-center gap-1 w-fit ${STATUS_CONFIG[p.status]?.color}`}>
          <StatusIcon className="w-3 h-3" />
          {p.status}
        </Badge>
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-blue-600" onClick={onEdit}>
            <Edit className="w-3 h-3" />
          </Button>
          <Button size="sm" variant="outline" className="h-7 w-7 p-0 text-[#860063]" onClick={onExpense}>
            <DollarSign className="w-3 h-3" />
          </Button>
        </div>
      </td>
    </motion.tr>
  );
}

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showExpense, setShowExpense] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterAnoBudget, setFilterAnoBudget] = useState("all");
  const [expandedMacros, setExpandedMacros] = useState({});

  const toggleExpand = (id) => setExpandedMacros(prev => ({ ...prev, [id]: !prev[id] }));

  const STATUS_ORDER = { "Em Andamento": 0, "Não Iniciado": 1, "Concluído": 2, "Pausado": 3, "Cancelado": 4 };

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => base44.entities.Project.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Project.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); setShowForm(false); toast.success("✅ Projeto criado!"); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Project.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); setShowForm(false); setShowExpense(false); toast.success("✅ Projeto atualizado!"); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Project.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["projects"] }); setShowForm(false); toast.success("🗑️ Projeto excluído!"); },
  });

  const handleSubmit = (data) => {
    if (selectedProject) updateMutation.mutate({ id: selectedProject.id, data });
    else createMutation.mutate(data);
  };

  const handleSaveExpenses = (gastos, total) => {
    updateMutation.mutate({ id: selectedProject.id, data: { gastos, valor_gasto: total } });
  };

  // Hierarchical view: top-level projects (non-subprojetos) + filter
  const filtered = useMemo(() => {
    const match = (p) => {
      const matchSearch = !search || p.projeto?.toLowerCase().includes(search.toLowerCase()) || p.responsavel?.toLowerCase().includes(search.toLowerCase()) || p.area?.toLowerCase().includes(search.toLowerCase());
      const matchStatus = filterStatus === "all" || p.status === filterStatus;
      const matchPriority = filterPriority === "all" || p.prioridade === filterPriority;
      const matchAno = filterAnoBudget === "all" || String(p.ano_budget || "") === filterAnoBudget;
      return matchSearch && matchStatus && matchPriority && matchAno;
    };
    // Always maintain hierarchy: show only top-level (non-subprojetos), filtering applies to both macros and their children
    return projects.filter(p => {
      if (p.tipo === "Subprojeto") return false;
      if (p.tipo === "Macro") {
        const subs = projects.filter(s => s.tipo === "Subprojeto" && s.projeto_pai_id === p.id);
        return match(p) || subs.some(match);
      }
      return match(p);
    }).sort((a, b) => {
      const statusDiff = (STATUS_ORDER[a.status] ?? 99) - (STATUS_ORDER[b.status] ?? 99);
      if (statusDiff !== 0) return statusDiff;
      const numA = parseInt((a.numero_projeto || "").replace(/\D/g, "")) || 0;
      const numB = parseInt((b.numero_projeto || "").replace(/\D/g, "")) || 0;
      return numA - numB;
    });
  }, [projects, search, filterStatus, filterPriority, filterAnoBudget]);

  const anosDisponiveis = useMemo(() => {
    const anos = [...new Set(projects.map(p => p.ano_budget).filter(Boolean))].sort((a, b) => b - a);
    return anos;
  }, [projects]);

  const getSubprojects = (parentId) => projects.filter(p => p.tipo === "Subprojeto" && p.projeto_pai_id === parentId);
  const getParentName = (id) => projects.find(p => p.id === id)?.projeto || "—";

  const stats = useMemo(() => {
    // Use filtered projects for stats (all matching projects including subprojects of visible macros)
    const subprojectIds = new Set(projects.filter(p => p.tipo === "Subprojeto" && p.projeto_pai_id).map(p => p.projeto_pai_id));
    // Get all countable projects from filtered top-level + their subprojects
    const filteredWithSubs = [];
    filtered.forEach(p => {
      if (p.tipo === "Macro" && subprojectIds.has(p.id)) {
        const subs = projects.filter(s => s.tipo === "Subprojeto" && s.projeto_pai_id === p.id);
        filteredWithSubs.push(...subs);
      } else {
        filteredWithSubs.push(p);
      }
    });
    const countable = filteredWithSubs.filter(p => !(p.tipo === "Macro" && subprojectIds.has(p.id)));
    return {
      total: countable.length,
      emAndamento: countable.filter(p => p.status === "Em Andamento").length,
      concluidos: countable.filter(p => p.status === "Concluído").length,
      orcamentoTotal: countable.reduce((s, p) => s + (p.valor_previsto || 0), 0),
      gastoTotal: countable.reduce((s, p) => s + (p.valor_gasto || 0), 0),
    };
  }, [projects, filtered]);

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#860063]" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-3 md:p-5">
      <div className="max-w-7xl mx-auto space-y-3">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestão de Projetos</h1>
            <p className="text-gray-500 text-sm">Acompanhe status, orçamento e progresso dos projetos</p>
          </div>
          <div className="flex gap-2">
            <Link to={createPageUrl("ProjectsDashboard")}>
              <Button variant="outline" className="border-[#860063] text-[#860063] hover:bg-[#860063]/10">
                <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
              </Button>
            </Link>
            <Button onClick={() => { setSelectedProject(null); setShowForm(true); }} className="bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824]">
              <Plus className="w-4 h-4 mr-2" /> Novo Projeto
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: "Total", value: stats.total, color: "text-gray-800" },
            { label: "Em Andamento", value: stats.emAndamento, color: "text-blue-700" },
            { label: "Concluídos", value: stats.concluidos, color: "text-green-700" },
            { label: "Orçamento Total", value: fmt(stats.orcamentoTotal), color: "text-[#860063]", small: true },
            { label: "Gasto Total", value: fmt(stats.gastoTotal), color: stats.gastoTotal > stats.orcamentoTotal ? "text-red-600" : "text-orange-600", small: true },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className={`font-bold ${s.color} ${s.small ? "text-base" : "text-2xl"}`}>{s.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Buscar por projeto, responsável, área..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {Object.keys(STATUS_CONFIG).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterPriority} onValueChange={setFilterPriority}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Prioridade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {["Baixa", "Média", "Alta", "Crítica"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterAnoBudget} onValueChange={setFilterAnoBudget}>
                <SelectTrigger className="w-44"><SelectValue placeholder="Ano Budget" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Anos</SelectItem>
                  {anosDisponiveis.map(ano => (
                    <SelectItem key={ano} value={String(ano)}>
                      {ano <= 2025 ? `📦 Histórico ${ano}` : `🟢 ${ano}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Projects Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {["ID", "Projeto", "Área / Responsável", "Prioridade", "Orçamento", "Progresso", "Início Plan.", "Fim Plan.", "Status", "Ações"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((p) => {
                    const subprojects = getSubprojects(p.id);
                    const isExpanded = expandedMacros[p.id];
                    const isMacro = p.tipo === "Macro";
                    const isSubprojeto = p.tipo === "Subprojeto";
                    return (
                      <React.Fragment key={p.id}>
                        <ProjectRow
                          p={p}
                          isMacro={isMacro}
                          isSubprojeto={isSubprojeto}
                          subCount={subprojects.length}
                          subprojects={subprojects}
                          isExpanded={isExpanded}
                          onToggle={() => toggleExpand(p.id)}
                          onEdit={() => { setSelectedProject(p); setShowForm(true); }}
                          onExpense={() => { setSelectedProject(p); setShowExpense(true); }}
                          parentName={isSubprojeto ? getParentName(p.projeto_pai_id) : null}
                        />
                        {isMacro && isExpanded && subprojects.map(sub => (
                          <ProjectRow
                            key={sub.id}
                            p={sub}
                            isSubprojeto={true}
                            isNested={true}
                            onEdit={() => { setSelectedProject(sub); setShowForm(true); }}
                            onExpense={() => { setSelectedProject(sub); setShowExpense(true); }}
                          />
                        ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                  <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>Nenhum projeto encontrado</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <ProjectForm
        open={showForm}
        onClose={() => setShowForm(false)}
        project={selectedProject}
        onSubmit={handleSubmit}
        onDelete={(id) => deleteMutation.mutate(id)}
        isLoading={createMutation.isPending || updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        allProjects={projects}
      />

      {showExpense && selectedProject && (
        <ProjectExpenseDialog
          open={showExpense}
          onClose={() => setShowExpense(false)}
          project={selectedProject}
          onSave={handleSaveExpenses}
        />
      )}
    </div>
  );
}