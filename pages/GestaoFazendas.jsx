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
import { TreePine, Search, CheckSquare, Square, Users, Calendar, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const PERFIS = ["1 - ADESAO", "2 - REVISITA", "3 - MONITORAMENTO"];
const STATUS_COLORS = {
  pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
  em_andamento: "bg-blue-100 text-blue-800 border-blue-200",
  concluido: "bg-green-100 text-green-800 border-green-200",
};
const STATUS_LABELS = { pendente: "Pendente", em_andamento: "Em Andamento", concluido: "Concluído" };
const PROGRAMA_COLORS = {
  "Nestlé/AtSource": "bg-blue-100 text-blue-700 border-blue-200",
  "Mondelez/Cocoa Life": "bg-purple-100 text-purple-700 border-purple-200",
  "Outro": "bg-gray-100 text-gray-600 border-gray-200",
};

export default function GestaoFazendas() {
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [cpfFilter, setCpfFilter] = useState("");
  const [programaFilter, setProgramaFilter] = useState("all");
  const [tecnicoFilter, setTecnicoFilter] = useState("all");
  const [compradorFilter, setCompradorFilter] = useState("all");
  const [filialFilter, setFilialFilter] = useState("all");
  const [pageSize, setPageSize] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkAction, setBulkAction] = useState(null);
  const [bulkForm, setBulkForm] = useState({ tecnico_email: "", tecnico_nome: "", perfil_visita: "", data_atendimento: "", status: "pendente" });
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: produtores = [], isLoading } = useQuery({
    queryKey: ["produtores"],
    queryFn: () => base44.entities.Produtor.list("nome", 2000),
  });

  const { data: atribuicoes = [] } = useQuery({
    queryKey: ["fazenda-atribuicoes"],
    queryFn: () => base44.entities.FazendaAtribuicao.list("created_date", 2000),
  });

  const { data: tecnicos = [] } = useQuery({
    queryKey: ["tecnicos-sustentabilidade"],
    queryFn: () => base44.entities.TecnicoSustentabilidade.list("nome", 500),
  });

  // Map atribuicoes by produtor_id (latest)
  const atribMap = useMemo(() => {
    const map = {};
    atribuicoes.forEach(a => { map[a.produtor_id] = a; });
    return map;
  }, [atribuicoes]);

  // Unique values for filter dropdowns (from cadastro)
  const compradoresUnicos = useMemo(() => [...new Set(produtores.map(p => p.comprador_responsavel).filter(Boolean))].sort(), [produtores]);
  const filiaisUnicas = useMemo(() => [...new Set(produtores.map(p => p.filial_responsavel).filter(Boolean))].sort(), [produtores]);
  // Técnicos: from atribuicoes OR from cadastro (tecnico_responsavel field)
  const tecnicosUnicos = useMemo(() => {
    const set = new Set();
    atribuicoes.forEach(a => a.tecnico_email && set.add(a.tecnico_email));
    return [...set];
  }, [atribuicoes]);

  const filtered = useMemo(() => produtores.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = !search ||
      p.nome?.toLowerCase().includes(q) ||
      p.cpf?.toLowerCase().includes(q) ||
      p.municipio?.toLowerCase().includes(q) ||
      p.fornecedor?.toLowerCase().includes(q) ||
      p.nome_fazenda?.toLowerCase().includes(q) ||
      p.produtor_id?.toLowerCase().includes(q);
    const matchCpf = !cpfFilter || (p.cpf || "").toLowerCase().includes(cpfFilter.toLowerCase());
    const matchPrograma = programaFilter === "all" || p.programa === programaFilter;
    const atrib = atribMap[p.id];
    // Técnico: from atribuicao OR from produtor.tecnico_responsavel
    const tecnicoEmail = atrib?.tecnico_email || "";
    const matchTecnico = tecnicoFilter === "all" || tecnicoEmail === tecnicoFilter || p.tecnico_responsavel === tecnicoFilter;
    const matchComprador = compradorFilter === "all" || (p.comprador_responsavel || "") === compradorFilter;
    const matchFilial = filialFilter === "all" || (p.filial_responsavel || "") === filialFilter;
    return matchSearch && matchCpf && matchPrograma && matchTecnico && matchComprador && matchFilial;
  }), [produtores, search, cpfFilter, programaFilter, tecnicoFilter, compradorFilter, filialFilter, atribMap]);

  const totalPages = pageSize === 0 ? 1 : Math.ceil(filtered.length / pageSize);
  const paginated = pageSize === 0 ? filtered : filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const resetPage = () => setCurrentPage(1);

  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id));

  const toggleAll = () => {
    if (allSelected) {
      const next = new Set(selected);
      filtered.forEach(p => next.delete(p.id));
      setSelected(next);
    } else {
      const next = new Set(selected);
      filtered.forEach(p => next.add(p.id));
      setSelected(next);
    }
  };

  const toggleOne = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const openBulk = (action) => {
    setBulkForm({ tecnico_email: "", tecnico_nome: "", perfil_visita: "", data_atendimento: "", status: "pendente" });
    setBulkAction(action);
  };

  const handleTecnicoChange = (email) => {
    const u = tecnicos.find(u => u.email === email);
    setBulkForm(f => ({ ...f, tecnico_email: email, tecnico_nome: u?.nome || email }));
  };

  const handleBulkSave = async () => {
    setSaving(true);
    const ids = [...selected];
    const selectedProdutores = produtores.filter(p => ids.includes(p.id));

    for (const p of selectedProdutores) {
      const existing = atribMap[p.id];
      let data = { produtor_id: p.id, produtor_nome: p.nome };

      if (bulkAction === "tecnico") {
        data = { ...data, tecnico_email: bulkForm.tecnico_email, tecnico_nome: bulkForm.tecnico_nome };
        if (bulkForm.perfil_visita) data.perfil_visita = bulkForm.perfil_visita;
      } else if (bulkAction === "visita") {
        data = { ...data, data_atendimento: bulkForm.data_atendimento, perfil_visita: bulkForm.perfil_visita };
        if (existing) data = { ...data, tecnico_email: existing.tecnico_email, tecnico_nome: existing.tecnico_nome };
      } else if (bulkAction === "status") {
        data = { ...data, status: bulkForm.status };
        if (existing) data = { ...data, tecnico_email: existing.tecnico_email, tecnico_nome: existing.tecnico_nome, perfil_visita: existing.perfil_visita };
      }

      if (!data.perfil_visita) data.perfil_visita = existing?.perfil_visita || "1 - ADESAO";
      if (!data.tecnico_email) data.tecnico_email = existing?.tecnico_email || "";
      if (!data.status) data.status = existing?.status || "pendente";

      if (existing) {
        await base44.entities.FazendaAtribuicao.update(existing.id, data);
      } else {
        await base44.entities.FazendaAtribuicao.create(data);
      }
    }

    toast.success(`✅ ${ids.length} fazenda(s) atualizada(s)!`);
    queryClient.invalidateQueries({ queryKey: ["fazenda-atribuicoes"] });
    setBulkAction(null);
    setSelected(new Set());
    setSaving(false);
  };

  const canSaveBulk = () => {
    if (bulkAction === "tecnico") return !!bulkForm.tecnico_email;
    if (bulkAction === "visita") return !!bulkForm.data_atendimento && !!bulkForm.perfil_visita;
    if (bulkAction === "status") return !!bulkForm.status;
    return false;
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Excluir ${selected.size} produtor(es) selecionado(s)? Esta ação não pode ser desfeita.`)) return;
    setSaving(true);
    const ids = [...selected];
    const delay = (ms) => new Promise(res => setTimeout(res, ms));
    for (const id of ids) {
      const atrib = atribMap[id];
      if (atrib) await base44.entities.FazendaAtribuicao.delete(atrib.id);
      await base44.entities.Produtor.delete(id);
      await delay(200); // evitar rate limit
    }
    toast.success(`🗑️ ${ids.length} produtor(es) excluído(s)!`);
    queryClient.invalidateQueries({ queryKey: ["produtores"] });
    queryClient.invalidateQueries({ queryKey: ["fazenda-atribuicoes"] });
    setSelected(new Set());
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
          <TreePine className="w-5 h-5 text-green-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Gestão de Fazendas</h1>
          <p className="text-xs text-gray-500">{produtores.length} produtores · {atribuicoes.length} atribuições</p>
        </div>
      </div>

      {/* Stats Cards - Plant Leaf style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Produtores", value: filtered.length, icon: "🌿", orange: false },
          { label: "Visitados", value: filtered.filter((p) => atribMap[p.id]?.status === "concluido").length, icon: "✅", orange: false },
          { label: "Pendentes", value: filtered.filter((p) => atribMap[p.id]?.status === "pendente" && !!atribMap[p.id]?.data_atendimento).length, icon: "⏳", orange: false },
          { label: "Aproveitamento", value: filtered.length > 0 ? Math.round((filtered.filter((p) => atribMap[p.id]?.status === "concluido").length / filtered.length) * 100) + "%" : "0%", icon: "📊", orange: true },
        ].map((stat) => (
          <div key={stat.label} className={`rounded-xl p-4 shadow-md flex flex-col justify-between ${stat.orange ? "bg-gradient-to-br from-[#F88D2A] to-[#d97324]" : "bg-gradient-to-br from-[#860063] to-[#6b004f]"}`}>
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div>
              <p className="text-2xl md:text-3xl font-black text-white">{stat.value}</p>
              <p className="text-xs font-semibold text-white/80 mt-0.5">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar nome, fazenda, município, fornecedor, ID..."
            value={search}
            onChange={e => { setSearch(e.target.value); resetPage(); }}
            className="pl-9"
          />
        </div>
        <div className="relative min-w-[150px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Filtrar por CPF..."
            value={cpfFilter}
            onChange={e => { setCpfFilter(e.target.value); resetPage(); }}
            className="pl-9 font-mono"
          />
        </div>
        <Select value={programaFilter} onValueChange={v => { setProgramaFilter(v); resetPage(); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Programa" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os programas</SelectItem>
            <SelectItem value="Nestlé/AtSource">Nestlé/AtSource</SelectItem>
            <SelectItem value="Mondelez/Cocoa Life">Mondelez/Cocoa Life</SelectItem>
            <SelectItem value="Outro">Outro</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tecnicoFilter} onValueChange={v => { setTecnicoFilter(v); resetPage(); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Técnico" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os técnicos</SelectItem>
            {tecnicos.filter(t => t.ativo !== false).map(t => (
              <SelectItem key={t.email} value={t.email}>{t.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={compradorFilter} onValueChange={v => { setCompradorFilter(v); resetPage(); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Comprador" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os compradores</SelectItem>
            {compradoresUnicos.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filialFilter} onValueChange={v => { setFilialFilter(v); resetPage(); }}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Filial" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as filiais</SelectItem>
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
        <span className="text-xs text-gray-400 shrink-0">{filtered.length} de {produtores.length} registros</span>
        <Button
          size="sm"
          variant="outline"
          onClick={toggleAll}
          className="border-green-300 text-green-700 hover:bg-green-50 text-xs h-8 shrink-0"
        >
          {allSelected ? <><Square className="w-3.5 h-3.5 mr-1" /> Desmarcar Todos</> : <><CheckSquare className="w-3.5 h-3.5 mr-1" /> Marcar Todos</>}
        </Button>
      </div>

      {/* Bulk Action Bar */}
      {selected.size > 0 && (
        <div className="mb-4 p-3 bg-green-800 text-white rounded-xl flex items-center gap-3 flex-wrap shadow-lg">
          <span className="font-bold text-sm">{selected.size} selecionada(s)</span>
          <div className="flex gap-2 flex-wrap ml-auto">
            <Button size="sm" variant="outline" onClick={() => openBulk("tecnico")}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs h-8">
              <Users className="w-3.5 h-3.5 mr-1" /> Atribuir Técnico
            </Button>
            <Button size="sm" variant="outline" onClick={() => openBulk("visita")}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs h-8">
              <Calendar className="w-3.5 h-3.5 mr-1" /> Agendar Visita
            </Button>
            <Button size="sm" variant="outline" onClick={() => openBulk("status")}
              className="bg-white/10 border-white/30 text-white hover:bg-white/20 text-xs h-8">
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Alterar Status
            </Button>
            <Button size="sm" variant="outline" onClick={handleBulkDelete}
              disabled={saving}
              className="bg-red-600/80 border-red-400 text-white hover:bg-red-700 text-xs h-8">
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Excluir Selecionadas
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}
              className="text-white/70 hover:text-white hover:bg-white/10 text-xs h-8">
              Limpar
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center"><div className="animate-spin rounded-full h-10 w-10 border-t-4 border-green-600 mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <TreePine className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum produtor encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-3 w-10">
                      <button onClick={toggleAll} className="text-green-700 hover:text-green-900">
                        {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase">CPF</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase">Nome / Fazenda</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase">Município</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase">Programa</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase">Técnico</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase">Perfil Visita</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase">Data</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase">Comprador</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase">Filial Resp.</th>
                    <th className="px-3 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p, i) => {
                    const atrib = atribMap[p.id];
                    const isChecked = selected.has(p.id);
                    // Técnico: prefer atribuicao, fallback to cadastro
                    const tecnicoNome = atrib?.tecnico_nome || p.tecnico_responsavel || null;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => toggleOne(p.id)}
                        className={`border-b cursor-pointer transition-colors ${isChecked ? "bg-green-50" : i % 2 === 0 ? "bg-white hover:bg-gray-50" : "bg-gray-50/50 hover:bg-gray-100/50"}`}
                      >
                        <td className="px-3 py-3" onClick={e => { e.stopPropagation(); toggleOne(p.id); }}>
                          <div className="text-green-700">
                            {isChecked ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4 text-gray-300" />}
                          </div>
                        </td>
                        <td className="px-3 py-3 font-mono text-xs font-semibold text-gray-700">{p.cpf || <span className="text-gray-300">—</span>}</td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-gray-800">{p.nome}</p>
                          {p.nome_fazenda && <p className="text-xs text-gray-500">{p.nome_fazenda}</p>}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600">{p.municipio || "—"}</td>
                        <td className="px-3 py-3">
                          {p.programa ? (
                            <Badge className={`border text-[10px] px-1.5 py-0 ${PROGRAMA_COLORS[p.programa] || PROGRAMA_COLORS["Outro"]}`}>
                              {p.programa}
                            </Badge>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600">{tecnicoNome || <span className="text-gray-300">Sem técnico</span>}</td>
                        <td className="px-3 py-3">
                          {atrib?.perfil_visita ? (
                            <Badge className="border text-[10px] px-1.5 py-0 bg-green-50 text-green-800 border-green-200">{atrib.perfil_visita}</Badge>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600">
                          {atrib?.data_atendimento ? format(new Date(atrib.data_atendimento), "dd/MM/yyyy") : "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-gray-600">{p.comprador_responsavel || "—"}</td>
                        <td className="px-3 py-3 text-xs text-gray-600">{p.filial_responsavel || "—"}</td>
                        <td className="px-3 py-3">
                          {atrib?.status ? (
                            <Badge className={`border text-[10px] px-1.5 py-0 ${STATUS_COLORS[atrib.status]}`}>{STATUS_LABELS[atrib.status]}</Badge>
                          ) : "—"}
                        </td>
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
          <span className="text-xs text-gray-500">
            Página {currentPage} de {totalPages} · {paginated.length} registros
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

      {/* Bulk Action Dialog */}
      <Dialog open={!!bulkAction} onOpenChange={() => setBulkAction(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              {bulkAction === "tecnico" && <><Users className="w-4 h-4" /> Atribuir Técnico</>}
              {bulkAction === "visita" && <><Calendar className="w-4 h-4" /> Agendar Visita</>}
              {bulkAction === "status" && <><RefreshCw className="w-4 h-4" /> Alterar Status</>}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-500 -mt-2">Aplicar para {selected.size} fazenda(s) selecionada(s)</p>

          <div className="space-y-4 pt-1">
            {bulkAction === "tecnico" && (
              <>
                <div className="space-y-1.5">
                  <Label>Técnico Agrícola *</Label>
                  <Select value={bulkForm.tecnico_email} onValueChange={handleTecnicoChange}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {tecnicos.filter(t => t.ativo !== false).length === 0 && <SelectItem value="_none" disabled>Nenhum técnico cadastrado</SelectItem>}
                      {tecnicos.filter(t => t.ativo !== false).map(u => <SelectItem key={u.email} value={u.email}>{u.nome}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Perfil de Visita (opcional)</Label>
                  <Select value={bulkForm.perfil_visita} onValueChange={v => setBulkForm(f => ({ ...f, perfil_visita: v }))}>
                    <SelectTrigger><SelectValue placeholder="Manter existente..." /></SelectTrigger>
                    <SelectContent>
                      {PERFIS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {bulkAction === "visita" && (
              <>
                <div className="space-y-1.5">
                  <Label>Data de Atendimento *</Label>
                  <Input type="date" value={bulkForm.data_atendimento} onChange={e => setBulkForm(f => ({ ...f, data_atendimento: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Perfil de Visita *</Label>
                  <Select value={bulkForm.perfil_visita} onValueChange={v => setBulkForm(f => ({ ...f, perfil_visita: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {PERFIS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {bulkAction === "status" && (
              <div className="space-y-1.5">
                <Label>Novo Status *</Label>
                <Select value={bulkForm.status} onValueChange={v => setBulkForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setBulkAction(null)}>Cancelar</Button>
              <Button
                disabled={saving || !canSaveBulk()}
                onClick={handleBulkSave}
                className="flex-1 bg-gradient-to-r from-green-700 to-green-600 text-white"
              >
                {saving ? "Salvando..." : `Aplicar (${selected.size})`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}