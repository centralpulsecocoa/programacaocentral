import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Plus, Edit, Trash2, Check, X, Building2, Grid3x3, Power, Package, CalendarClock, Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("warehouses");

  // State for Warehouse Dialog
  const [showWarehouseDialog, setShowWarehouseDialog] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState(null); // Stores the warehouse object being edited
  const [warehouseFormData, setWarehouseFormData] = useState({
    config_type: "warehouse",
    name: "",
    value: "", // Added an explicit 'value' field for warehouses to be used as 'warehouse_ref' for lines
    enabled: true,
  });

  // State for Line Dialog
  const [showLineDialog, setShowLineDialog] = useState(false);
  const [editingLine, setEditingLine] = useState(null); // Stores the line object being edited
  const [lineFormData, setLineFormData] = useState({
    config_type: "line",
    name: "",
    value: "", // Nome completo/descritivo da linha
    warehouse_ref: "",
    has_crew: true, // Replaces 'enabled' for lines based on the new mutation
    max_bags: 0,
    visible: true,
  });

  // State for Period Disable Dialog
  const [showPeriodDialog, setShowPeriodDialog] = useState(false);
  const [selectedLineForPeriod, setSelectedLineForPeriod] = useState(null);
  const [periodFormData, setPeriodFormData] = useState({
    start_date: "",
    end_date: "",
  });

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['appconfig'],
    queryFn: () => base44.entities.AppConfig.list(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const warehouses = configs.filter(c => c.config_type === 'warehouse');
  const lines = configs.filter(c => c.config_type === 'line');

  const createWarehouseMutation = useMutation({
    mutationFn: (data) => base44.entities.AppConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appconfig'] });
      setShowWarehouseDialog(false);
      resetWarehouseForm();
      toast.success('✅ Armazém criado com sucesso!', {
        description: 'A configuração foi salva no sistema.',
        duration: 3000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao criar armazém', {
        description: error.message,
        duration: 3000,
      });
    }
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AppConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appconfig'] });
      setShowWarehouseDialog(false);
      setEditingWarehouse(null);
      resetWarehouseForm();
      toast.success('✅ Armazém atualizado!', {
        description: 'As alterações foram salvas.',
        duration: 3000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao atualizar armazém', {
        description: error.message,
        duration: 3000,
      });
    }
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: (id) => base44.entities.AppConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appconfig'] });
      toast.success('✅ Armazém excluído!', {
        duration: 3000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao excluir armazém', {
        description: error.message,
        duration: 3000,
      });
    }
  });

  const createLineMutation = useMutation({
    mutationFn: (data) => base44.entities.AppConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appconfig'] });
      setShowLineDialog(false);
      resetLineForm();
      toast.success('✅ Linha criada com sucesso!', {
        description: 'A configuração foi salva no sistema.',
        duration: 3000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao criar linha', {
        description: error.message,
        duration: 3000,
      });
    }
  });

  const updateLineMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AppConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appconfig'] });
      setShowLineDialog(false);
      setEditingLine(null);
      resetLineForm();
      toast.success('✅ Linha atualizada!', {
        description: 'As alterações foram salvas.',
        duration: 3000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao atualizar linha', {
        description: error.message,
        duration: 3000,
      });
    }
  });

  const deleteLineMutation = useMutation({
    mutationFn: (id) => base44.entities.AppConfig.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appconfig'] });
      toast.success('✅ Linha excluída!', {
        duration: 3000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao excluir linha', {
        description: error.message,
        duration: 3000,
      });
    }
  });

  const toggleLineStatusMutation = useMutation({
    mutationFn: ({ id, has_crew }) => base44.entities.AppConfig.update(id, { has_crew }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appconfig'] });
      const statusText = variables.has_crew ? 'ativada' : 'desativada';
      toast.success(`✅ Linha ${statusText}!`, {
        description: `Terno ${variables.has_crew ? 'disponível' : 'indisponível'}`,
        duration: 3000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao alterar status', {
        description: error.message,
        duration: 3000,
      });
    }
  });

  const toggleLineVisibilityMutation = useMutation({
    mutationFn: ({ id, visible }) => base44.entities.AppConfig.update(id, { visible }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appconfig'] });
      const statusText = variables.visible ? 'exibida' : 'oculta';
      toast.success(`✅ Linha ${statusText}!`, {
        description: `Linha ${variables.visible ? 'visível' : 'oculta'} no sistema`,
        duration: 3000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao alterar visibilidade', {
        description: error.message,
        duration: 3000,
      });
    }
  });

  const resetWarehouseForm = () => {
    setWarehouseFormData({ config_type: "warehouse", name: "", value: "", enabled: true });
    setEditingWarehouse(null);
  };

  const resetLineForm = () => {
    setLineFormData({ config_type: "line", name: "", value: "", warehouse_ref: "", has_crew: true, max_bags: 0, visible: true });
    setEditingLine(null);
  };

  const resetPeriodForm = () => {
    setPeriodFormData({ start_date: "", end_date: "" });
    setSelectedLineForPeriod(null);
  };

  const handleWarehouseSubmit = (e) => {
    e.preventDefault();
    if (editingWarehouse) {
      updateWarehouseMutation.mutate({ id: editingWarehouse.id, data: warehouseFormData });
    } else {
      createWarehouseMutation.mutate(warehouseFormData);
    }
  };

  const handleLineSubmit = (e) => {
    e.preventDefault();
    if (editingLine) {
      updateLineMutation.mutate({ id: editingLine.id, data: lineFormData });
    } else {
      createLineMutation.mutate(lineFormData);
    }
  };

  const handleEditWarehouse = (warehouse) => {
    setEditingWarehouse(warehouse);
    setWarehouseFormData({
      config_type: warehouse.config_type,
      name: warehouse.name,
      value: warehouse.value || "", // Ensure value exists
      enabled: warehouse.enabled
    });
    setShowWarehouseDialog(true);
  };

  const handleEditLine = (line) => {
    setEditingLine(line);
    setLineFormData({
      config_type: line.config_type,
      name: line.name,
      value: line.value || "",
      warehouse_ref: line.warehouse_ref || "",
      has_crew: line.has_crew,
      max_bags: line.max_bags || 0,
      visible: line.visible !== undefined ? line.visible : true
    });
    setShowLineDialog(true);
  };

  const handleOpenPeriodDialog = (line) => {
    setSelectedLineForPeriod(line);
    
    // Se já existe período configurado, pré-preencher
    const settings = line.settings || {};
    setPeriodFormData({
      start_date: settings.disabled_start_date || "",
      end_date: settings.disabled_end_date || "",
    });
    
    setShowPeriodDialog(true);
  };

  const handlePeriodSubmit = (e) => {
    e.preventDefault();
    
    const updatedSettings = {
      ...selectedLineForPeriod.settings,
      disabled_start_date: periodFormData.start_date || null,
      disabled_end_date: periodFormData.end_date || null,
    };

    updateLineMutation.mutate({
      id: selectedLineForPeriod.id,
      data: { settings: updatedSettings }
    });

    setShowPeriodDialog(false);
    resetPeriodForm();
  };

  const handleClearPeriod = () => {
    if (!window.confirm('Remover período de desabilitação?')) return;
    
    const updatedSettings = {
      ...selectedLineForPeriod.settings,
      disabled_start_date: null,
      disabled_end_date: null,
    };

    updateLineMutation.mutate({
      id: selectedLineForPeriod.id,
      data: { settings: updatedSettings }
    });

    setShowPeriodDialog(false);
    resetPeriodForm();
  };

  const isLineDisabledByPeriod = (line) => {
    if (!line.settings?.disabled_start_date || !line.settings?.disabled_end_date) return false;
    
    const today = new Date().toISOString().split('T')[0];
    return today >= line.settings.disabled_start_date && today <= line.settings.disabled_end_date;
  };

  const handleDeleteWarehouse = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este armazém?')) {
      deleteWarehouseMutation.mutate(id);
    }
  };

  const handleDeleteLine = (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta linha?')) {
      deleteLineMutation.mutate(id);
    }
  };

  const handleToggleLineStatus = (line) => {
    toggleLineStatusMutation.mutate({
      id: line.id,
      has_crew: !line.has_crew // Toggle has_crew
    });
  };

  const handleToggleLineVisibility = (line) => {
    toggleLineVisibilityMutation.mutate({
      id: line.id,
      visible: !line.visible
    });
  };

  const openWarehouseDialog = () => {
    resetWarehouseForm();
    setShowWarehouseDialog(true);
  };

  const openLineDialog = () => {
    resetLineForm();
    setShowLineDialog(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <SettingsIcon className="w-6 h-6 md:w-8 md:h-8 text-[#860063]" />
            Configurações do Sistema
          </h1>
          <p className="text-sm md:text-base text-gray-600">Gerencie armazéns e linhas de descarga</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "warehouses" ? "default" : "outline"}
            onClick={() => setActiveTab("warehouses")}
            className={activeTab === "warehouses" ? "bg-[#860063]" : ""}
          >
            <Building2 className="w-4 h-4 mr-2" />
            Armazéns
          </Button>
          <Button
            variant={activeTab === "lines" ? "default" : "outline"}
            onClick={() => setActiveTab("lines")}
            className={activeTab === "lines" ? "bg-[#860063]" : ""}
          >
            <Grid3x3 className="w-4 h-4 mr-2" />
            Linhas
          </Button>
        </div>

        {/* Warehouses Tab */}
        {activeTab === "warehouses" && (
          <Card className="shadow-xl border-none">
            <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg md:text-xl font-bold">Armazéns Cadastrados</CardTitle>
                <Button onClick={openWarehouseDialog} className="bg-[#860063]">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Armazém
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#860063] mx-auto"></div>
                </div>
              ) : warehouses.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhum armazém cadastrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <AnimatePresence>
                    {warehouses.map((warehouse) => (
                      <motion.div
                        key={warehouse.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="p-4 rounded-lg border-2 border-gray-200 hover:border-[#860063]/30 transition-all bg-white"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold text-gray-900 capitalize">
                                {warehouse.name}
                              </h3>
                              <Badge variant={warehouse.enabled ? "default" : "secondary"}>
                                {warehouse.enabled ? (
                                  <><Check className="w-3 h-3 mr-1" /> Ativo</>
                                ) : (
                                  <><X className="w-3 h-3 mr-1" /> Inativo</>
                                )}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">
                              {lines.filter(l => l.warehouse_ref === warehouse.value).length} linha(s) vinculada(s)
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditWarehouse(warehouse)}
                              className="hover:bg-[#860063]/10 hover:border-[#860063]"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteWarehouse(warehouse.id)}
                              className="hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Lines Tab */}
        {activeTab === "lines" && (
          <Card className="shadow-xl border-none">
            <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg md:text-xl font-bold">Linhas de Descarga</CardTitle>
                <Button onClick={openLineDialog} className="bg-[#860063]">
                  <Plus className="w-4 h-4 mr-2" />
                  Nova Linha
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#860063] mx-auto"></div>
                </div>
              ) : lines.length === 0 ? (
                <div className="text-center py-12">
                  <Grid3x3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma linha cadastrada</p>
                </div>
              ) : (
               <div className="space-y-3">
                 <AnimatePresence>
                   {lines.map((line) => {
                     const warehouse = warehouses.find(w => w.value === line.warehouse_ref || w.value?.toLowerCase() === line.warehouse_ref?.toLowerCase());
                     return (
                       <motion.div
                         key={line.id}
                         initial={{ opacity: 0, y: 20 }}
                         animate={{ opacity: 1, y: 0 }}
                         exit={{ opacity: 0, y: -20 }}
                         className="p-4 rounded-lg border-2 border-gray-200 hover:border-[#860063]/30 transition-all bg-white"
                       >
                         <div className="flex items-center justify-between">
                           <div className="flex-1">
                             <div className="flex items-center gap-3 flex-wrap">
                               <h3 className="text-lg font-semibold text-gray-900">
                                 Linha {line.name}
                                 {line.value && (
                                   <span className="text-sm font-normal text-gray-600 ml-2">({line.value})</span>
                                 )}
                               </h3>
                               <Badge variant={line.has_crew ? "default" : "secondary"}>
                                 {line.has_crew ? (
                                   <><Check className="w-3 h-3 mr-1" /> Com Terno</>
                                 ) : (
                                   <><X className="w-3 h-3 mr-1" /> Sem Terno</>
                                 )}
                               </Badge>
                               {line.max_bags > 0 && (
                                 <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                                   <Package className="w-3 h-3 mr-1" />
                                   Limite: {line.max_bags} sacos
                                 </Badge>
                               )}
                               {line.settings?.disabled_start_date && line.settings?.disabled_end_date && (
                                <Badge className={`border-2 ${isLineDisabledByPeriod(line) ? 'bg-red-100 text-red-800 border-red-300' : 'bg-blue-100 text-blue-800 border-blue-300'}`}>
                                  <CalendarClock className="w-3 h-3 mr-1" />
                                  {isLineDisabledByPeriod(line) ? 'Desabilitada' : 'Período configurado'}
                                </Badge>
                               )}
                               {line.visible === false && (
                                <Badge className="bg-gray-100 text-gray-800 border-gray-300">
                                  <EyeOff className="w-3 h-3 mr-1" />
                                  Oculta
                                </Badge>
                               )}
                             </div>
                             <p className="text-sm text-gray-500 mt-1 capitalize">
                               Armazém: {warehouse?.name || line.warehouse_ref}
                             </p>
                           </div>
                            <div className="flex gap-2">
                              {/* Toggle Visibility */}
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleToggleLineVisibility(line)}
                                disabled={toggleLineVisibilityMutation.isPending}
                                className={`transition-all ${
                                  line.visible !== false
                                    ? 'hover:bg-gray-50 hover:border-gray-300'
                                    : 'hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600'
                                }`}
                                title={line.visible !== false ? 'Ocultar linha' : 'Exibir linha'}
                              >
                                {line.visible !== false ? (
                                  <Eye className="w-4 h-4 text-blue-600" />
                                ) : (
                                  <EyeOff className="w-4 h-4 text-gray-400" />
                                )}
                              </Button>

                              {/* Toggle Crew Status */}
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleToggleLineStatus(line)}
                                disabled={toggleLineStatusMutation.isPending}
                                className={`transition-all ${
                                  line.has_crew
                                    ? 'hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                                    : 'hover:bg-green-50 hover:border-green-300 hover:text-green-600'
                                }`}
                                title={line.has_crew ? 'Indisponibilizar terno' : 'Disponibilizar terno'}
                              >
                                <Power className={`w-4 h-4 ${line.has_crew ? 'text-green-600' : 'text-gray-400'}`} />
                              </Button>

                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleOpenPeriodDialog(line)}
                                className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
                                title="Desabilitar por período"
                              >
                                <CalendarClock className="w-4 h-4" />
                              </Button>

                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleEditLine(line)}
                                className="hover:bg-[#860063]/10 hover:border-[#860063]"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDeleteLine(line.id)}
                                className="hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Warehouse Dialog */}
        <Dialog open={showWarehouseDialog} onOpenChange={setShowWarehouseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingWarehouse ? 'Editar Armazém' : 'Novo Armazém'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleWarehouseSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="warehouse-name">Nome do Armazém *</Label>
                <Input
                  id="warehouse-name"
                  required
                  value={warehouseFormData.name}
                  onChange={(e) => setWarehouseFormData({ ...warehouseFormData, name: e.target.value })}
                  placeholder="Ex: Central"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="warehouse-value">Valor de Referência (ID Interno) *</Label>
                <Input
                  id="warehouse-value"
                  required
                  value={warehouseFormData.value}
                  onChange={(e) => setWarehouseFormData({ ...warehouseFormData, value: e.target.value })}
                  placeholder="Ex: W_CENTRAL"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="warehouse-enabled"
                  checked={warehouseFormData.enabled}
                  onChange={(e) => setWarehouseFormData({ ...warehouseFormData, enabled: e.target.checked })}
                  className="w-4 h-4 text-[#860063] rounded focus:ring-[#860063]"
                />
                <Label htmlFor="warehouse-enabled">Armazém ativo</Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowWarehouseDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createWarehouseMutation.isPending || updateWarehouseMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f]"
                >
                  {editingWarehouse ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Period Disable Dialog */}
        <Dialog open={showPeriodDialog} onOpenChange={setShowPeriodDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-blue-600" />
                Desabilitar Linha por Período
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handlePeriodSubmit} className="space-y-4">
              {selectedLineForPeriod && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-sm font-semibold text-blue-900">
                    Linha {selectedLineForPeriod.name}
                    {selectedLineForPeriod.value && ` (${selectedLineForPeriod.value})`}
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Armazém: {warehouses.find(w => w.value === selectedLineForPeriod.warehouse_ref)?.name}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="start-date">Data de Início *</Label>
                <Input
                  id="start-date"
                  type="date"
                  required
                  value={periodFormData.start_date}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, start_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="end-date">Data de Término *</Label>
                <Input
                  id="end-date"
                  type="date"
                  required
                  value={periodFormData.end_date}
                  onChange={(e) => setPeriodFormData({ ...periodFormData, end_date: e.target.value })}
                  min={periodFormData.start_date}
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-800">
                  <strong>⚠️ Atenção:</strong> Durante o período selecionado, esta linha não estará disponível para novos agendamentos.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                {selectedLineForPeriod?.settings?.disabled_start_date && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearPeriod}
                    className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                  >
                    Remover Período
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPeriodDialog(false);
                    resetPeriodForm();
                  }}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateLineMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f]"
                >
                  Salvar Período
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Line Dialog */}
        <Dialog open={showLineDialog} onOpenChange={setShowLineDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingLine ? 'Editar Linha' : 'Nova Linha'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleLineSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="line-name">Número da Linha *</Label>
                <Input
                  id="line-name"
                  required
                  value={lineFormData.name}
                  onChange={(e) => setLineFormData({ ...lineFormData, name: e.target.value })}
                  placeholder="Ex: 01, 02, 03..."
                />
                <p className="text-xs text-gray-500">
                  Número da linha (01, 02, 03, 04...)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="line-value">Nome/Descrição Adicional</Label>
                <Input
                  id="line-value"
                  value={lineFormData.value}
                  onChange={(e) => setLineFormData({ ...lineFormData, value: e.target.value })}
                  placeholder="Ex: Produtor, Peq Produtor, Express..."
                />
                <p className="text-xs text-gray-500">
                  Será exibido entre parênteses nos cards. Exemplo: Central (Produtor) L03
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="line-warehouse">Armazém *</Label>
                <Select
                  value={lineFormData.warehouse_ref}
                  onValueChange={(value) => setLineFormData({ ...lineFormData, warehouse_ref: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o armazém" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses.map((w) => (
                      <SelectItem key={w.id} value={w.value} className="capitalize">
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-bags">Limite Máximo de Sacos</Label>
                <Input
                  id="max-bags"
                  type="number"
                  min="0"
                  value={lineFormData.max_bags}
                  onChange={(e) => setLineFormData({ ...lineFormData, max_bags: Number(e.target.value) })}
                  placeholder="0 = sem limite"
                />
                <p className="text-xs text-gray-500">
                  Defina o limite máximo de sacos permitidos nesta linha. Use 0 para sem limite.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="line-visible"
                    checked={lineFormData.visible}
                    onChange={(e) => setLineFormData({ ...lineFormData, visible: e.target.checked })}
                    className="w-4 h-4 text-[#860063] rounded focus:ring-[#860063]"
                  />
                  <Label htmlFor="line-visible">Linha visível no sistema</Label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="line-has-crew"
                    checked={lineFormData.has_crew}
                    onChange={(e) => setLineFormData({ ...lineFormData, has_crew: e.target.checked })}
                    className="w-4 h-4 text-[#860063] rounded focus:ring-[#860063]"
                  />
                  <Label htmlFor="line-has-crew">Terno disponível (Linha ativa)</Label>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800">
                  <strong>💡 Exemplos:</strong>
                </p>
                <ul className="text-xs text-blue-700 mt-1 ml-4 list-disc space-y-1">
                  <li>Produtor → Central (Produtor) L03</li>
                  <li>Peq Produtor → Central (Peq Produtor) L01 - Limite: 50 sacos</li>
                  <li>Express → Fábrica (Express) L01</li>
                  <li>Linha 04 → Central L04 - Limite: 50 sacos</li>
                </ul>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowLineDialog(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={createLineMutation.isPending || updateLineMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f]"
                >
                  {editingLine ? 'Atualizar' : 'Criar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}