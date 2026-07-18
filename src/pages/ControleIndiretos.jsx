import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2, Clock, ChevronLeft, ChevronRight,
  DollarSign, Plus, Undo2, AlertTriangle, Trash2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Constants ───────────────────────────────────────────────────────────────

const FILIAIS = [
  { id: "BA - Eunápolis",    estado: "BA", cidade: "Eunápolis" },
  { id: "BA - Gandú",        estado: "BA", cidade: "Gandú" },
  { id: "BA - Central",      estado: "BA", cidade: "Central" },
  { id: "BA - Ipiaú",        estado: "BA", cidade: "Ipiaú" },
  { id: "BA - Itabuna",      estado: "BA", cidade: "Itabuna" },
  { id: "BA - Ituberá",      estado: "BA", cidade: "Ituberá" },
  { id: "BA - Ferraz",       estado: "BA", cidade: "Ferraz" },
  { id: "BA - Barra",        estado: "BA", cidade: "Barra" },
  { id: "BA - P. Infantil",  estado: "BA", cidade: "P. Infantil" },
  { id: "PA - Altamira",     estado: "PA", cidade: "Altamira" },
  { id: "PA - Medicilândia", estado: "PA", cidade: "Medicilândia" },
];

const BASE_ITEMS = [
  "Aluguel Armazém",
  "Despesas Elétricas",
  "Abastecimento Água",
  "Provedor de Internet",
  "Serviço Telefonia",
  "Prevenção a Incêndio",
];

// Steps AFTER PR/PO (those are text fields, not workflow steps)
const STEPS = [
  { label: "Orçamento",             group: "Compras" },
  { label: "Criação de PR",         group: "Estagiário" },
  { label: "Aprovação de PR",       group: "Supervisor" },
  { label: "Aprov. Justificativa",  group: "Gerência" },
  { label: "E-mail sol. PO",        group: "Estagiário" },
  { label: "Criação de PO",         group: "Compras" },
  { label: "Aprovação de PO",       group: "Gerência" },
  { label: "Aguardando pagamento",  group: "Financeiro" },
  { label: "Finalizado",            group: null },
];

function getFixedItems(filialId) {
  return [...BASE_ITEMS];
}

function daysBetween(startStr, endStr) {
  if (!startStr) return null;
  const end = endStr ? new Date(endStr).getTime() : Date.now();
  return Math.floor((end - new Date(startStr).getTime()) / (1000 * 60 * 60 * 24));
}

