import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Search, Settings, CheckSquare, Square, ChevronDown, ChevronUp,
  Save, Loader2, ClipboardPaste, AlertCircle, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

// ─── Campos do checklist ────────────────────────────────────────────────────
const CHECKLIST_FIELDS = [
  { key: "poligono",             label: "Polígono" },
  { key: "coord_geoespacial",    label: "Coord. Geoespacial" },
  { key: "termo_adesao",         label: "Termo de Adesão" },
  { key: "codigo_fornecedor",    label: "Cód. Fornecedor" },
  { key: "ficha_recomendacao",   label: "Ficha Recomendação" },
  { key: "doc_pessoal",          label: "Doc. Pessoal" },
  { key: "doc_fazenda",          label: "Doc. Fazenda" },
  { key: "doc_trabalhador",      label: "Doc. Trabalhador" },
  { key: "all_farmers",          label: "All Farmers" },
  { key: "cadastro_meeiros",     label: "Cad. Meeiros" },
  { key: "pesquisa_anual",       label: "Pesquisa Anual" },
  { key: "checklist",            label: "Checklist" },
  { key: "asc_pesquisa",         label: "ASC Pesquisa" },
  { key: "clmrs_f1",             label: "CLMRS F1", extraOption: "PERFIL FAMILIAR" },
  { key: "clmrs_f2",             label: "CLMRS F2" },
  { key: "treinamento_coaching", label: "Acomp. Visitas" },
  { key: "treinamento_agri",     label: "Cód. Fornec. Agro" },
  { key: "drive",                label: "Drive" },
];

const PROGRAMAS = ["Nestlé/AtSource", "Mondelez/Cocoa Life", "Mars", "Outro"];
const STATUS_COLORS = {
  pendente:     "bg-yellow-100 text-yellow-800 border-yellow-200",
  em_andamento: "bg-blue-100 text-blue-800 border-blue-200",
  concluido:    "bg-green-100 text-green-800 border-green-200",
};
const STATUS_LABELS = { pendente: "Pendente", em_andamento: "Em Andamento", concluido: "Concluído" };

const NAO_FAZER = "NÃO FAZER";
const defaultTemplate = CHECKLIST_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: NAO_FAZER }), {});

// ─── Mapa de cabeçalhos para campos do checklist ─────────────────────────────
const HEADER_MAP = {
  // identificadores
  "id_fazenda": "_idFazenda", "id fazenda": "_idFazenda", "produtor_id": "_idFazenda",
  // dados do produtor
  "tecnico": "tecnico_email", "tecnico_email": "tecnico_email",
  "programa": "programa", "certificacao": "programa", "certificação": "programa",
  "fornecedor": "fornecedor", "intermediario": "fornecedor", "intermediário": "fornecedor",
  "municipio": "municipio", "município": "municipio", "cidade": "municipio",
  "latitude": "latitude", "longitude": "longitude",
  "nome_fazenda": "nome_fazenda", "nome fazenda": "nome_fazenda",
  "comprador": "comprador_responsavel", "comprador_responsavel": "comprador_responsavel",
  // campos do checklist
  "poligono": "poligono", "polígono": "poligono",
  "coord_geoespacial": "coord_geoespacial", "coord. geoespacial": "coord_geoespacial",
  "coord geoespacial": "coord_geoespacial",
  "termo_adesao": "termo_adesao", "termo adesao": "termo_adesao", "termo adesão": "termo_adesao",
  "codigo_fornecedor": "codigo_fornecedor", "cód. fornecedor": "codigo_fornecedor",
  "cod. fornecedor": "codigo_fornecedor", "codigo fornecedor": "codigo_fornecedor",
  "ficha_recomendacao": "ficha_recomendacao", "ficha recomendação": "ficha_recomendacao",
  "ficha recomendacao": "ficha_recomendacao",
  "doc_pessoal": "doc_pessoal", "doc. pessoal": "doc_pessoal", "doc pessoal": "doc_pessoal",
  "doc_fazenda": "doc_fazenda", "doc. fazenda": "doc_fazenda", "doc fazenda": "doc_fazenda",
  "doc_trabalhador": "doc_trabalhador", "doc. trabalhador": "doc_trabalhador",
  "doc trabalhador": "doc_trabalhador",
  "all_farmers": "all_farmers", "all farmers": "all_farmers",
  "cadastro_meeiros": "cadastro_meeiros", "cad. meeiros": "cadastro_meeiros",
  "cadastro meeiros": "cadastro_meeiros",
  "pesquisa_anual": "pesquisa_anual", "pesquisa anual": "pesquisa_anual",
  "checklist": "checklist",
  "asc_pesquisa": "asc_pesquisa", "asc pesquisa": "asc_pesquisa",
  "clmrs_f1": "clmrs_f1", "clmrs f1": "clmrs_f1",
  "clmrs_f2": "clmrs_f2", "clmrs f2": "clmrs_f2",
  "treinamento_coaching": "treinamento_coaching", "acomp. visitas": "treinamento_coaching",
  "coaching treinam": "treinamento_coaching",
  "treinamento_agri": "treinamento_agri", "cód. fornec. agro": "treinamento_agri",
  "agri supplier treinam": "treinamento_agri",
  "drive": "drive",
  "reporte": "reporte",
  "adequacao": "adequacao", "adequação": "adequacao",
  "observacao": "observacao", "observação": "observacao",
  "responsavel_verificacao": "responsavel_verificacao",
  "data_verificacao": "data_verificacao",
};

