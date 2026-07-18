import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  MapPin, Search, Send, CheckCircle2, Clock, AlertCircle, Users, Filter, X, Pencil, RotateCcw, CalendarCheck
} from "lucide-react";
import { differenceInDays, format } from "date-fns";
import { toast } from "sonner";

const PERFIS_VISITA = ["1 - ADESAO", "2 - REVISITA", "3 - MONITORAMENTO"];
const STATUS_LABELS = { pendente: "Pendente", em_andamento: "Em Andamento", concluido: "Concluído" };
const STATUS_COLORS = {
  pendente: "bg-orange-100 text-orange-700",
  em_andamento: "bg-blue-100 text-blue-700",
  concluido: "bg-green-100 text-green-700",
};

export default function ConfigGerais() {
  const queryClient = useQueryClient();
  const [searchProdutor, setSearchProdutor] = useState("");
  const [tecnicoFilter, setTecnicoFilter] = useState("all");
  const [compradorFilter, setCompradorFilter] = useState("all");
  const [cidadeFilter, setCidadeFilter] = useState("all");
  const [programaFilter, setProgramaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [perfilFilter, setPerfilFilter] = useState("all");
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [dispatchDialog, setDispatchDialog] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({ tecnico_email: "", perfil_visita: "", substituir_tecnico: false });
  const [dispatching, setDispatching] = useState(false);
  const [editDialog, setEditDialog] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [markingVisited, setMarkingVisited] = useState(false);

  const { data: me } = useQuery({ queryKey: ["me-config"], queryFn: () => base44.auth.me() });

  const { data: produtores = [] } = useQuery({
    queryKey: ["prod-config"],
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

  const { data: atribuicoes = [] } = useQuery({
    queryKey: ["atrib-config"],
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

  const { data: tecnicos = [] } = useQuery({
    queryKey: ["tec-config"],
    queryFn: () => base44.entities.TecnicoSustentabilidade.list("nome", 500),
  });

  const prodMap = useMemo(() => {
    const m = {};
    produtores.forEach(p => { m[p.id] = p; });
    return m;
  }, [produtores]);

  const atribByProdId = useMemo(() => {
    const m = {};
    atribuicoes.forEach(a => { m[a.produtor_id] = a; });
    return m;
  }, [atribuicoes]);

  const compradoresList = useMemo(() => [...new Set(produtores.map(p => p.comprador_responsavel).filter(Boolean))].sort(), [produtores]);
  const cidadesList = useMemo(() => [...new Set(produtores.map(p => p.municipio).filter(Boolean))].sort(), [produtores]);
  const programasList = useMemo(() => [...new Set(produtores.map(p => p.programa).filter(Boolean))].sort(), [produtores]);

  // Técnicos para filtro: apenas os cadastrados em TecnicoSustentabilidade (ativos)
  const tecnicosList = useMemo(() => {
    return tecnicos
      .filter(t => t.ativo !== false)
      .map(t => ({ email: t.email, nome: t.nome }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [tecnicos]);

  // Join produtores + atribuições para tabela unificada
  const rows = useMemo(() => produtores.map(p => {
    const atrib = atribByProdId[p.id];
    const diasAberto = atrib ? differenceInDays(
      atrib.status === "concluido" && atrib.updated_date ? new Date(atrib.updated_date) : new Date(),
      new Date(atrib.created_date)
    ) : null;
    return { prod: p, atrib, diasAberto };
  }), [produtores, atribByProdId]);

  const filtered = useMemo(() => rows.filter(r => {
    const { prod, atrib } = r;
    const q = searchProdutor.toLowerCase();
    if (q && !prod.nome?.toLowerCase().includes(q) && !prod.municipio?.toLowerCase().includes(q) && !prod.nome_fazenda?.toLowerCase().includes(q)) return false;
    if (tecnicoFilter !== "all") {
      const tecnicoMatch = atrib?.tecnico_email === tecnicoFilter || 
                           prod.tecnico_responsavel === tecnicoFilter;
      if (!tecnicoMatch) return false;
    }
    if (compradorFilter !== "all" && prod.comprador_responsavel !== compradorFilter) return false;
    if (cidadeFilter !== "all" && prod.municipio !== cidadeFilter) return false;
    if (programaFilter !== "all" && prod.programa !== programaFilter) return false;
    if (statusFilter !== "all") {
      const s = atrib?.status || "pendente";
      if (statusFilter === "sem_atribuicao" && atrib) return false;
      if (statusFilter !== "sem_atribuicao" && s !== statusFilter) return false;
    }
    if (perfilFilter !== "all" && atrib?.perfil_visita !== perfilFilter) return false;
    return true;
  }), [rows, searchProdutor, tecnicoFilter, compradorFilter, cidadeFilter, programaFilter, statusFilter, perfilFilter]);

  const toggleRow = (id) => {
    setSelectedRows(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };
  const toggleAll = () => {
    if (selectedRows.size === filtered.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(filtered.map(r => r.prod.id)));
  };

  // Técnico majoritário entre as fazendas selecionadas (para exibir no popup)
  const selectedTecnicoInfo = useMemo(() => {
    const selecionados = [...selectedRows].map(id => prodMap[id]).filter(Boolean);
    const tecnicos_map = {};
    selecionados.forEach(p => {
      const tec = p.tecnico_responsavel;
      if (tec) tecnicos_map[tec] = (tecnicos_map[tec] || 0) + 1;
    });
    const entries = Object.entries(tecnicos_map);
    if (entries.length === 0) return { unico: null, misto: false };
    if (entries.length === 1) return { unico: entries[0][0], misto: false };
    return { unico: null, misto: true, resumo: entries.map(([t, n]) => `${t} (${n})`).join(", ") };
  }, [selectedRows, prodMap]);

  // Disparar demanda (criar/atualizar FazendaAtribuicao)
  const handleDispatch = async () => {
    if (!dispatchForm.perfil_visita) return toast.error("Selecione o perfil de visita");
    if (dispatchForm.substituir_tecnico && !dispatchForm.tecnico_email) return toast.error("Selecione o técnico substituto");
    setDispatching(true);
    let criados = 0, atualizados = 0;
    const fazendas = [];

    for (const prodId of selectedRows) {
      const prod = prodMap[prodId];
      const existing = atribByProdId[prodId];

      // Definir técnico: usar o do cadastro, ou o substituto se flag ativa
      const tecnicoEmail = dispatchForm.substituir_tecnico
        ? dispatchForm.tecnico_email
        : (prod?.tecnico_responsavel || dispatchForm.tecnico_email || "");
      const tecnico = tecnicosList.find(t => t.email === tecnicoEmail);

      const payload = {
        produtor_id: prodId,
        produtor_nome: prod?.nome || "",
        tecnico_email: tecnicoEmail,
        tecnico_nome: tecnico?.nome || tecnicoEmail,
        perfil_visita: dispatchForm.perfil_visita,
        status: "pendente",
        data_atendimento: new Date().toISOString().slice(0, 10),
      };
      if (existing) {
        await base44.entities.FazendaAtribuicao.update(existing.id, payload);
        atualizados++;
      } else {
        await base44.entities.FazendaAtribuicao.create(payload);
        criados++;
      }
      fazendas.push({
        nome: prod?.nome || prodId,
        municipio: prod?.municipio || "—",
        programa: prod?.programa || "—",
        perfil: dispatchForm.perfil_visita,
        tecnicoEmail,
      });
      await new Promise(r => setTimeout(r, 200));
    }

    // Enviar email para cada técnico com sua lista de fazendas
    const porTecnico = {};
    fazendas.forEach(f => {
      if (!f.tecnicoEmail) return;
      if (!porTecnico[f.tecnicoEmail]) porTecnico[f.tecnicoEmail] = [];
      porTecnico[f.tecnicoEmail].push(f);
    });
    for (const [tEmail, lista] of Object.entries(porTecnico)) {
      const tNome = tecnicosList.find(t => t.email === tEmail)?.nome || tEmail;
      const linhas = lista.map((f, i) => `${i + 1}. ${f.nome} — ${f.municipio} (${f.programa}) · Perfil: ${f.perfil}`).join("\n");
      const emailBody = `Olá${tNome ? ` ${tNome}` : ""},\n\nVocê recebeu novas atribuições de visitas técnicas:\n\n${linhas}\n\nTotal: ${lista.length} fazenda(s)\nAcesse o sistema para visualizar sua lista completa e registrar o progresso das visitas.\n\nAtenciosamente,\nEquipe Sustentabilidade`;
      await base44.functions.invoke("sendDataSquadEmail", {
        recipients: [tEmail],
        subject: `[Sustentabilidade] ${lista.length} nova(s) visita(s) atribuída(s) a você`,
        body: emailBody,
      }).catch(() => {});
    }

    const msg = [criados > 0 && `${criados} nova(s)`, atualizados > 0 && `${atualizados} atualizada(s)`].filter(Boolean).join(" · ");
    toast.success(`✅ Demanda disparada: ${msg} · Email enviado ao técnico`);
    queryClient.invalidateQueries({ queryKey: ["atrib-config"] });
    setDispatching(false);
    setDispatchDialog(false);
    setSelectedRows(new Set());
  };

  // Editar atribuição existente
  const openEdit = (row) => {
    setEditForm({
      tecnico_email: row.atrib?.tecnico_email || "",
      perfil_visita: row.atrib?.perfil_visita || "",
      status: row.atrib?.status || "pendente",
    });
    setEditDialog(row);
  };

  const handleEditSave = async () => {
    setSaving(true);
    const { prod, atrib } = editDialog;
    const tecnico = tecnicosList.find(t => t.email === editForm.tecnico_email);
    const payload = {
      produtor_id: prod.id,
      produtor_nome: prod.nome,
      tecnico_email: editForm.tecnico_email,
      tecnico_nome: tecnico?.nome || editForm.tecnico_email,
      perfil_visita: editForm.perfil_visita,
      status: editForm.status,
    };
    if (atrib) {
      await base44.entities.FazendaAtribuicao.update(atrib.id, payload);
    } else {
      await base44.entities.FazendaAtribuicao.create({ ...payload, data_atendimento: new Date().toISOString().slice(0, 10) });
    }
    toast.success("Atribuição salva!");
    queryClient.invalidateQueries({ queryKey: ["atrib-config"] });
    setSaving(false);
    setEditDialog(null);
  };

  const handleReset = async () => {
    if (!editDialog?.atrib) return;
    if (!confirm("Isso vai limpar a visita e retornar ao status inicial (pendente). Confirma?")) return;
    setSaving(true);
    await base44.entities.FazendaAtribuicao.update(editDialog.atrib.id, {
      status: "pendente",
      data_atendimento: new Date().toISOString().slice(0, 10),
    });
    toast.success("Visita reiniciada para pendente.");
    queryClient.invalidateQueries({ queryKey: ["atrib-config"] });
    setSaving(false);
    setEditDialog(null);
  };

  // Marcar selecionadas como visitado (concluido) em massa
  const handleMarkAsVisited = async () => {
    if (selectedRows.size === 0) return;
    if (!confirm(`Marcar ${selectedRows.size} fazenda(s) como VISITADAS (Concluído)? Isso vai sobrescrever o status atual.`)) return;
    setMarkingVisited(true);
    for (const prodId of selectedRows) {
      const existing = atribByProdId[prodId];
      const prod = prodMap[prodId];
      if (existing) {
        await base44.entities.FazendaAtribuicao.update(existing.id, { status: "concluido" });
      } else {
        await base44.entities.FazendaAtribuicao.create({
          produtor_id: prodId,
          produtor_nome: prod?.nome || "",
          tecnico_email: prod?.tecnico_responsavel || "",
          tecnico_nome: prod?.tecnico_responsavel || "",
          perfil_visita: "1 - ADESAO",
          status: "concluido",
          data_atendimento: new Date().toISOString().slice(0, 10),
        });
      }
      await new Promise(r => setTimeout(r, 100));
    }
    toast.success(`✅ ${selectedRows.size} fazenda(s) marcadas como Visitadas!`);
    queryClient.invalidateQueries({ queryKey: ["atrib-config"] });
    setMarkingVisited(false);
    setSelectedRows(new Set());
  };

  // Contadores rápidos
  const counters = useMemo(() => ({
    semAtribuicao: rows.filter(r => !r.atrib).length,
    pendente: rows.filter(r => r.atrib?.status === "pendente" || (!r.atrib)).length,
    emAndamento: rows.filter(r => r.atrib?.status === "em_andamento").length,
    concluido: rows.filter(r => r.atrib?.status === "concluido").length,
    agendadas: rows.filter(r => r.atrib?.data_agendamento_tecnico).length,
    atrasadas: rows.filter(r => r.atrib && r.atrib.status !== "concluido" && r.diasAberto > 30).length,
    mediaDias: (() => {
      const d = rows.filter(r => r.atrib && r.diasAberto !== null).map(r => r.diasAberto);
      return d.length > 0 ? Math.round(d.reduce((a, b) => a + b, 0) / d.length) : 0;
    })(),
  }), [rows]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-[#860063]/10 rounded-xl flex items-center justify-center">
          <MapPin className="w-5 h-5 text-[#860063]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Atribuição de Visitas</h1>
          <p className="text-xs text-gray-500">Filtre, atribua e monitore visitas técnicas por fazenda</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mb-5">
        {[
          { label: "Sem Atribuição", value: counters.semAtribuicao, color: "from-gray-500 to-gray-700" },
          { label: "Pendentes", value: counters.pendente, color: "from-orange-500 to-orange-700" },
          { label: "Em Andamento", value: counters.emAndamento, color: "from-blue-500 to-blue-700" },
          { label: "Agendadas p/ Técnico", value: counters.agendadas, color: "from-cyan-500 to-cyan-700" },
          { label: "Concluídas", value: counters.concluido, color: "from-green-600 to-green-700" },
          { label: "Atrasadas >30d", value: counters.atrasadas, color: "from-red-500 to-red-700" },
          { label: "Média Dias", value: `${counters.mediaDias}d`, color: "from-purple-500 to-purple-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 shadow-md bg-gradient-to-br ${s.color}`}>
            <p className="text-xl font-black text-white">{s.value}</p>
            <p className="text-[10px] font-semibold text-white/80 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <Card className="shadow-sm mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-bold text-gray-700">Filtros</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            <div className="relative col-span-2 md:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <Input placeholder="Produtor / cidade..." value={searchProdutor} onChange={e => setSearchProdutor(e.target.value)} className="pl-8 h-8 text-xs" />
            </div>
            <Select value={tecnicoFilter} onValueChange={setTecnicoFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Técnico" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos técnicos</SelectItem>
                {tecnicosList.map(t => <SelectItem key={t.email} value={t.email}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={compradorFilter} onValueChange={setCompradorFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Comprador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos compradores</SelectItem>
                {compradoresList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={cidadeFilter} onValueChange={setCidadeFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Cidade" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas cidades</SelectItem>
                {cidadesList.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={programaFilter} onValueChange={setProgramaFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Programa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos programas</SelectItem>
                {programasList.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="sem_atribuicao">Sem Atribuição</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
              </SelectContent>
            </Select>
            <Select value={perfilFilter} onValueChange={setPerfilFilter}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Perfil Visita" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos perfis</SelectItem>
                {PERFIS_VISITA.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-500">{filtered.length} fazendas · {selectedRows.size} selecionadas</span>
            <div className="flex gap-2">
              {(searchProdutor || tecnicoFilter !== "all" || compradorFilter !== "all" || cidadeFilter !== "all" || programaFilter !== "all" || statusFilter !== "all" || perfilFilter !== "all") && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setSearchProdutor(""); setTecnicoFilter("all"); setCompradorFilter("all"); setCidadeFilter("all"); setProgramaFilter("all"); setStatusFilter("all"); setPerfilFilter("all"); }}>
                  <X className="w-3.5 h-3.5 mr-1" /> Limpar
                </Button>
              )}
              {selectedRows.size > 0 && (
                <div className="flex gap-2">
                  <Button size="sm" className="h-7 text-xs bg-[#860063] hover:bg-[#6b004f] text-white" onClick={() => setDispatchDialog(true)}>
                    <Send className="w-3.5 h-3.5 mr-1" /> Disparar para {selectedRows.size}
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleMarkAsVisited}
                    disabled={markingVisited}
                  >
                    <CalendarCheck className="w-3.5 h-3.5 mr-1" />
                    {markingVisited ? "Marcando..." : `Marcar ${selectedRows.size} como Visitado`}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-3 py-2 w-8">
                    <input type="checkbox" checked={selectedRows.size === filtered.length && filtered.length > 0} onChange={toggleAll} className="rounded" />
                  </th>
                  {["Produtor", "Cidade", "Comprador", "Programa", "Técnico", "Perfil Visita", "Status", "Data Agendada", "Dias Aberto", "Urgência", "Ações"].map(h => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-12 text-gray-400">Nenhuma fazenda encontrada.</td></tr>
                ) : filtered.map(({ prod, atrib, diasAberto }, i) => (
                  <tr key={prod.id} className={`border-b hover:bg-green-50/20 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/30"} ${selectedRows.has(prod.id) ? "bg-[#860063]/5" : ""}`}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selectedRows.has(prod.id)} onChange={() => toggleRow(prod.id)} className="rounded" />
                    </td>
                    <td className="px-3 py-2 text-xs font-semibold text-gray-800 whitespace-nowrap">{prod.nome}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{prod.municipio || "—"}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 max-w-[120px] truncate">{prod.comprador_responsavel || "—"}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{prod.programa?.split("/")[0] || "—"}</td>
                    <td className="px-3 py-2 text-xs text-gray-600 max-w-[120px] truncate">{atrib?.tecnico_nome || atrib?.tecnico_email || prod.tecnico_responsavel || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{atrib?.perfil_visita || <span className="text-gray-300">—</span>}</td>
                    <td className="px-3 py-2">
                     {atrib ? (
                       <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${STATUS_COLORS[atrib.status || "pendente"]}`}>
                         {STATUS_LABELS[atrib.status || "pendente"]}
                       </span>
                     ) : <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-100 text-gray-500">Sem Atrib.</span>}
                    </td>
                    <td className="px-3 py-2 text-xs">
                     {atrib?.data_agendamento_tecnico ? (
                       <span className="text-cyan-700 font-medium bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200 whitespace-nowrap">
                         📅 {new Date(atrib.data_agendamento_tecnico + "T12:00:00").toLocaleDateString("pt-BR")}
                       </span>
                     ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs font-mono">
                      {diasAberto !== null ? `${diasAberto}d` : "—"}
                    </td>
                    <td className="px-3 py-2">
                      {diasAberto !== null && atrib?.status !== "concluido" ? (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${diasAberto > 30 ? "bg-red-100 text-red-700" : diasAberto > 15 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                          {diasAberto > 30 ? "🔴 Alta" : diasAberto > 15 ? "🟡 Média" : "🟢 Normal"}
                        </span>
                      ) : atrib?.status === "concluido" ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-green-100 text-green-700">✓ OK</span>
                      ) : "—"}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={() => openEdit({ prod, atrib, diasAberto })} className="p-1 hover:bg-blue-50 rounded text-blue-600">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {atrib && (
                          <button
                            onClick={async () => {
                              if (!confirm(`Remover visita de "${prod.nome}"? Isso apagará a atribuição e zerará a contagem.`)) return;
                              await base44.entities.FazendaAtribuicao.delete(atrib.id);
                              toast.success("Visita removida!");
                              queryClient.invalidateQueries({ queryKey: ["atrib-config"] });
                            }}
                            className="p-1 hover:bg-red-50 rounded text-red-400 hover:text-red-600"
                            title="Remover visita"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog Disparar Demanda */}
      <Dialog open={dispatchDialog} onOpenChange={v => { if (!dispatching) { setDispatchDialog(v); if (!v) setDispatchForm({ tecnico_email: "", perfil_visita: "", substituir_tecnico: false }); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#860063]">
              <Send className="w-4 h-4" /> Disparar Visitas — {selectedRows.size} fazenda(s)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Técnico do cadastro */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Técnico do Cadastro</p>
              {selectedTecnicoInfo.misto ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                  ⚠️ Fazendas com técnicos diferentes: {selectedTecnicoInfo.resumo}
                </p>
              ) : selectedTecnicoInfo.unico ? (
                <p className="text-sm font-bold text-gray-800">{selectedTecnicoInfo.unico}</p>
              ) : (
                <p className="text-xs text-gray-400 italic">Nenhum técnico definido no cadastro</p>
              )}
            </div>

            {/* Flag substituir técnico */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setDispatchForm(f => ({ ...f, substituir_tecnico: !f.substituir_tecnico, tecnico_email: "" }))}
                className={`relative w-10 h-5 rounded-full transition-colors ${dispatchForm.substituir_tecnico ? "bg-[#860063]" : "bg-gray-300"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${dispatchForm.substituir_tecnico ? "translate-x-5" : "translate-x-0"}`} />
              </div>
              <span className="text-sm text-gray-700">Substituir o técnico definido no cadastro</span>
            </label>

            {/* Seletor de técnico substituto — só aparece se flag ativa */}
            {dispatchForm.substituir_tecnico && (
              <div className="space-y-1">
                <Label className="text-xs">Técnico Substituto *</Label>
                <Select value={dispatchForm.tecnico_email} onValueChange={v => setDispatchForm(f => ({ ...f, tecnico_email: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o técnico..." /></SelectTrigger>
                  <SelectContent>
                    {tecnicosList.map(t => <SelectItem key={t.email} value={t.email}>{t.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Perfil de Visita *</Label>
              <Select value={dispatchForm.perfil_visita} onValueChange={v => setDispatchForm(f => ({ ...f, perfil_visita: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o perfil..." /></SelectTrigger>
                <SelectContent>
                  {PERFIS_VISITA.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              {dispatchForm.substituir_tecnico
                ? "O técnico substituto será usado para todas as fazendas selecionadas."
                : "Cada fazenda será atribuída ao técnico já definido no seu cadastro. Um email será enviado para cada técnico."}
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => { setDispatchDialog(false); setDispatchForm({ tecnico_email: "", perfil_visita: "", substituir_tecnico: false }); }} disabled={dispatching}>Cancelar</Button>
              <Button className="flex-1 bg-[#860063] hover:bg-[#6b004f] text-white" onClick={handleDispatch} disabled={dispatching}>
                {dispatching ? "Disparando..." : `Disparar ${selectedRows.size} visita(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Atribuição */}
      <Dialog open={!!editDialog} onOpenChange={v => { if (!v) setEditDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#860063]">
              <Pencil className="w-4 h-4" /> Editar Atribuição — {editDialog?.prod?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            {/* Urgência atual */}
            {editDialog?.atrib && editDialog.atrib.status !== "concluido" && (() => {
              const dias = editDialog.diasAberto;
              if (dias === null) return null;
              const urgencia = dias > 30 ? { label: "Alta", color: "bg-red-100 text-red-700 border-red-200", icon: "🔴" }
                : dias > 15 ? { label: "Média", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: "🟡" }
                : { label: "Normal", color: "bg-green-100 text-green-700 border-green-200", icon: "🟢" };
              return (
                <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${urgencia.color}`}>
                  <span className="text-xs font-semibold">Urgência: {urgencia.icon} {urgencia.label}</span>
                  <span className="text-xs font-mono">{dias} dias em aberto</span>
                </div>
              );
            })()}

            <div className="space-y-1">
              <Label className="text-xs">Técnico</Label>
              <Select value={editForm.tecnico_email || ""} onValueChange={v => setEditForm(f => ({ ...f, tecnico_email: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {tecnicosList.map(t => <SelectItem key={t.email} value={t.email}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Perfil de Visita</Label>
              <Select value={editForm.perfil_visita || ""} onValueChange={v => setEditForm(f => ({ ...f, perfil_visita: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {PERFIS_VISITA.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={editForm.status || "pendente"} onValueChange={v => setEditForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Limpar visita */}
            {editDialog?.atrib && editDialog.atrib.status !== "pendente" && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
                <p className="text-xs text-orange-800 font-semibold mb-2">⚠️ Reiniciar Visita</p>
                <p className="text-xs text-orange-700 mb-2">Retorna o status para <strong>Pendente</strong> e reseta a data de atendimento.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-orange-400 text-orange-700 hover:bg-orange-100"
                  onClick={handleReset}
                  disabled={saving}
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Limpar e Reiniciar Visita
                </Button>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditDialog(null)}>Cancelar</Button>
              <Button className="flex-1 bg-[#860063] hover:bg-[#6b004f] text-white" onClick={handleEditSave} disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}