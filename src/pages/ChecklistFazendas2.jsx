import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ClipboardList, Search, Plus, Pencil, Trash2, X, ChevronUp, ChevronDown, CheckCircle2, XCircle, Minus, MapPin, Download } from "lucide-react";
import { toast } from "sonner";

const FAZER_OPTIONS = ["FAZER", "NÃO FAZER"];
const FAZER_OPTIONS_F1 = ["FAZER", "NÃO FAZER", "PERFIL FAMILIAR"];

const CHECKLIST_FIELDS = [
  { key: "poligono", label: "Polígono" },
  { key: "termo_adesao", label: "Termo Adesão" },
  { key: "codigo_fornecedor", label: "Cód. Fornecedor" },
  { key: "ficha_recomendacao", label: "Ficha Recom." },
  { key: "doc_pessoal", label: "Doc. Pessoal" },
  { key: "doc_fazenda", label: "Doc. Fazenda" },
  { key: "doc_trabalhador", label: "Doc. Trabalhador" },
  { key: "all_farmers", label: "All Farmers" },
  { key: "cadastro_meeiros", label: "Cad. Meeiros" },
  { key: "checklist", label: "Checklist" },
  { key: "clmrs_f1", label: "CLMRS F1", options: FAZER_OPTIONS_F1 },
  { key: "clmrs_f2", label: "CLMRS F2" },
  { key: "treinamento_coaching", label: "Acomp. Visitas" },
  { key: "treinamento_agri", label: "Cód. Fornec. Agro" },
];

const REPORTE_OPTIONS = ["1 - APTO", "2 - NAO APTO COM PLANO DE ADEQUACAO", "3 - RECUSA", "4 - EXCLUSAO", "5 - SEM RETORNO"];

const EMPTY_FORM = {
  produtor_id: "", tecnico_email: "",
  poligono: "", termo_adesao: "", codigo_fornecedor: "", ficha_recomendacao: "",
  doc_pessoal: "", doc_fazenda: "", doc_trabalhador: "", all_farmers: "",
  cadastro_meeiros: "", checklist: "", clmrs_f1: "", clmrs_f2: "",
  treinamento_coaching: "", treinamento_agri: "",
  latitude: "", longitude: "", reporte: "", adequacao: "", observacao: "",
  responsavel_verificacao: "", data_verificacao: "", reporte_final: "", observacoes_finais: ""
};

function FazerBadge({ value }) {
  if (!value) return <Minus className="w-3.5 h-3.5 text-gray-300 mx-auto" />;
  if (value === "FAZER") return <CheckCircle2 className="w-4 h-4 text-green-600 mx-auto" />;
  if (value === "NÃO FAZER") return <XCircle className="w-4 h-4 text-red-400 mx-auto" />;
  return <span className="text-[9px] text-purple-600 font-bold text-center block leading-tight">{value}</span>;
}

function ColHeader({ label, field, sort, onSort, filterValue, onFilter, options }) {
  const active = sort.field === field;
  return (
    <th className="px-2 py-2 text-left text-[10px] font-bold text-gray-600 uppercase whitespace-nowrap bg-gray-50 min-w-[80px]">
      <div className="flex items-center gap-0.5 cursor-pointer select-none" onClick={() => onSort(field)}>
        <span className="truncate max-w-[80px]" title={label}>{label}</span>
        <span className="flex flex-col flex-shrink-0">
          <ChevronUp className={`w-2 h-2 -mb-0.5 ${active && sort.dir === 'asc' ? 'text-[#860063]' : 'text-gray-300'}`} />
          <ChevronDown className={`w-2 h-2 ${active && sort.dir === 'desc' ? 'text-[#860063]' : 'text-gray-300'}`} />
        </span>
      </div>
      {options ? (
        <select
          value={filterValue}
          onChange={e => onFilter(field, e.target.value)}
          onClick={e => e.stopPropagation()}
          className="mt-1 w-full text-[10px] border border-gray-200 rounded px-1 py-0.5 bg-white focus:outline-none"
        >
          <option value="">Todos</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          value={filterValue}
          onChange={e => onFilter(field, e.target.value)}
          onClick={e => e.stopPropagation()}
          placeholder="Filtrar..."
          className="mt-1 w-full text-[10px] border border-gray-200 rounded px-1 py-0.5 focus:outline-none"
        />
      )}
    </th>
  );
}

