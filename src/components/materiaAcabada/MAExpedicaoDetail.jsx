import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  X, Package, BarChart3, CheckCircle2,
  Truck, Hash, User, FileText, Weight, Plus, Trash2, ShieldCheck, ShieldX, Clock, Pencil, Save, AlertTriangle
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const STATUS_COLORS = {
  agendado: "bg-blue-100 text-blue-800 border-blue-200",
  aguardando: "bg-yellow-100 text-yellow-800 border-yellow-200",
  em_carregamento: "bg-orange-100 text-orange-800 border-orange-200",
  concluido: "bg-green-100 text-green-800 border-green-200",
  cancelado: "bg-red-100 text-red-800 border-red-200",
};
const STATUS_LABELS = {
  agendado: "Agendado",
  aguardando: "Aguardando",
  em_carregamento: "Em Carregamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

function now() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function MAExpedicaoDetail({ item, allRecords, userProfile, userEmail, onUpdate, onClose }) {
  const { data: lotes = [] } = useQuery({
    queryKey: ["ma-lotes"],
    queryFn: () => base44.entities.MALote.list("-data_entrada"),
    staleTime: 2 * 60 * 1000,
  });
  const [balancaForm, setBalancaForm] = useState({ vehicle_plate: "", driver_name: "", gross_weight: "", tare_weight: "" });
  const [batches, setBatches] = useState([{ batch: "", volumes: "" }]);
  const [operatorNotes, setOperatorNotes] = useState("");
  const [qualityNotes, setQualityNotes] = useState("");

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    setBalancaForm({
      vehicle_plate: item.vehicle_plate || "",
      driver_name: item.driver_name || "",
      gross_weight: item.gross_weight ?? "",
      tare_weight: item.tare_weight ?? "",
    });
    if (item.batches && item.batches.length > 0) {
      setBatches(item.batches.map(b => ({ batch: b.batch || "", volumes: b.volumes ?? "" })));
    } else if (item.batch_loaded) {
      setBatches([{ batch: item.batch_loaded, volumes: item.volumes_quantity ?? "" }]);
    } else {
      setBatches([{ batch: "", volumes: "" }]);
    }
    setOperatorNotes(item.notes || "");
    setQualityNotes(item.quality_release_notes || "");
    setEditMode(false);
  }, [item.id]);

  const startEdit = () => {
    setEditForm({
      date: item.date || "",
      material_no: item.material_no || "",
      sales_order_no: item.sales_order_no || "",
      customer: item.customer || "",
      short_text: item.short_text || "",
      customer_po_no: item.customer_po_no || "",
      quantity: item.quantity ?? "",
      net_price: item.net_price ?? "",
      pluto: item.pluto || "",
      delivery: item.delivery || "",
      paletizado: item.paletizado || "",
      frete: item.frete || "",
      status: item.status || "agendado",
      vehicle_plate: item.vehicle_plate || "",
      driver_name: item.driver_name || "",
      gross_weight: item.gross_weight ?? "",
      tare_weight: item.tare_weight ?? "",
      arrival_time: item.arrival_time || "",
      call_time: item.call_time || "",
      notes: item.notes || "",
    });
    setEditMode(true);
  };

  const handleSaveEdit = () => {
    const payload = {
      ...editForm,
      quantity: editForm.quantity !== "" ? parseFloat(editForm.quantity) : null,
      net_price: editForm.net_price !== "" ? parseFloat(editForm.net_price) : null,
      gross_weight: editForm.gross_weight !== "" ? parseFloat(editForm.gross_weight) : null,
      tare_weight: editForm.tare_weight !== "" ? parseFloat(editForm.tare_weight) : null,
    };
    if (payload.gross_weight && payload.tare_weight) {
      payload.net_weight = payload.gross_weight - payload.tare_weight;
    }
    onUpdate(payload);
    setEditMode(false);
    toast.success("✅ Agendamento atualizado!");
  };

  const netWeight = balancaForm.gross_weight !== "" && balancaForm.tare_weight !== ""
    ? parseFloat(balancaForm.gross_weight) - parseFloat(balancaForm.tare_weight)
    : null;

  const GRANEL_MATERIALS = ["000000100000035407", "000000100000045393", "000000100000035382"];
  const BIG_BAG_MATERIALS = ["000000100000065878", "000000100000036328"];
  const isGranel = GRANEL_MATERIALS.includes(item.material_no);
  const KG_PER_VOLUME = isGranel ? null : BIG_BAG_MATERIALS.includes(item.material_no) ? 900 : 25;
  const totalVolumes = batches.reduce((s, b) => s + (parseFloat(b.volumes) || 0), 0);
  const calculatedQty = isGranel
    ? (totalVolumes > 0 ? totalVolumes : null)
    : (totalVolumes > 0 ? (totalVolumes * KG_PER_VOLUME) / 1000 : null);

  const sameMatRecords = allRecords.filter(r => r.material_no === item.material_no);
  const totalProgramado = sameMatRecords.reduce((s, r) => s + (r.quantity || 0), 0);
  const totalExpedido = sameMatRecords.filter(r => r.status === "concluido").reduce((s, r) => s + (r.actual_quantity ?? r.quantity ?? 0), 0);
  const emAberto = sameMatRecords.filter(r => r.status !== "concluido" && r.status !== "cancelado").reduce((s, r) => s + (r.quantity || 0), 0);

  // ── Mapa de status de cada lote digitado ──
  const batchStatusMap = useMemo(() => {
    const map = {};
    batches.forEach(b => {
      if (!b.batch) return;
      const lote = lotes.find(l => l.lote?.trim().toLowerCase() === b.batch.trim().toLowerCase());
      if (!lote) return;
      map[b.batch] = lote;
    });
    return map;
  }, [batches, lotes]);

  // ── Lotes reservados para o cliente deste embarque ──
  const lotesReservadosParaCliente = useMemo(() => {
    if (!item.customer) return [];
    return lotes.filter(l =>
      l.lote_bloqueado &&
      l.motivo_bloqueio_lote === "Reservado para cliente" &&
      l.cliente_reserva_lote?.toLowerCase() === item.customer.toLowerCase()
    );
  }, [lotes, item.customer]);

  // ── Alertas de lote bloqueado / reserva ──
  const batchAlerts = useMemo(() => {
    const alerts = [];
    const alertedReserva = new Set();

    batches.forEach(b => {
      if (!b.batch) return;
      const lote = batchStatusMap[b.batch];

      // 1. Lote bloqueado (qualquer motivo)
      if (lote?.lote_bloqueado) {
        alerts.push({
          type: "bloqueado",
          lote: b.batch,
          motivo: lote.motivo_bloqueio_lote,
          obs: lote.observacao_bloqueio_lote,
          cliente_reserva: lote.cliente_reserva_lote,
        });
      }

      // 2. Cliente tem lotes reservados e o lote digitado NÃO é um deles
      if (lotesReservadosParaCliente.length > 0) {
        const isLoteReservadoParaCliente = lotesReservadosParaCliente.some(
          l => l.lote?.trim().toLowerCase() === b.batch.trim().toLowerCase()
        );
        if (!isLoteReservadoParaCliente && !alertedReserva.has(b.batch)) {
          alertedReserva.add(b.batch);
          // Verifica se o lote digitado está reservado para outro cliente
          const loteReservadoOutroCliente = lotes.find(
            l => l.lote_bloqueado &&
              l.motivo_bloqueio_lote === "Reservado para cliente" &&
              l.cliente_reserva_lote &&
              l.lote?.trim().toLowerCase() === b.batch.trim().toLowerCase()
          );
          alerts.push({
            type: "reserva_incorreta",
            lote: b.batch,
            cliente_embarque: item.customer,
            lotes_reservados: lotesReservadosParaCliente.map(l => l.lote),
            reservado_para: loteReservadoOutroCliente?.cliente_reserva_lote || null,
          });
        }
      }
    });
    return alerts;
  }, [batchStatusMap, batches, lotesReservadosParaCliente, item.customer]);

  const isOpBalanca = ["op_balanca", "supervisor", "admin"].includes(userProfile);
  const isOperador = ["operador", "supervisor", "admin"].includes(userProfile);
  const isAnalistaQualidade = ["analista_qualidade", "qualidade", "supervisor", "admin"].includes(userProfile);
  const canEdit = ["supervisor", "admin"].includes(userProfile);
  const isConcluido = item.status === "concluido" || item.status === "cancelado";

  const handleRegisterArrival = () => {
    const t = now();
    onUpdate({ arrival_time: t, arrived_by: userEmail, status: "aguardando", vehicle_plate: balancaForm.vehicle_plate || item.vehicle_plate, driver_name: balancaForm.driver_name || item.driver_name });
    toast.success(`✅ Chegada registrada às ${t}`);
  };

  const handleSaveBalanca = () => {
    if (!balancaForm.gross_weight || !balancaForm.tare_weight) {
      toast.error("Informe peso bruto e tara");
      return;
    }
    onUpdate({
      vehicle_plate: balancaForm.vehicle_plate,
      driver_name: balancaForm.driver_name,
      gross_weight: parseFloat(balancaForm.gross_weight),
      tare_weight: parseFloat(balancaForm.tare_weight),
      net_weight: netWeight,
    });
    toast.success("✅ Dados de balança salvos!");
  };

  const handleCallVehicle = () => {
    const t = now();
    onUpdate({ call_time: t, called_by: userEmail, status: "em_carregamento" });
    toast.success(`✅ Veículo chamado às ${t}`);
  };

  const handleSaveOperator = () => {
    const validBatches = batches.filter(b => b.batch || b.volumes);
    onUpdate({
      batches: validBatches,
      batch_loaded: validBatches.map(b => b.batch).filter(Boolean).join(", "),
      volumes_quantity: totalVolumes || null,
      actual_quantity: calculatedQty,
      notes: operatorNotes,
    });
    toast.success("✅ Dados da operação salvos!");
  };

  const handleMarkConcluido = () => {
    onUpdate({ status: "concluido" });
    toast.success("✅ Expedição concluída!");
  };

  const handleQualityRelease = () => {
    onUpdate({
      quality_released: true,
      quality_released_by: userEmail,
      quality_released_at: new Date().toISOString(),
      quality_release_notes: qualityNotes || null,
    });
    toast.success("✅ Embarque liberado pela Qualidade!");
  };

  const handleQualityRevoke = () => {
    onUpdate({ quality_released: false, quality_released_by: null, quality_released_at: null, quality_release_notes: null });
    toast.info("Liberação de qualidade removida.");
  };

  return (
    <Card className="shadow-lg border-2 border-[#860063]/30">
      <CardHeader className="border-b bg-gradient-to-r from-[#860063]/10 to-[#F88D2A]/10 py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold text-[#860063]">Detalhe da Expedição</CardTitle>
          <div className="flex items-center gap-2">
            {canEdit && !editMode && (
              <button onClick={startEdit} className="flex items-center gap-1 text-xs text-[#860063] hover:text-[#6b004f] bg-[#860063]/10 hover:bg-[#860063]/20 px-2 py-1 rounded transition-colors">
                <Pencil className="w-3 h-3" /> Editar
              </button>
            )}
            {editMode && (
              <>
                <button onClick={handleSaveEdit} className="flex items-center gap-1 text-xs text-green-700 hover:text-green-800 bg-green-100 hover:bg-green-200 px-2 py-1 rounded transition-colors">
                  <Save className="w-3 h-3" /> Salvar
                </button>
                <button onClick={() => setEditMode(false)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors">
                  <X className="w-3 h-3" /> Cancelar
                </button>
              </>
            )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-220px)] md:overflow-y-visible md:max-h-none">

        {/* ── EDIT MODE ── */}
        {editMode ? (
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-700 font-medium">
              ✏️ Modo edição — todos os campos estão habilitados
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-gray-500">Data</Label>
                <Input type="date" value={editForm.date} onChange={e => setEditForm({ ...editForm, date: e.target.value })} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Status</Label>
                <Select value={editForm.status} onValueChange={v => setEditForm({ ...editForm, status: v })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-[10px] text-gray-500">Cliente</Label>
                <Input value={editForm.customer} onChange={e => setEditForm({ ...editForm, customer: e.target.value })} className="h-7 text-xs" />
              </div>
              <div className="col-span-2">
                <Label className="text-[10px] text-gray-500">Short Text (Produto)</Label>
                <Input value={editForm.short_text} onChange={e => setEditForm({ ...editForm, short_text: e.target.value })} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Sales Order No</Label>
                <Input value={editForm.sales_order_no} onChange={e => setEditForm({ ...editForm, sales_order_no: e.target.value })} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Customer PO No</Label>
                <Input value={editForm.customer_po_no} onChange={e => setEditForm({ ...editForm, customer_po_no: e.target.value })} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Material No</Label>
                <Input value={editForm.material_no} onChange={e => setEditForm({ ...editForm, material_no: e.target.value })} className="h-7 text-xs font-mono" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Pluto</Label>
                <Input value={editForm.pluto} onChange={e => setEditForm({ ...editForm, pluto: e.target.value })} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Delivery</Label>
                <Input value={editForm.delivery} onChange={e => setEditForm({ ...editForm, delivery: e.target.value })} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Qty Programada (ton)</Label>
                <Input type="number" step="0.001" value={editForm.quantity} onChange={e => setEditForm({ ...editForm, quantity: e.target.value })} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Net Price (R$/ton)</Label>
                <Input type="number" step="0.01" value={editForm.net_price} onChange={e => setEditForm({ ...editForm, net_price: e.target.value })} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Paletizado</Label>
                <Select value={editForm.paletizado} onValueChange={v => setEditForm({ ...editForm, paletizado: v })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SIM">SIM</SelectItem>
                    <SelectItem value="NÃO">NÃO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Frete</Label>
                <Select value={editForm.frete} onValueChange={v => setEditForm({ ...editForm, frete: v })}>
                  <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CIF">CIF</SelectItem>
                    <SelectItem value="FCA">FCA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Operational fields */}
              <div>
                <Label className="text-[10px] text-gray-500">Placa do Veículo</Label>
                <Input value={editForm.vehicle_plate} onChange={e => setEditForm({ ...editForm, vehicle_plate: e.target.value.toUpperCase() })} className="h-7 text-xs" placeholder="ABC-1234" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Motorista</Label>
                <Input value={editForm.driver_name} onChange={e => setEditForm({ ...editForm, driver_name: e.target.value })} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Peso Bruto (kg)</Label>
                <Input type="number" value={editForm.gross_weight} onChange={e => setEditForm({ ...editForm, gross_weight: e.target.value })} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Tara (kg)</Label>
                <Input type="number" value={editForm.tare_weight} onChange={e => setEditForm({ ...editForm, tare_weight: e.target.value })} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Horário Chegada</Label>
                <Input type="time" value={editForm.arrival_time} onChange={e => setEditForm({ ...editForm, arrival_time: e.target.value })} className="h-7 text-xs" />
              </div>
              <div>
                <Label className="text-[10px] text-gray-500">Horário Chamada</Label>
                <Input type="time" value={editForm.call_time} onChange={e => setEditForm({ ...editForm, call_time: e.target.value })} className="h-7 text-xs" />
              </div>
              <div className="col-span-2">
                <Label className="text-[10px] text-gray-500">Observações</Label>
                <Input value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} className="h-7 text-xs" />
              </div>
            </div>
            <Button onClick={handleSaveEdit} className="w-full h-8 text-xs bg-green-600 hover:bg-green-700 text-white">
              <Save className="w-3.5 h-3.5 mr-1.5" /> Salvar Alterações
            </Button>
          </div>
        ) : (
          <>
            {/* Status badges */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={`${STATUS_COLORS[item.status || "agendado"]} border`}>
                {STATUS_LABELS[item.status || "agendado"]}
              </Badge>
              {item.arrival_time && (
                <span className="text-xs text-yellow-700 font-medium bg-yellow-50 border border-yellow-200 px-2 py-0.5 rounded flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Chegou às {item.arrival_time}
                </span>
              )}
              {item.call_time && (
                <span className="text-xs text-green-600 font-medium bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                  ✓ Chamado às {item.call_time}
                </span>
              )}
              {item.quality_released && (
                <span className="text-xs text-green-700 font-semibold bg-green-100 border border-green-300 px-2 py-0.5 rounded flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Qualidade Liberada
                </span>
              )}
            </div>

            {/* Basic Info */}
            <div className="space-y-2">
              <Row icon={<User className="w-3.5 h-3.5 text-[#860063]" />} label="Cliente" value={item.customer} />
              <Row icon={<FileText className="w-3.5 h-3.5 text-gray-400" />} label="Produto" value={item.short_text} />
              <Row icon={<Hash className="w-3.5 h-3.5 text-blue-400" />} label="Sales Order" value={item.sales_order_no} mono />
              {item.customer_po_no && <Row icon={<FileText className="w-3.5 h-3.5 text-gray-400" />} label="Customer PO" value={item.customer_po_no} />}
              <Row icon={<Truck className="w-3.5 h-3.5 text-[#F88D2A]" />} label="Pluto" value={item.pluto} mono />
              <Row icon={<Hash className="w-3.5 h-3.5 text-gray-400" />} label="Material No" value={item.material_no} mono />
              {item.paletizado && <Row icon={<Package className="w-3.5 h-3.5 text-gray-400" />} label="Paletizado" value={item.paletizado} />}
              {item.frete && <Row icon={<Truck className="w-3.5 h-3.5 text-gray-400" />} label="Frete" value={item.frete} />}
              <Row icon={<Package className="w-3.5 h-3.5 text-green-600" />} label="Qty Programada" value={`${item.quantity?.toLocaleString("pt-BR", { minimumFractionDigits: 3 })} ton`} bold />
            </div>

            {/* SKU Open Balance */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-2">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Saldo SKU — {item.material_no?.slice(-8)}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[["Total Prog.", totalProgramado, "text-gray-700", "border-blue-100"], ["Expedido", totalExpedido, "text-green-600", "border-green-200"], ["Em Aberto", emAberto, "text-orange-600", "border-orange-200"]].map(([l, v, c, bc]) => (
                  <div key={l} className={`bg-white rounded p-1.5 border ${bc}`}>
                    <p className="text-[9px] text-gray-400 uppercase">{l}</p>
                    <p className={`text-sm font-bold ${c}`}>{v.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}</p>
                    <p className="text-[9px] text-gray-400">ton</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── OP. BALANÇA SECTION ── */}
            {isOpBalanca && (
              <div className="border border-[#860063]/20 rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#860063]" />
                  <span className="text-xs font-bold text-[#860063] uppercase tracking-wide">Balança / Chegada</span>
                </div>
                {item.arrival_time && (
                  <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2">
                    🕐 Veículo chegou às <strong>{item.arrival_time}</strong>
                    {item.vehicle_plate && <> — <strong>{item.vehicle_plate}</strong></>}
                    {item.driver_name && <> — {item.driver_name}</>}
                  </div>
                )}
                {!isConcluido && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-gray-500">Placa</Label>
                        <Input value={balancaForm.vehicle_plate} onChange={e => setBalancaForm({ ...balancaForm, vehicle_plate: e.target.value.toUpperCase() })} className="h-7 text-xs" placeholder="ABC-1234" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-gray-500">Motorista</Label>
                        <Input value={balancaForm.driver_name} onChange={e => setBalancaForm({ ...balancaForm, driver_name: e.target.value })} className="h-7 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-gray-500">Peso Bruto (kg)</Label>
                        <Input type="number" value={balancaForm.gross_weight} onChange={e => setBalancaForm({ ...balancaForm, gross_weight: e.target.value })} className="h-7 text-xs" />
                      </div>
                      <div>
                        <Label className="text-[10px] text-gray-500">Tara (kg)</Label>
                        <Input type="number" value={balancaForm.tare_weight} onChange={e => setBalancaForm({ ...balancaForm, tare_weight: e.target.value })} className="h-7 text-xs" />
                      </div>
                    </div>
                    {netWeight !== null && (
                      <div className="bg-green-50 border border-green-300 rounded p-2 text-center">
                        <p className="text-[10px] text-green-600 uppercase">Peso Líquido Calculado</p>
                        <p className="text-xl font-bold text-green-700">{netWeight.toLocaleString("pt-BR")} kg</p>
                      </div>
                    )}
                    {(!item.vehicle_plate || !item.driver_name) && (
                      <Button onClick={handleRegisterArrival} className="w-full h-8 text-xs bg-yellow-500 hover:bg-yellow-600 text-white font-bold">
                        <Clock className="w-3.5 h-3.5 mr-1.5" /> Registrar Chegada do Veículo
                      </Button>
                    )}
                    <Button onClick={handleSaveBalanca} className="w-full h-8 text-xs bg-[#860063] hover:bg-[#6b004f]">
                      <Weight className="w-3.5 h-3.5 mr-1.5" /> Salvar Pesagem
                    </Button>
                  </>
                )}
                {isConcluido && item.gross_weight && (
                  <div className="grid grid-cols-3 gap-1 text-center text-xs">
                    {[["Bruto", item.gross_weight], ["Tara", item.tare_weight], ["Líquido", item.net_weight]].map(([l, v]) => (
                      <div key={l} className="bg-gray-50 rounded p-1 border border-gray-100">
                        <p className="text-[9px] text-gray-400">{l}</p>
                        <p className="font-semibold">{v?.toLocaleString("pt-BR")} kg</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── OPERADOR SECTION ── */}
            {isOperador && (
              <div className="border border-[#F88D2A]/30 rounded-lg p-3 space-y-3">
                <div className="flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-[#F88D2A]" />
                  <span className="text-xs font-bold text-[#F88D2A] uppercase tracking-wide">Operação de Carga</span>
                </div>
                {item.vehicle_plate && (
                  <div className="text-xs text-gray-600 bg-gray-50 rounded p-2 border border-gray-200">
                    🚛 <strong>{item.vehicle_plate}</strong>{item.driver_name && <> — {item.driver_name}</>}
                  </div>
                )}
                {!isConcluido && (
                  <>
                    {item.status === "aguardando" && !item.call_time && (
                      <Button onClick={handleCallVehicle} className="w-full h-8 text-xs bg-orange-400 hover:bg-orange-500 text-black font-bold">
                        📢 Chamar Veículo para Carregamento
                      </Button>
                    )}
                    {item.status === "agendado" && (
                      <div className="text-xs text-gray-400 text-center py-1 bg-gray-50 rounded border border-dashed border-gray-200">
                        Aguardando chegada do veículo (Op. Balança)
                      </div>
                    )}
                    {/* ── Alertas de lote bloqueado / reserva incorreta ── */}
                    {batchAlerts.map((alert, i) => (
                      <div key={i} className={`rounded-lg border-2 p-3 space-y-1 ${alert.type === "bloqueado" ? "bg-red-50 border-red-400" : "bg-orange-50 border-orange-400"}`}>
                        <div className="flex items-center gap-2">
                          <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${alert.type === "bloqueado" ? "text-red-600" : "text-orange-600"}`} />
                          <p className={`text-xs font-bold ${alert.type === "bloqueado" ? "text-red-700" : "text-orange-700"}`}>
                            {alert.type === "bloqueado"
                              ? `⛔ LOTE BLOQUEADO: ${alert.lote}`
                              : alert.reservado_para
                                ? `⚠️ LOTE RESERVADO PARA ${alert.reservado_para.toUpperCase()}: ${alert.lote}`
                                : `⚠️ LOTE SEM RESERVA: ${alert.lote}`}
                          </p>
                        </div>
                        {alert.type === "bloqueado" && (
                          <>
                            {alert.motivo && <p className="text-xs text-red-700 ml-6"><strong>Motivo:</strong> {alert.motivo}</p>}
                            {alert.cliente_reserva && <p className="text-xs text-red-700 ml-6"><strong>Reservado para:</strong> {alert.cliente_reserva}</p>}
                            {alert.obs && <p className="text-xs text-red-600 ml-6"><strong>Obs:</strong> {alert.obs}</p>}
                            <p className="text-xs text-red-800 font-semibold ml-6">📞 Contate o Departamento de Qualidade antes de prosseguir.</p>
                          </>
                        )}
                        {alert.type === "reserva_incorreta" && (
                          <>
                            {alert.reservado_para && (
                              <p className="text-xs text-orange-700 ml-6">Este lote está reservado para <strong>{alert.reservado_para}</strong>.</p>
                            )}
                            <p className="text-xs text-orange-700 ml-6">O cliente <strong>{alert.cliente_embarque}</strong> possui lotes reservados: <strong>{alert.lotes_reservados.join(", ")}</strong>.</p>
                            <p className="text-xs text-orange-700 ml-6">Solicite o desbloqueio do lote reservado, ou confirme com a Qualidade se seguirá com lote sem reserva.</p>
                          </>
                        )}
                      </div>
                    ))}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] text-gray-500 uppercase tracking-wide">Lotes Embarcados</Label>
                        <Button type="button" size="sm" variant="outline" onClick={() => setBatches([...batches, { batch: "", volumes: "" }])} className="h-6 text-[10px] px-2 border-[#860063]/40 text-[#860063] hover:bg-[#860063]/5">
                          <Plus className="w-3 h-3 mr-1" /> Adicionar Lote
                        </Button>
                      </div>
                      {batches.map((b, i) => {
                        const loteInfo = batchStatusMap[b.batch];
                        const isBloqueado = loteInfo?.lote_bloqueado;
                        return (
                          <div key={i} className="flex items-center gap-1.5">
                            <Input
                              value={b.batch}
                              onChange={e => { const u = [...batches]; u[i] = { ...u[i], batch: e.target.value }; setBatches(u); }}
                              className={`h-7 text-xs flex-1 ${isBloqueado ? "border-red-500 bg-red-50 text-red-700 font-semibold" : ""}`}
                              placeholder={`Lote ${i + 1}`}
                            />
                            <Input
                              type="number"
                              value={b.volumes}
                              onChange={e => { if (isBloqueado) return; const u = [...batches]; u[i] = { ...u[i], volumes: e.target.value }; setBatches(u); }}
                              className={`h-7 text-xs w-20 ${isBloqueado ? "opacity-40 cursor-not-allowed bg-gray-100" : ""}`}
                              placeholder="Volumes"
                              disabled={isBloqueado}
                              title={isBloqueado ? "Lote bloqueado — sem quantidade disponível para embarque" : ""}
                            />
                            {batches.length > 1 && (
                              <button type="button" onClick={() => setBatches(batches.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600 shrink-0">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {totalVolumes > 0 && (
                      <div className="bg-[#860063]/5 border border-[#860063]/20 rounded p-2 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Total Volumes</span>
                          <span className="font-bold text-gray-700">{totalVolumes.toLocaleString("pt-BR")}</span>
                        </div>
                        {isGranel
                          ? <div className="flex justify-between text-xs"><span className="text-gray-500">Tipo</span><span className="text-blue-600 font-medium">Granel (ton direto)</span></div>
                          : <div className="flex justify-between text-xs"><span className="text-gray-500">Peso por volume</span><span className="text-gray-500">{KG_PER_VOLUME} kg {KG_PER_VOLUME === 900 ? "(big bag)" : "(saco)"}</span></div>
                        }
                        <div className="flex justify-between text-xs border-t border-[#860063]/10 pt-1 mt-1">
                          <span className="text-[#860063] font-semibold">Qtd. Real Calculada</span>
                          <span className="font-bold text-[#860063] text-sm">{calculatedQty?.toLocaleString("pt-BR", { minimumFractionDigits: 3 })} ton</span>
                        </div>
                        {item.quantity != null && (
                          <div className={`flex justify-between text-xs ${Math.abs(calculatedQty - item.quantity) > 0.01 ? "text-orange-600" : "text-green-600"}`}>
                            <span>Diferença vs programado</span>
                            <span className="font-semibold">{(calculatedQty - item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 3 })} ton</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div>
                      <Label className="text-[10px] text-gray-500">Observações</Label>
                      <Input value={operatorNotes} onChange={e => setOperatorNotes(e.target.value)} className="h-7 text-xs" />
                    </div>
                    <Button onClick={handleSaveOperator} className="w-full h-8 text-xs bg-[#F88D2A] hover:bg-[#d97824] text-white">
                      💾 Salvar Dados da Operação
                    </Button>
                    {(item.status === "em_carregamento" || item.call_time) && (
                      <Button onClick={handleMarkConcluido} variant="outline" className="w-full h-8 text-xs border-green-500 text-green-600 hover:bg-green-50">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Marcar como Expedido ✓
                      </Button>
                    )}
                  </>
                )}
                {isConcluido && (
                  <div className="space-y-1.5 text-xs">
                    {item.batches && item.batches.length > 0 ? (
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Lotes Embarcados</p>
                        {item.batches.map((b, i) => (
                          <div key={i} className="flex justify-between bg-gray-50 rounded px-2 py-1 mb-1 border border-gray-100">
                            <span className="font-mono text-gray-700">{b.batch || `Lote ${i + 1}`}</span>
                            <span className="text-gray-500">{b.volumes?.toLocaleString("pt-BR")} vol.</span>
                          </div>
                        ))}
                      </div>
                    ) : item.batch_loaded && (
                      <Row icon={<Package className="w-3.5 h-3.5 text-gray-400" />} label="Lote" value={item.batch_loaded} />
                    )}
                    {item.volumes_quantity != null && <Row icon={<Hash className="w-3.5 h-3.5 text-gray-400" />} label="Total Volumes" value={item.volumes_quantity?.toLocaleString("pt-BR")} />}
                    {item.actual_quantity != null && <Row icon={<Package className="w-3.5 h-3.5 text-green-600" />} label="Qty Real" value={`${item.actual_quantity?.toLocaleString("pt-BR", { minimumFractionDigits: 3 })} ton`} bold />}
                    {item.notes && <Row icon={<FileText className="w-3.5 h-3.5 text-gray-400" />} label="Obs." value={item.notes} />}
                  </div>
                )}
              </div>
            )}

            {/* ── Alerta reserva incorreta para qualidade ── */}
            {isAnalistaQualidade && batchAlerts.filter(a => a.type === "reserva_incorreta").map((alert, i) => (
              <div key={i} className="bg-orange-50 border-2 border-orange-400 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                  <p className="text-xs font-bold text-orange-700">⚠️ ATENÇÃO QUALIDADE — Lote reservado para outro cliente</p>
                </div>
                <p className="text-xs text-orange-700 ml-6">O lote <strong>{alert.lote}</strong> não faz parte dos lotes reservados para <strong>{alert.cliente_embarque}</strong>. Lotes reservados: <strong>{alert.lotes_reservados.join(", ")}</strong>.</p>
                <p className="text-xs text-orange-800 font-semibold ml-6">Verifique se o operador deve pedir desbloqueio ou se seguirá com lote sem reserva.</p>
              </div>
            ))}

            {/* ── QUALIDADE SECTION ── */}
            {isAnalistaQualidade && (
              <div className={`border-2 rounded-lg p-3 space-y-3 ${item.quality_released ? "border-green-400 bg-green-50" : "border-orange-300 bg-orange-50"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    {item.quality_released ? <ShieldCheck className="w-4 h-4 text-green-600" /> : <ShieldX className="w-4 h-4 text-orange-500" />}
                    <span className={`text-xs font-bold uppercase tracking-wide ${item.quality_released ? "text-green-700" : "text-orange-600"}`}>Liberação Qualidade</span>
                  </div>
                  {item.quality_released && <span className="text-[10px] bg-green-200 text-green-800 font-semibold px-2 py-0.5 rounded-full">LIBERADO</span>}
                </div>
                {item.quality_released ? (
                  <div className="space-y-1 text-xs">
                    <p className="text-green-700"><strong>Liberado por:</strong> {item.quality_released_by}</p>
                    <p className="text-green-700"><strong>Em:</strong> {item.quality_released_at ? new Date(item.quality_released_at).toLocaleString("pt-BR") : "-"}</p>
                    {item.quality_release_notes && <p className="text-green-700"><strong>Obs:</strong> {item.quality_release_notes}</p>}
                    <button onClick={handleQualityRevoke} className="mt-2 text-[10px] text-red-500 hover:text-red-700 underline">Remover liberação</button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-xs text-orange-700">Este embarque ainda não possui liberação da Qualidade.</p>
                    <div>
                      <Label className="text-[10px] text-gray-500">Observações (opcional)</Label>
                      <input value={qualityNotes} onChange={e => setQualityNotes(e.target.value)} placeholder="Ex: Lote aprovado, FFA ok..." className="mt-1 w-full h-7 rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                    </div>
                    <Button onClick={handleQualityRelease} className="w-full h-8 text-xs bg-green-600 hover:bg-green-700 text-white">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Liberar Embarque — Qualidade
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!isOpBalanca && !isOperador && isConcluido && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-1 text-xs">
                <p className="font-bold text-green-700 mb-2">✅ Expedição concluída</p>
                {item.vehicle_plate && <p><strong>Veículo:</strong> {item.vehicle_plate} — {item.driver_name}</p>}
                {item.net_weight && <p><strong>Peso Líquido:</strong> {item.net_weight?.toLocaleString("pt-BR")} kg</p>}
                {item.actual_quantity && <p><strong>Qty Real:</strong> {item.actual_quantity?.toLocaleString("pt-BR", { minimumFractionDigits: 3 })} ton</p>}
              </div>
            )}
          </>
        )}

      </CardContent>
    </Card>
  );
}

function Row({ icon, label, value, mono, bold }) {
  return (
    <div className="flex gap-2">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gray-400 uppercase tracking-wide leading-none mb-0.5">{label}</p>
        <p className={`text-gray-800 break-words ${mono ? "font-mono text-xs" : "text-sm"} ${bold ? "font-bold text-[#860063]" : ""}`}>
          {value ?? "-"}
        </p>
      </div>
    </div>
  );
}