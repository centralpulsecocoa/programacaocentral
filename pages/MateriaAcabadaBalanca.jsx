import React, { useState } from "react";
import MALayout from "@/components/materiaAcabada/MALayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Scale, Plus, Search, ClipboardList } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function MateriaAcabadaBalanca() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    product: "",
    vehicle_plate: "",
    driver_name: "",
    gross_weight: "",
    tare_weight: "",
    status: "pendente",
    notes: "",
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["ma-balanca"],
    queryFn: () => base44.entities.MABalanca.list("-date"),
    initialData: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MABalanca.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ma-balanca"] });
      setShowDialog(false);
      resetForm();
      toast.success("✅ Registro criado com sucesso!");
    },
  });

  const resetForm = () =>
    setForm({
      date: new Date().toISOString().split("T")[0],
      product: "",
      vehicle_plate: "",
      driver_name: "",
      gross_weight: "",
      tare_weight: "",
      status: "pendente",
      notes: "",
    });

  const netWeight =
    form.gross_weight && form.tare_weight
      ? (parseFloat(form.gross_weight) - parseFloat(form.tare_weight)).toFixed(2)
      : "-";

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.product || !form.vehicle_plate || !form.gross_weight || !form.tare_weight) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    createMutation.mutate({
      ...form,
      gross_weight: parseFloat(form.gross_weight),
      tare_weight: parseFloat(form.tare_weight),
      net_weight: parseFloat(form.gross_weight) - parseFloat(form.tare_weight),
    });
  };

  const filtered = records.filter((r) => {
    const s = search.toLowerCase();
    return (
      r.product?.toLowerCase().includes(s) ||
      r.vehicle_plate?.toLowerCase().includes(s) ||
      r.driver_name?.toLowerCase().includes(s)
    );
  });

  const statusColors = {
    pendente: "bg-yellow-100 text-yellow-800",
    concluido: "bg-green-100 text-green-800",
    cancelado: "bg-red-100 text-red-800",
  };

  return (
    <MALayout>
      <div className="p-6 md:p-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Scale className="w-7 h-7 text-[#860063]" />
              Controle de Balança
            </h1>
            <p className="text-gray-500 text-sm mt-1">Registros de pesagem — Matéria Acabada</p>
          </div>
          <Button
            onClick={() => setShowDialog(true)}
            className="bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#154360] hover:to-[#860063]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Registro
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Registros", value: records.length, color: "text-[#860063]" },
            { label: "Pendentes", value: records.filter((r) => r.status === "pendente").length, color: "text-yellow-600" },
            { label: "Concluídos", value: records.filter((r) => r.status === "concluido").length, color: "text-green-600" },
            {
              label: "Peso Líq. Total (kg)",
              value: records.filter((r) => r.status === "concluido").reduce((s, r) => s + (r.net_weight || 0), 0).toLocaleString("pt-BR"),
              color: "text-[#860063]",
            },
          ].map((c) => (
            <Card key={c.label} className="shadow-sm border-none">
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-gray-500 mt-1">{c.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por produto, placa, motorista..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Table */}
        <Card className="shadow-md border-none">
          <CardHeader className="border-b bg-[#860063]/5 py-3 px-5">
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> Registros
              </span>
              <Badge variant="outline">{filtered.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-[#860063]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Scale className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum registro encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Data", "Produto", "Placa", "Motorista", "Peso Bruto", "Tara", "Peso Líq.", "Status"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((r) => (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap">{r.date ? r.date.split("-").reverse().join("/") : "-"}</td>
                        <td className="px-4 py-3 font-medium text-[#860063]">{r.product || "-"}</td>
                        <td className="px-4 py-3 uppercase font-mono">{r.vehicle_plate || "-"}</td>
                        <td className="px-4 py-3">{r.driver_name || "-"}</td>
                        <td className="px-4 py-3 text-right">{r.gross_weight?.toLocaleString("pt-BR") || "-"} kg</td>
                        <td className="px-4 py-3 text-right">{r.tare_weight?.toLocaleString("pt-BR") || "-"} kg</td>
                        <td className="px-4 py-3 text-right font-bold text-green-700">{r.net_weight?.toLocaleString("pt-BR") || "-"} kg</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[r.status] || "bg-gray-100 text-gray-600"}`}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New Record Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#860063]" />
              Novo Registro de Pesagem
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Produto *</Label>
                <Input placeholder="Ex: Manteiga de Cacau" value={form.product} onChange={(e) => setForm({ ...form, product: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Placa do Veículo *</Label>
                <Input placeholder="ABC-1234" value={form.vehicle_plate} onChange={(e) => setForm({ ...form, vehicle_plate: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1">
                <Label>Motorista</Label>
                <Input placeholder="Nome do motorista" value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Peso Bruto (kg) *</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={form.gross_weight} onChange={(e) => setForm({ ...form, gross_weight: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Tara (kg) *</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={form.tare_weight} onChange={(e) => setForm({ ...form, tare_weight: e.target.value })} />
              </div>
            </div>

            {form.gross_weight && form.tare_weight && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="text-sm text-green-700">
                  <strong>Peso Líquido:</strong>{" "}
                  <span className="text-xl font-bold">{netWeight} kg</span>
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Observações</Label>
                <Input placeholder="Observações adicionais..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancelar</Button>
              <Button type="submit" className="bg-gradient-to-r from-[#860063] to-[#6b004f]">
                Salvar Registro
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MALayout>
  );
}