function CheckColHeader({ label, field, sort, onSort, filterValue, onFilter }) {
  const active = sort.field === field;
  return (
    <th className="px-1 py-2 text-center text-[9px] font-bold text-green-700 uppercase whitespace-nowrap bg-green-50 w-[72px]">
      <div className="flex items-center justify-center gap-0.5 cursor-pointer select-none" onClick={() => onSort(field)}>
        <span className="truncate max-w-[64px] block" title={label}>{label}</span>
        <span className="flex flex-col flex-shrink-0">
          <ChevronUp className={`w-2 h-2 ${active && sort.dir === 'asc' ? 'text-[#860063]' : 'text-gray-300'}`} />
          <ChevronDown className={`w-2 h-2 ${active && sort.dir === 'desc' ? 'text-[#860063]' : 'text-gray-300'}`} />
        </span>
      </div>
      <select
        value={filterValue}
        onChange={e => onFilter(field, e.target.value)}
        onClick={e => e.stopPropagation()}
        className="mt-1 w-full text-[9px] border border-green-200 rounded px-0.5 py-0.5 bg-white focus:outline-none"
      >
        <option value="">Todos</option>
        <option value="FAZER">FAZER</option>
        <option value="NÃO FAZER">NÃO FAZER</option>
        <option value="PERFIL FAMILIAR">PERFIL FAM.</option>
      </select>
    </th>
  );
}

