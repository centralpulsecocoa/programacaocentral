import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ProjectForm({ open, onClose, project, onSubmit, onDelete, isLoading, isDeleting, allProjects = [] }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    filial: "", numero_projeto: "", projeto: "", descricao: "", tipo: "Individual", projeto_pai_id: "",
    prioridade: "Média", responsavel: "", area: "", ano_budget: new Date().getFullYear(),
    valor_previsto: "", valor_gasto: 0,
    data_inicio_planejada: "", data_inicio_real: "",
    data_fim_planejada: "", data_fim_real: "",
    status: "Não Iniciado", progresso: 0
  });

  useEffect(() => {
    setConfirmDelete(false);
    if (project) {
      setForm({
        filial: project.filial || "",
        numero_projeto: project.numero_projeto || "",
        projeto: project.projeto || "",
        descricao: project.descricao || "",
        tipo: project.tipo || "Individual",
        projeto_pai_id: project.projeto_pai_id || "",
        prioridade: project.prioridade || "Média",
        responsavel: project.responsavel || "",
        area: project.area || "",
        ano_budget: project.ano_budget || new Date().getFullYear(),
        valor_previsto: project.valor_previsto || "",
        valor_gasto: project.valor_gasto || 0,
        data_inicio_planejada: project.data_inicio_planejada || "",
        data_inicio_real: project.data_inicio_real || "",
        data_fim_planejada: project.data_fim_planejada || "",
        data_fim_real: project.data_fim_real || "",
        status: project.status || "Não Iniciado",
        progresso: project.progresso || 0
      });
    } else {
      setForm({
        filial: "", numero_projeto: "", projeto: "", descricao: "", tipo: "Individual", projeto_pai_id: "",
        prioridade: "Média", responsavel: "", area: "", ano_budget: new Date().getFullYear(),
        valor_previsto: "", valor_gasto: 0,
        data_inicio_planejada: "", data_inicio_real: "",
        data_fim_planejada: "", data_fim_real: "",
        status: "Não Iniciado", progresso: 0
      });
    }
  }, [project, open]);

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target ? e.target.value : e }));

  const currentYear = new Date().getFullYear();
  const isHistorico = form.ano_budget && parseInt(form.ano_budget) <= 2025;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      ano_budget: form.ano_budget ? parseInt(form.ano_budget) : null,
      valor_previsto: form.valor_previsto !== "" ? parseFloat(form.valor_previsto) : null,
      valor_gasto: form.valor_gasto !== "" ? parseFloat(form.valor_gasto) : 0,
      progresso: parseInt(form.progresso),
      projeto_pai_id: form.tipo === "Subprojeto" ? form.projeto_pai_id : null,
    });
  };

  const priorityColors = { Baixa: "text-blue-600", Média: "text-yellow-600", Alta: "text-orange-600", Crítica: "text-red-600" };
  // Projetos elegíveis como pai: macros ou individuais (exceto o próprio projeto sendo editado)
  const elegibleParents = allProjects.filter(p => p.id !== project?.id && (p.tipo === "Macro" || p.tipo === "Individual" || !p.tipo));

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#860063]">
            {project ? `Editar Projeto #${project.id?.slice(-6).toUpperCase()}` : "Novo Projeto"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Filial</Label>
              <Input value={form.filial} onChange={set("filial")} placeholder="Ex: Central" />
            </div>
            <div className="space-y-1">
              <Label>Nº do Projeto</Label>
              <Input value={form.numero_projeto} onChange={set("numero_projeto")} placeholder="Ex: Projeto 01" />
            </div>
            <div className="space-y-1">
              <Label>Área</Label>
              <Input value={form.area} onChange={set("area")} placeholder="Ex: TI, Manutenção..." />
            </div>
          </div>
          {(form.filial || form.numero_projeto) && (
            <div className="bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm text-gray-700">
              <span className="text-xs text-gray-400 mr-2">Identificação:</span>
              <strong>{[form.filial, form.numero_projeto].filter(Boolean).join(" - ")}</strong>
            </div>
          )}

          {/* Row 2 */}
          <div className="space-y-1">
            <Label>Nome do Projeto *</Label>
            <Input required value={form.projeto} onChange={set("projeto")} placeholder="Nome do projeto" />
          </div>

          <div className="space-y-1">
            <Label>Descrição</Label>
            <Textarea value={form.descricao} onChange={set("descricao")} placeholder="Descreva o projeto..." className="h-20" />
          </div>

          {/* Tipo e Projeto Pai */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo de Projeto</Label>
              <Select value={form.tipo} onValueChange={set("tipo")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="Macro">Macro (agrupa subprojetos)</SelectItem>
                  <SelectItem value="Subprojeto">Subprojeto (filho de um macro)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.tipo === "Subprojeto" && (
              <div className="space-y-1">
                <Label>Projeto Pai *</Label>
                <Select value={form.projeto_pai_id} onValueChange={set("projeto_pai_id")}>
                  <SelectTrigger><SelectValue placeholder="Selecione o projeto pai" /></SelectTrigger>
                  <SelectContent>
                    {elegibleParents.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="text-xs text-gray-500 mr-1">[{p.tipo || "Individual"}]</span> {p.projeto}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Responsável *</Label>
              <Input required value={form.responsavel} onChange={set("responsavel")} placeholder="Nome do responsável" />
            </div>
            <div className="space-y-1">
              <Label>Prioridade</Label>
              <Select value={form.prioridade} onValueChange={set("prioridade")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Baixa", "Média", "Alta", "Crítica"].map(p => (
                    <SelectItem key={p} value={p}><span className={priorityColors[p]}>{p}</span></SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Ano Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Ano do Budget</Label>
              <Input
                type="number"
                min="2020" max="2030"
                value={form.ano_budget}
                onChange={set("ano_budget")}
                placeholder="Ex: 2026"
              />
            </div>
            <div className="flex items-end pb-1">
              {form.ano_budget && (
                <span className={`text-xs font-semibold px-2 py-1 rounded ${isHistorico ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700'}`}>
                  {isHistorico ? `📦 Histórico ${form.ano_budget}` : `🟢 Budget Ativo ${form.ano_budget}`}
                </span>
              )}
            </div>
          </div>

          {/* Row 4 - Valores */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Valor Previsto (R$)</Label>
              <Input type="number" step="0.01" value={form.valor_previsto} onChange={set("valor_previsto")} placeholder="0,00" />
            </div>
            <div className="space-y-1">
              <Label>Valor Gasto (R$)</Label>
              <Input type="number" step="0.01" value={form.valor_gasto} onChange={set("valor_gasto")} placeholder="0,00" />
            </div>
          </div>

          {/* Row 5 - Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Início Planejado</Label>
              <Input type="date" value={form.data_inicio_planejada} onChange={set("data_inicio_planejada")} />
            </div>
            <div className="space-y-1">
              <Label>Início Real</Label>
              <Input type="date" value={form.data_inicio_real} onChange={set("data_inicio_real")} />
            </div>
            <div className="space-y-1">
              <Label>Fim Planejado</Label>
              <Input type="date" value={form.data_fim_planejada} onChange={set("data_fim_planejada")} />
            </div>
            <div className="space-y-1">
              <Label>Fim Real</Label>
              <Input type="date" value={form.data_fim_real} onChange={set("data_fim_real")} />
            </div>
          </div>

          {/* Row 6 - Status e Progresso */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={set("status")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Não Iniciado", "Em Andamento", "Pausado", "Concluído", "Cancelado"].map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Progresso: {form.progresso}%</Label>
              <div className="pt-2">
                <Slider
                  min={0} max={100} step={5}
                  value={[form.progresso]}
                  onValueChange={([v]) => setForm(f => ({ ...f, progresso: v }))}
                  className="[&_.absolute]:bg-[#F88D2A] [&_.block]:border-[#F88D2A]"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-between gap-2 pt-2">
            <div>
              {project && !confirmDelete && (
                <Button type="button" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Excluir
                </Button>
              )}
              {project && confirmDelete && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600 font-medium">Confirmar exclusão?</span>
                  <Button type="button" size="sm" variant="destructive" disabled={isDeleting} onClick={() => onDelete(project.id)}>
                    {isDeleting ? "Excluindo..." : "Sim, excluir"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setConfirmDelete(false)}>Não</Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={isLoading} className="bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824]">
                {isLoading ? "Salvando..." : project ? "Atualizar" : "Criar Projeto"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}