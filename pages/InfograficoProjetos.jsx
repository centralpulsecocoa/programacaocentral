import React, { useMemo, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Shield, Clock, Target, CheckCircle2, TrendingUp, Flame, Code2, GitBranch, Terminal, Activity, ArrowRight, ArrowDown, Zap } from "lucide-react";

const OFI_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6905526da166967415597099/3c8ad4e27_ofi_logo_RGB2.jpg";
const ALLOWED_EMAIL = "jose.j.santos@ofi.com";

const CRIT_CONFIG = {
  baixa: { label: "Baixa", color: "#16a34a", bg: "#dcfce7", border: "#86efac" },
  media: { label: "Média", color: "#d97706", bg: "#fef3c7", border: "#fcd34d" },
  alta:  { label: "Alta",  color: "#dc2626", bg: "#fee2e2", border: "#fca5a5" },
};

function CritBadge({ crit }) {
  if (!crit) return null;
  const cfg = CRIT_CONFIG[crit];
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border"
      style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
      {cfg.label}
    </span>
  );
}

function DotGrid({ rows = 3, cols = 6, color = "#860063" }) {
  return (
    <svg width={cols * 10} height={rows * 10} className="pointer-events-none opacity-20">
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <circle key={`${r}-${c}`} cx={c * 10 + 5} cy={r * 10 + 5} r={1.5} fill={color} />
        ))
      )}
    </svg>
  );
}