export default function ChecklistFazendas2() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [produtorFilter, setProdutorFilter] = useState("all");
  const [tecnicoFilter, setTecnicoFilter] = useState("all");
  const [reporteFilter, setReporteFilter] = useState("all");
  const [programaFilter, setProgramaFilter] = useState("all");
  const [compradorFilter, setCompradorFilter] = useState("all");
  const [sort, setSort] = useState({ field: "produtor_id", dir: "asc" });
  const [colFilters, setColFilters] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: me } = useQuery({
    queryKey: ["me-cl2"],
    queryFn: () => base44.auth.me(),
  });

  const { data: checklists = [], isLoading } = useQuery({
    queryKey: ["checklists2"],
    queryFn: async () => {
      const b1 = await base44.entities.FazendaChecklist.list("produtor_id", 5000);
      const b2 = await base44.entities.FazendaChecklist.list("produtor_id", 5000, 5000);
      const b3 = await base44.entities.FazendaChecklist.list("produtor_id", 5000, 10000);
      return [...b1, ...b2, ...b3];
    },
  });

  const { data: produtores = [] } = useQuery({
    queryKey: ["produtores2-cl"],
    queryFn: async () => {
      const b1 = await base44.entities.Produtor.list("nome", 5000);
      const b2 = await base44.entities.Produtor.list("nome", 5000, 5000);
      return [...b1, ...b2];
    },
  });

  const { data: atribuicoes = [] } = useQuery({
    queryKey: ["atribuicoes2-cl"],
    queryFn: () => base44.entities.FazendaAtribuicao.list("produtor_id", 5000),
  });

  // Map: UUID do registro Produtor → dados do Produtor
  const prodMap = useMemo(() => {
    const m = {};
    produtores.forEach(p => { m[p.id] = p; });
    return m;
  }, [produtores]);

  const produtoresList = useMemo(() => produtores.map(p => ({ id: p.id, label: p.nome })).sort((a, b) => a.label.localeCompare(b.label)), [produtores]);

  const handleSort = (field) => {
    setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });
  };
  const handleColFilter = (field, val) => setColFilters(f => ({ ...f, [field]: val }));

  // Deduplicar: 1 checklist por produtor_id (UUID), manter o mais recente
  const dedupedChecklists = useMemo(() => {
    const byProdutor = {};
    checklists.forEach(c => {
      const existing = byProdutor[c.produtor_id];
      if (!existing || new Date(c.updated_date) > new Date(existing.updated_date)) {
        byProdutor[c.produtor_id] = c;
      }
    });
    return Object.values(byProdutor);
  }, [checklists]);

  const tecnicosList = useMemo(() => [...new Set(dedupedChecklists.map(c => c.tecnico_email).filter(Boolean))].sort(), [dedupedChecklists]);

  const programasList = useMemo(() => [...new Set(produtores.map(p => p.programa).filter(Boolean))].sort(), [produtores]);
  const compradorsList = useMemo(() => [...new Set(produtores.map(p => p.comprador_responsavel).filter(Boolean))].sort(), [produtores]);

  // Mapa produtor_id (UUID) → checklist deduplicado (para join)
  const checklistByProdutorId = useMemo(() => {
    const m = {};
    dedupedChecklists.forEach(c => { m[c.produtor_id] = c; });
    return m;
  }, [dedupedChecklists]);

  // Base = TODOS os produtores (como Gestão de Fazendas), enriquecidos com checklist se existir
  const enriched = useMemo(() => produtores.map(prod => {
    const cl = checklistByProdutorId[prod.id] || {};
    return {
      ...cl,
      // identificadores sempre do Produtor
      _produtorRecordId: prod.id,
      produtor_id: prod.id, // usado internamente para filtros
      produtor_nome: prod.nome || "",
      municipio: prod.municipio || "",
      produtor_id_fazenda: prod.produtor_id || "",
      programa: prod.programa || "",
      comprador_responsavel: prod.comprador_responsavel || "",
      tecnico_nome: prod.tecnico_responsavel || cl.tecnico_email || "",
      lat_display: prod.latitude ?? cl.latitude ?? "",
      lng_display: prod.longitude ?? cl.longitude ?? "",
      _hasChecklist: !!cl.id,
    };
  }), [produtores, checklistByProdutorId]);

  // Se o usuário logado é comprador, filtrar automaticamente pelas suas fazendas
  const isComprador = me?.profile === "comprador";
  const myFullName = me?.full_name || "";

  const filtered = useMemo(() => {
    let data = [...enriched];

    // Auto-filtro para comprador: ver só fazendas onde é o comprador responsável
    if (isComprador && myFullName) {
      data = data.filter(c => c.comprador_responsavel === myFullName);
    }

    if (search) {
      const q = search.toLowerCase();
      data = data.filter(c =>
        c.produtor_nome?.toLowerCase().includes(q) ||
        c.produtor_id?.toLowerCase().includes(q) ||
        c.tecnico_email?.toLowerCase().includes(q) ||
        c.municipio?.toLowerCase().includes(q) ||
        c.comprador_responsavel?.toLowerCase().includes(q)
      );
    }
    if (produtorFilter !== "all") data = data.filter(c => c._produtorRecordId === produtorFilter);
    if (tecnicoFilter !== "all") data = data.filter(c => c.tecnico_email === tecnicoFilter);
    if (reporteFilter !== "all") data = data.filter(c => c.reporte === reporteFilter);
    if (programaFilter !== "all") data = data.filter(c => c.programa === programaFilter);
    if (compradorFilter !== "all") data = data.filter(c => c.comprador_responsavel === compradorFilter);

    Object.entries(colFilters).forEach(([field, val]) => {
      if (!val) return;
      data = data.filter(c => String(c[field] ?? "").toLowerCase().includes(val.toLowerCase()));
    });

    data.sort((a, b) => {
      const va = String(a[sort.field] ?? "").toLowerCase();
      const vb = String(b[sort.field] ?? "").toLowerCase();
      return sort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    return data;
  }, [enriched, search, produtorFilter, tecnicoFilter, reporteFilter, programaFilter, compradorFilter, colFilters, sort, isComprador, myFullName]);

  const totalPages = pageSize === 0 ? 1 : Math.ceil(filtered.length / pageSize);
  const paginated = pageSize === 0 ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const resetPage = () => setCurrentPage(1);

  const isTecnico = me?.profile === "tecnico_agricola";
  const isGerente = me?.role === "admin" || me?.profile === "gerente_sustentabilidade";

  const openNew = () => { setForm(EMPTY_FORM); setEditing(null); setShowForm(true); };
  const openEdit = (c) => {
    // Buscar lat/lng sempre do registro Produtor (fonte de verdade)
    const prod = prodMap[c._produtorRecordId];
    const lat = prod?.latitude ?? c.lat_display ?? "";
    const lng = prod?.longitude ?? c.lng_display ?? "";
    setForm({ ...EMPTY_FORM, ...c, produtor_id: c._produtorRecordId, latitude: lat, longitude: lng });
    setEditing(c.id);
    setShowForm(true);
  };

  const handleSave = async (concluir = false) => {
    if (!form.produtor_id) return toast.error("Produtor é obrigatório");
    setSaving(true);
    // Buscar lat/lng do produtor (fonte de verdade)
    const prod = prodMap[form.produtor_id];
    const latVal = prod?.latitude ?? (form.latitude ? Number(form.latitude) : undefined);
    const lngVal = prod?.longitude ?? (form.longitude ? Number(form.longitude) : undefined);
    const nowDate = new Date().toISOString().slice(0, 10);
    const data = {
      ...form,
      latitude: latVal,
      longitude: lngVal,
      ...(concluir ? { data_verificacao: nowDate } : {}),
    };
    if (editing) {
      await base44.entities.FazendaChecklist.update(editing, data);
      toast.success(concluir ? "Visita concluída!" : "Checklist atualizado!");
    } else {
      await base44.entities.FazendaChecklist.create(data);
      toast.success("Checklist criado!");
    }
    queryClient.invalidateQueries({ queryKey: ["checklists2"] });
    setShowForm(false);
    setSaving(false);
  };

  const downloadExcel = () => {
    const infoHeaders = ["ID Fazenda","Nome Produtor","Cidade","Técnico","Latitude","Longitude","Reporte","Adequação","Resp. Verif.","Data Verif.","Rep. Final"];
    const checkHeaders = CHECKLIST_FIELDS.map(f => f.label);
    const headers = [...infoHeaders, ...checkHeaders];
    const rows = filtered.map(c => [
      c.produtor_id_fazenda||"",c.produtor_nome||"",c.municipio||"",c.tecnico_nome||"",
      c.lat_display??"",c.lng_display??"",c.reporte||"",c.adequacao||"",
      c.responsavel_verificacao||"",c.data_verificacao||"",c.reporte_final||"",
      ...CHECKLIST_FIELDS.map(f => c[f.key]||"")
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "checklist_fazendas.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  // Toggle FAZER para técnico: clica para marcar como feito, clica de novo para desmarcar
  const toggleFazerFeito = (key) => {
    const current = form[key];
    // Se era FAZER (atribuído pelo gerente), toggle entre FAZER e "FEITO"
    // Usamos itens_feitos para rastrear o que o técnico marcou como feito
    const feitos = form.itens_feitos || [];
    const jaFeito = feitos.includes(key);
    setForm(f => ({
      ...f,
      itens_feitos: jaFeito ? feitos.filter(k => k !== key) : [...feitos, key],
    }));
  };

  // Mapa produtor_id (campo fazenda) → id do registro Produtor
  const produtorIdMap = useMemo(() => {
    const m = {};
    produtores.forEach(p => { if (p.produtor_id) m[p.produtor_id] = p.id; });
    return m;
  }, [produtores]);

  // Set de produtor record IDs que possuem atribuição
  const atribuicaoSet = useMemo(() => {
    const s = new Set();
    atribuicoes.forEach(a => { if (a.produtor_id) s.add(a.produtor_id); });
    return s;
  }, [atribuicoes]);

  // Alias para uso no bulk paste (mesmo mapa)
  const checklistByProdutorRecordId = checklistByProdutorId;

  // Ordem fixa das colunas da planilha (posição 0 = ID_FAZENDA, posições 1..14 = campos do checklist)
  const PASTE_COLUMN_ORDER = [
    null,                  // col 0: ID_FAZENDA (chave, não é campo do checklist)
    "poligono",            // col 1
    "termo_adesao",        // col 2
    "codigo_fornecedor",   // col 3
    "ficha_recomendacao",  // col 4
    "doc_pessoal",         // col 5
    "doc_fazenda",         // col 6
    "doc_trabalhador",     // col 7
    "all_farmers",         // col 8
    "cadastro_meeiros",    // col 9
    "checklist",           // col 10
    "clmrs_f1",            // col 11
    "clmrs_f2",            // col 12
    "treinamento_coaching", // col 13
    "treinamento_agri",    // col 14
  ];

  // Normaliza variações de FAZER/NÃO FAZER da planilha
  const normalizeFazer = (val) => {
    const v = String(val).trim().toUpperCase();
    if (["FAZER", "F", "SIM", "S", "1", "X", "TRUE"].includes(v)) return "FAZER";
    if (["NÃO FAZER", "NAO FAZER", "NF", "NÃO", "NAO", "N", "0", "FALSE", "—", "-"].includes(v)) return "NÃO FAZER";
    if (["PERFIL FAMILIAR", "PF"].includes(v)) return "PERFIL FAMILIAR";
    return val.trim();
  };

  const parsePasteChecklist = (text) => {
    const lines = text.trim().split("\n").filter(l => l.trim());
    // Pular linha de cabeçalho se existir (primeira célula não é um ID de fazenda no padrão BR-)
    const firstCols = lines[0]?.split("\t");
    const firstCell = firstCols?.[0]?.trim() || "";
    const dataLines = firstCell.toUpperCase().startsWith("BR-") ? lines : lines.slice(1);

    return dataLines.map(line => {
      const cols = line.split("\t");
      const idFazenda = cols[0]?.trim();
      if (!idFazenda) return null;
      const obj = { _idFazenda: idFazenda };
      PASTE_COLUMN_ORDER.forEach((field, i) => {
        if (!field) return; // col 0 é o ID
        const raw = cols[i]?.trim();
        if (raw) obj[field] = normalizeFazer(raw);
      });
      return obj;
    }).filter(Boolean);
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir este checklist?")) return;
    await base44.entities.FazendaChecklist.delete(id);
    queryClient.invalidateQueries({ queryKey: ["checklists2"] });
    toast.success("Excluído!");
  };

  const infoColDefs = [
    { field: "produtor_id_fazenda", label: "ID Fazenda" },
    { field: "produtor_nome", label: "Nome Produtor" },
    { field: "municipio", label: "Cidade" },
    { field: "tecnico_nome", label: "Técnico" },
    { field: "lat_display", label: "Latitude" },
    { field: "lng_display", label: "Longitude" },
    { field: "reporte", label: "Reporte", options: REPORTE_OPTIONS },
    { field: "adequacao", label: "Adequação" },
    { field: "responsavel_verificacao", label: "Resp. Verif." },
    { field: "data_verificacao", label: "Data Verif." },
    { field: "reporte_final", label: "Rep. Final" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <ClipboardList className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Checklist de Fazendas</h1>
            <p className="text-xs text-gray-500">{filtered.length} de {produtores.length} fazendas · {dedupedChecklists.length} com checklist</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadExcel} className="border-green-300 text-green-700 hover:bg-green-50">
            <Download className="w-4 h-4 mr-1" /> Download Excel
          </Button>
          <Button onClick={openNew} className="bg-[#860063] hover:bg-[#6b004f] text-white">
            <Plus className="w-4 h-4 mr-1" /> Novo Checklist
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Fazendas", value: produtores.length, color: "from-[#860063] to-[#6b004f]" },
          { label: "Com Checklist", value: dedupedChecklists.length, color: "from-green-600 to-green-700" },
          { label: "Sem Checklist", value: produtores.length - dedupedChecklists.length, color: "from-[#F88D2A] to-[#d97824]" },
          { label: "Filtrados", value: filtered.length, color: "from-blue-600 to-blue-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 shadow-md bg-gradient-to-br ${s.color}`}>
            <p className="text-2xl font-black text-white">{s.value}</p>
            <p className="text-xs font-semibold text-white/80 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar produtor, técnico, cidade..." value={search} onChange={e => { setSearch(e.target.value); resetPage(); }} className="pl-9" />
        </div>
        <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); resetPage(); }}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="100">100 por página</SelectItem>
            <SelectItem value="250">250 por página</SelectItem>
            <SelectItem value="500">500 por página</SelectItem>
            <SelectItem value="1000">1000 por página</SelectItem>
            <SelectItem value="0">Todos</SelectItem>
          </SelectContent>
        </Select>
        {(search || Object.values(colFilters).some(Boolean)) && (
          <Button variant="outline" onClick={() => { setSearch(""); setColFilters({}); resetPage(); }}>
            <X className="w-4 h-4 mr-1" /> Limpar
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center"><div className="animate-spin rounded-full h-10 w-10 border-t-4 border-[#860063] mx-auto" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b sticky top-0 z-10">
                  <tr>
                    {infoColDefs.map(c => (
                      <ColHeader
                        key={c.field}
                        field={c.field}
                        label={c.label}
                        sort={sort}
                        onSort={handleSort}
                        filterValue={colFilters[c.field] || ""}
                        onFilter={handleColFilter}
                        options={c.options}
                      />
                    ))}
                    {CHECKLIST_FIELDS.map(c => (
                      <CheckColHeader
                        key={c.key}
                        field={c.key}
                        label={c.label}
                        sort={sort}
                        onSort={handleSort}
                        filterValue={colFilters[c.key] || ""}
                        onFilter={handleColFilter}
                      />
                    ))}
                    <th className="px-2 py-2 bg-gray-50 text-xs text-gray-500 w-16">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={infoColDefs.length + CHECKLIST_FIELDS.length + 1} className="text-center py-12 text-gray-400">Nenhum checklist encontrado.</td></tr>
                  ) : paginated.map((c, i) => (
                    <tr key={c._produtorRecordId} className={`border-b hover:bg-green-50/30 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                      <td className="px-2 py-2 text-xs font-mono text-gray-500 whitespace-nowrap">{c.produtor_id_fazenda || "—"}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-gray-800 whitespace-nowrap">{c.produtor_nome}</td>
                      <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">{c.municipio || "—"}</td>
                      <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap max-w-[140px] truncate">{c.tecnico_nome || "—"}</td>
                      <td className="px-2 py-2 text-xs text-gray-600">{c.lat_display !== "" ? c.lat_display : "—"}</td>
                      <td className="px-2 py-2 text-xs text-gray-600">{c.lng_display !== "" ? c.lng_display : "—"}</td>
                      <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">{c.reporte || "—"}</td>
                      <td className="px-2 py-2 text-xs text-gray-600">{c.adequacao || "—"}</td>
                      <td className="px-2 py-2 text-xs text-gray-600">{c.responsavel_verificacao || "—"}</td>
                      <td className="px-2 py-2 text-xs text-gray-600">{c.data_verificacao || "—"}</td>
                      <td className="px-2 py-2 text-xs text-gray-600">{c.reporte_final || "—"}</td>
                      {CHECKLIST_FIELDS.map(f => (
                        <td key={f.key} className="px-1 py-2 text-center">
                          <FazerBadge value={c[f.key]} />
                        </td>
                      ))}
                      <td className="px-2 py-2">
                        <div className="flex gap-1">
                          {c._hasChecklist && (
                            <>
                              <button onClick={() => openEdit(c)} className="p-1 hover:bg-blue-50 rounded text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => handleDelete(c.id)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                            </>
                          )}
                          {!c._hasChecklist && (
                            <button onClick={() => { setForm({ ...EMPTY_FORM, produtor_id: c._produtorRecordId }); setEditing(null); setShowForm(true); }} className="p-1 hover:bg-green-50 rounded text-green-600"><Plus className="w-3.5 h-3.5" /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {pageSize > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-500">
            Página {currentPage} de {totalPages} · {paginated.length} registros exibidos de {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(1)} disabled={currentPage === 1} className="h-7 text-xs px-2">«</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-7 text-xs px-2">‹</Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
              const page = start + i;
              return page <= totalPages ? (
                <Button key={page} variant={page === currentPage ? "default" : "outline"} size="sm"
                  onClick={() => setCurrentPage(page)} className="h-7 text-xs px-2.5">
                  {page}
                </Button>
              ) : null;
            })}
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-7 text-xs px-2">›</Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} className="h-7 text-xs px-2">»</Button>
          </div>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#860063]">
              <ClipboardList className="w-4 h-4" /> {editing ? "Editar Checklist" : "Novo Checklist"}
            </DialogTitle>
          </DialogHeader>

          {/* ── VISÃO DO TÉCNICO ── */}
          {isTecnico ? (
            <div className="space-y-5 pt-2">
              {/* Info do produtor */}
              {form.produtor_id && (() => {
                const prod = prodMap[form.produtor_id];
                return prod ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-900 space-y-0.5">
                    <p className="font-bold text-sm">{prod.nome}</p>
                    {prod.nome_fazenda && <p>Fazenda: {prod.nome_fazenda}</p>}
                    {prod.municipio && <p>Município: {prod.municipio}</p>}
                    {prod.produtor_id && <p className="font-mono text-[10px] text-green-700">ID: {prod.produtor_id}</p>}
                  </div>
                ) : null;
              })()}

              {/* Itens FAZER como botões */}
              <div>
                <p className="text-xs font-bold text-green-700 uppercase mb-3">Itens do Checklist</p>
                <div className="grid grid-cols-1 gap-2">
                  {CHECKLIST_FIELDS.map(f => {
                    const valor = form[f.key];
                    const ehFazer = valor === "FAZER" || valor === "PERFIL FAMILIAR";
                    const feitos = form.itens_feitos || [];
                    const feito = feitos.includes(f.key);
                    if (!ehFazer) {
                      // NÃO FAZER: exibir desabilitado
                      return (
                        <div key={f.key} className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed">
                          <XCircle className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-sm text-gray-400 line-through">{f.label}</span>
                          <span className="ml-auto text-[10px] text-gray-400">NÃO FAZER</span>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => toggleFazerFeito(f.key)}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border text-left transition-all ${
                          feito
                            ? "bg-green-600 border-green-600 text-white shadow-sm"
                            : "bg-white border-orange-400 text-orange-800 hover:bg-orange-50"
                        }`}
                      >
                        {feito
                          ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                          : <div className="w-4 h-4 rounded-full border-2 border-orange-400 shrink-0" />
                        }
                        <span className="text-sm font-medium">{f.label}</span>
                        {valor === "PERFIL FAMILIAR" && <span className="ml-auto text-[9px] font-bold opacity-70 bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">PF</span>}
                        {feito && <span className="ml-auto text-xs font-semibold opacity-80">Feito ✓</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visita e Reporte */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-xs font-bold text-gray-600 uppercase">Visita e Reporte</p>
                {/* Perfil de visita: somente leitura (cadastrado pelo gerente) */}
                {form.perfil_visita && (
                  <div className="space-y-1">
                    <Label className="text-xs text-gray-500">Perfil de Visita (definido pelo gerente)</Label>
                    <div className="h-8 px-3 flex items-center bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">{form.perfil_visita}</div>
                  </div>
                )}
                <div className="space-y-1">
                  <Label className="text-xs">Reporte</Label>
                  <Select value={form.reporte || ""} onValueChange={v => setForm(f => ({ ...f, reporte: v }))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {REPORTE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Adequação</Label>
                  <Input value={form.adequacao || ""} onChange={e => setForm(f => ({ ...f, adequacao: e.target.value }))} className="h-8 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Observação</Label>
                  <Textarea value={form.observacao || ""} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} rows={2} className="text-sm resize-none" />
                </div>
              </div>

              {/* Geolocalização (somente leitura para técnico — buscada do Produtor pelo ID fazenda) */}
              {(() => {
                const prod = prodMap[form.produtor_id];
                const lat = prod?.latitude ?? form.latitude ?? "";
                const lng = prod?.longitude ?? form.longitude ?? "";
                return (
                  <div className="border-t pt-4 space-y-2">
                    <p className="text-xs font-bold text-gray-600 uppercase flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Geolocalização da Fazenda</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Latitude</Label>
                        <div className="h-8 px-3 flex items-center bg-gray-50 border border-gray-200 rounded-md text-sm font-mono text-gray-700">{lat !== "" && lat !== null ? lat : <span className="text-gray-400 italic">não informada</span>}</div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs text-gray-500">Longitude</Label>
                        <div className="h-8 px-3 flex items-center bg-gray-50 border border-gray-200 rounded-md text-sm font-mono text-gray-700">{lng !== "" && lng !== null ? lng : <span className="text-gray-400 italic">não informada</span>}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Observações finais do gerente (somente leitura) */}
              {form.observacoes_finais && (
                <div className="border-t pt-4 space-y-2">
                  <p className="text-xs font-bold text-gray-600 uppercase">Observações do Gerente</p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-900 whitespace-pre-wrap">{form.observacoes_finais}</div>
                </div>
              )}

              {/* Botões técnico */}
              <div className="flex gap-2 pt-2 border-t">
                <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)} disabled={saving}>Cancelar</Button>
                <Button variant="outline" className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50" disabled={saving} onClick={() => handleSave(false)}>
                  {saving ? "Salvando..." : "Salvar"}
                </Button>
                <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white" disabled={saving} onClick={() => handleSave(true)}>
                  {saving ? "Salvando..." : "Concluir"}
                </Button>
              </div>
            </div>
          ) : (
          /* ── VISÃO DO GERENTE / ADMIN ── */
          <div className="space-y-4 pt-2">
            {/* Produtor */}
            <div className="space-y-1">
              <Label className="text-xs">Produtor *</Label>
              <Select value={form.produtor_id} onValueChange={v => setForm(f => ({ ...f, produtor_id: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {produtoresList.map(p => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Técnico (email)</Label>
                <Input value={form.tecnico_email || ""} onChange={e => setForm(f => ({ ...f, tecnico_email: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Perfil de Visita</Label>
                <Select value={form.perfil_visita || ""} onValueChange={v => setForm(f => ({ ...f, perfil_visita: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1 - ADESAO">1 - ADESAO</SelectItem>
                    <SelectItem value="2 - REVISITA">2 - REVISITA</SelectItem>
                    <SelectItem value="3 - MONITORAMENTO">3 - MONITORAMENTO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reporte</Label>
                <Select value={form.reporte || ""} onValueChange={v => setForm(f => ({ ...f, reporte: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {REPORTE_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Adequação</Label>
                <Input value={form.adequacao || ""} onChange={e => setForm(f => ({ ...f, adequacao: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Responsável Verificação</Label>
                <Input value={form.responsavel_verificacao || ""} onChange={e => setForm(f => ({ ...f, responsavel_verificacao: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Conclusão</Label>
                <Input type="date" value={form.data_verificacao || ""} onChange={e => setForm(f => ({ ...f, data_verificacao: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Reporte Final</Label>
                <Input value={form.reporte_final || ""} onChange={e => setForm(f => ({ ...f, reporte_final: e.target.value }))} className="h-8 text-sm" />
              </div>
            </div>

            {/* Checklist Fields */}
            <div>
              <p className="text-xs font-bold text-green-700 uppercase mb-2">Itens do Checklist</p>
              <div className="grid grid-cols-2 gap-2">
                {CHECKLIST_FIELDS.map(f => (
                  <div key={f.key} className="space-y-0.5">
                    <Label className="text-[10px] text-gray-600">{f.label}</Label>
                    <Select value={form[f.key] || ""} onValueChange={v => setForm(fm => ({ ...fm, [f.key]: v }))}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                      <SelectContent>
                        {(f.options || FAZER_OPTIONS).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observação do Técnico</Label>
              <Input value={form.observacao || ""} onChange={e => setForm(f => ({ ...f, observacao: e.target.value }))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observações Finais (visíveis ao técnico)</Label>
              <Textarea value={form.observacoes_finais || ""} onChange={e => setForm(f => ({ ...f, observacoes_finais: e.target.value }))} rows={2} className="text-sm resize-none" />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button disabled={saving} onClick={() => handleSave(false)} className="flex-1 bg-[#860063] hover:bg-[#6b004f] text-white">
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}