// Normaliza valores FAZER / NÃO FAZER de variações comuns da planilha
const normalizeFazerValue = (val) => {
  if (!val) return null;
  const v = String(val).trim().toUpperCase();
  if (v === "FAZER" || v === "F" || v === "SIM" || v === "S" || v === "1" || v === "TRUE" || v === "X") return "FAZER";
  if (v === "NÃO FAZER" || v === "NAO FAZER" || v === "NF" || v === "NÃO" || v === "NAO" ||
      v === "N" || v === "0" || v === "FALSE" || v === "—" || v === "-") return NAO_FAZER;
  if (v === "PERFIL FAMILIAR" || v === "PF") return "PERFIL FAMILIAR";
  return val.trim() || null;
};

// ─── Parser do texto colado ───────────────────────────────────────────────────
const parsePasteText = (text) => {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split("\t").map(h => h.trim().toLowerCase());
  const fieldMap = headers.map(h => HEADER_MAP[h] || null);

  return lines.slice(1).map(line => {
    const cols = line.split("\t");
    const idFazenda = cols[0]?.trim();
    if (!idFazenda) return null;

    const obj = { _idFazenda: idFazenda };
    fieldMap.forEach((field, i) => {
      if (!field || field === "_idFazenda") return;
      const raw = cols[i]?.trim();
      if (!raw) return;
      // Campos checklist
      const isCheckField = CHECKLIST_FIELDS.some(f => f.key === field);
      obj[field] = isCheckField ? normalizeFazerValue(raw) : raw;
    });
    return obj;
  }).filter(Boolean);
};

