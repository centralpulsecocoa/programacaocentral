import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Lightbulb, MessageSquare, ClipboardList, QrCode, Clock, TrendingUp, Pencil, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const OFI_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6905526da166967415597099/3c8ad4e27_ofi_logo_RGB2.jpg";

const STATUS_COLORS = {
  pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
  em_analise: "bg-blue-100 text-blue-800 border-blue-200",
  aprovado: "bg-green-100 text-green-800 border-green-200",
  recusado: "bg-red-100 text-red-800 border-red-200",
  concluido: "bg-gray-100 text-gray-600 border-gray-200",
};
const STATUS_LABELS = {
  pendente: "Pendente",
  em_analise: "Em Análise",
  aprovado: "Aprovado",
  recusado: "Recusado",
  concluido: "Concluído",
};
const TIPO_ICONS = {
  "Sugestão": MessageSquare,
  "Ideia": Lightbulb,
  "Requerimento": ClipboardList,
};
const TIPO_COLORS = {
  "Sugestão": "text-blue-600",
  "Ideia": "text-yellow-600",
  "Requerimento": "text-purple-600",
};
const DEPARTAMENTOS = [
  "Operações", "Qualidade", "Logística", "Compras", "Financeiro",
  "Sustentabilidade", "TI", "Produção", "Comercial", "Administrativo", "Outro"
];

