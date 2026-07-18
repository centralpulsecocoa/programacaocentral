import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";

export default function ProjectExpenseDialog({ open, onClose, project, onSave }) {
  const [gastos, setGastos] = useState(project?.gastos || []);
  const [newGasto, setNewGasto] = useState({ descricao: "", valor: "", data: new Date().toISOString().split("T")[0], categoria: "" });

  const addGasto = () => {
    if (!newGasto.descricao || !newGasto.valor) return;
    const updated = [...gastos, { ...newGasto, valor: parseFloat(newGasto.valor) }];
    setGastos(updated);
    setNewGasto({ descricao: "", valor: "", data: new Date().toISOString().split("T")[0], categoria: "" });
  };

  const removeGasto = (idx) => setGastos(gastos.filter((_, i) => i !== idx));

  const total = gastos.reduce((s, g) => s + (g.valor || 0), 0);

  const handleSave = () => {
    onSave(gastos, total);
    onClose();
  };

  const fmt = (v) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#860063]">Gastos — {project?.projeto}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
              <p className="text-xs text-blue-600">Previsto</p>
              <p className="font-bold text-blue-800">{fmt(project?.valor_previsto || 0)}</p>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
              <p className="text-xs text-orange-600">Gasto Total</p>
              <p className="font-bold text-orange-800">{fmt(total)}</p>
            </div>
            <div className={`rounded-lg p-3 text-center border ${total > (project?.valor_previsto || 0) ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <p className={`text-xs ${total > (project?.valor_previsto || 0) ? 'text-red-600' : 'text-green-600'}`}>Saldo</p>
              <p className={`font-bold ${total > (project?.valor_previsto || 0) ? 'text-red-800' : 'text-green-800'}`}>
                {fmt((project?.valor_previsto || 0) - total)}
              </p>
            </div>
          </div>

          {/* Add expense */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2 border">
            <p className="text-xs font-semibold text-gray-600 uppercase">Novo Gasto</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Descrição *</Label>
                <Input className="h-8 text-sm" value={newGasto.descricao} onChange={e => setNewGasto(p => ({ ...p, descricao: e.target.value }))} placeholder="Ex: Equipamento" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoria</Label>
                <Input className="h-8 text-sm" value={newGasto.categoria} onChange={e => setNewGasto(p => ({ ...p, categoria: e.target.value }))} placeholder="Ex: Material" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Valor (R$) *</Label>
                <Input className="h-8 text-sm" type="number" step="0.01" value={newGasto.valor} onChange={e => setNewGasto(p => ({ ...p, valor: e.target.value }))} placeholder="0,00" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data</Label>
                <Input className="h-8 text-sm" type="date" value={newGasto.data} onChange={e => setNewGasto(p => ({ ...p, data: e.target.value }))} />
              </div>
            </div>
            <Button onClick={addGasto} size="sm" className="bg-[#860063] hover:bg-[#6b004f]">
              <Plus className="w-3 h-3 mr-1" /> Adicionar
            </Button>
          </div>

          {/* Expense list */}
          {gastos.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {gastos.map((g, i) => (
                <div key={i} className="flex items-center justify-between bg-white border rounded-lg px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{g.descricao}</p>
                    <p className="text-xs text-gray-500">{g.categoria && `${g.categoria} · `}{g.data}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-[#860063]">{fmt(g.valor)}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-red-500 hover:text-red-700" onClick={() => removeGasto(i)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} className="bg-gradient-to-r from-[#860063] to-[#F88D2A]">Salvar Gastos</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}