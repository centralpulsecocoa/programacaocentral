import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MALayout from "@/components/materiaAcabada/MALayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Truck, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";

const COLUMNS = [
  { key: "date", label: "Date", width: 90, align: "left", fmt: v => v ? v.split("-").reverse().join("/") : "-" },
  { key: "material_no", label: "Material No", width: 155, align: "left" },
  { key: "sales_order_no", label: "Sales Order No", width: 125, align: "left" },
  { key: "customer", label: "Customer", width: 190, align: "left" },
  { key: "short_text", label: "Short Text", width: 260, align: "left" },
  { key: "customer_po_no", label: "Customer PO No", width: 200, align: "left" },
  { key: "quantity", label: "Quantity", width: 80, align: "right", fmt: v => v != null ? Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 3, maximumFractionDigits: 3 }) : "-" },
  { key: "net_price", label: "Net Price", width: 100, align: "right", fmt: v => v != null ? Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "-" },
  { key: "pluto", label: "Pluto", width: 115, align: "left" },
  { key: "delivery", label: "Delivery", width: 100, align: "left" },
];

const EMPTY_FILTERS = Object.fromEntries(COLUMNS.map(c => [c.key, ""]));

const EMPTY_FORM = {
  date: format(new Date(), "yyyy-MM-dd"),
  material_no: "",
  sales_order_no: "",
  customer: "",
  short_text: "",
  customer_po_no: "",
  quantity: "",
  net_price: "",
  pluto: "",
  delivery: "",
  paletizado: "",
  frete: "",
};