function SectionLabel({ icon: Icon, label, color = "#860063", count, subtitle }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <div className="w-1 h-6 rounded-full" style={{ background: color }} />
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-black tracking-[0.12em] uppercase" style={{ color: "#1e293b" }}>{label}</span>
          {subtitle && <p className="text-[9px] text-gray-400">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-1 ml-1">
          <div className="w-12 h-px" style={{ background: `linear-gradient(to right, ${color}50, transparent)` }} />
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: color, opacity: 0.3 }} />
        </div>
        {count != null && (
          <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full" style={{ background: `${color}15`, color, border: `1px solid ${color}25` }}>
            {count}
          </span>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function InfograficoProjetos() {
  const pageRef = useRef(null);

  const { data: me, isLoading: loadingMe } = useQuery({
    queryKey: ["me-infografico"],
    queryFn: () => base44.auth.me(),
  });

  const { data: sugestoes = [] } = useQuery({
    queryKey: ["sugestoes-infografico"],
    queryFn: () => base44.entities.Sugestao.list("created_date", 200),
    enabled: me?.email === ALLOWED_EMAIL || me?.role === "admin",
  });

  const reqs = useMemo(
    () => sugestoes.filter(s => s.tipo === "Requerimento").sort((a, b) => (a.prioridade ?? Infinity) - (b.prioridade ?? Infinity)),
    [sugestoes]
  );

  const emExecucao = useMemo(() => reqs.filter(r => r.status === "em_execucao"), [reqs]);
  const emAnalise  = useMemo(() => reqs.filter(r => r.status === "em_analise"), [reqs]);
  const aguardando = useMemo(() => reqs.filter(r => r.status === "aguardando"), [reqs]);
  const concluidos = useMemo(() => reqs.filter(r => r.status === "concluido"), [reqs]);

  const totalHorasEconomia = useMemo(() =>
    reqs.reduce((acc, r) => acc + Math.max(0, (r.tempo_processo_atual_horas || 0) - (r.tempo_novo_fluxo_horas || 0)), 0),
    [reqs]
  );

  const pieData = useMemo(() => [
    { name: "Aguardando",  value: aguardando.length, color: "#94a3b8" },
    { name: "Em Análise",  value: emAnalise.length,  color: "#3b82f6" },
    { name: "Em Execução", value: emExecucao.length, color: "#860063" },
    { name: "Concluído",   value: concluidos.length, color: "#22c55e" },
  ].filter(d => d.value > 0), [aguardando, emAnalise, emExecucao, concluidos]);

  const barData = useMemo(() => [
    { name: "Backlog",   value: aguardando.length, fill: "#94a3b8" },
    { name: "Análise",  value: emAnalise.length,  fill: "#3b82f6" },
    { name: "Execução", value: emExecucao.length, fill: "#860063" },
    { name: "Feito",    value: concluidos.length, fill: "#22c55e" },
  ], [aguardando, emAnalise, emExecucao, concluidos]);

  if (loadingMe) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#860063]" />
      </div>
    );
  }

  if (me?.email !== ALLOWED_EMAIL && me?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Acesso Restrito</h2>
          <p className="text-gray-500 text-sm">Esta página não está disponível para o seu perfil.</p>
        </div>
      </div>
    );
  }

  const dateStr = format(new Date(), "EEE, d MMM yyyy", { locale: ptBR });
  const timeStr = format(new Date(), "HH:mm", { locale: ptBR });

  return (
    <div className="font-sans" style={{ background: "#f8fafc", color: "#1e293b", minHeight: "100vh" }}>

      {/* dot-grid bg */}
      <div className="fixed inset-0 pointer-events-none" style={{
        backgroundImage: "radial-gradient(circle, #86006328 1px, transparent 1px)",
        backgroundSize: "24px 24px", opacity: 0.4, zIndex: 0,
      }} />
      <div className="fixed top-0 right-0 pointer-events-none" style={{
        width: 280, height: 280,
        background: "linear-gradient(225deg, rgba(134,0,99,0.06) 0%, transparent 70%)", zIndex: 0,
      }} />

      <div className="relative z-10">

      <div ref={pageRef}>
        {/* ── HEADER compacto ── */}
        <div className="relative overflow-hidden" style={{ background: "linear-gradient(135deg, #860063 0%, #6b004f 40%, #F88D2A 100%)" }}>
          <svg className="absolute inset-0 w-full h-full opacity-10 pointer-events-none" preserveAspectRatio="none">
            <line x1="0" y1="30%" x2="100%" y2="30%" stroke="#fff" strokeWidth="0.8" strokeDasharray="10 6" />
            <line x1="0" y1="70%" x2="100%" y2="70%" stroke="#fff" strokeWidth="0.8" strokeDasharray="10 6" />
            <line x1="20%" y1="0" x2="20%" y2="100%" stroke="#fff" strokeWidth="0.5" strokeDasharray="6 8" />
            <line x1="70%" y1="0" x2="70%" y2="100%" stroke="#fff" strokeWidth="0.5" strokeDasharray="6 8" />
            <circle cx="20%" cy="30%" r="3" fill="#fff" opacity="0.4" />
            <circle cx="20%" cy="70%" r="3" fill="#fff" opacity="0.4" />
            <circle cx="70%" cy="30%" r="3" fill="#fff" opacity="0.4" />
            <circle cx="70%" cy="70%" r="3" fill="#fff" opacity="0.4" />
          </svg>

          <div className="relative px-5 md:px-8 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-9 bg-white rounded-lg flex items-center justify-center p-1.5 shadow-md">
                <img src={OFI_LOGO_URL} alt="OFI" className="w-full h-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl md:text-4xl font-black leading-none tracking-tighter text-white drop-shadow-lg">
                    Data Squad
                  </h1>

                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <Terminal className="w-3 h-3 text-white/50" />
                  <span className="text-white/60 font-mono text-[10px] tracking-wider">Central Pulse · Hub de Inovação</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:block opacity-50">
                <DotGrid rows={3} cols={8} color="#fff" />
              </div>
              <div className="text-right shrink-0">
                <p className="text-white/50 text-[10px] font-mono capitalize">{dateStr}</p>
                <p className="text-white text-xl font-black font-mono">{timeStr}</p>
                <p className="text-white/50 text-[9px] font-mono">{reqs.length} requerimentos</p>
              </div>
            </div>
          </div>
          <div className="h-0.5" style={{ background: "linear-gradient(to right, #fff1, #F88D2A, #fff1)" }} />
        </div>

        {/* ── PIPELINE STRIP ── */}
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="px-5 md:px-8 py-2 flex items-center gap-1.5 text-xs overflow-x-auto">
            {[
              { label: "Backlog",   count: aguardando.length, color: "#64748b", bg: "#f1f5f9" },
              { label: "Análise",  count: emAnalise.length,  color: "#3b82f6", bg: "#eff6ff" },
              { label: "Execução", count: emExecucao.length, color: "#860063", bg: "#fdf4ff" },
              { label: "Concluído",count: concluidos.length, color: "#16a34a", bg: "#f0fdf4" },
            ].map((s, i, arr) => (
              <React.Fragment key={s.label}>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold shrink-0"
                  style={{ background: s.bg, borderColor: `${s.color}30`, color: s.color }}>
                  <span>{s.label}</span>
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: s.color }}>{s.count}</span>
                </div>
                {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-gray-300 shrink-0" />}
              </React.Fragment>
            ))}
            <div className="flex-1 border-t border-dashed border-gray-200 ml-1" />
            <span className="text-[10px] text-gray-400 font-mono shrink-0">{reqs.length} total</span>
          </div>
        </div>

        {/* ── GRID 3 COLUNAS ── */}
        <div className="px-4 md:px-6 py-4 grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* COL 1: EXECUTANDO + BACKLOG */}
          <div className="flex flex-col gap-3">
            <div className="relative">
              <div className="absolute -top-1 -right-1 hidden lg:block">
                <DotGrid rows={2} cols={4} color="#860063" />
              </div>
              <SectionLabel icon={Flame} label="Executando" color="#860063" subtitle="em andamento ativo" />
              <div className="space-y-2">
                {emExecucao.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-gray-200 p-5 text-center bg-white">
                    <p className="text-xs text-gray-400">Nenhum em execução</p>
                  </div>
                ) : emExecucao.map(r => (
                  <div key={r.id} className="rounded-xl overflow-hidden bg-white shadow-sm border" style={{ borderColor: "#86006320", borderLeft: "4px solid #860063" }}>
                    <div className="flex items-center justify-between px-3 py-2" style={{ background: "linear-gradient(to right, #860063, #a0007a)" }}>
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-300 opacity-80" />
                          <div className="w-2 h-2 rounded-full bg-yellow-200 opacity-80" />
                          <div className="w-2 h-2 rounded-full bg-green-300 opacity-80" />
                        </div>
                        <span className="text-white font-black text-xs truncate">
                          {r.prioridade ? `#${String(r.prioridade).padStart(2,"0")} ` : ""}{r.nome}
                        </span>
                      </div>
                      <CritBadge crit={r.criticidade} />
                    </div>
                    <div className="px-3 py-2 space-y-1.5">
                      <span className="text-[9px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded inline-block">{r.departamento}</span>
                      {r.objetivo && (
                        <div className="flex gap-1.5 items-start">
                          <Target className="w-3 h-3 shrink-0 mt-0.5" style={{ color: "#860063" }} />
                          <p className="text-xs text-gray-700 line-clamp-2 leading-relaxed">{r.objetivo}</p>
                        </div>
                      )}
                      {r.impacto && (
                        <div className="flex gap-1.5 items-start">
                          <Zap className="w-3 h-3 shrink-0 mt-0.5 text-[#d97706]" />
                          <p className="text-xs text-gray-500 line-clamp-1">{r.impacto}</p>
                        </div>
                      )}
                      {r.prazo_estimado_dias && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-[#d97706]" />
                          <span className="text-[10px] font-bold text-[#d97706]">{r.prazo_estimado_dias}d</span>
                          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{
                              width: r.prazo_estimado_dias <= 15 ? "30%" : r.prazo_estimado_dias <= 30 ? "60%" : "90%",
                              background: r.prazo_estimado_dias <= 15 ? "#22c55e" : r.prazo_estimado_dias <= 30 ? "#F88D2A" : "#ef4444"
                            }} />
                          </div>
                        </div>
                      )}
                      {r.tempo_processo_atual_horas && r.tempo_novo_fluxo_horas && (
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                          <span className="text-[9px] text-red-500 font-mono font-bold line-through">{r.tempo_processo_atual_horas}h</span>
                          <ArrowRight className="w-2.5 h-2.5 text-gray-400" />
                          <span className="text-[9px] text-green-600 font-mono font-bold">{r.tempo_novo_fluxo_horas}h</span>
                          <TrendingUp className="w-2.5 h-2.5 text-green-600 ml-auto" />
                          <span className="text-[9px] text-green-700 font-bold">-{Math.max(0, r.tempo_processo_atual_horas - r.tempo_novo_fluxo_horas).toFixed(0)}h/ano</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* divisor */}
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-dashed border-gray-300" />
              <ArrowDown className="w-3.5 h-3.5 text-gray-400" />
              <div className="flex-1 border-t border-dashed border-gray-300" />
            </div>

            {/* BACKLOG */}
            <div>
              <SectionLabel icon={Code2} label="Backlog" color="#64748b" count={aguardando.length} subtitle="aguardando início" />
              {aguardando.length === 0 ? (
                <p className="text-xs text-gray-400 px-2">Vazio</p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {aguardando.map(r => (
                    <div key={r.id} className="rounded-lg border bg-white shadow-sm px-2.5 py-2 flex flex-col gap-1" style={{ borderColor: "#e2e8f0" }}>
                      <div className="flex items-center gap-1">
                        {r.prioridade && <span className="text-[9px] font-mono text-gray-400 shrink-0">#{String(r.prioridade).padStart(2,"0")}</span>}
                        <p className="text-xs font-bold text-gray-700 truncate">{r.nome}</p>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-[9px] font-mono text-gray-400 truncate">{r.departamento}</p>
                        <CritBadge crit={r.criticidade} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COL 2: ANÁLISE + CONCLUÍDOS */}
          <div className="flex flex-col gap-3">
            <div>
              <SectionLabel icon={GitBranch} label="Em Análise" color="#3b82f6" subtitle="avaliação técnica" />
              <div className="space-y-2">
                {emAnalise.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-blue-100 p-5 text-center bg-blue-50">
                    <p className="text-xs text-blue-300">Nenhum em análise</p>
                  </div>
                ) : emAnalise.map(r => (
                  <div key={r.id} className="rounded-lg border bg-white shadow-sm px-3 py-2.5" style={{ borderColor: "#dbeafe", borderLeft: "3px solid #3b82f6" }}>
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      {r.prioridade && (
                        <span className="text-[9px] font-mono font-black px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                          #{String(r.prioridade).padStart(2,"0")}
                        </span>
                      )}
                      <span className="text-sm font-bold text-gray-800 flex-1 truncate">{r.nome}</span>
                      <CritBadge crit={r.criticidade} />
                      {r.prazo_estimado_dias && (
                        <span className="text-[9px] font-mono text-gray-400 flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />{r.prazo_estimado_dias}d
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] font-mono text-blue-400">{r.departamento}</p>
                    {r.objetivo && <p className="text-xs text-gray-500 mt-1 line-clamp-1">{r.objetivo}</p>}
                    <div className="mt-1.5"><ProgressBar value={1} max={3} color="#3b82f6" /></div>
                  </div>
                ))}
              </div>
            </div>

            {/* divisor */}
            <div className="flex items-center gap-2">
              <div className="flex-1 border-t border-dashed border-green-200" />
              <ArrowDown className="w-3.5 h-3.5 text-green-400" />
              <div className="flex-1 border-t border-dashed border-green-200" />
            </div>

            {/* CONCLUÍDOS */}
            <div>
              <SectionLabel icon={CheckCircle2} label="Concluídos" color="#16a34a" subtitle="finalizados" />
              {concluidos.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-green-100 p-5 text-center bg-green-50">
                  <p className="text-xs text-green-300">Nenhum concluído ainda</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {concluidos.map(r => (
                    <div key={r.id} className="rounded-lg border bg-white shadow-sm px-3 py-2 flex items-center gap-2" style={{ borderColor: "#bbf7d0", borderLeft: "3px solid #22c55e" }}>
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-700 truncate">{r.nome}</p>
                        <p className="text-[9px] font-mono text-green-500">{r.departamento}</p>
                      </div>
                      <span className="text-[9px] bg-green-50 text-green-600 border border-green-200 px-1.5 py-0.5 rounded font-mono shrink-0">done ✓</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* COL 3: GRÁFICOS */}
          <div className="flex flex-col gap-3">

            {/* Pie */}
            <div>
              <SectionLabel icon={Activity} label="Distribuição" color="#F88D2A" subtitle="por status" />
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
                {pieData.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Sem dados</p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                          outerRadius={60} innerRadius={22} paddingAngle={2} labelLine={false}
                          label={({ cx, cy, midAngle, innerRadius, outerRadius, value, percent }) => {
                            if (percent < 0.06) return null;
                            const RADIAN = Math.PI / 180;
                            const r = innerRadius + (outerRadius - innerRadius) * 0.6;
                            const x = cx + r * Math.cos(-midAngle * RADIAN);
                            const y = cy + r * Math.sin(-midAngle * RADIAN);
                            return <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fill="#fff" fontSize={10} fontWeight="bold">{value}</text>;
                          }}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11 }} formatter={(v, n) => [v, n]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 border-t border-gray-100 pt-2">
                      {pieData.map(d => (
                        <div key={d.name} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-sm shrink-0" style={{ background: d.color }} />
                          <span className="text-xs text-gray-600 flex-1">{d.name}</span>
                          <ProgressBar value={d.value} max={reqs.length} color={d.color} />
                          <span className="text-xs font-black tabular-nums w-4 text-right" style={{ color: d.color }}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Bar */}
            <div>
              <SectionLabel icon={TrendingUp} label="Pipeline" color="#860063" subtitle="volume por fase" />
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3">
                <ResponsiveContainer width="100%" height={110}>
                  <BarChart data={barData} barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 11 }} formatter={(v) => [v, "Reqs"]} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} label={{ position: "top", fontSize: 9, fontWeight: "bold", fill: "#64748b" }}>
                      {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Economia card */}
            {totalHorasEconomia > 0 && (
              <div className="bg-white rounded-xl border border-green-200 shadow-sm p-4" style={{ borderLeft: "4px solid #22c55e" }}>
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-wide">Economia Estimada</span>
                </div>
                <p className="text-3xl font-black text-green-600 font-mono leading-none">
                  {totalHorasEconomia.toFixed(0)}<span className="text-base font-normal text-gray-400">h</span>
                  <span className="text-xs font-normal text-gray-400 ml-1">/ano</span>
                </p>
                <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-green-400 to-green-600" style={{ width: "75%" }} />
                </div>
                <p className="text-[9px] text-gray-400 mt-1">ganho operacional projetado</p>
              </div>
            )}

            {/* footer */}
            <div className="flex items-center gap-2 pt-2 border-t border-dashed border-gray-200">
              <div className="flex-1 border-t border-dashed border-gray-200" />
              <p className="text-[9px] font-mono text-gray-400 shrink-0">
                {format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </p>
              <div className="flex-1 border-t border-dashed border-gray-200" />
            </div>
          </div>

        </div>

      </div>{/* fim ref visual */}

      </div>
    </div>
  );
}