export default function ChecklistConfiguracao() {
  const [search, setSearch] = useState("");
  const [programaFilter, setProgramaFilter] = useState("all");
  const [tecnicoFilter, setTecnicoFilter] = useState("all");
  const [compradorFilter, setCompradorFilter] = useState("all");
  const [filialFilter, setFilialFilter] = useState("all");
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [template, setTemplate] = useState({ ...defaultTemplate });
  const [showTemplate, setShowTemplate] = useState(true);
  const [saving, setSaving] = useState(false);

  // Bulk paste state
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pastePreview, setPastePreview] = useState([]);
  const [pasting, setPasting] = useState(false);
  const [pasteProgress, setPasteProgress] = useState({ done: 0, total: 0 });

  const queryClient = useQueryClient();

  // ─── Dados ────────────────────────────────────────────────────────────────
  const { data: produtores = [], isLoading: loadingP } = useQuery({
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

  // ─── Maps ─────────────────────────────────────────────────────────────────
  const atribMap = useMemo(() => {
    const m = {};
    atribuicoes.forEach(a => { m[a.produtor_id] = a; });
    return m;
  }, [atribuicoes]);

  // checklist deduplicado por produtor_id (UUID)
  const checklistMap = useMemo(() => {
    const m = {};
    checklists.forEach(c => {
      const ex = m[c.produtor_id];
      if (!ex || new Date(c.updated_date) > new Date(ex.updated_date)) m[c.produtor_id] = c;
    });
    return m;
  }, [checklists]);

  // produtor_id (ID Fazenda string) → id UUID do registro Produtor
  const produtorIdMap = useMemo(() => {
    const m = {};
    produtores.forEach(p => { if (p.produtor_id) m[p.produtor_id] = p.id; });
    return m;
  }, [produtores]);

  // id UUID → registro Produtor
  const prodMap = useMemo(() => {
    const m = {};
    produtores.forEach(p => { m[p.id] = p; });
    return m;
  }, [produtores]);

  const compradoresUnicos = useMemo(
    () => [...new Set(produtores.map(p => p.comprador_responsavel).filter(Boolean))].sort(),
    [produtores]
  );
  const filiaisUnicas = useMemo(
    () => [...new Set(produtores.map(p => p.filial_responsavel).filter(Boolean))].sort(),
    [produtores]
  );

  const resetPage = () => setCurrentPage(1);

  const filtered = useMemo(() => produtores.filter(p => {
    const q = search.toLowerCase();
    const atrib = atribMap[p.id];
    const matchSearch = !search ||
      p.nome?.toLowerCase().includes(q) ||
      p.cpf?.toLowerCase().includes(q) ||
      p.municipio?.toLowerCase().includes(q) ||
      p.fornecedor?.toLowerCase().includes(q) ||
      p.nome_fazenda?.toLowerCase().includes(q) ||
      p.produtor_id?.toLowerCase().includes(q) ||
      atrib?.tecnico_nome?.toLowerCase().includes(q);
    const matchPrograma  = programaFilter === "all"  || p.programa === programaFilter;
    const matchTecnico   = tecnicoFilter === "all"   || atrib?.tecnico_email === tecnicoFilter || p.tecnico_responsavel === tecnicoFilter;
    const matchComprador = compradorFilter === "all" || (p.comprador_responsavel || "") === compradorFilter;
    const matchFilial    = filialFilter === "all"    || (p.filial_responsavel || "") === filialFilter;
    return matchSearch && matchPrograma && matchTecnico && matchComprador && matchFilial;
  }), [produtores, search, programaFilter, tecnicoFilter, compradorFilter, filialFilter, atribMap]);

  const totalPages = pageSize === 0 ? 1 : Math.ceil(filtered.length / pageSize);
  const paginated  = pageSize === 0 ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // ─── Seleção ──────────────────────────────────────────────────────────────
  const allPageSelected = paginated.length > 0 && paginated.every(p => selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => { const n = new Set(prev); paginated.forEach(p => n.delete(p.id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); paginated.forEach(p => n.add(p.id)); return n; });
    }
  };

  const toggleSelect = (id) => setSelectedIds(prev => {
    const n = new Set(prev);
    if (n.has(id)) n.delete(id); else n.add(id);
    return n;
  });

  const selectFiltered = () => setSelectedIds(new Set(filtered.map(p => p.id)));
  const clearSelection = () => setSelectedIds(new Set());

  // ─── Template ─────────────────────────────────────────────────────────────
  const toggleField = (key) => setTemplate(prev => ({
    ...prev,
    [key]: prev[key] === "FAZER" ? NAO_FAZER : "FAZER",
  }));

  const setAllFazer    = () => setTemplate(CHECKLIST_FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: "FAZER" }), {}));
  const setAllNaoFazer = () => setTemplate({ ...defaultTemplate });

  const fazendoCount = Object.values(template).filter(v => v === "FAZER").length;

  // ─── Aplicar template ─────────────────────────────────────────────────────
  const handleApply = async () => {
    if (selectedIds.size === 0) { toast.error("Selecione ao menos um produtor."); return; }
    setSaving(true);
    const ids = [...selectedIds];
    let created = 0, updated = 0;
    for (const produtorId of ids) {
      const existing = checklistMap[produtorId];
      if (existing) {
        await base44.entities.FazendaChecklist.update(existing.id, template);
        updated++;
      } else {
        await base44.entities.FazendaChecklist.create({ ...template, produtor_id: produtorId });
        created++;
      }
      await new Promise(r => setTimeout(r, 400));
    }
    queryClient.invalidateQueries({ queryKey: ["fazenda-checklists"] });
    setSaving(false);
    toast.success(`✅ Aplicado em ${ids.length} produtor(es): ${created} criado(s), ${updated} atualizado(s).`);
  };

  // ─── Bulk Paste ───────────────────────────────────────────────────────────
  const handlePasteChange = (text) => {
    setPasteText(text);
    setPastePreview(parsePasteText(text));
  };

  const handleBulkPaste = async () => {
    const records = parsePasteText(pasteText);
    if (!records.length) { toast.error("Nenhum registro válido."); return; }

    setPasting(true);
    let created = 0, updated = 0, notFound = 0;
    const toProcess = [];

    for (const r of records) {
      const { _idFazenda, ...fields } = r;
      const produtorRecordId = produtorIdMap[_idFazenda];
      if (!produtorRecordId) { notFound++; continue; }

      // Atualizar dados do Produtor (lat, lng, programa, fornecedor, etc.)
      const produtorUpdates = {};
      if (fields.latitude)              produtorUpdates.latitude  = parseFloat(fields.latitude)  || fields.latitude;
      if (fields.longitude)             produtorUpdates.longitude = parseFloat(fields.longitude) || fields.longitude;
      if (fields.programa)              produtorUpdates.programa  = fields.programa;
      if (fields.fornecedor)            produtorUpdates.fornecedor = fields.fornecedor;
      if (fields.municipio)             produtorUpdates.municipio = fields.municipio;
      if (fields.nome_fazenda)          produtorUpdates.nome_fazenda = fields.nome_fazenda;
      if (fields.comprador_responsavel) produtorUpdates.comprador_responsavel = fields.comprador_responsavel;
      if (fields.tecnico_email) {
        produtorUpdates.tecnico_responsavel = fields.tecnico_email;
      }

      // Campos do checklist
      const checklistData = {};
      CHECKLIST_FIELDS.forEach(f => {
        if (fields[f.key] != null) checklistData[f.key] = fields[f.key];
      });
      if (fields.tecnico_email) checklistData.tecnico_email = fields.tecnico_email;
      if (fields.reporte)       checklistData.reporte       = fields.reporte;
      if (fields.adequacao)     checklistData.adequacao     = fields.adequacao;
      if (fields.observacao)    checklistData.observacao    = fields.observacao;
      if (fields.responsavel_verificacao) checklistData.responsavel_verificacao = fields.responsavel_verificacao;
      if (fields.data_verificacao)        checklistData.data_verificacao        = fields.data_verificacao;
      if (fields.latitude)  checklistData.latitude  = parseFloat(fields.latitude)  || null;
      if (fields.longitude) checklistData.longitude = parseFloat(fields.longitude) || null;

      toProcess.push({ produtorRecordId, produtorUpdates, checklistData, isNew: !checklistMap[produtorRecordId] });
    }

    setPasteProgress({ done: 0, total: toProcess.length });

    for (const item of toProcess) {
      const { produtorRecordId, produtorUpdates, checklistData, isNew } = item;

      // Atualizar Produtor se houver dados
      if (Object.keys(produtorUpdates).length > 0) {
        await base44.entities.Produtor.update(produtorRecordId, produtorUpdates);
      }

      // Criar ou atualizar checklist
      const existing = checklistMap[produtorRecordId];
      if (existing) {
        await base44.entities.FazendaChecklist.update(existing.id, { ...checklistData, produtor_id: produtorRecordId });
        updated++;
      } else {
        await base44.entities.FazendaChecklist.create({ ...checklistData, produtor_id: produtorRecordId });
        created++;
      }

      setPasteProgress(p => ({ ...p, done: p.done + 1 }));
      await new Promise(r => setTimeout(r, 600));
    }

    queryClient.invalidateQueries({ queryKey: ["fazenda-checklists"] });
    queryClient.invalidateQueries({ queryKey: ["produtores"] });

    const parts = [
      created > 0  && `${created} checklist(s) criado(s)`,
      updated > 0  && `${updated} atualizado(s)`,
      notFound > 0 && `${notFound} ID(s) não encontrado(s)`,
    ].filter(Boolean).join(" · ");

    if (created + updated > 0) toast.success(`✅ ${parts}`);
    else toast.info(`ℹ️ ${parts || "Nenhum registro processado"}`);

    setShowPaste(false);
    setPasteText("");
    setPastePreview([]);
    setPasting(false);
    setPasteProgress({ done: 0, total: 0 });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Checklist Configuração</h1>
            <p className="text-xs text-gray-500">Configure FAZER/NÃO FAZER por produtor ou importe dados via planilha</p>
          </div>
        </div>
        <Button
          onClick={() => setShowPaste(true)}
          className="border-purple-300 text-purple-700 hover:bg-purple-50 bg-white border"
        >
          <ClipboardPaste className="w-4 h-4 mr-1" /> Colar Dados em Massa
        </Button>
      </div>

      {/* Template de configuração */}
      <Card className="shadow-sm mb-5 border-purple-200">
        <CardContent className="p-4">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setShowTemplate(v => !v)}
          >
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-700 text-sm">Template de Atividades (FAZER / NÃO FAZER)</span>
              <Badge className="bg-purple-100 text-purple-800 border-purple-200 border text-[10px]">
                {fazendoCount} FAZER · {CHECKLIST_FIELDS.length - fazendoCount} NÃO FAZER
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setAllFazer(); }}
                className="h-7 text-xs px-2 border-green-300 text-green-700 hover:bg-green-50">
                Todos FAZER
              </Button>
              <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); setAllNaoFazer(); }}
                className="h-7 text-xs px-2 border-red-300 text-red-700 hover:bg-red-50">
                Todos NÃO FAZER
              </Button>
              {showTemplate ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </div>
          </div>

          {showTemplate && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {CHECKLIST_FIELDS.map(f => {
                const isFazer = template[f.key] === "FAZER";
                return (
                  <button key={f.key} type="button" onClick={() => toggleField(f.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${
                      isFazer
                        ? "bg-green-600 border-green-600 text-white shadow-sm"
                        : "bg-white border-gray-300 text-gray-500 hover:border-gray-400"
                    }`}>
                    {isFazer ? <CheckSquare className="w-3.5 h-3.5 shrink-0" /> : <Square className="w-3.5 h-3.5 shrink-0" />}
                    <span className="truncate">{f.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Barra de ação aplicar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm font-semibold text-gray-700">{selectedIds.size} produtor(es) selecionado(s)</span>
          {selectedIds.size > 0 && (
            <>
              <button onClick={clearSelection} className="text-xs text-red-500 hover:underline">Limpar seleção</button>
              <span className="text-gray-300">|</span>
            </>
          )}
          <button onClick={selectFiltered} className="text-xs text-blue-600 hover:underline">
            Selecionar todos filtrados ({filtered.length})
          </button>
        </div>
        <Button
          onClick={handleApply}
          disabled={saving || selectedIds.size === 0}
          className="bg-gradient-to-r from-purple-700 to-purple-600 text-white hover:from-purple-800 hover:to-purple-700 gap-2"
        >
          {saving
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Aplicando...</>
            : <><Save className="w-4 h-4" /> Aplicar em {selectedIds.size} produtor(es)</>}
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar nome, fazenda, ID, técnico..." value={search}
            onChange={e => { setSearch(e.target.value); resetPage(); }} className="pl-9" />
        </div>
        <Select value={programaFilter} onValueChange={v => { setProgramaFilter(v); resetPage(); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Programa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos programas</SelectItem>
            {PROGRAMAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tecnicoFilter} onValueChange={v => { setTecnicoFilter(v); resetPage(); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Técnico" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos técnicos</SelectItem>
            {tecnicos.filter(t => t.ativo !== false).map(t => (
              <SelectItem key={t.email} value={t.email}>{t.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={compradorFilter} onValueChange={v => { setCompradorFilter(v); resetPage(); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Comprador" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos compradores</SelectItem>
            {compradoresUnicos.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filialFilter} onValueChange={v => { setFilialFilter(v); resetPage(); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Filial" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas filiais</SelectItem>
            {filiaisUnicas.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); resetPage(); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="100">100 por página</SelectItem>
            <SelectItem value="250">250 por página</SelectItem>
            <SelectItem value="500">500 por página</SelectItem>
            <SelectItem value="0">Todos</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-400 self-center shrink-0">{filtered.length} de {produtores.length}</span>
      </div>

      {/* Tabela */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {loadingP ? (
            <div className="p-12 text-center"><div className="animate-spin rounded-full h-10 w-10 border-t-4 border-purple-600 mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Settings className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum registro encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-3 bg-gray-50 w-10">
                      <button onClick={toggleSelectAll} className="flex items-center justify-center">
                        {allPageSelected
                          ? <CheckSquare className="w-4 h-4 text-purple-600" />
                          : <Square className="w-4 h-4 text-gray-400" />}
                      </button>
                    </th>
                    {["ID Fazenda", "Nome / Fazenda", "Município", "Programa", "Técnico", "Comprador", "Status Visita", "Lat", "Lng"].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase whitespace-nowrap bg-gray-50">{h}</th>
                    ))}
                    {CHECKLIST_FIELDS.map(f => (
                      <th key={f.key} className="px-2 py-3 text-center text-[9px] font-bold text-green-700 uppercase whitespace-nowrap bg-green-50 max-w-[60px]">
                        <span className="block truncate max-w-[60px]" title={f.label}>{f.label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p, i) => {
                    const atrib = atribMap[p.id];
                    const cl = checklistMap[p.id];
                    const isSelected = selectedIds.has(p.id);
                    const tecnicoNome = atrib?.tecnico_nome || p.tecnico_responsavel || "—";
                    return (
                      <tr key={p.id} onClick={() => toggleSelect(p.id)}
                        className={`border-b transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-purple-50 hover:bg-purple-100"
                            : i % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50/50 hover:bg-gray-100/50"
                        }`}>
                        <td className="px-3 py-2 text-center" onClick={e => { e.stopPropagation(); toggleSelect(p.id); }}>
                          {isSelected
                            ? <CheckSquare className="w-4 h-4 text-purple-600 mx-auto" />
                            : <Square className="w-4 h-4 text-gray-300 mx-auto" />}
                        </td>
                        <td className="px-3 py-2 text-xs font-mono text-gray-500 whitespace-nowrap">{p.produtor_id || "—"}</td>
                        <td className="px-3 py-2">
                          <p className="font-semibold text-gray-800 text-xs uppercase whitespace-nowrap">{p.nome}</p>
                          {p.nome_fazenda && <p className="text-[10px] text-gray-500">{p.nome_fazenda}</p>}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{p.municipio || "—"}</td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          {p.programa
                            ? <span className="px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-medium">{p.programa}</span>
                            : "—"}
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{tecnicoNome}</td>
                        <td className="px-3 py-2 text-xs text-gray-600 whitespace-nowrap">{p.comprador_responsavel || "—"}</td>
                        <td className="px-3 py-2">
                          <Badge className={`border text-[10px] px-1.5 py-0 whitespace-nowrap ${STATUS_COLORS[atrib?.status || "pendente"]}`}>
                            {STATUS_LABELS[atrib?.status || "pendente"]}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-[10px] font-mono text-gray-400">{p.latitude != null ? String(p.latitude).slice(0,8) : "—"}</td>
                        <td className="px-3 py-2 text-[10px] font-mono text-gray-400">{p.longitude != null ? String(p.longitude).slice(0,8) : "—"}</td>
                        {CHECKLIST_FIELDS.map(f => {
                          const val = cl?.[f.key];
                          const isFazer = val === "FAZER" || val === "PERFIL FAMILIAR";
                          return (
                            <td key={f.key} className="px-2 py-2 text-center">
                              {!cl
                                ? <span className="text-[9px] text-gray-300">—</span>
                                : isFazer
                                  ? <span className="inline-block w-3.5 h-3.5 rounded-full bg-green-500 mx-auto" title={val} />
                                  : <span className="inline-block w-3.5 h-3.5 rounded-full bg-gray-200 mx-auto" title="NÃO FAZER" />}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {pageSize > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-500">Página {currentPage} de {totalPages} · {paginated.length} registros</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="h-7 text-xs px-2">«</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-7 text-xs px-2">‹</Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
              const page = start + i;
              return page <= totalPages ? (
                <Button key={page} variant={page === currentPage ? "default" : "outline"} size="sm"
                  onClick={() => setCurrentPage(page)} className="h-7 text-xs px-2.5">{page}</Button>
              ) : null;
            })}
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-7 text-xs px-2">›</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="h-7 text-xs px-2">»</Button>
          </div>
        </div>
      )}

      {/* ─── Dialog Colar em Massa ─────────────────────────────────────────── */}
      <Dialog open={showPaste} onOpenChange={v => { if (pasting) return; setShowPaste(v); if (!v) { setPasteText(""); setPastePreview([]); } }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-700">
              <ClipboardPaste className="w-4 h-4" /> Importar Dados em Massa
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* Instruções */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
              <p className="font-semibold">📋 Como usar:</p>
              <p>Copie as colunas da planilha <strong>incluindo o cabeçalho</strong>. A 1ª coluna deve ser <strong>ID Fazenda</strong>. Os dados serão usados para atualizar o produtor <em>e</em> criar/atualizar o checklist FAZER/NÃO FAZER.</p>
              <div className="bg-blue-100 rounded px-2 py-1.5 font-mono text-[10px] text-blue-700 mt-1 whitespace-nowrap overflow-x-auto">
                ID Fazenda · Técnico · Programa · Latitude · Longitude · Polígono · Coord. Geoespacial · Termo de Adesão · Cód. Fornecedor · ... (campos FAZER/NÃO FAZER)
              </div>
              <p className="text-[10px] text-blue-600 mt-1">Valores aceitos para checklist: <strong>FAZER, F, SIM, S, 1, X</strong> → FAZER · <strong>NÃO FAZER, NAO FAZER, NF, N, 0</strong> → NÃO FAZER · <strong>PERFIL FAMILIAR, PF</strong></p>
            </div>

            <Textarea
              rows={8}
              placeholder="Cole aqui os dados copiados da planilha (com cabeçalho)..."
              value={pasteText}
              onChange={e => handlePasteChange(e.target.value)}
              className="font-mono text-xs"
            />

            {/* Preview */}
            {pastePreview.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-700">{pastePreview.length} linha(s) reconhecida(s)</span>
                </div>
                <div className="overflow-x-auto border rounded-lg max-h-56">
                  <table className="w-full text-[10px]">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-2 py-1 text-left text-gray-500 whitespace-nowrap">ID Fazenda</th>
                        <th className="px-2 py-1 text-left text-gray-500 whitespace-nowrap">Nome Produtor</th>
                        <th className="px-2 py-1 text-left text-gray-500 whitespace-nowrap">Técnico</th>
                        <th className="px-2 py-1 text-left text-gray-500 whitespace-nowrap">Programa</th>
                        <th className="px-2 py-1 text-left text-gray-500 whitespace-nowrap">Lat</th>
                        <th className="px-2 py-1 text-left text-gray-500 whitespace-nowrap">Lng</th>
                        <th className="px-2 py-1 text-left text-gray-500 whitespace-nowrap">Ação</th>
                        <th className="px-2 py-1 text-left text-gray-500 whitespace-nowrap">Campos FAZER</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pastePreview.slice(0, 25).map((r, i) => {
                        const prodRecordId = produtorIdMap[r._idFazenda];
                        const produtor = prodRecordId ? prodMap[prodRecordId] : null;
                        const existing = prodRecordId ? checklistMap[prodRecordId] : null;
                        const fazerCount = CHECKLIST_FIELDS.filter(f => r[f.key] === "FAZER" || r[f.key] === "PERFIL FAMILIAR").length;
                        return (
                          <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <td className="px-2 py-1 font-mono font-semibold">{r._idFazenda}</td>
                            <td className="px-2 py-1 text-gray-700 max-w-[120px] truncate">{produtor?.nome || "—"}</td>
                            <td className="px-2 py-1 text-gray-500 max-w-[100px] truncate">{r.tecnico_email || "—"}</td>
                            <td className="px-2 py-1 text-gray-500">{r.programa || "—"}</td>
                            <td className="px-2 py-1 font-mono text-gray-400">{r.latitude || "—"}</td>
                            <td className="px-2 py-1 font-mono text-gray-400">{r.longitude || "—"}</td>
                            <td className="px-2 py-1">
                              {!produtor
                                ? <span className="text-red-500 font-bold">✗ não existe</span>
                                : existing
                                  ? <span className="text-blue-600 font-bold">↻ atualizar</span>
                                  : <span className="text-green-600 font-bold">+ criar</span>}
                            </td>
                            <td className="px-2 py-1 text-gray-500">{fazerCount} item(s) FAZER</td>
                          </tr>
                        );
                      })}
                      {pastePreview.length > 25 && (
                        <tr><td colSpan={8} className="px-2 py-1 text-center text-gray-400">... e mais {pastePreview.length - 25} linhas</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {pasteText && pastePreview.length === 0 && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle className="w-4 h-4" /> Nenhum registro válido. Verifique se o cabeçalho está na 1ª linha e a 1ª coluna é o ID Fazenda.
              </div>
            )}

            {/* Progresso */}
            {pasting && pasteProgress.total > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-600 font-medium">
                  <span>{pasteProgress.done} / {pasteProgress.total} registros</span>
                  <span>{Math.round((pasteProgress.done / pasteProgress.total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-purple-500 to-purple-700 transition-all duration-300"
                    style={{ width: `${Math.round((pasteProgress.done / pasteProgress.total) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" disabled={pasting}
                onClick={() => { setShowPaste(false); setPasteText(""); setPastePreview([]); }}>
                Cancelar
              </Button>
              <Button
                disabled={pasting || pastePreview.length === 0}
                onClick={handleBulkPaste}
                className="flex-1 bg-purple-700 hover:bg-purple-800 text-white"
              >
                {pasting
                  ? `Importando... (${pasteProgress.done}/${pasteProgress.total})`
                  : `Importar ${pastePreview.filter(r => !!produtorIdMap[r._idFazenda]).length} registro(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}