export default function MateriaAcabadaExpedicao() {
  const currentMonth = format(new Date(), "yyyy-MM");
  const queryClient = useQueryClient();
  const [filterMode, setFilterMode] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [colFilters, setColFilters] = useState(EMPTY_FILTERS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["ma-expedicao"],
    queryFn: () => base44.entities.MAExpedicao.list("date"),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MAExpedicao.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ma-expedicao"] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      toast.success("✅ Carregamento adicionado à programação!");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.date || !form.material_no) {
      toast.error("Date e Material No são obrigatórios");
      return;
    }
    createMutation.mutate({
      ...form,
      quantity: form.quantity !== "" ? parseFloat(form.quantity) : null,
      net_price: form.net_price !== "" ? parseFloat(form.net_price) : null,
    });
  };

  const filtered = useMemo(() => {
    let data = records;

    if (filterMode === "month") {
      data = data.filter(r => r.date && r.date.startsWith(selectedMonth));
    } else {
      data = data.filter(r => r.date && r.date >= startDate && r.date <= endDate);
    }

    COLUMNS.forEach(({ key }) => {
      const val = colFilters[key];
      if (!val) return;
      const v = val.toLowerCase();
      data = data.filter(r => {
        const cell = r[key] != null ? String(r[key]).toLowerCase() : "";
        return cell.includes(v);
      });
    });

    return data;
  }, [records, filterMode, selectedMonth, startDate, endDate, colFilters]);

  const totalQty = filtered.reduce((s, r) => s + (r.quantity || 0), 0);
  const totalNetPrice = filtered.reduce((s, r) => s + (r.net_price || 0), 0);

  const setColFilter = (col, val) => setColFilters(prev => ({ ...prev, [col]: val }));

  return (
    <MALayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#860063]" />
              Programação de Expedição
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Expedições programadas por data</p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Carregamento
          </Button>
        </div>

        {/* Filter Bar */}
        <Card className="mb-4">
          <CardContent className="pt-3 pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1">
                <button
                  onClick={() => setFilterMode("month")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterMode === "month" ? "bg-[#860063] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setFilterMode("period")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterMode === "period" ? "bg-[#860063] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  Período
                </button>
              </div>

              {filterMode === "month" ? (
                <div className="flex items-center gap-2">
                  <Label className="text-sm whitespace-nowrap">Mês:</Label>
                  <Input
                    type="month"
                    value={selectedMonth}
                    onChange={e => setSelectedMonth(e.target.value)}
                    className="w-40 h-8 text-sm"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-sm">De:</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36 h-8 text-sm" />
                  <Label className="text-sm">Até:</Label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36 h-8 text-sm" />
                </div>
              )}

              <div className="ml-auto flex items-center gap-3 text-sm text-gray-600">
                <span><strong>{filtered.length}</strong> registros</span>
                {filtered.length > 0 && (
                  <>
                    <span>| Qtd total: <strong>{totalQty.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}</strong></span>
                    <span>| Net Price total: <strong>{totalNetPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></span>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse" style={{ minWidth: "1430px", width: "100%" }}>
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {COLUMNS.map(col => (
                      <th
                        key={col.key}
                        style={{ width: col.width, minWidth: col.width }}
                        className="px-2 pt-2 pb-1 border-b-2 border-gray-200 font-semibold text-gray-700"
                      >
                        <div className={col.align === "right" ? "text-right" : "text-left"}>{col.label}</div>
                        <Input
                          className="mt-1 h-6 text-[10px] px-1.5 border-gray-300 focus:border-[#860063]"
                          placeholder="filtrar..."
                          value={colFilters[col.key]}
                          onChange={e => setColFilter(col.key, e.target.value)}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#860063] mx-auto" />
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-10 text-gray-400">Nenhum registro encontrado</td>
                    </tr>
                  ) : (
                    filtered.map((r, i) => (
                      <tr
                        key={r.id}
                        className={`border-b border-gray-100 hover:bg-[#860063]/5 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}
                      >
                        {COLUMNS.map(col => (
                          <td
                            key={col.key}
                            className={`px-2 py-1.5 ${col.align === "right" ? "text-right tabular-nums" : ""}`}
                          >
                            {col.fmt ? col.fmt(r[col.key]) : (r[col.key] || "-")}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
                {filtered.length > 0 && (
                  <tfoot>
                    <tr className="bg-[#860063]/10 border-t-2 border-[#860063]/30 font-bold">
                      <td colSpan={6} className="px-2 py-2 text-gray-700">Total — {filtered.length} itens</td>
                      <td className="px-2 py-2 text-right text-gray-900 tabular-nums">
                        {totalQty.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                      </td>
                      <td className="px-2 py-2 text-right text-gray-900 tabular-nums">
                        {totalNetPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* New Shipment Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-[#860063]" />
              Novo Carregamento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Material No *</Label>
                <Input placeholder="000000100000000000" value={form.material_no} onChange={e => setForm({ ...form, material_no: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Sales Order No</Label>
                <Input placeholder="Sales Order" value={form.sales_order_no} onChange={e => setForm({ ...form, sales_order_no: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Customer</Label>
                <Input placeholder="Nome do cliente" value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Short Text</Label>
                <Input placeholder="Descrição do produto" value={form.short_text} onChange={e => setForm({ ...form, short_text: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Customer PO No</Label>
                <Input placeholder="PO do cliente" value={form.customer_po_no} onChange={e => setForm({ ...form, customer_po_no: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Quantity (ton)</Label>
                <Input type="number" step="0.001" placeholder="0.000" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Net Price (R$/ton)</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={form.net_price} onChange={e => setForm({ ...form, net_price: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Pluto</Label>
                <Input placeholder="Pluto" value={form.pluto} onChange={e => setForm({ ...form, pluto: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Delivery</Label>
                <Input placeholder="Delivery" value={form.delivery} onChange={e => setForm({ ...form, delivery: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Paletizado</Label>
                <Select value={form.paletizado} onValueChange={v => setForm({ ...form, paletizado: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SIM">SIM</SelectItem>
                    <SelectItem value="NÃO">NÃO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Frete</Label>
                <Select value={form.frete} onValueChange={v => setForm({ ...form, frete: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CIF">CIF</SelectItem>
                    <SelectItem value="FCA">FCA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending} className="bg-gradient-to-r from-[#860063] to-[#6b004f]">
                {createMutation.isPending ? "Salvando..." : "Adicionar à Programação"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MALayout>
  );
}