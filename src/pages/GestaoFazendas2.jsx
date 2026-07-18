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
import { TreePine, Search, Plus, Pencil, Trash2, X, ChevronUp, ChevronDown, Download } from "lucide-react";
import { toast } from "sonner";

const CERTIFICACOES = ["Mars", "Nestlé", "Mondelez"];
const PROFILES_ACCESS = ["admin", "gerente_sustentabilidade", "supervisor", "gerente_originacao"];
const PERFIS_VISITA = ["1 - ADESAO", "2 - REVISITA"];

const EMPTY_FORM = {
  produtor_id: "", nome: "", cpf: "", contato: "", certificacao: "", intermediario: "",
  latitude: "", longitude: "", nome_fazenda: "", municipio: "", comprador_responsavel: "",
  tecnico_responsavel: "", filial_responsavel: "", programa: "", ativo: true, notas: ""
};

function ColHeader({ label, field, sort, onSort, filterValue, onFilter, options }) {
  const active = sort.field === field;
  return (
    <th className="px-2 py-2 text-left text-xs font-bold text-gray-600 uppercase whitespace-nowrap bg-gray-50 min-w-[100px]">
      <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => onSort(field)}>
        <span>{label}</span>
        <span className="flex flex-col">
          <ChevronUp className={`w-2.5 h-2.5 -mb-0.5 ${active && sort.dir === 'asc' ? 'text-[#860063]' : 'text-gray-300'}`} />
          <ChevronDown className={`w-2.5 h-2.5 ${active && sort.dir === 'desc' ? 'text-[#860063]' : 'text-gray-300'}`} />
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

export default function GestaoFazendas2() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ field: "nome", dir: "asc" });
  const [colFilters, setColFilters] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [perfilVisita, setPerfilVisita] = useState("");

  const { data: produtores = [], isLoading } = useQuery({
    queryKey: ["produtores2"],
    queryFn: async () => {
      const batch1 = await base44.entities.Produtor.list("nome", 5000);
      const batch2 = await base44.entities.Produtor.list("nome", 5000, 5000);
      return [...batch1, ...batch2];
    },
  });

  const { data: atribuicoes = [] } = useQuery({
    queryKey: ["atribuicoes-gestao2"],
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

  const compradores = useMemo(() => [...new Set(produtores.map(p => p.comprador_responsavel).filter(Boolean))].sort(), [produtores]);
  const tecnicos = useMemo(() => [...new Set(produtores.map(p => p.tecnico_responsavel).filter(Boolean))].sort(), [produtores]);

  // Opções em cascata para cada coluna com dropdown: calculadas a partir dos dados já filtrados
  // pelos demais filtros ativos (excluindo o próprio filtro da coluna) — comportamento igual ao Excel
  const getFilteredExcluding = (excludeField) => {
    let data = [...produtores];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(p =>
        p.nome?.toLowerCase().includes(q) ||
        p.cpf?.toLowerCase().includes(q) ||
        p.nome_fazenda?.toLowerCase().includes(q) ||
        p.produtor_id?.toLowerCase().includes(q)
      );
    }
    Object.entries(colFilters).forEach(([field, val]) => {
      if (!val || field === excludeField) return;
      data = data.filter(p => String(p[field] ?? "").toLowerCase().includes(val.toLowerCase()));
    });
    return data;
  };

  const handleSort = (field) => {
    setSort(s => s.field === field ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { field, dir: 'asc' });
  };

  const handleColFilter = (field, val) => {
    setColFilters(f => ({ ...f, [field]: val }));
  };

  const filtered = useMemo(() => {
    let data = [...produtores];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(p =>
        p.nome?.toLowerCase().includes(q) ||
        p.cpf?.toLowerCase().includes(q) ||
        p.nome_fazenda?.toLowerCase().includes(q) ||
        p.produtor_id?.toLowerCase().includes(q)
      );
    }

    Object.entries(colFilters).forEach(([field, val]) => {
      if (!val) return;
      data = data.filter(p => String(p[field] ?? "").toLowerCase().includes(val.toLowerCase()));
    });

    data.sort((a, b) => {
      const va = String(a[sort.field] ?? "").toLowerCase();
      const vb = String(b[sort.field] ?? "").toLowerCase();
      return sort.dir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });

    return data;
  }, [produtores, search, colFilters, sort]);

  const totalPages = pageSize === 0 ? 1 : Math.ceil(filtered.length / pageSize);
  const paginated = pageSize === 0 ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const resetPage = () => setCurrentPage(1);

  const openNew = () => { setForm(EMPTY_FORM); setEditing(null); setPerfilVisita(""); setShowForm(true); };
  const openEdit = (p) => {
    setForm({ ...EMPTY_FORM, ...p });
    setEditing(p.id);
    const atrib = atribuicoes.find(a => a.produtor_id === p.id);
    setPerfilVisita(atrib?.perfil_visita || "");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.nome) return toast.error("Nome é obrigatório");
    setSaving(true);
    const data = { ...form, latitude: form.latitude ? Number(form.latitude) : undefined, longitude: form.longitude ? Number(form.longitude) : undefined };
    if (editing) {
      await base44.entities.Produtor.update(editing, data);
      // Atualizar perfil de visita na atribuição se existir
      if (perfilVisita) {
        const atrib = atribuicoes.find(a => a.produtor_id === editing);
        if (atrib) {
          await base44.entities.FazendaAtribuicao.update(atrib.id, { perfil_visita: perfilVisita });
        }
      }
      toast.success("Produtor atualizado!");
    } else {
      await base44.entities.Produtor.create(data);
      toast.success("Produtor criado!");
    }
    queryClient.invalidateQueries({ queryKey: ["produtores2"] });
    queryClient.invalidateQueries({ queryKey: ["atribuicoes-gestao2"] });
    setShowForm(false);
    setSaving(false);
  };

  const downloadExcel = () => {
    const headers = ["ID Fazenda","Nome Produtor","CPF","Telefone","Certificação","Intermediário","Latitude","Longitude","Nome Fazenda","Cidade","Comprador","Técnico","Filial"];
    const rows = filtered.map(p => [
      p.produtor_id||"",p.nome||"",p.cpf||"",p.contato||"",p.programa||"",p.fornecedor||"",
      p.latitude??""  ,p.longitude??"",p.nome_fazenda||"",p.municipio||"",
      p.comprador_responsavel||"",p.tecnico_responsavel||"",p.filial_responsavel||""
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "gestao_fazendas.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir este produtor?")) return;
    await base44.entities.Produtor.delete(id);
    queryClient.invalidateQueries({ queryKey: ["produtores2"] });
    toast.success("Excluído!");
  };

  // Opções em cascata calculadas excluindo o próprio filtro da coluna
  const cascadeOptions = useMemo(() => {
    const programasData = getFilteredExcluding("programa");
    const compradoresData = getFilteredExcluding("comprador_responsavel");
    const tecnicosData = getFilteredExcluding("tecnico_responsavel");
    return {
      programa: [...new Set(programasData.map(p => p.programa).filter(Boolean))].sort(),
      comprador_responsavel: [...new Set(compradoresData.map(p => p.comprador_responsavel).filter(Boolean))].sort(),
      tecnico_responsavel: [...new Set(tecnicosData.map(p => p.tecnico_responsavel).filter(Boolean))].sort(),
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtores, search, colFilters]);

  const cols = [
    { field: "produtor_id", label: "ID Fazenda" },
    { field: "nome", label: "Nome Produtor" },
    { field: "cpf", label: "CPF" },
    { field: "contato", label: "Telefone" },
    { field: "programa", label: "Certificação", options: cascadeOptions.programa },
    { field: "fornecedor", label: "Intermediário" },
    { field: "latitude", label: "Latitude" },
    { field: "longitude", label: "Longitude" },
    { field: "nome_fazenda", label: "Nome Fazenda" },
    { field: "municipio", label: "Cidade" },
    { field: "comprador_responsavel", label: "Comprador", options: cascadeOptions.comprador_responsavel },
    { field: "tecnico_responsavel", label: "Técnico", options: cascadeOptions.tecnico_responsavel },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <TreePine className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Gestão de Fazendas</h1>
            <p className="text-xs text-gray-500">{filtered.length} de {produtores.length} produtores {pageSize > 0 && filtered.length > pageSize ? `· pág. ${currentPage}/${totalPages}` : ""}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadExcel} className="border-green-300 text-green-700 hover:bg-green-50">
            <Download className="w-4 h-4 mr-1" /> Download Excel
          </Button>
          <Button onClick={openNew} className="bg-[#860063] hover:bg-[#6b004f] text-white">
            <Plus className="w-4 h-4 mr-1" /> Novo Produtor
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total", value: produtores.length, color: "from-[#860063] to-[#6b004f]" },
          { label: "Filtrados", value: filtered.length, color: "from-[#F88D2A] to-[#d97824]" },
          { label: "Compradores", value: compradores.length, color: "from-blue-600 to-blue-700" },
          { label: "Técnicos", value: tecnicos.length, color: "from-green-600 to-green-700" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 shadow-md bg-gradient-to-br ${s.color}`}>
            <p className="text-2xl font-black text-white">{s.value}</p>
            <p className="text-xs font-semibold text-white/80 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Outer Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar nome, CPF, fazenda, ID..." value={search} onChange={e => { setSearch(e.target.value); resetPage(); }} className="pl-9" />
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
                    {cols.map(c => (
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
                    <th className="px-2 py-2 bg-gray-50 text-xs text-gray-500 w-20">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={cols.length + 1} className="text-center py-12 text-gray-400">Nenhum produtor encontrado.</td></tr>
                  ) : paginated.map((p, i) => (
                    <tr key={p.id} className={`border-b hover:bg-green-50/30 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                      <td className="px-2 py-2 text-xs font-mono text-gray-500 whitespace-nowrap">{p.produtor_id || "—"}</td>
                      <td className="px-2 py-2 text-xs font-semibold text-gray-800 whitespace-nowrap">{p.nome}</td>
                      <td className="px-2 py-2 text-xs font-mono text-gray-600">{p.cpf || "—"}</td>
                      <td className="px-2 py-2 text-xs text-gray-600">{p.contato || "—"}</td>
                      <td className="px-2 py-2 text-xs text-gray-600">{p.programa || p.certificacao || "—"}</td>
                      <td className="px-2 py-2 text-xs text-gray-600 max-w-[140px] truncate">{p.fornecedor || p.intermediario || "—"}</td>
                      <td className="px-2 py-2 text-xs text-gray-600">{p.latitude ?? "—"}</td>
                      <td className="px-2 py-2 text-xs text-gray-600">{p.longitude ?? "—"}</td>
                      <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">{p.nome_fazenda || "—"}</td>
                      <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">{p.municipio || "—"}</td>
                      <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">{p.comprador_responsavel || "—"}</td>
                      <td className="px-2 py-2 text-xs text-gray-600 whitespace-nowrap">{p.tecnico_responsavel || "—"}</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(p)} className="p-1 hover:bg-blue-50 rounded text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(p.id)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
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

      {/* Pagination */}
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
              <TreePine className="w-4 h-4" /> {editing ? "Editar Produtor" : "Novo Produtor"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { key: "produtor_id", label: "ID Fazenda" },
              { key: "nome", label: "Nome Produtor *" },
              { key: "cpf", label: "CPF" },
              { key: "contato", label: "Telefone" },
              { key: "fornecedor", label: "Intermediário" },
              { key: "nome_fazenda", label: "Nome Fazenda" },
              { key: "municipio", label: "Cidade" },
              { key: "comprador_responsavel", label: "Comprador" },
              { key: "tecnico_responsavel", label: "Técnico" },
              { key: "filial_responsavel", label: "Filial" },
              { key: "latitude", label: "Latitude" },
              { key: "longitude", label: "Longitude" },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                <Input value={form[f.key] || ""} onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))} className="h-8 text-sm" />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-xs">Certificação</Label>
              <Select value={form.programa || ""} onValueChange={v => setForm(fm => ({ ...fm, programa: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {CERTIFICACOES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Perfil de Visita</Label>
              <Select value={perfilVisita || ""} onValueChange={setPerfilVisita}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {PERFIS_VISITA.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Observações</Label>
              <Input value={form.notas || ""} onChange={e => setForm(fm => ({ ...fm, notas: e.target.value }))} className="h-8 text-sm" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button disabled={saving} onClick={handleSave} className="flex-1 bg-[#860063] hover:bg-[#6b004f] text-white">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}