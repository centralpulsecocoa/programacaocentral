import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ClipboardList, Pencil, Plus, CheckCircle2, XCircle, Search,
  Square, CheckSquare, ChevronUp, PlayCircle, Eye, Upload
} from "lucide-react";
import { toast } from "sonner";

const CHECKLIST_FIELDS = [
  { key: "poligono", label: "Polígono" },
  { key: "coord_geoespacial", label: "Coord. Geoespacial" },
  { key: "termo_adesao", label: "Termo de Adesão" },
  { key: "codigo_fornecedor", label: "Código Fornecedor" },
  { key: "ficha_recomendacao", label: "Ficha Recomendação" },
  { key: "doc_pessoal", label: "Doc. Pessoal" },
  { key: "doc_fazenda", label: "Doc. Fazenda" },
  { key: "doc_trabalhador", label: "Doc. Trabalhador" },
  { key: "all_farmers", label: "All Farmers" },
  { key: "cadastro_meeiros", label: "Cadastro de Meeiros" },
  { key: "pesquisa_anual", label: "Pesquisa Anual" },
  { key: "checklist", label: "Checklist" },
  { key: "asc_pesquisa", label: "ASC Pesquisa" },
  { key: "clmrs_f1", label: "CLMRS F1", extra: ["PERFIL FAMILIAR"] },
  { key: "clmrs_f2", label: "CLMRS F2" },
  { key: "treinamento_coaching", label: "Coaching/Técnico Treinam" },
  { key: "treinamento_agri", label: "Agri Supplier Code Treinam" },
  { key: "drive", label: "Drive" },
];

const PERFIS_VISITA = ["1 - ADESAO", "2 - REVISITA", "3 - MONITORAMENTO"];
const REPORTE_OPTIONS = [
  "1 - APTO",
  "2 - NAO APTO COM PLANO DE ADEQUACAO",
  "3 - RECUSA",
  "4 - EXCLUSAO",
  "5 - SEM RETORNO",
];
const REPORTE_FINAL_OPTIONS = ["1 - APTO", "2 - EXCLUSAO"];
const OPTIONS_BASE = ["FAZER", "NÃO FAZER"];
const NAO_FAZER = "NÃO FAZER";

const CELL_STYLE = {
  FAZER: "bg-green-100 text-green-800 border-green-300",
  "NÃO FAZER": "bg-red-50 text-red-700 border-red-200",
  "PERFIL FAMILIAR": "bg-blue-100 text-blue-800 border-blue-300",
};

const EMPTY_CHECKLIST = CHECKLIST_FIELDS.reduce(
  (acc, f) => ({ ...acc, [f.key]: NAO_FAZER }),
  {
    longitude: "",
    latitude: "",
    reporte: "",
    adequacao: "NA",
    observacao: "",
    responsavel_verificacao: "",
    data_verificacao: "",
    reporte_final: "",
    observacoes_finais: "",
    itens_feitos: [],
  }
);

