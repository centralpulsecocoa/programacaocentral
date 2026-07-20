import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Pencil, Trash2, Leaf, Users, ClipboardPaste, Download } from "lucide-react";
import { toast } from "sonner";

const PROGRAMAS = ["Nestlé/AtSource", "Mondelez/Cocoa Life", "Outro"];
const PROGRAMA_COLORS = {
  "Nestlé/AtSource": "bg-blue-100 text-blue-800 border-blue-200",
  "Mondelez/Cocoa Life": "bg-purple-100 text-purple-800 border-purple-200",
  "Outro": "bg-gray-100 text-gray-700 border-gray-200",
};

const EMPTY_FORM = {
  nome: "", produtor_id: "", contato: "", cpf: "",
  fornecedor: "", municipio: "", nome_fazenda: "", programa: "",
  comprador_responsavel: "", filial_responsavel: "",
  tecnico_responsavel: "", meeiro: "", latitude: "", longitude: "", area_produtiva: "",
  ativo: true, notas: ""
};

export default function Produtores() {
  const [search, setSearch] = useState("");
  const [programaFilter, setProgramaFilter] = useState("all");
  const [cpfFilter, setCpfFilter] = useState("");
  const [tecnicoFilter, setTecnicoFilter] = useState("all");
  const [compradorFilter, setCompradorFilter] = useState("all");
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [cpfExistentes, setCpfExistentes] = useState([]); // registros com mesmo CPF
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pastePreview, setPastePreview] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 });
  const queryClient = useQueryClient();

  const handlePasteChange = (text) => {
    setPasteText(text);
    if (!text.trim()) { setPastePreview([]); return; }
    const rows = text.trim().split("\n").map(r => r.split("\t"));
    const parsed = rows.map(cols => ({
      produtor_id: cols[0]?.trim() || "",
      nome: cols[1]?.trim() || "",
      cpf: cols[2]?.trim() || "",
      contato: cols[3]?.trim() || "",
      municipio: cols[4]?.trim() || "",
      fornecedor: cols[5]?.trim() || "",
      nome_fazenda: cols[6]?.trim() || "",
      programa: cols[7]?.trim() || "",
      comprador_responsavel: cols[8]?.trim() || "",
      tecnico_responsavel: cols[9]?.trim() || "",
      meeiro: cols[10]?.trim() || "",
      area_produtiva: cols[11]?.trim() ? parseFloat(cols[11].trim()) : null,
      latitude: cols[12]?.trim() ? parseFloat(cols[12].trim()) : null,
      longitude: cols[13]?.trim() ? parseFloat(cols[13].trim()) : null,
    })).filter(r => r.nome || r.cpf);
    setPastePreview(parsed);
  };

  const BATCH_SIZE = 500;

  const handleBulkImport = async () => {
    if (!pastePreview.length) return;
    setImporting(true);
    setImportProgress({ done: 0, total: pastePreview.length });

    const records = pastePreview.map(r => ({ ...r, ativo: true }));
    let done = 0;

    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      const batch = records.slice(i, i + BATCH_SIZE);
      await base44.entities.Produtor.bulkCreate(batch);
      done += batch.length;
      setImportProgress({ done, total: records.length });
    }

    queryClient.invalidateQueries({ queryKey: ["produtores"] });
    toast.success(`✅ ${records.length} produtores importados!`);
    setShowPaste(false);
    setPasteText("");
    setPastePreview([]);
    setImporting(false);
    setImportProgress({ done: 0, total: 0 });
  };

  const handleDownloadCSV = () => {
    const headers = ["Olam Farmer ID","Nome Produtor","CPF","Cidade","Filial Responsável","Nome do Parceiro","Latitude","Longitude","Telefone","Meeiro","Nome da Fazenda","Área Cacau (ha)","Técnico Responsável"];
    const rows = filtered.map(p => [
      p.produtor_id||"", p.nome||"", p.cpf||"", p.municipio||"",
      p.filial_responsavel||"", p.fornecedor||"",
      p.latitude??""  , p.longitude??"", p.contato||"",
      p.meeiro||"", p.nome_fazenda||"", p.area_produtiva??"", p.tecnico_responsavel||""
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "produtores.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const { data: produtores = [], isLoading } = useQuery({
    queryKey: ["produtores"],
    queryFn: async () => {
      const pageLimit = 5000;
      let all = [];
      let skip = 0;
      while (true) {
        const batch = await base44.entities.Produtor.list("nome", pageLimit, skip);
        all = [...all, ...batch];
        if (batch.length < pageLimit) break;
        skip += pageLimit;
      }
      return all;
    },
  });

  const { data: compradores = [] } = useQuery({
    queryKey: ["users-compradores"],
    queryFn: async () => {
      const users = await base44.entities.User.list("full_name", 500);
      return users.filter(u => u.profile === "comprador" || u.profile === "gerente_originacao" || u.role === "admin");
    },
  });

  const filtered = produtores.filter(p => {
    const matchSearch = !search ||
      p.nome?.toLowerCase().includes(search.toLowerCase()) ||
      p.cpf?.toLowerCase().includes(search.toLowerCase()) ||
      p.municipio?.toLowerCase().includes(search.toLowerCase()) ||
      p.fornecedor?.toLowerCase().includes(search.toLowerCase()) ||
      p.produtor_id?.toLowerCase().includes(search.toLowerCase());
    const matchPrograma = programaFilter === "all" || p.programa === programaFilter;
    const matchCpf = !cpfFilter || (p.cpf || "").toLowerCase().includes(cpfFilter.toLowerCase());
    const matchTecnico = tecnicoFilter === "all" || (p.tecnico_responsavel || "") === tecnicoFilter;
    const matchComprador = compradorFilter === "all" || (p.comprador_responsavel || "") === compradorFilter;
    return matchSearch && matchPrograma && matchCpf && matchTecnico && matchComprador;
  });

  const totalPages = pageSize === 0 ? 1 : Math.ceil(filtered.length / pageSize);
  const paginatedFiltered = pageSize === 0 ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const tecnicosUnicos = [...new Set(produtores.map(p => p.tecnico_responsavel).filter(Boolean))].sort();
  const compradoresUnicos = [...new Set(produtores.map(p => p.comprador_responsavel).filter(Boolean))].sort();

  const openNew = () => {
    setEditItem(null);
    setForm(EMPTY_FORM);
    setCpfExistentes([]);
    setShowForm(true);
  };

  const handleCpfChange = (cpf) => {
    setForm(f => ({ ...f, cpf }));
    if (!editItem && cpf.replace(/\D/g, '').length >= 11) {
      const matches = produtores.filter(p => p.cpf?.replace(/\D/g, '') === cpf.replace(/\D/g, ''));
      setCpfExistentes(matches);
      if (matches.length > 0) {
        // Pré-preenche com dados do primeiro registro encontrado, exceto fazenda/fornecedor/municipio
        const base = matches[0];
        setForm(f => ({
          ...f, cpf,
          nome: base.nome || f.nome,
          produtor_id: base.produtor_id || f.produtor_id,
          contato: base.contato || f.contato,
          programa: base.programa || f.programa,
          comprador_responsavel: base.comprador_responsavel || f.comprador_responsavel,
          filial_responsavel: base.filial_responsavel || f.filial_responsavel,
          nome_fazenda: "",
          fornecedor: "",
          municipio: "",
        }));
      }
    } else if (!editItem) {
      setCpfExistentes([]);
    }
  };

  const openEdit = (p) => {
    setEditItem(p);
    setForm({ ...EMPTY_FORM, ...p });
    setCpfExistentes([]);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    // Bloquear CPF + fazenda duplicados
    if (!editItem && cpfExistentes.length > 0) {
      const fazendaJaExiste = cpfExistentes.some(
        p => (p.nome_fazenda || "").trim().toLowerCase() === (form.nome_fazenda || "").trim().toLowerCase()
          && (p.fornecedor || "").trim().toLowerCase() === (form.fornecedor || "").trim().toLowerCase()
      );
      if (fazendaJaExiste) {
        toast.error("Este produtor já está cadastrado com essa fazenda e fornecedor.");
        return;
      }
    }
    setSaving(true);
    if (editItem) {
      await base44.entities.Produtor.update(editItem.id, form);
      toast.success("✅ Produtor atualizado!");
    } else {
      await base44.entities.Produtor.create(form);
      toast.success("✅ Produtor cadastrado!");
    }
    queryClient.invalidateQueries({ queryKey: ["produtores"] });
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir este produtor?")) return;
    await base44.entities.Produtor.delete(id);
    queryClient.invalidateQueries({ queryKey: ["produtores"] });
    toast.success("🗑️ Excluído!");
  };

  const totalNestle = produtores.filter(p => p.programa === "Nestlé/AtSource").length;
  const totalMondelez = produtores.filter(p => p.programa === "Mondelez/Cocoa Life").length;

  // Detectar duplicatas: mesma chave (cpf + nome_fazenda + fornecedor)
  const duplicateIds = useMemo(() => {
    const seen = {};
    const dupes = new Set();
    produtores.forEach(p => {
      const key = `${(p.cpf || "").replace(/\D/g, "").toLowerCase()}|${(p.nome_fazenda || "").trim().toLowerCase()}|${(p.fornecedor || "").trim().toLowerCase()}`;
      if (!key || key === "||") return;
      if (seen[key]) {
        dupes.add(p.id);
        dupes.add(seen[key]);
      } else {
        seen[key] = p.id;
      }
    });
    return dupes;
  }, [produtores]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Leaf className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Cadastro de Produtores</h1>
              <p className="text-xs text-gray-500">Sustentabilidade · {produtores.length} produtores</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button onClick={openNew} className="bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white">
              <Plus className="w-4 h-4 mr-1" /> Novo Produtor
            </Button>
            <Button variant="outline" onClick={() => setShowPaste(true)} className="border-green-300 text-green-700 hover:bg-green-50">
              <ClipboardPaste className="w-4 h-4 mr-1" /> Importar
            </Button>
            <Button variant="outline" onClick={handleDownloadCSV} className="border-gray-300 text-gray-600 hover:bg-gray-50">
              <Download className="w-4 h-4 mr-1" /> Exportar CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="w-6 h-6 text-green-600" />
            <div><p className="text-2xl font-bold">{produtores.length}</p><p className="text-xs text-gray-500">Total</p></div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Leaf className="w-6 h-6 text-blue-600" />
            <div><p className="text-2xl font-bold">{totalNestle}</p><p className="text-xs text-gray-500">Nestlé/AtSource</p></div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Leaf className="w-6 h-6 text-purple-600" />
            <div><p className="text-2xl font-bold">{totalMondelez}</p><p className="text-xs text-gray-500">Mondelez/Cocoa Life</p></div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <Leaf className="w-6 h-6 text-gray-400" />
            <div><p className="text-2xl font-bold">{filtered.length}</p><p className="text-xs text-gray-500">Filtrados</p></div>
          </CardContent>
        </Card>
        {duplicateIds.size > 0 && (
          <Card className="shadow-sm border-red-300 bg-red-50 md:col-span-4">
            <CardContent className="p-4 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-sm font-bold text-red-700">{duplicateIds.size} registros duplicados detectados</p>
                <p className="text-xs text-red-500">Linhas marcadas em vermelho com "DUP" possuem CPF + Fazenda + Fornecedor idênticos. Revise e exclua os duplicados.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar nome, município, fornecedor, ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-9"
          />
        </div>
        <div className="relative min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Filtrar por CPF..."
            value={cpfFilter}
            onChange={e => { setCpfFilter(e.target.value); setCurrentPage(1); }}
            className="pl-9 font-mono"
          />
        </div>
        <Select value={programaFilter} onValueChange={v => { setProgramaFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Programa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os programas</SelectItem>
            {PROGRAMAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={tecnicoFilter} onValueChange={v => { setTecnicoFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Técnico" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os técnicos</SelectItem>
            {tecnicosUnicos.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={compradorFilter} onValueChange={v => { setCompradorFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Comprador" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os compradores</SelectItem>
            {compradoresUnicos.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(pageSize)} onValueChange={v => { setPageSize(Number(v)); setCurrentPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="100">100 por página</SelectItem>
            <SelectItem value="250">250 por página</SelectItem>
            <SelectItem value="500">500 por página</SelectItem>
            <SelectItem value="1000">1000 por página</SelectItem>
            <SelectItem value="0">Todos</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-400 self-center">{filtered.length} de {produtores.length} registros</span>
      </div>

      {/* Tabela */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center"><div className="animate-spin rounded-full h-10 w-10 border-t-4 border-green-600 mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Leaf className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum produtor encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Olam Farmer ID</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Nome Produtor</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">CPF</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Telefone</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Cidade</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Fornecedor / Filial Responsável</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Nome da Fazenda</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Programa</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Comprador Resp.</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Filial Responsável</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Técnico Responsável</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Meeiro</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Área Cacau (ha)</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Latitude</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Longitude</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedFiltered.map((p, i) => {
                    const isDupe = duplicateIds.has(p.id);
                    return (
                    <tr key={p.id} className={`border-b transition-colors ${isDupe ? "bg-red-50 hover:bg-red-100 border-l-4 border-l-red-400" : i % 2 === 0 ? "bg-white hover:bg-green-50/40" : "bg-gray-50/50 hover:bg-green-50/40"}`}>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap font-mono">
                        {isDupe && <span className="inline-flex items-center gap-1 text-red-600 font-bold text-[10px] bg-red-100 border border-red-300 px-1.5 py-0.5 rounded mr-1">⚠ DUP</span>}
                        {p.produtor_id || "-"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap uppercase">{p.nome}</td>
                      <td className="px-4 py-3 font-mono text-xs text-green-800 whitespace-nowrap">{p.cpf || "-"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.contato || "-"}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{p.municipio || "-"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">{p.fornecedor || "-"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.nome_fazenda || "-"}</td>
                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {p.programa ? (
                          <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${PROGRAMA_COLORS[p.programa] || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                            {p.programa}
                          </span>
                        ) : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.comprador_responsavel || "-"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.filial_responsavel || "-"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.tecnico_responsavel || "-"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.meeiro || "-"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{p.area_produtiva != null ? `${p.area_produtiva} ha` : "-"}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">{p.latitude != null ? p.latitude : "-"}</td>
                      <td className="px-4 py-3 text-xs font-mono text-gray-500 whitespace-nowrap">{p.longitude != null ? p.longitude : "-"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-gray-400 hover:text-green-700 hover:bg-green-50 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(p.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
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
            Página {currentPage} de {totalPages} · mostrando {paginatedFiltered.length} registros
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

      {/* Paste Import Dialog */}
      <Dialog open={showPaste} onOpenChange={v => { setShowPaste(v); if (!v) { setPasteText(""); setPastePreview([]); } }}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <ClipboardPaste className="w-4 h-4" /> Importar Produtores via Planilha
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              <strong>Formato esperado (colunas na ordem):</strong><br />
              Olam Farmer ID · Nome · CPF · Contato · Município · Fornecedor · Fazenda · Programa · Comprador · Técnico Resp. · Meeiro · Área (ha) · Latitude · Longitude
            </div>
            <Textarea
              placeholder="Cole aqui os dados da planilha (Ctrl+V)..."
              value={pasteText}
              onChange={e => handlePasteChange(e.target.value)}
              rows={6}
              className="resize-none font-mono text-xs"
            />
            {pastePreview.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">{pastePreview.length} linha(s) detectada(s) — pré-visualização:</p>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b">
                      <tr>{["ID","Nome","CPF","Contato","Município","Fornecedor","Fazenda","Programa","Comprador","Técnico","Meeiro","Área (ha)","Lat","Long"].map(h => <th key={h} className="px-2 py-2 text-left font-bold text-gray-600">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                      {pastePreview.slice(0,10).map((r, i) => (
                        <tr key={i} className={i%2===0?"bg-white":"bg-gray-50"}>
                          {[r.produtor_id,r.nome,r.cpf,r.contato,r.municipio,r.fornecedor,r.nome_fazenda,r.programa,r.comprador_responsavel,r.tecnico_responsavel,r.meeiro,r.area_produtiva,r.latitude,r.longitude].map((v,j) => <td key={j} className="px-2 py-1 truncate max-w-[100px]">{v||"—"}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pastePreview.length > 10 && <p className="text-xs text-gray-400 p-2">... e mais {pastePreview.length - 10} linha(s)</p>}
                </div>
              </div>
            )}
            {importing && importProgress.total > 0 && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>Importando em lotes de {BATCH_SIZE}...</span>
                  <span className="font-bold">{importProgress.done} / {importProgress.total}</span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((importProgress.done / importProgress.total) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 text-center">
                  {Math.round((importProgress.done / importProgress.total) * 100)}% concluído
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowPaste(false)} disabled={importing}>Cancelar</Button>
              <Button
                disabled={importing || !pastePreview.length}
                onClick={handleBulkImport}
                className="flex-1 bg-gradient-to-r from-green-700 to-green-600 text-white"
              >
                {importing ? `Importando... (${importProgress.done}/${importProgress.total})` : `Importar ${pastePreview.length} registro(s)`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <Leaf className="w-4 h-4" />
              {editItem ? "Editar Produtor" : "Novo Produtor"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {cpfExistentes.length > 0 && (
              <div className="md:col-span-2 bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-800">
                <strong>⚠️ CPF já cadastrado em {cpfExistentes.length} registro(s):</strong>
                <ul className="mt-1 space-y-0.5">
                  {cpfExistentes.map(p => (
                    <li key={p.id}>· {p.nome} — Fazenda: <strong>{p.nome_fazenda || "(sem fazenda)"}</strong> — Fornecedor: {p.fornecedor || "—"}</li>
                  ))}
                </ul>
                <p className="mt-1.5 text-amber-700">Dados pessoais foram pré-preenchidos. Informe uma <strong>fazenda ou fornecedor diferente</strong> para adicionar novo vínculo.</p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">CPF <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-normal">chave primária</span></Label>
              <Input value={form.cpf} onChange={e => handleCpfChange(e.target.value)} placeholder="000.000.000-00" className="font-mono" />
            </div>
            <div className="space-y-1.5">
             <Label>Nome *</Label>
             <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value.toUpperCase() })} placeholder="NOME COMPLETO DO PRODUTOR" />
            </div>
            <div className="space-y-1.5">
              <Label>ID</Label>
              <Input value={form.produtor_id} onChange={e => setForm({ ...form, produtor_id: e.target.value })} placeholder="BR-0137-..." />
            </div>
            <div className="space-y-1.5">
              <Label>Contato</Label>
              <Input value={form.contato} onChange={e => setForm({ ...form, contato: e.target.value })} placeholder="+55 11 9..." />
            </div>
            <div className="space-y-1.5">
              <Label>Município</Label>
              <Input value={form.municipio} onChange={e => setForm({ ...form, municipio: e.target.value })} placeholder="Cidade" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Fornecedor</Label>
              <Input value={form.fornecedor} onChange={e => setForm({ ...form, fornecedor: e.target.value })} placeholder="Filial / Cooperativa" />
            </div>
            <div className="space-y-1.5">
              <Label>Nome da Fazenda</Label>
              <Input value={form.nome_fazenda} onChange={e => setForm({ ...form, nome_fazenda: e.target.value })} placeholder="Nome da propriedade" />
            </div>
            <div className="space-y-1.5">
              <Label>Programa</Label>
              <Select value={form.programa} onValueChange={v => setForm({ ...form, programa: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {PROGRAMAS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Comprador Responsável</Label>
              <Select value={form.comprador_responsavel || ""} onValueChange={v => setForm({ ...form, comprador_responsavel: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o comprador..." /></SelectTrigger>
                <SelectContent>
                  {compradores.map(c => (
                    <SelectItem key={c.id} value={c.full_name}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Filial Responsável</Label>
              <Input value={form.filial_responsavel} onChange={e => setForm({ ...form, filial_responsavel: e.target.value })} placeholder="Nome da filial" />
            </div>
            <div className="space-y-1.5">
              <Label>Técnico Responsável</Label>
              <Input value={form.tecnico_responsavel} onChange={e => setForm({ ...form, tecnico_responsavel: e.target.value })} placeholder="Nome do técnico" />
            </div>
            <div className="space-y-1.5">
              <Label>Meeiro</Label>
              <Input value={form.meeiro} onChange={e => setForm({ ...form, meeiro: e.target.value })} placeholder="Nome do meeiro" />
            </div>
            <div className="space-y-1.5">
              <Label>Área Produtiva (ha)</Label>
              <Input type="number" step="0.1" value={form.area_produtiva} onChange={e => setForm({ ...form, area_produtiva: e.target.value })} placeholder="Ex: 12.5" />
            </div>
            <div className="space-y-1.5">
              <Label>Latitude</Label>
              <Input type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="-14.235004" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Longitude</Label>
              <Input type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="-51.925282" className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.ativo === false ? "inativo" : "ativo"} onValueChange={v => setForm({ ...form, ativo: v === "ativo" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">✅ Ativo</SelectItem>
                  <SelectItem value="inativo">❌ Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={3} className="resize-none" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button
              disabled={saving}
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white"
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}