import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Users, Search, Plus, Pencil, Trash2, ClipboardPaste, AlertCircle, CheckCircle2, X, Download } from "lucide-react";
import { toast } from "sonner";

const EMPTY_FORM = {
  id_fazenda: "",
  nome_produtor: "",
  farmer_id_fk: "",
  stakeholder_id: "",
  ms_temp_id: "",
  nome_meeiro: "",
  ms_gender: "",
};

// Colunas esperadas na colagem em massa (ordem da planilha)
// id | ms_temp_id | Meeiros | ms_gender | stakeholder_id | farmer_id_fk | ID FAZENDA | NOME PRODUTOR
const PASTE_ORDER = ["_skip_id", "ms_temp_id", "nome_meeiro", "ms_gender", "stakeholder_id", "farmer_id_fk", "id_fazenda", "nome_produtor"];

export default function Meeiros() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pastePreview, setPastePreview] = useState([]);
  const [pasting, setPasting] = useState(false);
  const [pasteProgress, setPasteProgress] = useState({ done: 0, total: 0 });

  const { data: meeiros = [], isLoading } = useQuery({
    queryKey: ["meeiros"],
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

  const { data: produtores = [] } = useQuery({
    queryKey: ["produtores-meeiros"],
    queryFn: async () => {
      const b1 = await base44.entities.Produtor.list("nome", 5000);
      const b2 = await base44.entities.Produtor.list("nome", 5000, 5000);
      return [...b1, ...b2];
    },
  });

  const prodMap = useMemo(() => {
    const m = {};
    produtores.forEach(p => { m[p.produtor_id] = p; });
    return m;
  }, [produtores]);

  const filtered = useMemo(() => {
    if (!search) return meeiros;
    const q = search.toLowerCase();
    return meeiros.filter(m =>
      m.nome_meeiro?.toLowerCase().includes(q) ||
      m.id_fazenda?.toLowerCase().includes(q) ||
      m.nome_produtor?.toLowerCase().includes(q) ||
      m.ms_temp_id?.toLowerCase().includes(q) ||
      m.stakeholder_id?.toLowerCase().includes(q)
    );
  }, [meeiros, search]);

  const openNew = () => { setForm(EMPTY_FORM); setEditing(null); setShowForm(true); };
  const openEdit = (m) => { setForm({ ...EMPTY_FORM, ...m }); setEditing(m.id); setShowForm(true); };

  const handleSave = async () => {
    if (!form.nome_meeiro || !form.id_fazenda) return toast.error("Nome do meeiro e ID Fazenda são obrigatórios");
    setSaving(true);
    if (editing) {
      await base44.entities.Meeiro.update(editing, form);
      toast.success("Meeiro atualizado!");
    } else {
      await base44.entities.Meeiro.create(form);
      toast.success("Meeiro cadastrado!");
    }
    queryClient.invalidateQueries({ queryKey: ["meeiros"] });
    setShowForm(false);
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir este meeiro?")) return;
    await base44.entities.Meeiro.delete(id);
    queryClient.invalidateQueries({ queryKey: ["meeiros"] });
    toast.success("Excluído!");
  };

  // Parser bulk paste
  const parsePaste = (text) => {
    const lines = text.trim().split("\n").filter(l => l.trim());
    if (!lines.length) return [];
    // Detectar cabeçalho
    const firstCols = lines[0].split("\t").map(c => c.trim().toLowerCase());
    const hasHeader = firstCols.some(c => ["id", "meeiros", "ms_temp_id", "nome produtor"].includes(c));
    const dataLines = hasHeader ? lines.slice(1) : lines;
    return dataLines.map(line => {
      const cols = line.split("\t").map(c => c.trim());
      const obj = {};
      PASTE_ORDER.forEach((field, i) => {
        if (field === "_skip_id") return;
        obj[field] = cols[i] || "";
      });
      return obj;
    }).filter(r => r.nome_meeiro);
  };

  const handlePasteChange = (text) => {
    setPasteText(text);
    setPastePreview(parsePaste(text));
  };

  const handleBulkPaste = async () => {
    const records = parsePaste(pasteText);
    if (!records.length) return toast.error("Nenhum registro válido encontrado.");
    setPasting(true);

    // Construir conjunto de chaves existentes: id_fazenda + nome_meeiro (normalizado)
    const existingKeys = new Set(
      meeiros.map(m => `${(m.id_fazenda || "").trim().toLowerCase()}|${(m.nome_meeiro || "").trim().toLowerCase()}`)
    );

    const toCreate = records.filter(r => {
      const key = `${(r.id_fazenda || "").trim().toLowerCase()}|${(r.nome_meeiro || "").trim().toLowerCase()}`;
      return !existingKeys.has(key);
    });
    const skipped = records.length - toCreate.length;

    setPasteProgress({ done: 0, total: toCreate.length });

    for (let i = 0; i < toCreate.length; i++) {
      await base44.entities.Meeiro.create(toCreate[i]);
      setPasteProgress({ done: i + 1, total: toCreate.length });
      await new Promise(r => setTimeout(r, 300));
    }

    const msg = [
      toCreate.length > 0 && `${toCreate.length} cadastrado(s)`,
      skipped > 0 && `${skipped} ignorado(s) (já existem)`,
    ].filter(Boolean).join(" · ");
    toast.success(`✅ ${msg || "Nenhum registro novo"}`);
    queryClient.invalidateQueries({ queryKey: ["meeiros"] });
    setShowPaste(false);
    setPasteText("");
    setPastePreview([]);
    setPasting(false);
    setPasteProgress({ done: 0, total: 0 });
  };

  const downloadExcel = () => {
    const headers = ["ID Fazenda","Nome Produtor","Nome Meeiro","Gênero","ms_temp_id","stakeholder_id","farmer_id_fk"];
    const rows = filtered.map(m => [
      m.id_fazenda||"",m.nome_produtor||"",m.nome_meeiro||"",m.ms_gender||"",
      m.ms_temp_id||"",m.stakeholder_id||"",m.farmer_id_fk||""
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "meeiros.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const byFazenda = useMemo(() => {
    const m = {};
    meeiros.forEach(me => {
      if (!m[me.id_fazenda]) m[me.id_fazenda] = 0;
      m[me.id_fazenda]++;
    });
    return m;
  }, [meeiros]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-green-700" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Cadastro de Meeiros</h1>
            <p className="text-xs text-gray-500">{meeiros.length} meeiro(s) · {Object.keys(byFazenda).length} fazenda(s)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadExcel} className="border-green-300 text-green-700 hover:bg-green-50">
            <Download className="w-4 h-4 mr-1" /> Download Excel
          </Button>
          <Button onClick={openNew} className="bg-[#860063] hover:bg-[#6b004f] text-white">
            <Plus className="w-4 h-4 mr-1" /> Novo Meeiro
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
        {[
          { label: "Total Meeiros", value: meeiros.length, color: "from-[#860063] to-[#6b004f]" },
          { label: "Fazendas c/ Meeiros", value: Object.keys(byFazenda).length, color: "from-green-600 to-green-700" },
          { label: "Filtrados", value: filtered.length, color: "from-[#F88D2A] to-[#d97824]" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-4 shadow-md bg-gradient-to-br ${s.color}`}>
            <p className="text-2xl font-black text-white">{s.value}</p>
            <p className="text-xs font-semibold text-white/80 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar meeiro, fazenda, produtor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        {search && (
          <Button variant="outline" onClick={() => setSearch("")}><X className="w-4 h-4" /></Button>
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
                <thead className="border-b bg-gray-50">
                  <tr>
                    {["ID Fazenda", "Nome Produtor", "Nome Meeiro", "Gênero", "ms_temp_id", "stakeholder_id", "farmer_id_fk", "Ações"].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-12 text-gray-400">Nenhum meeiro encontrado.</td></tr>
                  ) : filtered.map((m, i) => (
                    <tr key={m.id} className={`border-b hover:bg-green-50/30 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                      <td className="px-3 py-2 text-xs font-mono text-gray-500">{m.id_fazenda || "—"}</td>
                      <td className="px-3 py-2 text-xs font-semibold text-gray-800">{m.nome_produtor || "—"}</td>
                      <td className="px-3 py-2 text-xs text-gray-800">{m.nome_meeiro}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{m.ms_gender || "—"}</td>
                      <td className="px-3 py-2 text-xs font-mono text-gray-400">{m.ms_temp_id || "—"}</td>
                      <td className="px-3 py-2 text-xs font-mono text-gray-400">{m.stakeholder_id || "—"}</td>
                      <td className="px-3 py-2 text-xs font-mono text-gray-400">{m.farmer_id_fk || "—"}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          <button onClick={() => openEdit(m)} className="p-1 hover:bg-blue-50 rounded text-blue-600"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(m.id)} className="p-1 hover:bg-red-50 rounded text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#860063]">
              <Users className="w-4 h-4" /> {editing ? "Editar Meeiro" : "Novo Meeiro"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 pt-2">
            {[
              { key: "id_fazenda", label: "ID Fazenda *" },
              { key: "nome_produtor", label: "Nome Produtor" },
              { key: "nome_meeiro", label: "Nome Meeiro *" },
              { key: "farmer_id_fk", label: "farmer_id_fk" },
              { key: "stakeholder_id", label: "stakeholder_id" },
              { key: "ms_temp_id", label: "ms_temp_id" },
            ].map(f => (
              <div key={f.key} className="space-y-1">
                <Label className="text-xs">{f.label}</Label>
                <Input value={form[f.key] || ""} onChange={e => setForm(fm => ({ ...fm, [f.key]: e.target.value }))} className="h-8 text-sm" />
              </div>
            ))}
            <div className="space-y-1">
              <Label className="text-xs">Gênero</Label>
              <Select value={form.ms_gender || ""} onValueChange={v => setForm(fm => ({ ...fm, ms_gender: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">M</SelectItem>
                  <SelectItem value="F">F</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
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