export default function SugestoesQR() {
  const [time, setTime] = useState(new Date());
  const [editItem, setEditItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [showConcluidos, setShowConcluidos] = useState(false);
  const queryClient = useQueryClient();

  const pageUrl = `${window.location.origin}/sugestoes`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(pageUrl)}&margin=10&color=860063`;

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { data: sugestoes = [] } = useQuery({
    queryKey: ["sugestoes"],
    queryFn: () => base44.entities.Sugestao.list("-created_date", 50),
    refetchInterval: 30000,
  });

  const handleMarkConcluido = async (id) => {
    await base44.entities.Sugestao.update(id, { status: "concluido" });
    queryClient.invalidateQueries({ queryKey: ["sugestoes"] });
    setViewItem(null);
    toast.success("✅ Marcado como concluído!");
  };

  const filteredSugestoes = sugestoes.filter(s => {
    if (showConcluidos) return s.status === "concluido";
    if (s.status === "concluido") return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });
  const recentes = filteredSugestoes.slice(0, 20);
  const totalHoje = sugestoes.filter(s => s.created_date?.startsWith(new Date().toISOString().split("T")[0])).length;
  const porTipo = ["Sugestão", "Ideia", "Requerimento"].map(tipo => ({
    tipo,
    count: sugestoes.filter(s => s.tipo === tipo).length
  }));

  const handleEdit = (s) => {
    setEditItem(s);
    setEditForm({ nome: s.nome, departamento: s.departamento, tipo: s.tipo, descricao: s.descricao, status: s.status });
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Sugestao.update(editItem.id, editForm);
    queryClient.invalidateQueries({ queryKey: ["sugestoes"] });
    setEditItem(null);
    setSaving(false);
    toast.success("✅ Atualizado com sucesso!");
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir esta submissão?")) return;
    await base44.entities.Sugestao.delete(id);
    queryClient.invalidateQueries({ queryKey: ["sugestoes"] });
    toast.success("🗑️ Excluído!");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1.5 shadow border border-gray-100">
            <img src={OFI_LOGO_URL} alt="OFI" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#860063]">Central Pulse</h1>
            <p className="text-xs text-gray-500">Painel de Sugestões & Ideias</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-800 tabular-nums">
            {time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </p>
          <p className="text-xs text-gray-500 capitalize">
            {time.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* QR Code Section */}
        <div className="lg:col-span-1">
          <Card className="shadow-xl border-2 border-[#860063]/20 overflow-hidden">
            <div className="bg-gradient-to-br from-[#860063] to-[#F88D2A] p-5 text-center">
              <QrCode className="w-6 h-6 text-white/80 mx-auto mb-1" />
              <h2 className="text-white font-bold text-lg">Participe!</h2>
              <p className="text-white/80 text-xs mt-1">Escaneie o QR code para enviar sua sugestão, ideia ou requerimento</p>
            </div>
            <CardContent className="p-5 flex flex-col items-center gap-4">
              <div className="bg-white p-3 rounded-2xl shadow-lg border-4 border-[#860063]/10">
                <img src={qrUrl} alt="QR Code" className="w-64 h-64" />
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400 mb-1">ou acesse diretamente:</p>
                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-[#860063] font-mono break-all">{pageUrl}</code>
              </div>
            </CardContent>
          </Card>

          {/* Totais por tipo */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {porTipo.map(({ tipo, count }) => {
              const Icon = TIPO_ICONS[tipo];
              const color = TIPO_COLORS[tipo];
              return (
                <Card key={tipo} className="shadow-sm">
                  <CardContent className="p-3 text-center">
                    <Icon className={`w-5 h-5 mx-auto mb-1 ${color}`} />
                    <p className="text-xl font-bold text-gray-800">{count}</p>
                    <p className="text-[10px] text-gray-500">{tipo}s</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Hoje */}
          <Card className="mt-3 shadow-sm border border-[#F88D2A]/30">
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 bg-[#F88D2A]/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#F88D2A]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{totalHoje}</p>
                <p className="text-xs text-gray-500">submissões hoje</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Parking Lot */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <Clock className="w-4 h-4 text-gray-500" />
            <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">🅿️ Parking Lot</h3>
            <span className="ml-auto text-xs text-gray-400">{filteredSugestoes.length} registros</span>
          </div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#860063]"
            >
              <option value="all">Todos os status</option>
              <option value="pendente">Pendente</option>
              <option value="em_analise">Em Análise</option>
              <option value="aprovado">Aprovado</option>
              <option value="recusado">Recusado</option>
            </select>
            <button
              onClick={() => setShowConcluidos(!showConcluidos)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                showConcluidos
                  ? "bg-gray-700 text-white border-gray-700"
                  : "bg-white text-gray-500 border-gray-200 hover:border-gray-400"
              }`}
            >
              {showConcluidos ? "✓ Exibindo Concluídos" : "Exibir Concluídos"}
            </button>
          </div>
          <div className="space-y-3">
            {recentes.length === 0 && (
              <Card className="shadow-sm border-dashed border-2 border-gray-200">
                <CardContent className="p-8 text-center text-gray-400">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma submissão ainda.</p>
                  <p className="text-xs mt-1">Escaneie o QR code para ser o primeiro!</p>
                </CardContent>
              </Card>
            )}
            {recentes.map((s) => {
              const Icon = TIPO_ICONS[s.tipo] || MessageSquare;
              const color = TIPO_COLORS[s.tipo] || "text-gray-500";
              return (
                <Card key={s.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => setViewItem(s)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-gray-50 border flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-semibold text-gray-800 text-sm">{s.nome}</span>
                          <span className="text-xs text-gray-400">·</span>
                          <span className="text-xs text-gray-500">{s.departamento}</span>
                          <Badge className={`ml-auto border text-[10px] px-1.5 py-0 ${STATUS_COLORS[s.status]}`}>
                            {STATUS_LABELS[s.status]}
                          </Badge>
                        </div>
                        <p className="text-xs font-medium text-[#860063] mb-1">{s.tipo}</p>
                        <p className="text-sm text-gray-700 leading-relaxed line-clamp-2">{s.descricao}</p>
                        <p className="text-[10px] text-gray-400 mt-1.5">
                          {s.created_date ? new Date(s.created_date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : ""}
                        </p>
                      </div>
                      {/* Actions */}
                      <div className="flex flex-col gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => handleEdit(s)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#860063] hover:bg-[#860063]/10 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="max-w-2xl w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewItem && (() => { const Icon = TIPO_ICONS[viewItem.tipo] || MessageSquare; const color = TIPO_COLORS[viewItem.tipo] || 'text-gray-500'; return <Icon className={`w-5 h-5 ${color}`} />; })()}
              <span className="text-gray-800">{viewItem?.tipo}</span>
            </DialogTitle>
          </DialogHeader>
          {viewItem && (
            <div className="space-y-4 pt-1">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-gray-800">{viewItem.nome}</span>
                <span className="text-xs text-gray-400">·</span>
                <span className="text-sm text-gray-500">{viewItem.departamento}</span>
                <Badge className={`ml-auto border text-xs px-2 py-0.5 ${STATUS_COLORS[viewItem.status]}`}>
                  {STATUS_LABELS[viewItem.status]}
                </Badge>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-[60vh] overflow-y-auto">
                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{viewItem.descricao}</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {viewItem.created_date ? new Date(viewItem.created_date).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                </p>
                {viewItem.status === "aprovado" && (
                  <Button
                    size="sm"
                    onClick={() => handleMarkConcluido(viewItem.id)}
                    className="bg-gray-700 hover:bg-gray-800 text-white text-xs"
                  >
                    ✓ Marcar como Concluído
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editItem} onOpenChange={() => setEditItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#860063]">
              <Pencil className="w-4 h-4" /> Editar Submissão
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Nome</Label>
              <Input value={editForm.nome || ""} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Departamento</Label>
              <Select value={editForm.departamento} onValueChange={v => setEditForm({ ...editForm, departamento: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DEPARTAMENTOS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Tipo</Label>
              <Select value={editForm.tipo} onValueChange={v => setEditForm({ ...editForm, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sugestão">Sugestão</SelectItem>
                  <SelectItem value="Ideia">Ideia</SelectItem>
                  <SelectItem value="Requerimento">Requerimento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_analise">Em Análise</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="recusado">Recusado</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold">Descrição</Label>
              <Textarea value={editForm.descricao || ""} onChange={e => setEditForm({ ...editForm, descricao: e.target.value })} rows={4} className="resize-none" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setEditItem(null)}>Cancelar</Button>
              <Button
                disabled={saving}
                onClick={handleSave}
                className="flex-1 bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824] text-white"
              >
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}