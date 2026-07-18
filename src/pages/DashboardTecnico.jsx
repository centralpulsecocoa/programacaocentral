import React, { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { CheckCircle2, Clock, AlertCircle, TrendingUp, Target, TreePine, Award } from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";

function ProgressRing({ pct, size = 100, stroke = 10, color = "#860063" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize={18} fontWeight="bold" fill={color}>{pct}%</text>
    </svg>
  );
}

function StatCard({ label, value, sub, color, icon: IconComp }) {
  return (
    <div className={`rounded-xl p-4 shadow-md bg-gradient-to-br ${color}`}>
      <div className="flex items-center justify-between">
        <p className="text-2xl font-black text-white">{value}</p>
        {IconComp && <IconComp className="w-5 h-5 text-white/60" />}
      </div>
      <p className="text-xs font-semibold text-white/80 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-white/60">{sub}</p>}
    </div>
  );
}

export default function DashboardTecnico() {
  const { data: me } = useQuery({ queryKey: ["me-dash-tec"], queryFn: () => base44.auth.me() });

  const { data: atribuicoes = [] } = useQuery({
    queryKey: ["atrib-tec"],
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
    enabled: !!me,
  });

  const { data: produtores = [] } = useQuery({
    queryKey: ["prod-tec-dash"],
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

  const { data: checklists = [] } = useQuery({
    queryKey: ["cl-tec-dash"],
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
    enabled: !!me,
  });

  const prodMap = useMemo(() => {
    const m = {};
    produtores.forEach(p => { m[p.id] = p; });
    return m;
  }, [produtores]);

  // Filtrar apenas atribuições do técnico logado
  const minhasAtrib = useMemo(() =>
    atribuicoes.filter(a => a.tecnico_email === me?.email),
    [atribuicoes, me]
  );

  const checklistByProdId = useMemo(() => {
    const m = {};
    checklists.filter(c => c.tecnico_email === me?.email).forEach(c => {
      const ex = m[c.produtor_id];
      if (!ex || new Date(c.updated_date) > new Date(ex.updated_date)) m[c.produtor_id] = c;
    });
    return m;
  }, [checklists, me]);

  const stats = useMemo(() => {
    const total = minhasAtrib.length;
    const concluido = minhasAtrib.filter(a => a.status === "concluido").length;
    const em_andamento = minhasAtrib.filter(a => a.status === "em_andamento").length;
    const pendente = minhasAtrib.filter(a => (a.status || "pendente") === "pendente").length;
    const pct = total > 0 ? Math.round((concluido / total) * 100) : 0;

    const diasList = minhasAtrib.map(a => {
      const criacao = new Date(a.created_date);
      const fim = a.status === "concluido" && a.updated_date ? new Date(a.updated_date) : new Date();
      return differenceInDays(fim, criacao);
    });
    const mediaDias = diasList.length > 0 ? Math.round(diasList.reduce((a, b) => a + b, 0) / diasList.length) : 0;

    const atrasadas = minhasAtrib.filter(a => {
      if (a.status === "concluido") return false;
      return differenceInDays(new Date(), new Date(a.created_date)) > 30;
    }).length;

    return { total, concluido, em_andamento, pendente, pct, mediaDias, atrasadas };
  }, [minhasAtrib]);

  // Por programa
  const porPrograma = useMemo(() => {
    const m = {};
    minhasAtrib.forEach(a => {
      const prod = prodMap[a.produtor_id];
      const prog = prod?.programa || "Sem Programa";
      if (!m[prog]) m[prog] = { name: prog, total: 0, concluido: 0 };
      m[prog].total++;
      if (a.status === "concluido") m[prog].concluido++;
    });
    return Object.values(m).map(p => ({ ...p, pct: p.total > 0 ? Math.round((p.concluido / p.total) * 100) : 0 }));
  }, [minhasAtrib, prodMap]);

  // Por perfil de visita
  const porPerfil = useMemo(() => {
    const m = {};
    minhasAtrib.forEach(a => {
      const perfil = a.perfil_visita || "Sem Perfil";
      if (!m[perfil]) m[perfil] = { name: perfil, total: 0, concluido: 0 };
      m[perfil].total++;
      if (a.status === "concluido") m[perfil].concluido++;
    });
    return Object.values(m);
  }, [minhasAtrib]);

  // Últimas visitas pendentes/em andamento (ordenadas por urgência)
  const proximasVisitas = useMemo(() =>
    minhasAtrib
      .filter(a => a.status !== "concluido")
      .map(a => ({
        ...a,
        prod: prodMap[a.produtor_id],
        diasAberto: differenceInDays(new Date(), new Date(a.created_date)),
      }))
      .sort((a, b) => b.diasAberto - a.diasAberto)
      .slice(0, 10),
    [minhasAtrib, prodMap]
  );

  // Envios de documentação: visitas concluídas com doc_enviada=true vs total concluídas, por mês
  const docEnvioStats = useMemo(() => {
    const concluidasComDoc = minhasAtrib.filter(a => a.status === "concluido" && a.doc_enviada === true).length;
    const concluidasSemDoc = minhasAtrib.filter(a => a.status === "concluido" && a.doc_enviada !== true).length;
    return [
      { name: "Documentação Enviada", value: concluidasComDoc, color: "#10b981" },
      { name: "Sem Documentação", value: concluidasSemDoc, color: "#f59e0b" },
    ];
  }, [minhasAtrib]);

  if (!me) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin h-10 w-10 border-4 border-[#860063] border-t-transparent rounded-full" /></div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <Award className="w-5 h-5 text-green-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Minha Performance</h1>
          <p className="text-xs text-gray-500">{me?.full_name} · {me?.email}</p>
        </div>
      </div>

      {/* Atingimento central */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
        <Card className="shadow-sm flex items-center justify-center p-6 md:col-span-1">
          <div className="text-center">
            <ProgressRing pct={stats.pct} size={120} stroke={12} color="#860063" />
            <p className="mt-2 text-sm font-bold text-gray-700">Atingimento Geral</p>
            <p className="text-xs text-gray-400">{stats.concluido} de {stats.total} concluídas</p>
          </div>
        </Card>
        <div className="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Atribuídas" value={stats.total} icon={TreePine} color="from-[#860063] to-[#6b004f]" />
          <StatCard label="Concluídas" value={stats.concluido} sub={`${stats.pct}%`} icon={CheckCircle2} color="from-green-600 to-green-700" />
          <StatCard label="Em Andamento" value={stats.em_andamento} icon={TrendingUp} color="from-blue-500 to-blue-700" />
          <StatCard label="Pendentes" value={stats.pendente} icon={Clock} color="from-[#F88D2A] to-[#d97824]" />
          <StatCard label="Atrasadas >30d" value={stats.atrasadas} icon={AlertCircle} color="from-red-500 to-red-700" />
          <StatCard label="Média Dias/Visita" value={`${stats.mediaDias}d`} sub="tempo médio" icon={Clock} color="from-purple-500 to-purple-700" />
          <StatCard label="Checklists Preenchidos" value={Object.keys(checklistByProdId).length} icon={Target} color="from-teal-500 to-teal-700" />
          <StatCard label="Meta Concluídas" value={`${stats.pct}%`} sub={stats.pct >= 80 ? "✓ Atingida!" : `faltam ${stats.total - stats.concluido}`} icon={Award} color={stats.pct >= 80 ? "from-green-600 to-green-700" : "from-gray-500 to-gray-700"} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        {/* Por Programa */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <h2 className="font-bold text-gray-800 mb-4">Performance por Programa</h2>
            <div className="space-y-3">
              {porPrograma.map((p, i) => (
                <div key={p.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-gray-700">{p.name}</span>
                    <span className="font-bold text-green-700">{p.pct}% <span className="text-gray-400 font-normal">({p.concluido}/{p.total})</span></span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 rounded-full bg-[#860063]" style={{ width: `${p.pct}%` }} />
                  </div>
                </div>
              ))}
              {porPrograma.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>}
            </div>
          </CardContent>
        </Card>

        {/* Por Perfil de Visita */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <h2 className="font-bold text-gray-800 mb-4">Performance por Tipo de Visita</h2>
            <div className="space-y-3">
              {porPerfil.map((p, i) => {
                const pct = p.total > 0 ? Math.round((p.concluido / p.total) * 100) : 0;
                return (
                  <div key={p.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-gray-700">{p.name}</span>
                      <span className="font-bold" style={{ color: ["#860063", "#F88D2A", "#10b981"][i % 3] }}>{pct}% ({p.concluido}/{p.total})</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: ["#860063", "#F88D2A", "#10b981"][i % 3] }} />
                    </div>
                  </div>
                );
              })}
              {porPerfil.length === 0 && <p className="text-sm text-gray-400 text-center py-4">Sem dados</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Envio de Documentação */}
      <Card className="shadow-sm mb-6">
        <CardContent className="p-4">
          <h2 className="font-bold text-gray-800 mb-3">Envio de Documentação</h2>
          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-3 flex-1">
              {docEnvioStats.map(d => (
                <div key={d.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-gray-700">{d.name}</span>
                    <span className="font-bold" style={{ color: d.color }}>{d.value}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div className="h-3 rounded-full transition-all" style={{ width: stats.concluido > 0 ? `${Math.round((d.value / stats.concluido) * 100)}%` : '0%', background: d.color }} />
                  </div>
                  <p className="text-[10px] text-gray-400">{stats.concluido > 0 ? Math.round((d.value / stats.concluido) * 100) : 0}% das visitas concluídas</p>
                </div>
              ))}
              {stats.concluido === 0 && <p className="text-sm text-gray-400 text-center py-4">Sem visitas concluídas ainda</p>}
            </div>
            <div className="text-center shrink-0">
              <p className="text-4xl font-black text-emerald-600">{docEnvioStats[0].value}</p>
              <p className="text-xs text-gray-500 mt-1">docs enviados</p>
              <p className="text-xs text-gray-400">de {stats.concluido} concluídas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Próximas visitas pendentes por urgência */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <h2 className="font-bold text-gray-800 mb-3">Minhas Visitas Pendentes / Em Andamento</h2>
          {proximasVisitas.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <p className="text-sm text-green-700 font-semibold">Todas as visitas concluídas! 🎉</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    {["Produtor", "Município", "Programa", "Perfil", "Status", "Dias em Aberto", "Urgência"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {proximasVisitas.map((a, i) => (
                    <tr key={a.id} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                      <td className="px-3 py-2 text-xs font-semibold text-gray-800">{a.prod?.nome || "—"}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{a.prod?.municipio || "—"}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{a.prod?.programa || "—"}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{a.perfil_visita || "—"}</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${a.status === "em_andamento" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"}`}>
                          {a.status === "em_andamento" ? "Em Andamento" : "Pendente"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs font-mono font-bold">{a.diasAberto}d</td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${a.diasAberto > 30 ? "bg-red-100 text-red-700" : a.diasAberto > 15 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                          {a.diasAberto > 30 ? "🔴 Alta" : a.diasAberto > 15 ? "🟡 Média" : "🟢 Normal"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}