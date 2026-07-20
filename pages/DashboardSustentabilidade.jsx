import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend
} from "recharts";
import {
  TrendingUp, Users, CheckCircle2, Clock, AlertCircle, Award, TreePine, Target
} from "lucide-react";
import { differenceInDays } from "date-fns";

const COLORS = ["#860063", "#F88D2A", "#10b981", "#3b82f6", "#8b5cf6", "#f59e0b", "#ef4444", "#06b6d4"];

function StatCard({ label, value, sub, color, icon: IconComp }) {
  return (
    <div className={`rounded-xl p-4 shadow-md bg-gradient-to-br ${color} flex flex-col gap-1`}>
      <div className="flex items-center justify-between">
        <p className="text-2xl font-black text-white">{value}</p>
        {IconComp && <IconComp className="w-6 h-6 text-white/60" />}
      </div>
      <p className="text-xs font-semibold text-white/80">{label}</p>
      {sub && <p className="text-[10px] text-white/60">{sub}</p>}
    </div>
  );
}

function ProgressBar({ pct, color = "bg-green-500" }) {
  return (
    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
}

export default function DashboardSustentabilidade() {
  const [tecnicoFilter, setTecnicoFilter] = useState("all");
  const [compradorFilter, setCompradorFilter] = useState("all");
  const [programaFilter, setProgramaFilter] = useState("all");

  const { data: me } = useQuery({ queryKey: ["me-dash-sust"], queryFn: () => base44.auth.me() });

  const { data: atribuicoes = [] } = useQuery({
    queryKey: ["atrib-dash"],
    queryFn: async () => {
      let all = [], skip = 0;
      while (true) {
        const b = await base44.entities.FazendaAtribuicao.list("created_date", 5000, skip);
        all = [...all, ...b];
        if (b.length < 5000) break;
        skip += 5000;
      }
      return all;
    },
  });

  const { data: produtores = [] } = useQuery({
    queryKey: ["prod-dash"],
    queryFn: async () => {
      let all = [], skip = 0;
      while (true) {
        const b = await base44.entities.Produtor.list("nome", 5000, skip);
        all = [...all, ...b];
        if (b.length < 5000) break;
        skip += 5000;
      }
      return all;
    },
  });

  const { data: tecnicos = [] } = useQuery({
    queryKey: ["tec-dash"],
    queryFn: () => base44.entities.TecnicoSustentabilidade.list("nome", 500),
  });

  // Técnicos reais = os que já estão atribuídos nas atribuições (tecnico_email/tecnico_nome)
  // + os cadastrados em Gestão de Fazendas (tecnico_responsavel do Produtor)
  // Usamos isso para popular o filtro de técnicos

  const { data: checklists = [] } = useQuery({
    queryKey: ["cl-dash"],
    queryFn: async () => {
      let all = [], skip = 0;
      while (true) {
        const b = await base44.entities.FazendaChecklist.list("created_date", 5000, skip);
        all = [...all, ...b];
        if (b.length < 5000) break;
        skip += 5000;
      }
      return all;
    },
  });

  const prodMap = useMemo(() => {
    const m = {};
    produtores.forEach(p => { m[p.id] = p; });
    return m;
  }, [produtores]);

  const tecnicoMap = useMemo(() => {
    const m = {};
    tecnicos.forEach(t => { m[t.email] = t; });
    return m;
  }, [tecnicos]);

  // Listas de filtros
  const compradoresList = useMemo(() => [...new Set(produtores.map(p => p.comprador_responsavel).filter(Boolean))].sort(), [produtores]);
  const programasList = useMemo(() => [...new Set(produtores.map(p => p.programa).filter(Boolean))].sort(), [produtores]);

  // Técnicos para o filtro: atribuições + campo tecnico_responsavel das fazendas
  const tecnicosList = useMemo(() => {
    const map = {};
    atribuicoes.forEach(a => {
      if (a.tecnico_email) map[a.tecnico_email] = a.tecnico_nome || a.tecnico_email;
    });
    produtores.forEach(p => {
      if (p.tecnico_responsavel && !map[p.tecnico_responsavel]) {
        map[p.tecnico_responsavel] = p.tecnico_responsavel;
      }
    });
    return Object.entries(map).map(([key, nome]) => ({ email: key, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [atribuicoes, produtores]);

  // Aplicar filtros nas atribuições — o filtro de técnico compara apenas tecnico_email
  const atribFiltradas = useMemo(() => {
    return atribuicoes.filter(a => {
      const prod = prodMap[a.produtor_id];
      if (tecnicoFilter !== "all" && a.tecnico_email !== tecnicoFilter) return false;
      if (compradorFilter !== "all" && prod?.comprador_responsavel !== compradorFilter) return false;
      if (programaFilter !== "all" && prod?.programa !== programaFilter) return false;
      return true;
    });
  }, [atribuicoes, prodMap, tecnicoFilter, compradorFilter, programaFilter]);

  // Checklist mais recente por produtor
  const checklistByProdutorId = useMemo(() => {
    const m = {};
    checklists.forEach(c => {
      const ex = m[c.produtor_id];
      if (!ex || new Date(c.updated_date) > new Date(ex.updated_date)) m[c.produtor_id] = c;
    });
    return m;
  }, [checklists]);

  // Estatísticas por técnico
  const tecnicoStats = useMemo(() => {
    const stats = {};
    atribFiltradas.forEach(a => {
      const email = a.tecnico_email;
      if (!email) return;
      if (!stats[email]) stats[email] = { email, nome: tecnicoMap[email]?.nome || email, total: 0, concluido: 0, em_andamento: 0, pendente: 0, diasAbertos: [] };
      stats[email].total++;
      stats[email][a.status || "pendente"]++;

      // Medir tempo em aberto (dias desde criação até hoje ou até conclusão)
      const criacao = new Date(a.created_date);
      const fim = a.status === "concluido" && a.updated_date ? new Date(a.updated_date) : new Date();
      const dias = differenceInDays(fim, criacao);
      stats[email].diasAbertos.push(dias);
    });

    return Object.values(stats).map(s => ({
      ...s,
      pctConcluido: s.total > 0 ? Math.round((s.concluido / s.total) * 100) : 0,
      pctEmAndamento: s.total > 0 ? Math.round((s.em_andamento / s.total) * 100) : 0,
      mediaDias: s.diasAbertos.length > 0 ? Math.round(s.diasAbertos.reduce((a, b) => a + b, 0) / s.diasAbertos.length) : 0,
    })).sort((a, b) => b.pctConcluido - a.pctConcluido);
  }, [atribFiltradas, tecnicoMap]);

  // Totais gerais
  const totais = useMemo(() => {
    const total = atribFiltradas.length;
    const concluido = atribFiltradas.filter(a => a.status === "concluido").length;
    const em_andamento = atribFiltradas.filter(a => a.status === "em_andamento").length;
    const pendente = atribFiltradas.filter(a => (a.status || "pendente") === "pendente").length;

    const diasTodos = atribFiltradas.map(a => {
      const criacao = new Date(a.created_date);
      const fim = a.status === "concluido" && a.updated_date ? new Date(a.updated_date) : new Date();
      return differenceInDays(fim, criacao);
    });
    const mediaDiasGeral = diasTodos.length > 0 ? Math.round(diasTodos.reduce((a, b) => a + b, 0) / diasTodos.length) : 0;

    return { total, concluido, em_andamento, pendente, mediaDiasGeral, pctConcluido: total > 0 ? Math.round((concluido / total) * 100) : 0 };
  }, [atribFiltradas]);

  // Por comprador
  const porComprador = useMemo(() => {
    const m = {};
    atribFiltradas.forEach(a => {
      const prod = prodMap[a.produtor_id];
      const comp = prod?.comprador_responsavel || "Sem Comprador";
      if (!m[comp]) m[comp] = { name: comp, total: 0, concluido: 0 };
      m[comp].total++;
      if (a.status === "concluido") m[comp].concluido++;
    });
    return Object.values(m).map(c => ({ ...c, pct: c.total > 0 ? Math.round((c.concluido / c.total) * 100) : 0 })).sort((a, b) => b.pct - a.pct);
  }, [atribFiltradas, prodMap]);

  // Por programa
  const porPrograma = useMemo(() => {
    const m = {};
    atribFiltradas.forEach(a => {
      const prod = prodMap[a.produtor_id];
      const prog = prod?.programa || "Sem Programa";
      if (!m[prog]) m[prog] = { name: prog, total: 0, concluido: 0 };
      m[prog].total++;
      if (a.status === "concluido") m[prog].concluido++;
    });
    return Object.values(m).map(p => ({ ...p, pct: p.total > 0 ? Math.round((p.concluido / p.total) * 100) : 0 }));
  }, [atribFiltradas, prodMap]);

  // Por perfil de visita
  const porPerfil = useMemo(() => {
    const m = {};
    atribFiltradas.forEach(a => {
      const perfil = a.perfil_visita || "Sem Perfil";
      if (!m[perfil]) m[perfil] = { name: perfil, total: 0, concluido: 0 };
      m[perfil].total++;
      if (a.status === "concluido") m[perfil].concluido++;
    });
    return Object.values(m);
  }, [atribFiltradas]);

  // Ranking de agendamentos feitos pelos técnicos (data_agendamento_tecnico preenchida)
  const rankingAgendamentos = useMemo(() => {
    const stats = {};
    atribFiltradas.forEach(a => {
      const email = a.tecnico_email;
      if (!email) return;
      if (!stats[email]) stats[email] = { email, nome: tecnicoMap[email]?.nome || a.tecnico_nome || email, agendadas: 0, total: 0 };
      stats[email].total++;
      if (a.data_agendamento_tecnico) stats[email].agendadas++;
    });
    return Object.values(stats)
      .filter(s => s.total > 0)
      .map(s => ({ ...s, pct: Math.round((s.agendadas / s.total) * 100) }))
      .sort((a, b) => b.agendadas - a.agendadas);
  }, [atribFiltradas, tecnicoMap]);

  // Visitas atrasadas (mais de 30 dias pendentes ou em andamento)
  const visitasAtrasadas = useMemo(() =>
    atribFiltradas.filter(a => {
      if (a.status === "concluido") return false;
      const dias = differenceInDays(new Date(), new Date(a.created_date));
      return dias > 30;
    }).length,
    [atribFiltradas]
  );

  // Produtores filtrados (para o caso de filtrar por comprador/programa sem atribuição)
  const produtoresFiltrados = useMemo(() => produtores.filter(p => {
    if (tecnicoFilter !== "all") {
      const atrib = atribuicoes.find(a => a.produtor_id === p.id);
      const match = atrib?.tecnico_email === tecnicoFilter ||
                    atrib?.tecnico_nome === tecnicoFilter ||
                    p.tecnico_responsavel === tecnicoFilter;
      if (!match) return false;
    }
    if (compradorFilter !== "all" && p.comprador_responsavel !== compradorFilter) return false;
    if (programaFilter !== "all" && p.programa !== programaFilter) return false;
    return true;
  }), [produtores, atribuicoes, tecnicoFilter, compradorFilter, programaFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-[#860063]/10 rounded-xl flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-[#860063]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Dashboard Sustentabilidade — Gerente</h1>
          <p className="text-xs text-gray-500">Visão consolidada de performance por técnico, comprador e programa</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-5">
        <Select value={tecnicoFilter} onValueChange={setTecnicoFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Todos técnicos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos técnicos</SelectItem>
            {tecnicosList.map(t => <SelectItem key={t.email} value={t.email}>{t.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={compradorFilter} onValueChange={setCompradorFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Todos compradores" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos compradores</SelectItem>
            {compradoresList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={programaFilter} onValueChange={setProgramaFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Todos programas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos programas</SelectItem>
            {programasList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs Gerais */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        <StatCard label="Total Visitas" value={totais.total} icon={TreePine} color="from-[#860063] to-[#6b004f]" />
        <StatCard label="Concluídas" value={totais.concluido} sub={`${totais.pctConcluido}% do total`} icon={CheckCircle2} color="from-green-600 to-green-700" />
        <StatCard label="Em Andamento" value={totais.em_andamento} sub={`${totais.total > 0 ? Math.round((totais.em_andamento / totais.total) * 100) : 0}%`} icon={TrendingUp} color="from-blue-500 to-blue-700" />
        <StatCard label="Pendentes" value={totais.pendente} sub={`${totais.total > 0 ? Math.round((totais.pendente / totais.total) * 100) : 0}%`} icon={Clock} color="from-[#F88D2A] to-[#d97824]" />
        <StatCard label="Atrasadas >30d" value={visitasAtrasadas} icon={AlertCircle} color="from-red-500 to-red-700" />
        <StatCard label="Média Dias/Visita" value={`${totais.mediaDiasGeral}d`} sub="tempo médio em aberto" icon={Clock} color="from-purple-500 to-purple-700" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Ranking por Técnico */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-[#860063]" />
              <h2 className="font-bold text-gray-800">Ranking por Técnico</h2>
            </div>
            <div className="space-y-3">
              {tecnicoStats.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Nenhum dado</p>
              ) : tecnicoStats.map((t, i) => (
                <div key={t.email} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black w-5 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-400"}`}>
                        {i + 1}°
                      </span>
                      <span className="text-sm font-semibold text-gray-800 truncate max-w-[160px]">{t.nome}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-bold text-green-700">{t.pctConcluido}%</span>
                      <span>{t.concluido}/{t.total}</span>
                      <span className="text-orange-500">⏱ {t.mediaDias}d</span>
                    </div>
                  </div>
                  <ProgressBar pct={t.pctConcluido} color="bg-[#860063]" />
                  <div className="flex gap-3 text-[10px] text-gray-500">
                    <span className="text-green-600">✓ {t.concluido} concluídas</span>
                    <span className="text-blue-600">⟳ {t.em_andamento} andamento</span>
                    <span className="text-orange-500">◷ {t.pendente} pendentes</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Gráfico Técnicos */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <h2 className="font-bold text-gray-800 mb-4">% Conclusão por Técnico</h2>
            {tecnicoStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={tecnicoStats.slice(0, 10)} layout="vertical" margin={{ left: 0, right: 30 }}>
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={90} />
                  <Tooltip formatter={v => `${v}%`} />
                  <Bar dataKey="pctConcluido" radius={[0, 4, 4, 0]}>
                    {tecnicoStats.slice(0, 10).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-gray-400 text-center py-12">Sem dados</p>}
          </CardContent>
        </Card>
      </div>

      {/* Ranking de Agendamentos pelos Técnicos */}
      <Card className="shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-cyan-600" />
            <h2 className="font-bold text-gray-800">Ranking de Agendamentos — Técnicos</h2>
            <span className="text-[10px] text-gray-400 ml-1">(visitas com data agendada com o produtor)</span>
          </div>
          {rankingAgendamentos.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum agendamento registrado</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {rankingAgendamentos.map((t, i) => (
                <div key={t.email} className={`flex items-center gap-3 p-3 rounded-lg border ${i === 0 ? "border-yellow-300 bg-yellow-50" : i === 1 ? "border-gray-300 bg-gray-50" : i === 2 ? "border-orange-200 bg-orange-50" : "border-gray-100 bg-white"}`}>
                  <span className={`text-lg font-black w-7 text-center ${i === 0 ? "text-yellow-500" : i === 1 ? "text-gray-400" : i === 2 ? "text-orange-400" : "text-gray-300"}`}>
                    {i + 1}°
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{t.nome}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs font-bold text-cyan-700">{t.agendadas} agendadas</span>
                      <span className="text-[10px] text-gray-400">de {t.total} atribuídas</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div className="h-1.5 rounded-full bg-cyan-500 transition-all" style={{ width: `${t.pct}%` }} />
                    </div>
                  </div>
                  <span className={`text-xs font-black px-2 py-1 rounded-lg ${t.pct >= 80 ? "bg-green-100 text-green-700" : t.pct >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>
                    {t.pct}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* Por Comprador */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-[#F88D2A]" />
              <h2 className="font-bold text-gray-800">Por Comprador</h2>
            </div>
            <div className="space-y-3">
              {porComprador.map((c, i) => (
                <div key={c.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-gray-700 truncate max-w-[140px]">{c.name}</span>
                    <span className="font-bold text-green-700">{c.pct}% <span className="text-gray-400 font-normal">({c.concluido}/{c.total})</span></span>
                  </div>
                  <ProgressBar pct={c.pct} color={i % 2 === 0 ? "bg-[#F88D2A]" : "bg-[#860063]"} />
                </div>
              ))}
              {porComprador.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>}
            </div>
          </CardContent>
        </Card>

        {/* Por Programa */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <h2 className="font-bold text-gray-800 mb-4">Por Programa</h2>
            {porPrograma.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={porPrograma} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={70} labelLine={false} label={({ cx, cy, midAngle, innerRadius, outerRadius, name, pct }) => {
                      const RADIAN = Math.PI / 180;
                      const radius = outerRadius + 18;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} fill="#374151" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" style={{ fontSize: '9px', fontWeight: 600 }}>
                          {`${name?.split("/")[0]} ${pct}%`}
                        </text>
                      );
                    }}>
                    {porPrograma.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n, p) => [`${v} visitas (${p.payload.pct}% concluídas)`, p.payload.name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-gray-400 text-center py-12">Sem dados</p>}
            <div className="mt-3 space-y-1">
              {porPrograma.map((p, i) => (
                <div key={p.name} className="flex justify-between text-xs">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLORS[i % COLORS.length] }} />{p.name}</span>
                  <span className="font-bold text-gray-700">{p.pct}% ({p.concluido}/{p.total})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Por Perfil de Visita */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-purple-600" />
              <h2 className="font-bold text-gray-800">Por Perfil de Visita</h2>
            </div>
            <div className="space-y-3">
              {porPerfil.map((p, i) => (
                <div key={p.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-gray-700">{p.name}</span>
                    <span className="font-bold" style={{ color: COLORS[i % COLORS.length] }}>{p.total} visitas</span>
                  </div>
                  <ProgressBar pct={p.total > 0 ? Math.round((p.concluido / p.total) * 100) : 0} color="bg-purple-500" />
                  <p className="text-[10px] text-gray-400">{p.concluido} concluídas · {Math.round(p.total > 0 ? (p.concluido / p.total) * 100 : 0)}%</p>
                </div>
              ))}
              {porPerfil.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela detalhada por técnico com tempo */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <h2 className="font-bold text-gray-800 mb-3">Detalhamento por Técnico</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  {["Posição", "Técnico", "Total", "Concluídas", "%", "Em Andamento", "%", "Pendentes", "%", "Média dias", "Atrasadas >30d"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tecnicoStats.map((t, i) => {
                  const atrasadas = atribFiltradas.filter(a => {
                    if (a.tecnico_email !== t.email || a.status === "concluido") return false;
                    return differenceInDays(new Date(), new Date(a.created_date)) > 30;
                  }).length;
                  return (
                    <tr key={t.email} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                      <td className="px-3 py-2 text-xs font-black text-gray-500">{i + 1}°</td>
                      <td className="px-3 py-2 text-xs font-semibold text-gray-800">{t.nome}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{t.total}</td>
                      <td className="px-3 py-2 text-xs text-green-700 font-bold">{t.concluido}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${t.pctConcluido >= 80 ? "bg-green-100 text-green-700" : t.pctConcluido >= 50 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                          {t.pctConcluido}%
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs text-blue-600">{t.em_andamento}</td>
                      <td className="px-3 py-2 text-xs text-gray-400">{t.pctEmAndamento}%</td>
                      <td className="px-3 py-2 text-xs text-orange-500">{t.pendente}</td>
                      <td className="px-3 py-2 text-xs text-gray-400">{t.total > 0 ? Math.round((t.pendente / t.total) * 100) : 0}%</td>
                      <td className="px-3 py-2 text-xs font-mono">{t.mediaDias}d</td>
                      <td className="px-3 py-2 text-xs">
                        {atrasadas > 0 ? <span className="text-red-600 font-bold">{atrasadas}</span> : <span className="text-gray-300">—</span>}
                      </td>
                    </tr>
                  );
                })}
                {tecnicoStats.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-8 text-gray-400">Nenhum dado encontrado.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}