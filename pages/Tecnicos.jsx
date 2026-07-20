import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const EMPTY = { nome: "", email: "", telefone: "", cidade: "", estado: "", ativo: true, notas: "" };

export default function Tecnicos() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const { data: tecnicosDb = [], isLoading: loadingTec } = useQuery({
    queryKey: ["tecnicos-sustentabilidade"],
    queryFn: () => base44.entities.TecnicoSustentabilidade.list("nome", 500),
  });


  const tecnicos = tecnicosDb;
  const isLoading = loadingTec;

  const filtered = tecnicos.filter(t => {
    const q = search.toLowerCase();
    return !q ||
      t.nome?.toLowerCase().includes(q) ||
      t.email?.toLowerCase().includes(q) ||
      t.cidade?.toLowerCase().includes(q) ||
      t.estado?.toLowerCase().includes(q) ||
      t.telefone?.toLowerCase().includes(q);
  });

  const openNew = () => { setEditItem(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (t) => { setEditItem(t); setForm({ ...EMPTY, ...t }); setShowForm(true); };

  const handleSave = async () => {
    if (!form.nome.trim() || !form.email.trim()) { toast.error("Nome e e-mail são obrigatórios"); return; }
    setSaving(true);
    if (editItem) {
      await base44.entities.TecnicoSustentabilidade.update(editItem.id, form);
      toast.success("✅ Técnico atualizado!");
    } else {
      await base44.entities.TecnicoSustentabilidade.create(form);
      toast.success("✅ Técnico cadastrado!");
    }
    queryClient.invalidateQueries({ queryKey: ["tecnicos-sustentabilidade"] });
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (t) => {
    if (!confirm("Excluir este técnico?")) return;
    try {
      const res = await base44.functions.invoke('updateEntityRecord', {
        entity: 'TecnicoSustentabilidade',
        id: t.id,
        action: 'delete',
        data: {}
      });
      if (res.data?.error) throw new Error(res.data.error);
      queryClient.invalidateQueries({ queryKey: ["tecnicos-sustentabilidade"] });
      toast.success("🗑️ Técnico excluído!");
    } catch (err) {
      toast.error("Erro ao excluir: " + (err?.message || "Tente novamente"));
    }
  };

  const ativos = tecnicos.filter(t => t.ativo !== false).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Técnicos Agrícolas</h1>
            <p className="text-xs text-gray-500">{ativos} ativos · {tecnicos.length} total</p>
          </div>
        </div>
        <Button onClick={openNew} className="bg-gradient-to-r from-green-700 to-green-600 hover:from-green-800 hover:to-green-700 text-white">
          <Plus className="w-4 h-4 mr-1" /> Novo Técnico
        </Button>
      </div>

      {/* Busca */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar nome, e-mail, cidade, estado..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <span className="text-xs text-gray-400">{filtered.length} registros</span>
      </div>

      {/* Tabela */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center"><div className="animate-spin rounded-full h-10 w-10 border-t-4 border-green-600 mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Nenhum técnico encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Nome</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">E-mail</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Telefone</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Cidade / Estado</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => (
                    <tr key={t.id} className={`border-b hover:bg-green-50/40 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                      <td className="px-4 py-3 font-semibold text-gray-800 whitespace-nowrap">{t.nome}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{t.email}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{t.telefone || "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">
                        {[t.cidade, t.estado].filter(Boolean).join(" / ") || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`border text-[10px] px-2 py-0.5 ${t.ativo !== false ? "bg-green-100 text-green-800 border-green-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                          {t.ativo !== false ? "Ativo" : "Inativo"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(t)} className="p-1.5 rounded-lg text-gray-400 hover:text-green-700 hover:bg-green-50 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(t)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title={t._somenteFazenda ? "Técnico sem registro cadastrado" : "Excluir técnico"}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-700">
              <Users className="w-4 h-4" />
              {editItem ? "Editar Técnico" : "Novo Técnico"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="md:col-span-2 space-y-1.5">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Nome completo" />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>E-mail *</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="tecnico@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="+55 11 9..." />
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <select
                value={form.ativo ? "true" : "false"}
                onChange={e => setForm({ ...form, ativo: e.target.value === "true" })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} placeholder="Cidade" />
            </div>
            <div className="space-y-1.5">
              <Label>Estado (UF)</Label>
              <select
                value={form.estado}
                onChange={e => setForm({ ...form, estado: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">Selecione...</option>
                {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <Label>Observações</Label>
              <Textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} className="resize-none" />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button disabled={saving} onClick={handleSave} className="flex-1 bg-gradient-to-r from-green-700 to-green-600 text-white">
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}