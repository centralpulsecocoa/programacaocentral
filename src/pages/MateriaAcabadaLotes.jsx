import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MALayout from "@/components/materiaAcabada/MALayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Lock, Unlock, Package, Edit2, Eye, Trash2, ClipboardPaste, AlertTriangle } from "lucide-react";
import CustomerAutocomplete from "@/components/materiaAcabada/CustomerAutocomplete";
import { format } from "date-fns";
import { toast } from "sonner";

const MOTIVOS_BLOQUEIO = [
  "Análise especial",
  "Monitoramento",
  "Reservado para cliente",
  "Desvio de micro",
  "Patógenos",
];

const MOTIVO_COLORS = {
  "Análise especial": "bg-blue-100 text-blue-800 border-blue-200",
  "Monitoramento": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Reservado para cliente": "bg-purple-100 text-purple-800 border-purple-200",
  "Desvio de micro": "bg-orange-100 text-orange-800 border-orange-200",
  "Patógenos": "bg-red-100 text-red-800 border-red-200",
};

const EMPTY_LOTE_FORM = {
  lote: "",
  produto: "",
  material_sap: "",
  data_entrada: format(new Date(), "yyyy-MM-dd"),
  total_paletes: "",
  notas: "",
};

// ── Dialog de bloqueio ──────────────────────────────────────────────────
function BloqueioDialog({ open, onClose, onConfirm, titulo, motivoInicial = "", obsInicial = "", clienteInicial = "" }) {
  const [motivo, setMotivo] = useState(motivoInicial);
  const [obs, setObs] = useState(obsInicial);
  const [cliente, setCliente] = useState(clienteInicial);

  React.useEffect(() => {
    if (open) { setMotivo(motivoInicial); setObs(obsInicial); setCliente(clienteInicial); }
  }, [open]);

  const handleConfirm = () => {
    if (!motivo) { toast.error("Selecione um motivo de bloqueio"); return; }
    if (motivo === "Reservado para cliente" && !cliente.trim()) { toast.error("Informe o nome do cliente"); return; }
    onConfirm({ motivo, obs, cliente });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-700">
            <Lock className="w-5 h-5" /> {titulo}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <Label>Motivo do bloqueio *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {MOTIVOS_BLOQUEIO.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {motivo === "Reservado para cliente" && (
            <div className="space-y-1">
              <Label>Cliente *</Label>
              <CustomerAutocomplete value={cliente} onChange={setCliente} />
            </div>
          )}
          <div className="space-y-1">
            <Label>Observação <span className="text-gray-400 text-xs">(opcional)</span></Label>
            <Textarea placeholder="Descreva o motivo detalhado..." value={obs} onChange={e => setObs(e.target.value)} rows={3} />
          </div>
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirm}>
              <Lock className="w-4 h-4 mr-2" /> Confirmar Bloqueio
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Dialog de paletes ───────────────────────────────────────────────────
function PaletesDialog({ open, onClose, lote, onUpdate }) {
  const [bloqueioDialog, setBloqueioDialog] = useState(null);
  const [addInput, setAddInput] = useState("");
  const paletes = lote?.paletes || [];

  React.useEffect(() => { if (open) setAddInput(""); }, [open]);

  const parsePaletesInput = (input) => {
    const result = [];
    const parts = input.split(",").map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes("-")) {
        const [start, end] = part.split("-").map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) result.push(String(i));
        }
      } else {
        result.push(part);
      }
    }
    return result;
  };

  const handleAddPaletes = () => {
    if (!addInput.trim()) return;
    const novos = parsePaletesInput(addInput);
    const existentes = new Set(paletes.map(p => p.numero));
    const toAdd = novos.filter(n => !existentes.has(n)).map(n => ({ numero: n, bloqueado: false }));
    if (!toAdd.length) { toast.error("Todos os paletes informados já existem neste lote."); return; }
    const newPaletes = [...paletes, ...toAdd];
    onUpdate(lote.id, { paletes: newPaletes, total_paletes: newPaletes.length });
    toast.success(`${toAdd.length} palete(s) adicionado(s)!`);
    setAddInput("");
  };

  const handleRemovePalete = (idx) => {
    const newPaletes = paletes.filter((_, i) => i !== idx);
    onUpdate(lote.id, { paletes: newPaletes, total_paletes: newPaletes.length });
    toast.info("Palete removido.");
  };

  const handleBloqueioConfirm = ({ motivo, obs, cliente }) => {
    const idx = bloqueioDialog.paletIdx;
    setBloqueioDialog(null);
    const newPaletes = [...paletes];
    newPaletes[idx] = { ...newPaletes[idx], bloqueado: true, motivo_bloqueio: motivo, observacao: obs || null, cliente: motivo === "Reservado para cliente" ? cliente : null };
    onUpdate(lote.id, { paletes: newPaletes });
    toast.success(`Palete ${newPaletes[idx].numero} bloqueado!`);
  };

  const handleDesbloquear = (idx) => {
    const newPaletes = [...paletes];
    newPaletes[idx] = { ...newPaletes[idx], bloqueado: false, motivo_bloqueio: null, observacao: null, cliente: null };
    onUpdate(lote.id, { paletes: newPaletes });
    toast.info("Palete desbloqueado.");
  };

  const dialogData = bloqueioDialog != null
    ? { motivoInicial: paletes[bloqueioDialog.paletIdx]?.motivo_bloqueio || "", obsInicial: paletes[bloqueioDialog.paletIdx]?.observacao || "", clienteInicial: paletes[bloqueioDialog.paletIdx]?.cliente || "" }
    : {};

  if (!lote) return null;
  const bloqueadosCount = paletes.filter(p => p.bloqueado).length;

  return (
    <>
      <BloqueioDialog open={!!bloqueioDialog} onClose={() => setBloqueioDialog(null)} onConfirm={handleBloqueioConfirm} titulo="Bloquear Palete" {...dialogData} />
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#860063]" />
              Paletes — Lote {lote.lote}
              <span className="text-sm font-normal text-gray-500 ml-1">({paletes.length} paletes{bloqueadosCount > 0 ? `, ${bloqueadosCount} bloqueados` : ""})</span>
            </DialogTitle>
          </DialogHeader>

          {/* Adicionar paletes */}
          <div className="bg-[#860063]/5 border border-[#860063]/20 rounded-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-[#860063]">Apontar Paletes</p>
            <div className="flex gap-2">
              <Input
                placeholder="Ex: 1,2,3 ou 1-20 ou P01,P02"
                value={addInput}
                onChange={e => setAddInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddPaletes()}
                className="h-8 text-sm flex-1"
              />
              <Button onClick={handleAddPaletes} className="h-8 text-xs bg-[#860063] hover:bg-[#6b004f] shrink-0">
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
              </Button>
            </div>
            <p className="text-[10px] text-gray-400">Use vírgula para listar ou hífen para intervalo numérico</p>
          </div>

          {paletes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum palete apontado neste lote.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Palete</th>
                    <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Status</th>
                    <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Motivo</th>
                    <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Cliente</th>
                    <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Observação</th>
                    <th className="px-3 py-2 border border-gray-200" />
                  </tr>
                </thead>
                <tbody>
                  {paletes.map((p, idx) => (
                    <tr key={idx} className={`border-b ${p.bloqueado ? "bg-red-50" : "bg-white"} hover:bg-gray-50`}>
                      <td className="px-3 py-2 border border-gray-100 font-semibold text-gray-800">{p.numero}</td>
                      <td className="px-3 py-2 border border-gray-100">
                        {p.bloqueado
                          ? <Badge className="bg-red-100 text-red-700 border-red-300 border text-[10px]"><Lock className="w-2.5 h-2.5 mr-1" />Bloqueado</Badge>
                          : <Badge className="bg-green-100 text-green-700 border-green-300 border text-[10px]">OK</Badge>}
                      </td>
                      <td className="px-3 py-2 border border-gray-100">
                        {p.motivo_bloqueio ? <Badge className={`text-[10px] border ${MOTIVO_COLORS[p.motivo_bloqueio] || ""}`}>{p.motivo_bloqueio}</Badge> : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2 border border-gray-100 text-gray-600">{p.cliente || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 border border-gray-100 text-gray-500 text-xs max-w-[180px] truncate">{p.observacao || <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2 border border-gray-100">
                        <div className="flex gap-1 justify-end">
                          {p.bloqueado ? (
                            <>
                              <button className="text-orange-500 hover:text-orange-700 p-1" title="Editar" onClick={() => setBloqueioDialog({ paletIdx: idx })}><Edit2 className="w-3.5 h-3.5" /></button>
                              <button className="text-green-600 hover:text-green-800 p-1" title="Desbloquear" onClick={() => handleDesbloquear(idx)}><Unlock className="w-3.5 h-3.5" /></button>
                            </>
                          ) : (
                            <button className="text-red-400 hover:text-red-600 p-1" title="Bloquear" onClick={() => setBloqueioDialog({ paletIdx: idx })}><Lock className="w-3.5 h-3.5" /></button>
                          )}
                          <button className="text-gray-300 hover:text-red-500 p-1" title="Remover palete" onClick={() => handleRemovePalete(idx)}><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Dialog de importação por colagem ────────────────────────────────────
function PasteImportDialog({ open, onClose, onImport }) {
  const [text, setText] = useState("");
  const [preview, setPreview] = useState([]);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const parse = (raw) => {
    const lines = raw.trim().split("\n").filter(l => l.trim());
    return lines.map(line => {
      const cols = line.split(/\t/).map(c => c.trim());
      return {
        material_sap: cols[0] || "",
        produto: cols[1] || "",
        lote: cols[2] || "",
        total_paletes: cols[3] ? Number(cols[3]) : null,
      };
    }).filter(r => r.lote);
  };

  React.useEffect(() => {
    if (text) setPreview(parse(text));
    else setPreview([]);
  }, [text]);

  const handleImport = () => {
    if (!preview.length) { toast.error("Nenhum dado válido encontrado"); return; }
    onImport(preview.map(r => ({ ...r, data_entrada: date })));
    setText("");
    setPreview([]);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="w-5 h-5 text-[#860063]" /> Importar Lotes — Colar Dados
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
            <strong>📋 Como usar:</strong> Copie linhas de uma planilha ou sistema SAP com as colunas na ordem:<br />
            <code className="bg-blue-100 px-1 rounded">Material SAP | Descrição do Produto | Lote | Quantidade de Paletes</code><br />
            Separe as colunas com <strong>Tab</strong> (copiar/colar do Excel funciona automaticamente).
          </div>
          <div className="space-y-1">
            <Label>Data de Entrada para todos os lotes</Label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-48" />
          </div>
          <div className="space-y-1">
            <Label>Cole os dados aqui:</Label>
            <Textarea
              placeholder={"10000001\tChocolate em Pó\tLOT-2026-001\t20\n10000002\tManteiga de Cacau\tLOT-2026-002\t15"}
              value={text}
              onChange={e => setText(e.target.value)}
              rows={6}
              className="font-mono text-xs"
            />
          </div>
          {preview.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Pré-visualização — {preview.length} lote(s):</p>
              <div className="overflow-x-auto border rounded-lg">
                <table className="text-xs w-full border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Material SAP", "Produto", "Lote", "Qtd. Paletes"].map(h => (
                        <th key={h} className="px-2 py-1.5 border-b border-gray-200 text-left font-semibold text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                        <td className="px-2 py-1 border-b border-gray-100 font-mono">{r.material_sap || <span className="text-gray-300">—</span>}</td>
                        <td className="px-2 py-1 border-b border-gray-100">{r.produto || <span className="text-gray-300">—</span>}</td>
                        <td className="px-2 py-1 border-b border-gray-100 font-semibold text-[#860063]">{r.lote}</td>
                        <td className="px-2 py-1 border-b border-gray-100">{r.total_paletes ?? <span className="text-gray-300">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={() => { onClose(); setText(""); setPreview([]); }}>Cancelar</Button>
            <Button
              className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f]"
              disabled={!preview.length}
              onClick={handleImport}
            >
              <ClipboardPaste className="w-4 h-4 mr-2" /> Importar {preview.length > 0 ? `${preview.length} Lotes` : ""}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Página principal ────────────────────────────────────────────────────
export default function MateriaAcabadaLotes() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterBloqueio, setFilterBloqueio] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [form, setForm] = useState(EMPTY_LOTE_FORM);
  const [paletesInput, setPaletesInput] = useState("");
  const [bloqueioDialog, setBloqueioDialog] = useState(null);
  const [paletesDialogLote, setPaletesDialogLote] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const { data: lotes = [], isLoading } = useQuery({
    queryKey: ["ma-lotes"],
    queryFn: () => base44.entities.MALote.list("-data_entrada"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MALote.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ma-lotes"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MALote.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ma-lotes"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MALote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ma-lotes"] });
      toast.success("Lote excluído.");
      setConfirmDeleteId(null);
    },
  });

  const handleUpdate = (id, data) => updateMutation.mutate({ id, data });

  const parsePaletes = (input) => {
    const paletes = [];
    const parts = input.split(",").map(s => s.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes("-")) {
        const [start, end] = part.split("-").map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) paletes.push({ numero: String(i), bloqueado: false });
        }
      } else {
        paletes.push({ numero: part, bloqueado: false });
      }
    }
    return paletes;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.lote || !form.data_entrada) { toast.error("Lote e data de entrada são obrigatórios"); return; }
    const paletes = paletesInput ? parsePaletes(paletesInput) : [];
    createMutation.mutate({ ...form, total_paletes: form.total_paletes !== "" ? Number(form.total_paletes) : paletes.length || null, paletes }, {
      onSuccess: () => {
        setShowForm(false);
        setForm(EMPTY_LOTE_FORM);
        setPaletesInput("");
        toast.success("✅ Lote criado com sucesso!");
      }
    });
  };

  const handlePasteImport = async (rows) => {
    for (const row of rows) {
      await createMutation.mutateAsync(row);
    }
    queryClient.invalidateQueries({ queryKey: ["ma-lotes"] });
    setShowPaste(false);
    toast.success(`✅ ${rows.length} lote(s) importados com sucesso!`);
  };

  const handleDesbloquearLote = (lote) => {
    handleUpdate(lote.id, { lote_bloqueado: false, motivo_bloqueio_lote: null, observacao_bloqueio_lote: null, cliente_reserva_lote: null });
    toast.info("Lote desbloqueado.");
  };

  const handleBloqueioConfirm = ({ motivo, obs, cliente }) => {
    const loteId = bloqueioDialog.loteId;
    setBloqueioDialog(null);
    handleUpdate(loteId, { lote_bloqueado: true, motivo_bloqueio_lote: motivo, observacao_bloqueio_lote: obs || null, cliente_reserva_lote: motivo === "Reservado para cliente" ? cliente : null });
    toast.success("Lote bloqueado!");
  };

  const filtered = useMemo(() => {
    let data = lotes;
    if (search) {
      const s = search.toLowerCase();
      data = data.filter(l => l.lote?.toLowerCase().includes(s) || l.produto?.toLowerCase().includes(s) || l.material_sap?.toLowerCase().includes(s));
    }
    if (filterBloqueio === "bloqueados") data = data.filter(l => l.lote_bloqueado || (l.paletes || []).some(p => p.bloqueado));
    if (filterBloqueio === "ok") data = data.filter(l => !l.lote_bloqueado && !(l.paletes || []).some(p => p.bloqueado));
    return data;
  }, [lotes, search, filterBloqueio]);

  const totalBloqueados = lotes.filter(l => l.lote_bloqueado || (l.paletes || []).some(p => p.bloqueado)).length;
  const bloqueioLote = bloqueioDialog ? lotes.find(l => l.id === bloqueioDialog.loteId) : null;
  const confirmDeleteLote = confirmDeleteId ? lotes.find(l => l.id === confirmDeleteId) : null;

  return (
    <MALayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="mb-5 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5 text-[#860063]" /> Gestão de Lotes
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Apontamento de paletes e controle de bloqueios</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPaste(true)} className="border-[#860063]/40 text-[#860063] hover:bg-[#860063]/5">
              <ClipboardPaste className="w-4 h-4 mr-2" /> Colar Dados
            </Button>
            <Button onClick={() => setShowForm(true)} className="bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063]">
              <Plus className="w-4 h-4 mr-2" /> Novo Lote
            </Button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{lotes.length}</p>
            <p className="text-xs text-gray-500">Total de Lotes</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{totalBloqueados}</p>
            <p className="text-xs text-red-600">Com Bloqueio</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{lotes.length - totalBloqueados}</p>
            <p className="text-xs text-green-600">Sem Bloqueio</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="pt-3 pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <Input placeholder="Buscar por lote, produto ou Material SAP..." value={search} onChange={e => setSearch(e.target.value)} className="w-72 h-8 text-sm" />
              <div className="flex gap-1">
                {[["all", "Todos"], ["bloqueados", "Com bloqueio"], ["ok", "Sem bloqueio"]].map(([v, l]) => (
                  <button key={v} onClick={() => setFilterBloqueio(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterBloqueio === v ? "bg-[#860063] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >{l}</button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse" style={{ minWidth: 900 }}>
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="text-left px-4 py-2.5 border-b-2 border-gray-200 font-semibold text-gray-700">Lote</th>
                    <th className="text-left px-3 py-2.5 border-b-2 border-gray-200 font-semibold text-gray-700">Produto</th>
                    <th className="text-left px-3 py-2.5 border-b-2 border-gray-200 font-semibold text-gray-700">Material SAP</th>
                    <th className="text-left px-3 py-2.5 border-b-2 border-gray-200 font-semibold text-gray-700">Data Entrada</th>
                    <th className="text-center px-3 py-2.5 border-b-2 border-gray-200 font-semibold text-gray-700">Paletes</th>
                    <th className="text-left px-3 py-2.5 border-b-2 border-gray-200 font-semibold text-gray-700">Status</th>
                    <th className="text-left px-3 py-2.5 border-b-2 border-gray-200 font-semibold text-gray-700">Motivo / Cliente</th>
                    <th className="px-3 py-2.5 border-b-2 border-gray-200" />
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={8} className="text-center py-10"><div className="animate-spin rounded-full h-7 w-7 border-t-2 border-[#860063] mx-auto" /></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-10 text-gray-400">Nenhum lote encontrado</td></tr>
                  ) : (
                    filtered.map((lote, i) => {
                      const paletes = lote.paletes || [];
                      const bloqPaletes = paletes.filter(p => p.bloqueado).length;
                      const isLoteBloq = lote.lote_bloqueado;
                      return (
                        <tr key={lote.id} className={`border-b border-gray-100 hover:bg-[#860063]/5 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"} ${isLoteBloq ? "bg-red-50/50" : ""}`}>
                          <td className="px-4 py-2.5 font-bold text-gray-900">{lote.lote}</td>
                          <td className="px-3 py-2.5 text-gray-600 max-w-[180px] truncate" title={lote.produto}>{lote.produto || <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-2.5 font-mono text-gray-600">{lote.material_sap || <span className="text-gray-300">—</span>}</td>
                          <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{lote.data_entrada ? lote.data_entrada.split("-").reverse().join("/") : "—"}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="font-semibold text-gray-700">{paletes.length || lote.total_paletes || "—"}</span>
                            {bloqPaletes > 0 && <span className="ml-1 text-xs text-red-500">({bloqPaletes} bloq.)</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            {isLoteBloq
                              ? <Badge className="bg-red-100 text-red-700 border-red-300 border text-[10px]"><Lock className="w-2.5 h-2.5 mr-1" />Bloqueado</Badge>
                              : <Badge className="bg-green-100 text-green-700 border-green-300 border text-[10px]">OK</Badge>}
                          </td>
                          <td className="px-3 py-2.5">
                            {isLoteBloq && lote.motivo_bloqueio_lote ? (
                              <div>
                                <Badge className={`text-[10px] border ${MOTIVO_COLORS[lote.motivo_bloqueio_lote] || ""}`}>{lote.motivo_bloqueio_lote}</Badge>
                                {lote.cliente_reserva_lote && <p className="text-xs text-gray-500 mt-0.5">{lote.cliente_reserva_lote}</p>}
                              </div>
                            ) : <span className="text-gray-300 text-xs">—</span>}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1 justify-end">
                              {/* Olho — ver paletes */}
                              <button className="text-[#860063] hover:text-[#6b004f] p-1.5 rounded hover:bg-[#860063]/10 transition-colors" title="Ver paletes" onClick={() => setPaletesDialogLote(lote)}>
                                <Eye className="w-4 h-4" />
                              </button>
                              {isLoteBloq ? (
                                <>
                                  <button className="text-orange-500 hover:text-orange-700 p-1.5 rounded hover:bg-orange-50 transition-colors" title="Editar bloqueio" onClick={() => setBloqueioDialog({ loteId: lote.id })}>
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button className="text-green-600 hover:text-green-800 p-1.5 rounded hover:bg-green-50 transition-colors" title="Desbloquear lote" onClick={() => handleDesbloquearLote(lote)}>
                                    <Unlock className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              ) : (
                                <button className="text-red-400 hover:text-red-600 p-1.5 rounded hover:bg-red-50 transition-colors" title="Bloquear lote" onClick={() => setBloqueioDialog({ loteId: lote.id })}>
                                  <Lock className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {/* Excluir */}
                              <button className="text-gray-300 hover:text-red-500 p-1.5 rounded hover:bg-red-50 transition-colors" title="Excluir lote" onClick={() => setConfirmDeleteId(lote.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bloqueio lote dialog */}
      <BloqueioDialog
        open={!!bloqueioDialog}
        onClose={() => setBloqueioDialog(null)}
        onConfirm={handleBloqueioConfirm}
        titulo="Bloquear Lote"
        motivoInicial={bloqueioLote?.motivo_bloqueio_lote || ""}
        obsInicial={bloqueioLote?.observacao_bloqueio_lote || ""}
        clienteInicial={bloqueioLote?.cliente_reserva_lote || ""}
      />

      {/* Paletes dialog */}
      <PaletesDialog open={!!paletesDialogLote} onClose={() => setPaletesDialogLote(null)} lote={paletesDialogLote} onUpdate={handleUpdate} />

      {/* Paste import dialog */}
      <PasteImportDialog open={showPaste} onClose={() => setShowPaste(false)} onImport={handlePasteImport} />

      {/* Confirm Delete dialog */}
      <Dialog open={!!confirmDeleteId} onOpenChange={() => setConfirmDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" /> Excluir Lote
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-sm text-gray-700">
              Tem certeza que deseja excluir o lote <strong>{confirmDeleteLote?.lote}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setConfirmDeleteId(null)}>Cancelar</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={() => deleteMutation.mutate(confirmDeleteId)} disabled={deleteMutation.isPending}>
                <Trash2 className="w-4 h-4 mr-2" /> {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Lote Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-[#860063]" /> Novo Lote
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Código do Lote *</Label>
                <Input placeholder="Ex: LOT-2026-001" value={form.lote} onChange={e => setForm({ ...form, lote: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Data de Entrada *</Label>
                <Input type="date" value={form.data_entrada} onChange={e => setForm({ ...form, data_entrada: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Produto</Label>
                <Input placeholder="Descrição do produto" value={form.produto} onChange={e => setForm({ ...form, produto: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Material SAP</Label>
                <Input placeholder="Ex: 10000001" value={form.material_sap} onChange={e => setForm({ ...form, material_sap: e.target.value })} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Paletes <span className="text-gray-400 text-xs">(opcional)</span></Label>
                <Input placeholder="Ex: 1,2,3 ou 1-20 ou P01,P02,P03" value={paletesInput} onChange={e => setPaletesInput(e.target.value)} />
                <p className="text-xs text-gray-400">Use vírgula para listar ou hífen para intervalo numérico</p>
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Observações</Label>
                <Input placeholder="Observações gerais" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_LOTE_FORM); }}>Cancelar</Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-gradient-to-r from-[#860063] to-[#6b004f]">
                {createMutation.isPending ? "Salvando..." : "Criar Lote"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MALayout>
  );
}