// ─── SapNumberCell: inline editable SAP number ───────────────────────────────
function SapNumberCell({ value, onSave, placeholder }) {
  const [local, setLocal] = useState(value || "");
  const [editing, setEditing] = useState(false);

  const handleBlur = () => {
    setEditing(false);
    if (local !== (value || "")) onSave(local);
  };

  if (editing) {
    return (
      <input
        autoFocus
        value={local}
        onChange={e => setLocal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={e => { if (e.key === "Enter") e.target.blur(); }}
        className="w-full text-[10px] border border-blue-400 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-blue-400 bg-blue-50 text-gray-800 min-w-[64px]"
        placeholder={placeholder}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title="Clique para digitar número SAP"
      className={`w-full text-[10px] rounded px-1 py-1 cursor-pointer border transition-all min-w-[64px] text-center ${
        local
          ? "border-blue-200 bg-blue-50 text-blue-800 font-mono font-semibold"
          : "border-dashed border-gray-200 text-gray-300 hover:border-blue-300 hover:text-gray-400"
      }`}
    >
      {local || placeholder}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ControleIndiretos() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedFilial, setSelectedFilial] = useState(FILIAIS[2].id);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const queryClient = useQueryClient();
  const monthKey = format(currentMonth, "yyyy-MM");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["indiretos", monthKey, selectedFilial] });
    queryClient.invalidateQueries({ queryKey: ["indiretos-all", selectedFilial] });
  };

  const { data: currentRecords = [], isLoading } = useQuery({
    queryKey: ["indiretos", monthKey, selectedFilial],
    queryFn: async () => {
      const res = await base44.functions.invoke('getIndiretosCosts', { month: monthKey, filial: selectedFilial });
      return res.data?.records || [];
    },
  });

  const { data: allRecords = [] } = useQuery({
    queryKey: ["indiretos-all", selectedFilial],
    queryFn: async () => {
      const res = await base44.functions.invoke('getIndiretosCosts', { filial: selectedFilial, allByFilial: true });
      return res.data?.records || [];
    },
  });

  const rolledOver = allRecords.filter((r) => {
    if (r.month >= monthKey) return false;
    if ((r.completed_steps || []).length === STEPS.length) return false;
    if (!r.is_custom) return false;
    return !currentRecords.some(cr => cr.origin_month === r.month && cr.item_name === r.item_name);
  });

  const updateRecord = useMutation({
    mutationFn: async (data) => {
      const { item_name, recordId, is_custom, origin_month, ...fields } = data;
      if (recordId) {
        const res = await base44.functions.invoke('updateEntityRecord', {
          entity: 'IndiretosCost', id: recordId, data: fields, action: 'update'
        });
        if (res.data?.error) throw new Error(res.data.error);
        return res.data;
      }
      const res = await base44.functions.invoke('updateEntityRecord', {
        entity: 'IndiretosCost',
        data: { item_name, filial: selectedFilial, month: monthKey, is_custom: is_custom || false, origin_month, ...fields },
        action: 'create'
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: invalidate,
    onError: (err) => toast.error(`Erro ao salvar: ${err?.message || "verifique suas permissões"}`),
  });

  const deleteRecord = useMutation({
    mutationFn: async (id) => {
      const res = await base44.functions.invoke('updateEntityRecord', {
        entity: 'IndiretosCost', id, data: {}, action: 'delete'
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => { invalidate(); toast.success("Item removido."); },
    onError: (err) => toast.error(`Erro ao remover: ${err?.message || "verifique suas permissões"}`),
  });

  const addCustomItem = useMutation({
    mutationFn: async (name) => {
      const res = await base44.functions.invoke('updateEntityRecord', {
        entity: 'IndiretosCost',
        data: { item_name: name, filial: selectedFilial, month: monthKey, is_custom: true, completed_steps: [], step_dates: {} },
        action: 'create',
      });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => { invalidate(); setShowAddDialog(false); setNewItemName(""); toast.success("Compra adicionada."); },
    onError: (err) => toast.error(`Erro ao adicionar: ${err?.message || "verifique suas permissões"}`),
  });

  const getRecord = (item_name) =>
    currentRecords.find(r => r.item_name === item_name && !r.origin_month) ||
    currentRecords.find(r => r.item_name === item_name) ||
    { completed_steps: [], step_dates: {} };

  const handleStepClick = async (rec, item_name, stepIdx) => {
    const completed = rec.completed_steps || [];
    if (stepIdx !== completed.length) return;
    const newCompleted = [...completed, stepIdx];
    const newDates = { ...(rec.step_dates || {}), [stepIdx]: new Date().toISOString() };

    if (rec.id) {
      // Record already exists — just update
      await updateRecord.mutateAsync({ item_name, recordId: rec.id, completed_steps: newCompleted, step_dates: newDates });
    } else {
      // Record doesn't exist yet — create it first
      await updateRecord.mutateAsync({
        item_name,
        is_custom: false,
        completed_steps: newCompleted,
        step_dates: newDates,
      });
    }

    if (stepIdx === STEPS.length - 1) toast.success(`✅ ${item_name} — Finalizado!`);
    else toast.success(`✅ "${STEPS[stepIdx].label}" concluído`);
  };

  const handleUndoStep = async (rec, item_name) => {
    const completed = rec.completed_steps || [];
    if (completed.length === 0 || !rec.id) { toast.info("Nada para desfazer."); return; }
    const lastIdx = completed[completed.length - 1];
    const newCompleted = completed.slice(0, -1);
    const newDates = { ...(rec.step_dates || {}) };
    delete newDates[lastIdx];
    await updateRecord.mutateAsync({ item_name, recordId: rec.id, completed_steps: newCompleted, step_dates: newDates });
    toast.info(`↩ "${STEPS[lastIdx].label}" desfeito.`);
  };

  const handleSapSave = async (rec, item_name, field, value) => {
    await updateRecord.mutateAsync({ item_name, recordId: rec.id, [field]: value });
  };

  const handleRolloverStepClick = async (origRec, stepIdx) => {
    const proxy = currentRecords.find(r => r.item_name === origRec.item_name && r.origin_month === origRec.month);
    const active = proxy || origRec;
    const completed = active.completed_steps || [];
    if (stepIdx !== completed.length) return;
    const newCompleted = [...completed, stepIdx];
    const newDates = { ...(active.step_dates || {}), [stepIdx]: new Date().toISOString() };
    if (proxy) {
      const res = await base44.functions.invoke('updateEntityRecord', {
        entity: 'IndiretosCost', id: proxy.id, data: { completed_steps: newCompleted, step_dates: newDates }, action: 'update',
      });
      if (res.data?.error) throw new Error(res.data.error);
    } else {
      const res = await base44.functions.invoke('updateEntityRecord', {
        entity: 'IndiretosCost',
        data: {
          item_name: origRec.item_name, filial: selectedFilial, month: monthKey,
          is_custom: true, origin_month: origRec.month,
          pr_number: origRec.pr_number, po_number: origRec.po_number,
          completed_steps: newCompleted, step_dates: newDates,
        },
        action: 'create',
      });
      if (res.data?.error) throw new Error(res.data.error);
    }
    invalidate();
    if (stepIdx === STEPS.length - 1) toast.success(`✅ ${origRec.item_name} — Finalizado!`);
    else toast.success(`✅ "${STEPS[stepIdx].label}" concluído`);
  };

  const handleRolloverUndo = async (origRec) => {
    const proxy = currentRecords.find(r => r.item_name === origRec.item_name && r.origin_month === origRec.month);
    const src = proxy || origRec;
    const completed = src.completed_steps || [];
    if (completed.length === 0 || !src.id) return;
    const lastIdx = completed[completed.length - 1];
    const newDates = { ...(src.step_dates || {}) };
    delete newDates[lastIdx];
    const res = await base44.functions.invoke('updateEntityRecord', {
      entity: 'IndiretosCost', id: src.id, data: { completed_steps: completed.slice(0, -1), step_dates: newDates }, action: 'update',
    });
    if (res.data?.error) throw new Error(res.data.error);
    invalidate();
    toast.info(`↩ "${STEPS[lastIdx].label}" desfeito.`);
  };

  const fixedItems = getFixedItems(selectedFilial);
  const customItems = currentRecords.filter(r => r.is_custom && !r.origin_month);
  const allRows = [...fixedItems.map(getRecord), ...customItems];
  const finalized = allRows.filter(r => (r.completed_steps || []).length === STEPS.length).length;
  const inProgress = allRows.filter(r => { const l = (r.completed_steps || []).length; return l > 0 && l < STEPS.length; }).length;

  const baFiliais = FILIAIS.filter(f => f.estado === "BA");
  const paFiliais = FILIAIS.filter(f => f.estado === "PA");

  // ─── Row renderer ───────────────────────────────────────────────────────────
  const renderRow = ({ item_name, rec, isCustom, showDelete, onStepClick, onUndo, onDelete, onSap, rolledMonth }) => {
    const completed = rec.completed_steps || [];
    const step_dates = rec.step_dates || {};
    const activeStep = completed.length;
    const isFinalized = activeStep === STEPS.length;
    const hasStarted = activeStep > 0;

    return (
      <tr
        key={`${item_name}-${rolledMonth || "cur"}`}
        className={`border-b last:border-0 transition-colors ${
          isFinalized ? "bg-green-50/40" : hasStarted ? "bg-yellow-50/20" : "bg-white hover:bg-gray-50/40"
        }`}
      >
        {/* Item name */}
        <td className={`px-3 py-1.5 sticky left-0 z-10 font-medium text-[11px] text-gray-800 ${
          isFinalized ? "bg-green-50/60" : hasStarted ? "bg-yellow-50/30" : "bg-white"
        }`}>
          <div className="flex items-center gap-1.5">
            {isFinalized ? <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
             : hasStarted ? <Clock className="w-3 h-3 text-yellow-500 flex-shrink-0 animate-pulse" />
             : <div className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" />}
            <span>{item_name}</span>
            {rolledMonth && <span className="ml-1 text-[9px] bg-orange-100 text-orange-600 border border-orange-300 rounded px-1">{rolledMonth}</span>}
            {isCustom && !rolledMonth && <span className="ml-1 text-[9px] bg-blue-100 text-blue-600 border border-blue-200 rounded px-1">compra</span>}
          </div>
        </td>

        {/* PR Number (SAP input) */}
        <td className="px-1 py-1 text-center">
          <SapNumberCell
            value={rec.pr_number}
            placeholder="PR #"
            onSave={v => onSap("pr_number", v)}
          />
        </td>

        {/* PO Number (SAP input) */}
        <td className="px-1 py-1 text-center">
          <SapNumberCell
            value={rec.po_number}
            placeholder="PO #"
            onSave={v => onSap("po_number", v)}
          />
        </td>

        {/* Workflow steps */}
        {STEPS.map((step, idx) => {
          const isDone = completed.includes(idx);
          const isActive = idx === activeStep && !isFinalized;
          const isLocked = idx > activeStep;
          const isFinalStep = idx === STEPS.length - 1;

          // Dias que ficou parado neste step = data conclusão deste step - data conclusão step anterior (ou início do processo)
          const stepStart = idx === 0 ? null : step_dates[idx - 1]; // quando o step anterior foi concluído
          const stepEnd = step_dates[idx]; // quando este step foi concluído

          // Para steps concluídos: tempo que levou para concluir este step
          const stepDays = isDone ? daysBetween(stepStart, stepEnd) : null;

          // Para step ativo: tempo aguardando conclusão desde que o anterior foi concluído
          const waitingDays = isActive ? daysBetween(stepStart, null) : null;

          // Para "Finalizado": soma de todos os dias de todos os steps
          let totalDays = null;
          if (isFinalStep && isDone && step_dates[0] !== undefined) {
            // soma do step 0 até o último
            totalDays = daysBetween(step_dates[0], step_dates[STEPS.length - 1]);
          }

          return (
            <td key={idx} className="px-1 py-1 text-center">
              <button
                onClick={() => !isDone && !isLocked && onStepClick(idx)}
                disabled={isLocked || isDone}
                title={
                  isDone && stepEnd
                    ? `Concluído ${format(new Date(stepEnd), "dd/MM HH:mm")}${stepDays !== null ? ` · ${stepDays}d neste step` : ""}`
                    : isActive ? `Clique para concluir: ${step.label}`
                    : isLocked ? "Aguardando etapa anterior"
                    : step.label
                }
                className={`w-full rounded px-1 py-0.5 text-[10px] font-semibold leading-tight transition-all
                  ${isDone
                    ? isFinalStep
                      ? "bg-emerald-100 border border-emerald-400 text-emerald-700 cursor-default"
                      : "bg-green-100 border border-green-300 text-green-700 cursor-default"
                    : isActive
                      ? "bg-yellow-100 border border-yellow-400 text-yellow-700 cursor-pointer hover:bg-yellow-200 shadow-sm ring-1 ring-yellow-300"
                      : "bg-gray-50 border border-gray-200 text-gray-200 cursor-not-allowed"
                  }
                `}
              >
                {isDone ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <CheckCircle2 className={`w-3 h-3 ${isFinalStep ? "text-emerald-600" : "text-green-500"}`} />
                    {isFinalStep && totalDays !== null ? (
                      <span className="text-[9px] text-emerald-700 font-bold">{totalDays}d total</span>
                    ) : stepEnd ? (
                        <span className="text-[9px] text-green-600 font-normal">{format(new Date(stepEnd), "dd/MM")}</span>
                      ) : null}
                  </div>
                ) : isActive ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <Clock className="w-3 h-3 text-yellow-500" />
                    {waitingDays !== null
                      ? <span className="text-[9px] text-yellow-600 font-bold">{waitingDays}d</span>
                      : <span className="text-[9px]">ativo</span>
                    }
                  </div>
                ) : (
                   <span className="text-gray-200">—</span>
                 )}
                </button>
                </td>
                );
                })}

                {/* Actions */}
        <td className="px-1.5 py-1 text-center">
          <div className="flex items-center justify-center gap-1">
            {hasStarted && !isFinalized && (
              <button onClick={onUndo} title="Desfazer último step"
                className="p-1 text-gray-300 hover:text-orange-500 transition-colors rounded">
                <Undo2 className="w-3 h-3" />
              </button>
            )}
            {showDelete && (
              <button onClick={onDelete} title="Remover item"
                className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded">
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  // ─── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-4">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#860063]" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Controle de Indiretos</h1>
            <p className="text-xs text-gray-500">Fluxo de aprovação dos custos fixos mensais</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => subMonths(m, 1))}>
            <ChevronLeft className="w-3.5 h-3.5" />
          </Button>
          <span className="text-sm font-semibold text-gray-800 w-36 text-center">
            {format(currentMonth, "MMMM yyyy", { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}
          </span>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth(m => addMonths(m, 1))}>
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Filial tabs */}
      <div className="bg-white border rounded-lg p-2 space-y-1.5">
        {[{ label: "BA", items: baFiliais }, { label: "PA", items: paFiliais }].map(({ label, items }) => (
          <div key={label} className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider w-5">{label}</span>
            {items.map(f => (
              <button key={f.id} onClick={() => setSelectedFilial(f.id)}
                className={`text-xs px-3 py-1 rounded-full border font-medium transition-all ${
                  selectedFilial === f.id
                    ? "bg-[#860063] text-white border-[#860063]"
                    : "bg-gray-50 text-gray-600 border-gray-200 hover:border-[#860063]/40 hover:text-[#860063]"
                }`}>
                {f.cidade}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Summary + Add */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2 text-xs flex-wrap">
          <span className="px-2.5 py-1 bg-gray-100 rounded-full text-gray-600 font-medium">{fixedItems.length + customItems.length + rolledOver.length} itens</span>
          <span className="px-2.5 py-1 bg-yellow-100 rounded-full text-yellow-700 font-medium">{inProgress} em andamento</span>
          <span className="px-2.5 py-1 bg-green-100 rounded-full text-green-700 font-medium">{finalized} finalizados</span>
          {rolledOver.length > 0 && (
            <span className="px-2.5 py-1 bg-orange-100 rounded-full text-orange-700 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />{rolledOver.length} rolados
            </span>
          )}
        </div>
        <Button size="sm" className="h-7 text-xs bg-[#860063] hover:bg-[#6b004f] gap-1" onClick={() => setShowAddDialog(true)}>
          <Plus className="w-3.5 h-3.5" />Incluir Compra
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex justify-center py-10">
          <div className="w-7 h-7 border-4 border-[#860063] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              {/* Group row */}
              <tr className="border-b bg-gray-100">
                <th className="sticky left-0 bg-gray-100 z-10 min-w-[180px]" />
                {/* PR/PO — no group */}
                <th className="px-1.5 py-1 text-center text-[9px] text-gray-400 min-w-[72px]" />
                <th className="px-1.5 py-1 text-center text-[9px] text-gray-400 min-w-[72px]" />
                {/* Workflow groups */}
                {STEPS.map((step, i) => (
                  <th key={i} className={`px-1.5 py-1 text-center text-[9px] font-bold uppercase tracking-wider min-w-[80px] ${
                    step.group ? "text-[#860063]" : ""
                  }`}>
                    {step.group || ""}
                  </th>
                ))}
                <th className="bg-gray-100 min-w-[56px]" />
              </tr>
              {/* Step labels row */}
              <tr className="border-b bg-gray-50">
                <th className="text-left px-3 py-1.5 text-[11px] font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10">
                  Compra / Serviço
                </th>
                <th className="px-1.5 py-1.5 text-center text-[10px] font-semibold text-gray-700">Número PR</th>
                <th className="px-1.5 py-1.5 text-center text-[10px] font-semibold text-gray-700">Número PO</th>
                {STEPS.map((step, i) => (
                  <th key={i} className="px-1.5 py-1.5 text-center">
                    <div className="text-[10px] font-semibold text-gray-700 leading-tight">{step.label}</div>
                  </th>
                ))}
                <th className="px-2 py-1.5 text-center text-[10px] font-semibold text-gray-400">Ações</th>
              </tr>
            </thead>
            <tbody>
              {/* Fixed items */}
              {fixedItems.map(item_name => {
                const rec = getRecord(item_name);
                return renderRow({
                  item_name, rec, isCustom: false, showDelete: false,
                  onStepClick: idx => handleStepClick(rec, item_name, idx),
                  onUndo: () => handleUndoStep(rec, item_name),
                  onDelete: null,
                  onSap: (field, val) => handleSapSave(rec, item_name, field, val),
                  rolledMonth: null,
                });
              })}

              {/* Custom items */}
              {customItems.map(rec =>
                renderRow({
                  item_name: rec.item_name, rec, isCustom: true, showDelete: true,
                  onStepClick: idx => handleStepClick(rec, rec.item_name, idx),
                  onUndo: () => handleUndoStep(rec, rec.item_name),
                  onDelete: () => deleteRecord.mutate(rec.id),
                  onSap: (field, val) => handleSapSave(rec, rec.item_name, field, val),
                  rolledMonth: null,
                })
              )}

              {/* Rolled over */}
              {rolledOver.length > 0 && (
                <tr>
                  <td colSpan={STEPS.length + 4} className="px-3 py-1.5 bg-orange-50 border-t border-orange-200">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                      <AlertTriangle className="w-3 h-3" />Itens pendentes de meses anteriores
                    </div>
                  </td>
                </tr>
              )}
              {rolledOver.map(origRec => {
                const proxy = currentRecords.find(r => r.item_name === origRec.item_name && r.origin_month === origRec.month);
                const activeRec = proxy || origRec;
                return renderRow({
                  item_name: origRec.item_name, rec: activeRec, isCustom: true, showDelete: false,
                  onStepClick: idx => handleRolloverStepClick(origRec, idx),
                  onUndo: () => handleRolloverUndo(origRec),
                  onDelete: null,
                  onSap: (field, val) => handleSapSave(activeRec, origRec.item_name, field, val),
                  rolledMonth: origRec.month,
                });
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="bg-gray-50 border rounded-lg p-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Legenda</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {STEPS.map((s, i) => (
            <span key={i} className="text-[10px] bg-white border rounded px-2 py-0.5 text-gray-500">
              <strong className="text-gray-700">{i + 1}. {s.label}</strong>
              {s.group && ` · ${s.group}`}
            </span>
          ))}
        </div>
        <div className="flex gap-4 text-[10px] text-gray-500">
          <span className="flex items-center gap-1"><Undo2 className="w-3 h-3 text-orange-400" /> Desfaz último step</span>
          <span className="flex items-center gap-1"><Trash2 className="w-3 h-3 text-red-400" /> Remove compra</span>
        </div>
      </div>

      {/* Add custom item dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#860063]" />
              Incluir Compra — {selectedFilial}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs text-gray-600">Descrição da compra / serviço</Label>
              <Input
                className="mt-1 text-sm h-8"
                placeholder="Ex: Dedetização, Manutenção Elétrica..."
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && newItemName.trim() && addCustomItem.mutate(newItemName.trim())}
                autoFocus
              />
            </div>
            <p className="text-[11px] text-gray-400">
              Se não concluído, aparecerá automaticamente nos meses seguintes como item rolado.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1 h-8 text-xs"
                onClick={() => { setShowAddDialog(false); setNewItemName(""); }}>
                Cancelar
              </Button>
              <Button size="sm" className="flex-1 h-8 text-xs bg-[#860063] hover:bg-[#6b004f]"
                disabled={!newItemName.trim()} onClick={() => addCustomItem.mutate(newItemName.trim())}>
                Incluir
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}