export default function ChecklistFazendas() {
  const [search, setSearch] = useState("");
  const [programaFilter, setProgramaFilter] = useState("all");
  const [tecnicoFilter, setTecnicoFilter] = useState("all");

  const [compradorFilter, setCompradorFilter] = useState("all");
  const [filialFilter, setFilialFilter] = useState("all");
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [selectedProdutor, setSelectedProdutor] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_CHECKLIST);
  const [saving, setSaving] = useState(false);
  const [inlineEdits, setInlineEdits] = useState({});
  const [inlineSaving, setInlineSaving] = useState({});
  const [expandedCards, setExpandedCards] = useState({});
  const [meirosDialogProdutor, setMeirosDialogProdutor] = useState(null);
  const [docConfirmPendente, setDocConfirmPendente] = useState(null); // { produtorId, cl }

  const toggleExpand = (id) => setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  const collapseCard = (id) => setExpandedCards((prev) => ({ ...prev, [id]: false }));
  const queryClient = useQueryClient();

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const isTecnico = me?.profile === "tecnico_agricola" && me?.role !== "admin";

  // Para técnicos, buscar dados via backend function (bypass de RLS)
  const { data: tecnicoData } = useQuery({
    queryKey: ["tecnico-produtores", me?.email],
    queryFn: async () => {
      const res = await base44.functions.invoke('getTecnicoProdutores', {});
      return res.data || { produtores: [], atribuicoes: [] };
    },
    enabled: !!me && isTecnico,
    staleTime: 0,
  });

  const { data: atribuicoes = [] } = useQuery({
    queryKey: ["fazenda-atribuicoes"],
    queryFn: async () => {
      let all = [], skip = 0;
      while (true) {
        const batch = await base44.entities.FazendaAtribuicao.list("created_date", 5000, skip);
        all = [...all, ...batch];
        if (batch.length < 5000) break;
        skip += 5000;
      }
      return all;
    },
    enabled: !!me,
  });

  const { data: produtores = [] } = useQuery({
    queryKey: ["produtores"],
    queryFn: async () => {
      let all = [], skip = 0;
      while (true) {
        const batch = await base44.entities.Produtor.list("nome", 5000, skip);
        all = [...all, ...batch];
        if (batch.length < 5000) break;
        skip += 5000;
      }
      return all;
    },
  });

  const { data: checklists = [] } = useQuery({
    queryKey: ["fazenda-checklists"],
    queryFn: async () => {
      let all = [], skip = 0;
      while (true) {
        const batch = await base44.entities.FazendaChecklist.list("created_date", 5000, skip);
        all = [...all, ...batch];
        if (batch.length < 5000) break;
        skip += 5000;
      }
      return all;
    },
  });

  const { data: tecnicos = [] } = useQuery({
    queryKey: ["tecnicos-sustentabilidade"],
    queryFn: () => base44.entities.TecnicoSustentabilidade.list("nome", 500),
  });

  const { data: sustConfigs = [] } = useQuery({
    queryKey: ["sust-configs-checklist", me?.email],
    queryFn: () => base44.entities.SustentabilidadeConfig.list("config_key", 100),
    enabled: !!me,
    staleTime: 0,
  });

  const docLink = isTecnico && tecnicoData?.docLink
    ? tecnicoData.docLink
    : sustConfigs.find(c => c.config_key === "link_envio_documentos" && c.enabled && c.value)?.value || null;

  const { data: meeiros = [] } = useQuery({
    queryKey: ["meeiros-checklist"],
    queryFn: async () => {
      let all = [], skip = 0;
      while (true) {
        const batch = await base44.entities.Meeiro.list("nome_meeiro", 5000, skip);
        all = [...all, ...batch];
        if (batch.length < 5000) break;
        skip += 5000;
      }
      return all;
    },
  });

  // Meeiros por id_fazenda (produtor_id do registro Produtor)
  const meirosByFazendaId = useMemo(() => {
    const m = {};
    meeiros.forEach(me => {
      const key = me.id_fazenda;
      if (!m[key]) m[key] = [];
      m[key].push(me);
    });
    return m;
  }, [meeiros]);

  const isAdmin = me?.role === "admin";
  const isGerente = me?.profile === "gerente_sustentabilidade" || me?.profile === "admin";
  const isComprador = me?.profile === "comprador";

  // Para técnicos, usar dados do backend function; para outros, usar dados das queries normais
  const atribuicoesEfetivas = isTecnico && tecnicoData ? tecnicoData.atribuicoes || [] : atribuicoes;
  const produtoresEfetivos = isTecnico && tecnicoData ? tecnicoData.produtores || [] : produtores;

  // IDs de registros Produtor atribuídos ao técnico atual (ou todos se gerente/admin)
  const assignedProdutorIds = useMemo(() =>
    atribuicoesEfetivas
      .filter((a) => isGerente || isAdmin || a.tecnico_email === me?.email)
      .map((a) => a.produtor_id),
    [atribuicoesEfetivas, isGerente, isAdmin, me]
  );

  // IDs de registros Produtor com checklist do técnico atual (ou todos se gerente/admin)
  const checklistProdutorIds = useMemo(() =>
    checklists
      .filter((c) => isGerente || isAdmin || c.tecnico_email === me?.email)
      .map((c) => c.produtor_id),
    [checklists, isGerente, isAdmin, me]
  );

  const myProdutores = useMemo(() => {
    if (isGerente) return produtores;
    // Comprador: ver apenas fazendas onde é listado como comprador_responsavel
    if (isComprador) {
      return produtores.filter((p) =>
        p.comprador_responsavel && (
          p.comprador_responsavel === me?.email ||
          p.comprador_responsavel?.toLowerCase() === me?.full_name?.toLowerCase()
        )
      );
    }
    // Técnico: usar produtores retornados pelo backend function (já filtrados por atribuição)
    if (isTecnico && tecnicoData) {
      return produtoresEfetivos;
    }
    // Fallback: ver apenas fazendas atribuídas a ele
    return produtores.filter(
      (p) => assignedProdutorIds.includes(p.id) || checklistProdutorIds.includes(p.id)
    );
  }, [produtores, produtoresEfetivos, isGerente, isComprador, isTecnico, tecnicoData, assignedProdutorIds, checklistProdutorIds, me]);

  const compradoresUnicos = useMemo(
    () => [...new Set(myProdutores.map((p) => p.comprador_responsavel).filter(Boolean))].sort(),
    [myProdutores]
  );
  const filiaisUnicas = useMemo(
    () => [...new Set(myProdutores.map((p) => p.filial_responsavel).filter(Boolean))].sort(),
    [myProdutores]
  );

  const resetPage = () => setCurrentPage(1);

  const filtered = useMemo(() =>
    myProdutores.filter((p) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        p.nome?.toLowerCase().includes(q) ||
        p.cpf?.toLowerCase().includes(q) ||
        p.municipio?.toLowerCase().includes(q) ||
        p.fornecedor?.toLowerCase().includes(q) ||
        p.nome_fazenda?.toLowerCase().includes(q) ||
        p.produtor_id?.toLowerCase().includes(q);
      const matchPrograma =
        !isGerente || programaFilter === "all" || p.programa === programaFilter;
      const atrib = atribuicoesEfetivas.find((a) => a.produtor_id === p.id);
      const matchTecnico =
        !isGerente ||
        tecnicoFilter === "all" ||
        atrib?.tecnico_email === tecnicoFilter ||
        p.tecnico_responsavel === tecnicoFilter;
      const matchComprador =
        !isGerente || compradorFilter === "all" || (p.comprador_responsavel || "") === compradorFilter;
      const matchFilial =
        !isGerente || filialFilter === "all" || (p.filial_responsavel || "") === filialFilter;
      return matchSearch && matchPrograma && matchTecnico && matchComprador && matchFilial;
    }),
    [myProdutores, search, programaFilter, tecnicoFilter, compradorFilter, filialFilter, isGerente, atribuicoes]
  );

  const totalPages = pageSize === 0 ? 1 : Math.ceil(filtered.length / pageSize);
  const paginated = useMemo(
    () =>
      pageSize === 0
        ? filtered
        : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [filtered, pageSize, currentPage]
  );

  // Retorna o checklist mais recente do produtor (deduplicado)
  const getChecklist = (produtorId) => {
    const cls = checklists.filter((c) => c.produtor_id === produtorId);
    if (!cls.length) return null;
    return cls.reduce((latest, c) =>
      new Date(c.updated_date) > new Date(latest.updated_date) ? c : latest
    );
  };

  const getCompletionPercent = (cl, produtor) => {
    if (!cl) return 0;
    const fazItems = CHECKLIST_FIELDS.filter(
      (f) => cl[f.key] === "FAZER" || cl[f.key] === "PERFIL FAMILIAR"
    );
    const feitos = cl.itens_feitos || [];
    const fazConcluidosCount = fazItems.filter((f) => feitos.includes(f.key)).length;
    const meeiros = produtor?.meeiro
      ? produtor.meeiro.split(/[,;\/\n]+/).map((m) => m.trim()).filter(Boolean)
      : [];
    const meeirosConcluidosCount = meeiros.filter((m, idx) =>
      feitos.includes(`meeiro_${idx}_${m}`)
    ).length;
    const FORM_FIELDS = [
      "reporte", "reporte_final", "latitude", "longitude",
      "responsavel_verificacao", "data_verificacao",
    ];
    const formPreenchidosCount = FORM_FIELDS.filter(
      (k) => cl[k] != null && cl[k] !== ""
    ).length;
    const total = fazItems.length + meeiros.length + FORM_FIELDS.length;
    const done = fazConcluidosCount + meeirosConcluidosCount + formPreenchidosCount;
    if (total === 0) return 0;
    return Math.round((done / total) * 100);
  };

  const openChecklist = (produtor) => {
    setSelectedProdutor(produtor);
    const existing = getChecklist(produtor.id);
    if (existing) {
      setEditItem(existing);
      setForm({ ...EMPTY_CHECKLIST, ...existing, itens_feitos: existing.itens_feitos || [] });
    } else {
      setEditItem(null);
      // Usar o email do técnico da atribuição para que ele possa ler o checklist
      const atrib = atribuicoes.find((a) => a.produtor_id === produtor.id);
      const tecnicoEmailParaChecklist = atrib?.tecnico_email || "";
      setForm({ ...EMPTY_CHECKLIST, produtor_id: produtor.id, tecnico_email: tecnicoEmailParaChecklist });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    setSaving(true);
    // Sempre usar o email do técnico da atribuição (não do gerente que está salvando)
    const atribDoProdutor = atribuicoes.find((a) => a.produtor_id === selectedProdutor.id);
    const tecnicoEmailCorreto = atribDoProdutor?.tecnico_email || form.tecnico_email || "";
    const data = {
      ...form,
      produtor_id: selectedProdutor.id,
      tecnico_email: tecnicoEmailCorreto,
      latitude: form.latitude !== "" && form.latitude !== null ? parseFloat(form.latitude) : null,
      longitude: form.longitude !== "" && form.longitude !== null ? parseFloat(form.longitude) : null,
    };
    if (editItem) {
      await base44.entities.FazendaChecklist.update(editItem.id, data);
      toast.success("Checklist atualizado!");
    } else {
      await base44.entities.FazendaChecklist.create(data);
      toast.success("Checklist salvo!");
    }
    queryClient.invalidateQueries({ queryKey: ["fazenda-checklists"] });
    setShowForm(false);
    setSaving(false);
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const totalPreenchidos = filtered.filter((p) => !!getChecklist(p.id)).length;
  const totalAgendadas = filtered.filter((p) => {
    const a = atribuicoesEfetivas.find((a) => a.produtor_id === p.id);
    return !!a?.data_agendamento_tecnico;
  }).length;
  const totalAtribuidas = filtered.filter((p) => !!atribuicoesEfetivas.find((a) => a.produtor_id === p.id)).length;

  const toggleItemFeito = (checklist, key) => {
    const current = checklist.itens_feitos || [];
    const updated = current.includes(key)
      ? current.filter((k) => k !== key)
      : [...current, key];
    // Atualização otimista: reflete imediatamente na UI
    queryClient.setQueryData(["fazenda-checklists"], (old) =>
      (old || []).map((c) => c.id === checklist.id ? { ...c, itens_feitos: updated } : c)
    );
    // Persiste no servidor em background
    base44.entities.FazendaChecklist.update(checklist.id, { itens_feitos: updated });
  };

  const handleInlineSave = async (produtorId, cl, concluir = false) => {
    setInlineSaving((prev) => ({ ...prev, [produtorId]: true }));
    const edits = inlineEdits[produtorId] || {};
    // Buscar lat/lng do Produtor (fonte de verdade)
    const prod = produtores.find((p) => p.id === produtorId);
    const latVal = prod?.latitude ?? cl.latitude ?? null;
    const lngVal = prod?.longitude ?? cl.longitude ?? null;
    const nowDate = new Date().toISOString().slice(0, 10);
    await base44.entities.FazendaChecklist.update(cl.id, {
      reporte: edits.reporte ?? cl.reporte,
      reporte_final: edits.reporte_final ?? cl.reporte_final,
      latitude: latVal,
      longitude: lngVal,
      adequacao: edits.adequacao ?? cl.adequacao,
      responsavel_verificacao: me?.full_name || me?.email || edits.responsavel_verificacao || cl.responsavel_verificacao,
      data_verificacao: concluir ? nowDate : (edits.data_verificacao ?? cl.data_verificacao),
      observacao: edits.observacao ?? cl.observacao,
      observacoes_finais: edits.observacoes_finais ?? cl.observacoes_finais,
    });

    const atrib = atribuicoesEfetivas.find((a) => a.produtor_id === produtorId);
    if (atrib) {
      const newStatus = concluir ? "concluido" : "em_andamento";
      if (atrib.status !== "concluido" || concluir) {
        await base44.entities.FazendaAtribuicao.update(atrib.id, { status: newStatus });
        queryClient.invalidateQueries({ queryKey: ["fazenda-atribuicoes"] });
      }
    }

    queryClient.invalidateQueries({ queryKey: ["fazenda-checklists"] });
    setInlineSaving((prev) => ({ ...prev, [produtorId]: false }));
    collapseCard(produtorId);
    toast.success(concluir ? "Visita concluída!" : "Dados salvos!");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setInlineField = (produtorId, key, value) => {
    setInlineEdits((prev) => ({
      ...prev,
      [produtorId]: { ...(prev[produtorId] || {}), [key]: value },
    }));
  };

  // Calcula status real com base no progresso do checklist do técnico
  const getTecnicoStatus = (p) => {
    const atrib = atribuicoesEfetivas.find((a) => a.produtor_id === p.id);
    if (atrib?.status === "concluido") return "concluido";
    const cl = getChecklist(p.id);
    if (!cl) return "pendente";
    const feitos = cl.itens_feitos || [];
    const hasProgress = feitos.length > 0 || cl.reporte || cl.responsavel_verificacao;
    return hasProgress ? "em_andamento" : "pendente";
  };

  const getButtonClass = (p) => {
    if (expandedCards[p.id]) return "bg-gray-500 hover:bg-gray-600 text-white text-xs h-8 px-3";
    const status = getTecnicoStatus(p);
    if (status === "concluido") return "bg-green-600 hover:bg-green-700 text-white text-xs h-8 px-3";
    if (status === "em_andamento") return "bg-yellow-500 hover:bg-yellow-600 text-white text-xs h-8 px-3";
    return "bg-gray-400 hover:bg-gray-500 text-white text-xs h-8 px-3";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-green-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Checklist de Fazendas</h1>
          <p className="text-xs text-gray-500">
            {totalPreenchidos} preenchidos · {filtered.length - totalPreenchidos} pendentes
            {isGerente && (
              <span className="ml-2">
                · <span className="text-[#860063] font-semibold">{totalAtribuidas} atribuídas</span>
                · <span className="text-cyan-600 font-semibold">{totalAgendadas} agendadas p/ técnico</span>
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar nome, fazenda, município, ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            className="pl-9"
          />
        </div>
        {isGerente && (
          <>
            <Select value={programaFilter} onValueChange={(v) => { setProgramaFilter(v); resetPage(); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Programa" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos programas</SelectItem>
                <SelectItem value="Nestlé/AtSource">Nestlé/AtSource</SelectItem>
                <SelectItem value="Mondelez/Cocoa Life">Mondelez/Cocoa Life</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tecnicoFilter} onValueChange={(v) => { setTecnicoFilter(v); resetPage(); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Técnico" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos técnicos</SelectItem>
                {tecnicos.filter((t) => t.ativo !== false).map((t) => (
                  <SelectItem key={t.email} value={t.email}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={compradorFilter} onValueChange={(v) => { setCompradorFilter(v); resetPage(); }}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Comprador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos compradores</SelectItem>
                {compradoresUnicos.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filialFilter} onValueChange={(v) => { setFilialFilter(v); resetPage(); }}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Filial" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas filiais</SelectItem>
                {filiaisUnicas.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); resetPage(); }}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="100">100 por página</SelectItem>
                <SelectItem value="250">250 por página</SelectItem>
                <SelectItem value="500">500 por página</SelectItem>
                <SelectItem value="0">Todos</SelectItem>
              </SelectContent>
            </Select>
          </>
        )}
        <span className="text-xs text-gray-400 self-center shrink-0">{filtered.length} fazendas</span>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <Card className="border-dashed border-2 border-gray-200">
          <CardContent className="p-12 text-center text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Nenhuma fazenda encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {paginated.map((p) => {
            const cl = getChecklist(p.id);
            const fazItems = CHECKLIST_FIELDS.filter(
              (f) => cl && (cl[f.key] === "FAZER" || cl[f.key] === "PERFIL FAMILIAR")
            );
            const feitos = cl?.itens_feitos || [];
            const concluidosCount = fazItems.filter((f) => feitos.includes(f.key)).length;
            const hasAtribuicao = !!atribuicoesEfetivas.find((a) => a.produtor_id === p.id);
            const completionPercent = getCompletionPercent(cl, p);

            return (
              <Card key={p.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {/* Cabeçalho do card */}
                  <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800 uppercase">{p.nome}</p>
                        {(meirosByFazendaId[p.produtor_id] || []).length > 0 && (
                          <button
                            type="button"
                            onClick={() => setMeirosDialogProdutor(p)}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-100 border border-blue-300 text-blue-700 hover:bg-blue-200 transition-colors text-[10px] font-semibold"
                            title="Ver meeiros desta propriedade"
                          >
                            <Eye className="w-3 h-3" />
                            {(meirosByFazendaId[p.produtor_id] || []).length}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-500">
                        {p.produtor_id && <span className="font-mono text-gray-400">{p.produtor_id}</span>}
                        {p.municipio && <span>{p.municipio}</span>}
                        {p.nome_fazenda && <span>{p.nome_fazenda}</span>}
                        {p.programa && (
                          <Badge className="border text-[10px] px-1.5 py-0 bg-blue-50 text-blue-800 border-blue-200">
                            {p.programa}
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Gerente: botão editar/preencher checklist */}
                    {isGerente && (
                      <Button
                        size="sm"
                        onClick={() => openChecklist(p)}
                        className={
                          cl
                            ? "bg-white border border-green-300 text-green-700 hover:bg-green-50 text-xs shadow-none"
                            : "bg-gradient-to-r from-green-700 to-green-600 text-white text-xs"
                        }
                      >
                        {cl ? (
                          <><Pencil className="w-3 h-3 mr-1" /> Preencher</>
                        ) : (
                          <><Plus className="w-3 h-3 mr-1" /> Preencher</>
                        )}
                      </Button>
                    )}
                  </div>

                  {/* Comprador: visualização resumida */}
                  {isComprador && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {cl ? (
                        <span className={`text-[10px] border px-2 py-0.5 rounded-full font-medium ${
                          getCompletionPercent(cl, p) === 100
                            ? "bg-green-100 text-green-700 border-green-200"
                            : getCompletionPercent(cl, p) > 0
                            ? "bg-orange-100 text-orange-700 border-orange-200"
                            : "bg-gray-100 text-gray-500 border-gray-200"
                        }`}>
                          {getCompletionPercent(cl, p)}% concluído
                        </span>
                      ) : (
                        <span className="text-[10px] border px-2 py-0.5 rounded-full font-medium bg-gray-100 text-gray-500 border-gray-200">Checklist pendente</span>
                      )}
                      {(() => {
                        const atrib = atribuicoesEfetivas.find((a) => a.produtor_id === p.id);
                        if (!atrib) return null;
                        const statusColors = { pendente: "bg-orange-100 text-orange-700 border-orange-200", em_andamento: "bg-blue-100 text-blue-700 border-blue-200", concluido: "bg-green-100 text-green-700 border-green-200" };
                        const statusLabels = { pendente: "Pendente", em_andamento: "Em Andamento", concluido: "Concluído" };
                        const s = atrib.status || "pendente";
                        return <span className={`text-[10px] border px-2 py-0.5 rounded-full font-medium ${statusColors[s]}`}>{statusLabels[s]}</span>;
                      })()}
                    </div>
                  )}

                  {/* Técnico: sem atribuição nem checklist */}
                  {!isGerente && !isComprador && !cl && !hasAtribuicao && (
                    <div className="flex items-center gap-1 mt-1">
                      <XCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs text-amber-600">Aguardando atribuição do gerente</span>
                    </div>
                  )}

                  {/* Técnico: tem atribuição ou checklist */}
                  {!isGerente && !isComprador && (cl || hasAtribuicao) && (
                    <div>
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center gap-2">
                          {cl && (
                            <span className={`text-[10px] border px-2 py-0.5 rounded-full font-medium ${
                              completionPercent === 100
                                ? "bg-green-100 text-green-700 border-green-200"
                                : completionPercent > 0
                                ? "bg-orange-100 text-orange-700 border-orange-200"
                                : "bg-gray-100 text-gray-500 border-gray-200"
                            }`}>
                              {completionPercent}% concluído
                            </span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => toggleExpand(p.id)}
                          className={getButtonClass(p)}
                        >
                          {expandedCards[p.id] ? (
                            <><ChevronUp className="w-3.5 h-3.5 mr-1" /> Fechar</>
                          ) : getTecnicoStatus(p) === "concluido" ? (
                            <><CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Concluído</>
                          ) : getTecnicoStatus(p) === "em_andamento" ? (
                            <><PlayCircle className="w-3.5 h-3.5 mr-1" /> Em Andamento</>
                          ) : (
                            <><PlayCircle className="w-3.5 h-3.5 mr-1" /> Pendente</>
                          )}
                        </Button>
                      </div>

                      {expandedCards[p.id] && (
                        <div className="mt-3">

                          {/* Data de Agendamento — sempre visível ao abrir o card */}
                          {(() => {
                            const atrib = atribuicoesEfetivas.find((a) => a.produtor_id === p.id);
                            return (
                              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                                <p className="text-xs font-bold text-blue-700 uppercase tracking-wide">📅 Agendamento da Visita</p>
                                <Label className="text-xs text-blue-800">Data agendada com o produtor</Label>
                                <Input
                                  type="date"
                                  className="h-8 text-xs bg-white"
                                  value={inlineEdits[p.id]?.data_agendamento_tecnico ?? (atrib?.data_agendamento_tecnico || "")}
                                  onChange={async (e) => {
                                    const val = e.target.value;
                                    setInlineField(p.id, "data_agendamento_tecnico", val);
                                    if (atrib) {
                                      await base44.entities.FazendaAtribuicao.update(atrib.id, { data_agendamento_tecnico: val });
                                      queryClient.invalidateQueries({ queryKey: ["fazenda-atribuicoes"] });
                                    }
                                  }}
                                />
                                {(inlineEdits[p.id]?.data_agendamento_tecnico || atrib?.data_agendamento_tecnico) && (
                                  <p className="text-[10px] text-green-700 font-medium">
                                    ✅ Visita agendada para {new Date((inlineEdits[p.id]?.data_agendamento_tecnico || atrib.data_agendamento_tecnico) + "T12:00:00").toLocaleDateString("pt-BR")}
                                  </p>
                                )}
                              </div>
                            );
                          })()}

                          {!cl && (
                            <div className="flex items-center gap-2 mb-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <XCircle className="w-4 h-4 text-amber-500 shrink-0" />
                              <span className="text-xs text-amber-700">
                                O gerente ainda não preencheu o checklist para esta fazenda. Aguarde para realizar a visita.
                              </span>
                            </div>
                          )}

                          {cl && (
                            <>
                              {/* Itens do checklist clicáveis */}
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">Checklist</span>
                                {fazItems.length > 0 && (
                                  <span className="text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full font-medium">
                                    {concluidosCount}/{fazItems.length} FAZER concluídos
                                  </span>
                                )}
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-1">
                                {CHECKLIST_FIELDS.map((f) => {
                                  const val = cl[f.key];
                                  const isFazer = val === "FAZER" || val === "PERFIL FAMILIAR";
                                  const feito = feitos.includes(f.key);
                                  if (isFazer) {
                                    return (
                                      <button
                                        key={f.key}
                                        type="button"
                                        onClick={() => toggleItemFeito(cl, f.key)}
                                        className={
                                          "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all " +
                                          (feito
                                            ? "bg-green-600 border-green-600 text-white shadow-sm"
                                            : "bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200")
                                        }
                                      >
                                        {feito ? (
                                          <CheckSquare className="w-4 h-4 shrink-0" />
                                        ) : (
                                          <Square className="w-4 h-4 shrink-0" />
                                        )}
                                        <span className="truncate">{f.label}</span>
                                        {val === "PERFIL FAMILIAR" && !feito && (
                                          <span className="ml-auto text-[9px] font-bold opacity-60">PF</span>
                                        )}
                                      </button>
                                    );
                                  } else {
                                    return (
                                      <div
                                        key={f.key}
                                        className="flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium bg-red-50 border-red-200 text-red-400 cursor-not-allowed"
                                      >
                                        <XCircle className="w-4 h-4 shrink-0 text-red-300" />
                                        <span className="truncate line-through decoration-red-400">{f.label}</span>
                                      </div>
                                    );
                                  }
                                })}
                              </div>

                              {/* Meeiros */}
                              {p.meeiro && (
                                <div className="mt-3 border-t pt-3">
                                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Meeiros</p>
                                  <div className="flex flex-wrap gap-2">
                                    {p.meeiro.split(/[,;\/\n]+/).map((m) => m.trim()).filter(Boolean).map((meeiro, idx) => {
                                      const mKey = `meeiro_${idx}_${meeiro}`;
                                      const feito = feitos.includes(mKey);
                                      return (
                                        <button
                                          key={mKey}
                                          type="button"
                                          onClick={() => toggleItemFeito(cl, mKey)}
                                          className={
                                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all " +
                                            (feito
                                              ? "bg-green-600 border-green-600 text-white"
                                              : "bg-white border-blue-400 text-blue-700 hover:bg-blue-50")
                                          }
                                        >
                                          {feito ? (
                                            <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                                          ) : (
                                            <Square className="w-3.5 h-3.5 shrink-0" />
                                          )}
                                          {meeiro}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Reporte */}
                              <div className="mt-4 border-t pt-3 space-y-3">
                                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Visita e Reporte</p>
                                {cl.perfil_visita && (
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">Perfil de Visita (definido pelo gerente)</Label>
                                    <div className="h-8 px-3 flex items-center bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-700">{cl.perfil_visita}</div>
                                  </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Reporte</Label>
                                    <Select
                                      value={inlineEdits[p.id]?.reporte ?? (cl.reporte || "")}
                                      onValueChange={(v) => setInlineField(p.id, "reporte", v)}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Selecione..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {REPORTE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs">Reporte Final</Label>
                                    <Select
                                      value={inlineEdits[p.id]?.reporte_final ?? (cl.reporte_final || "")}
                                      onValueChange={(v) => setInlineField(p.id, "reporte_final", v)}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Selecione..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {REPORTE_FINAL_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>

                              {/* Geolocalização — somente leitura, dados do Produtor */}
                              <div className="mt-4 border-t pt-3 space-y-3">
                                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Geolocalização da Fazenda</p>
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">Latitude</Label>
                                    <div className="h-8 px-3 flex items-center bg-gray-50 border border-gray-200 rounded-md text-xs font-mono text-gray-700">
                                      {p.latitude ?? cl.latitude ?? <span className="text-gray-400 italic">não informada</span>}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">Longitude</Label>
                                    <div className="h-8 px-3 flex items-center bg-gray-50 border border-gray-200 rounded-md text-xs font-mono text-gray-700">
                                      {p.longitude ?? cl.longitude ?? <span className="text-gray-400 italic">não informada</span>}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Informações Adicionais */}
                              <div className="mt-4 border-t pt-3 space-y-3">
                                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Informações Adicionais</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-xs">Adequação 30 dias (NA/Data)</Label>
                                    <Input
                                      className="h-8 text-xs"
                                      value={inlineEdits[p.id]?.adequacao ?? (cl.adequacao ?? "NA")}
                                      onChange={(e) => setInlineField(p.id, "adequacao", e.target.value)}
                                      placeholder="NA"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-xs text-gray-500">Responsável Verificação</Label>
                                    <div className="h-8 px-3 flex items-center bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-700">
                                      {cl.responsavel_verificacao || <span className="text-gray-400 italic">preenchido ao salvar</span>}
                                    </div>
                                  </div>
                                  {cl.data_verificacao && (
                                    <div className="space-y-1">
                                      <Label className="text-xs text-gray-500">Data de Conclusão</Label>
                                      <div className="h-8 px-3 flex items-center bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-700">{cl.data_verificacao}</div>
                                    </div>
                                  )}
                                </div>

                                {(() => {
                                  const adequacaoVal = inlineEdits[p.id]?.adequacao ?? (cl.adequacao ?? "NA");
                                  const showObs = adequacaoVal && adequacaoVal !== "NA";
                                  return showObs ? (
                                    <div className="space-y-1">
                                      <Label className="text-xs">Observação de Adequação</Label>
                                      <Textarea
                                        value={inlineEdits[p.id]?.observacao ?? (cl.observacao ?? "")}
                                        onChange={(e) => setInlineField(p.id, "observacao", e.target.value)}
                                        rows={2}
                                        className="resize-none text-sm"
                                        placeholder="Descreva a adequação necessária..."
                                      />
                                    </div>
                                  ) : null;
                                })()}

                                <div className="space-y-1">
                                  <Label className="text-xs">Observações Finais (Gerente)</Label>
                                  <div className="min-h-[3rem] p-2 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-700 whitespace-pre-wrap">
                                    {cl.observacoes_finais || <span className="text-gray-400 italic">Sem observações finais</span>}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}

                          {/* Botões */}
                          {(() => {
                            const edits = inlineEdits[p.id] || {};
                            const reporte = edits.reporte ?? cl?.reporte ?? "";
                            const todosFeitos = fazItems.length > 0 && fazItems.every((f) => feitos.includes(f.key));
                            const canConcluir = !!reporte && todosFeitos;
                            const missingMsg = !canConcluir
                              ? !reporte
                                ? "Informe o Reporte"
                                : "Conclua todos os itens FAZER"
                              : null;
                            return (
                              <div className="mt-4 pt-3 border-t space-y-2">
                                {!canConcluir && cl && (
                                  <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                    <XCircle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                                    <span>Para concluir: {missingMsg}</span>
                                  </div>
                                )}
                                <div className="flex gap-2 flex-wrap">
                                   {docLink && (
                                     <a
                                       href={docLink}
                                       target="_blank"
                                       rel="noopener noreferrer"
                                       className="flex-1 min-w-[140px]"
                                     >
                                       <Button
                                         size="sm"
                                         type="button"
                                         variant="outline"
                                         className="w-full border-blue-400 text-blue-700 hover:bg-blue-50"
                                       >
                                         <Upload className="w-3.5 h-3.5 mr-1.5" />
                                         Enviar Documentos
                                       </Button>
                                     </a>
                                   )}
                                   {!docLink && (
                                     <Button
                                       size="sm"
                                       type="button"
                                       variant="outline"
                                       className="flex-1 min-w-[140px] border-gray-300 text-gray-400 cursor-not-allowed"
                                       disabled
                                       title="Link não configurado pelo gerente"
                                     >
                                       <Upload className="w-3.5 h-3.5 mr-1.5" />
                                       Enviar Documentos
                                     </Button>
                                   )}
                                   <Button
                                     size="sm"
                                     variant="outline"
                                     onClick={() => collapseCard(p.id)}
                                     className="flex-1 border-gray-300 text-gray-600 hover:bg-gray-50"
                                     disabled={!!inlineSaving[p.id]}
                                   >
                                     Cancelar
                                   </Button>
                                   <Button
                                     size="sm"
                                     onClick={() => cl && handleInlineSave(p.id, cl, false)}
                                     className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                     disabled={!!inlineSaving[p.id] || !cl}
                                   >
                                     {inlineSaving[p.id] ? "Salvando..." : "Salvar"}
                                   </Button>
                                   <Button
                                     size="sm"
                                     onClick={() => cl && canConcluir && setDocConfirmPendente({ produtorId: p.id, cl })}
                                     className="flex-1 bg-gradient-to-r from-green-700 to-green-600 text-white"
                                     disabled={!!inlineSaving[p.id] || !cl || !canConcluir}
                                     title={missingMsg || ""}
                                   >
                                     {inlineSaving[p.id] ? "Salvando..." : "Concluir"}
                                   </Button>
                                 </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Gerente: indicador de conclusão + stats de agendamento */}
                  {isGerente && (
                    <div className="mt-2 flex items-center gap-3 flex-wrap">
                      {cl ? (
                        <div className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                          <span className="text-xs text-green-700 font-medium">{completionPercent}% concluído</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-xs text-amber-600">Checklist pendente</span>
                        </div>
                      )}
                      {(() => {
                        const atrib = atribuicoesEfetivas.find((a) => a.produtor_id === p.id);
                        if (!atrib) return null;
                        if (atrib.data_agendamento_tecnico) {
                          return (
                            <span className="text-[10px] bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full font-medium">
                              📅 Agendado: {new Date(atrib.data_agendamento_tecnico + "T12:00:00").toLocaleDateString("pt-BR")}
                            </span>
                          );
                        }
                        return (
                          <span className="text-[10px] bg-gray-100 text-gray-500 border border-gray-200 px-2 py-0.5 rounded-full">
                            Sem data agendada
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Paginação (apenas gerente) */}
      {isGerente && pageSize > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-500">
            Página {currentPage} de {totalPages} · {paginated.length} registros
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="h-7 text-xs px-2">«</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-7 text-xs px-2">‹</Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
              const page = start + i;
              return page <= totalPages ? (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="h-7 text-xs px-2.5"
                >
                  {page}
                </Button>
              ) : null;
            })}
            <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-7 text-xs px-2">›</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="h-7 text-xs px-2">»</Button>
          </div>
        </div>
      )}

      {/* Popup confirmação de envio de documentação */}
      <Dialog open={!!docConfirmPendente} onOpenChange={(v) => { if (!v) setDocConfirmPendente(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <Upload className="w-4 h-4" />
              Confirmação de Conclusão
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-semibold mb-1">📄 Você enviou a documentação?</p>
              <p className="text-xs text-blue-600">Informe se a documentação desta visita foi enviada antes de concluir.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-gray-300 text-gray-600"
                onClick={() => setDocConfirmPendente(null)}
              >
                Cancelar
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-amber-400 text-amber-700 hover:bg-amber-50"
                onClick={async () => {
                  const { produtorId, cl } = docConfirmPendente;
                  setDocConfirmPendente(null);
                  // Concluir sem marcar doc_enviada
                  const atrib = atribuicoesEfetivas.find(a => a.produtor_id === produtorId);
                  if (atrib) await base44.entities.FazendaAtribuicao.update(atrib.id, { doc_enviada: false });
                  await handleInlineSave(produtorId, cl, true);
                }}
              >
                Não
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={async () => {
                  const { produtorId, cl } = docConfirmPendente;
                  setDocConfirmPendente(null);
                  // Marcar doc_enviada antes de concluir
                  const atrib = atribuicoesEfetivas.find(a => a.produtor_id === produtorId);
                  if (atrib) await base44.entities.FazendaAtribuicao.update(atrib.id, { doc_enviada: true });
                  await handleInlineSave(produtorId, cl, true);
                }}
              >
                Sim, enviei
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Meeiros da Propriedade */}
      <Dialog open={!!meirosDialogProdutor} onOpenChange={(v) => { if (!v) setMeirosDialogProdutor(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-blue-700">
              <Eye className="w-4 h-4" />
              Meeiros — <span className="uppercase">{meirosDialogProdutor?.nome}</span>
            </DialogTitle>
          </DialogHeader>
          {meirosDialogProdutor && (() => {
            const lista = meirosByFazendaId[meirosDialogProdutor.produtor_id] || [];
            return lista.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhum meeiro cadastrado para esta propriedade.</p>
            ) : (
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {["Nome Meeiro", "Gênero", "ms_temp_id", "stakeholder_id", "farmer_id_fk"].map(h => (
                        <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((me, i) => (
                      <tr key={me.id} className={`border-b ${i % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
                        <td className="px-3 py-2 text-sm font-semibold text-gray-800">{me.nome_meeiro}</td>
                        <td className="px-3 py-2 text-xs text-gray-600">{me.ms_gender || "—"}</td>
                        <td className="px-3 py-2 text-xs font-mono text-gray-400">{me.ms_temp_id || "—"}</td>
                        <td className="px-3 py-2 text-xs font-mono text-gray-400">{me.stakeholder_id || "—"}</td>
                        <td className="px-3 py-2 text-xs font-mono text-gray-400">{me.farmer_id_fk || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog de edição (gerente) */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl w-full max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <ClipboardList className="w-4 h-4" />
              Checklist — <span className="uppercase">{selectedProdutor?.nome}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-gray-50 rounded-lg p-3 text-xs text-gray-700">
            {selectedProdutor?.produtor_id && (
              <div><span className="font-semibold">ID Fazenda:</span> {selectedProdutor.produtor_id}</div>
            )}
            {selectedProdutor?.fornecedor && (
              <div><span className="font-semibold">Fornecedor:</span> {selectedProdutor.fornecedor}</div>
            )}
            {selectedProdutor?.municipio && (
              <div><span className="font-semibold">Município:</span> {selectedProdutor.municipio}</div>
            )}
            {selectedProdutor?.nome_fazenda && (
              <div><span className="font-semibold">Fazenda:</span> {selectedProdutor.nome_fazenda}</div>
            )}
            {selectedProdutor?.programa && (
              <div><span className="font-semibold">Programa:</span> {selectedProdutor.programa}</div>
            )}
          </div>

          <div className="space-y-5 pt-1">
            {/* Itens do checklist — toggles clicáveis */}
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Itens do Checklist</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {CHECKLIST_FIELDS.map((f) => {
                  const val = form[f.key];
                  const isFazer = val === "FAZER" || val === "PERFIL FAMILIAR";
                  const isNaoFazer = val === NAO_FAZER;
                  const isPF = val === "PERFIL FAMILIAR";

                  // Cicla: NÃO FAZER → FAZER → (PERFIL FAMILIAR se disponível) → NÃO FAZER
                  const cycle = () => {
                    if (f.extra) {
                      if (val === NAO_FAZER) return setField(f.key, "FAZER");
                      if (val === "FAZER") return setField(f.key, "PERFIL FAMILIAR");
                      return setField(f.key, NAO_FAZER);
                    }
                    setField(f.key, isFazer ? NAO_FAZER : "FAZER");
                  };

                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={cycle}
                      className={
                        "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-xs font-medium transition-all text-left w-full " +
                        (isFazer
                          ? isPF
                            ? "bg-blue-100 border-blue-400 text-blue-800 hover:bg-blue-200"
                            : "bg-green-100 border-green-400 text-green-800 hover:bg-green-200"
                          : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100")
                      }
                    >
                      {isFazer ? (
                        <CheckSquare className="w-4 h-4 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 shrink-0" />
                      )}
                      <span className="truncate flex-1">{f.label}</span>
                      {isPF && <span className="text-[9px] font-bold opacity-70 bg-blue-200 px-1 rounded">PF</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visita e Reporte */}
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Visita e Reporte</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Perfil de Visita</Label>
                  <Select value={form.perfil_visita || ""} onValueChange={(v) => setField("perfil_visita", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {PERFIS_VISITA.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Reporte</Label>
                  <Select value={form.reporte || ""} onValueChange={(v) => setField("reporte", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {REPORTE_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Reporte Final</Label>
                  <Select value={form.reporte_final || ""} onValueChange={(v) => setField("reporte_final", v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {REPORTE_FINAL_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Geolocalização */}
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Geolocalização</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Latitude</Label>
                  <Input className="h-8 text-xs" value={form.latitude || ""} onChange={(e) => setField("latitude", e.target.value)} placeholder="-16.864..." />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Longitude</Label>
                  <Input className="h-8 text-xs" value={form.longitude || ""} onChange={(e) => setField("longitude", e.target.value)} placeholder="-39.535..." />
                </div>
              </div>
            </div>

            {/* Informações Adicionais */}
            <div>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Informações Adicionais</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Adequação 30 dias (NA/Data)</Label>
                  <Input className="h-8 text-xs" value={form.adequacao || ""} onChange={(e) => setField("adequacao", e.target.value)} placeholder="NA" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Responsável Verificação</Label>
                  <Input className="h-8 text-xs" value={form.responsavel_verificacao || ""} onChange={(e) => setField("responsavel_verificacao", e.target.value)} />
                </div>
                <div className="space-y-1">
                   <Label className="text-xs">Data Conclusão</Label>
                   <Input type="date" className="h-8 text-xs" value={form.data_verificacao || ""} onChange={(e) => setField("data_verificacao", e.target.value)} />
                 </div>
              </div>
              {form.adequacao && form.adequacao !== "NA" && (
                <div className="space-y-1 mt-3">
                  <Label className="text-xs">Observação de Adequação</Label>
                  <Textarea value={form.observacao || ""} onChange={(e) => setField("observacao", e.target.value)} rows={2} className="resize-none text-sm" placeholder="Descreva a adequação necessária..." />
                </div>
              )}
              <div className="space-y-1 mt-2">
                <Label className="text-xs">Observações Finais</Label>
                <Textarea value={form.observacoes_finais || ""} onChange={(e) => setField("observacoes_finais", e.target.value)} rows={2} className="resize-none text-sm" />
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-4 border-t sticky bottom-0 bg-white">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button
              disabled={saving}
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-green-700 to-green-600 text-white"
            >
              {saving ? "Salvando..." : "Salvar Checklist"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}