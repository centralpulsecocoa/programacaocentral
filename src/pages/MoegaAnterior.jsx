import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Factory, Plus, Search, Edit, Trash2, FileSpreadsheet, Filter, Calendar, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function MoegaAnteriorPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const TODAY = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(TODAY), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(TODAY), 'yyyy-MM-dd'));
  const [selectedOrigin, setSelectedOrigin] = useState("all");

  const [formData, setFormData] = useState({
    consuming_date: format(TODAY, 'yyyy-MM-dd'),
    origin: "",
    ffa: "",
    moisture_percent: "",
    shell_percent: "",
    consumo: "",
    sacos: "",
    linha: "",
    classificador: ""
  });

  const queryClient = useQueryClient();

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['moega-anterior'],
    queryFn: () => base44.entities.MoegaAnterior.list('-consuming_date'),
  });

  const canEdit = user?.role === 'admin' || user?.profile === 'qualidade' || user?.profile === 'analista_qualidade' || user?.profile === 'classificador';

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  // Calcular FFA Ponderado automaticamente
  useEffect(() => {
    const ffa = parseFloat(formData.ffa) || 0;
    const consumo = parseFloat(formData.consumo) || 0;
    const ffaPonderado = ffa * consumo;
    setFormData(prev => ({ ...prev, ffa_ponderado: ffaPonderado }));
  }, [formData.ffa, formData.consumo]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('updateEntityRecord', { entity: 'MoegaAnterior', data, action: 'create' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moega-anterior'] });
      resetForm();
      setShowForm(false);
      toast.success('Registro criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar registro: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.functions.invoke('updateEntityRecord', { entity: 'MoegaAnterior', id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moega-anterior'] });
      resetForm();
      setShowForm(false);
      setEditingRecord(null);
      toast.success('Registro atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar registro: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MoegaAnterior.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['moega-anterior'] });
      toast.success('Registro excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir registro: ' + error.message);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    const ffa = parseFloat(formData.ffa) || 0;
    const consumo = parseFloat(formData.consumo) || 0;

    const processedData = {
      ...formData,
      ffa: formData.ffa !== "" ? Number(formData.ffa) : null,
      moisture_percent: formData.moisture_percent !== "" ? Number(formData.moisture_percent) : null,
      shell_percent: formData.shell_percent !== "" ? Number(formData.shell_percent) : null,
      consumo: formData.consumo !== "" ? Number(formData.consumo) : null,
      ffa_ponderado: ffa * consumo
    };

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: processedData });
    } else {
      createMutation.mutate(processedData);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      consuming_date: record.consuming_date,
      origin: record.origin || "",
      ffa: record.ffa || "",
      moisture_percent: record.moisture_percent || "",
      shell_percent: record.shell_percent || "",
      consumo: record.consumo || "",
      sacos: record.sacos || "",
      linha: record.linha || "",
      classificador: record.classificador || ""
    });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Tem certeza que deseja excluir este registro?')) {
      deleteMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setFormData({
      consuming_date: format(TODAY, 'yyyy-MM-dd'),
      origin: "",
      ffa: "",
      moisture_percent: "",
      shell_percent: "",
      consumo: "",
      sacos: "",
      linha: "",
      classificador: ""
    });
    setEditingRecord(null);
  };

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (r.consuming_date < startDate || r.consuming_date > endDate) return false;
      
      const matchSearch = r.linha?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.classificador?.toLowerCase().includes(searchTerm.toLowerCase());
      if (searchTerm && !matchSearch) return false;
      
      if (selectedOrigin !== "all" && r.origin !== selectedOrigin) return false;
      
      return true;
    });
  }, [records, startDate, endDate, searchTerm, selectedOrigin]);

  const exportToExcel = () => {
    const data = filteredRecords.map(r => ({
      'Consuming Date': format(new Date(r.consuming_date), 'dd/MM/yyyy'),
      'Origin': r.origin,
      'FFA': r.ffa,
      '% Moisture': r.moisture_percent,
      '% Shell per origin': r.shell_percent,
      'Consumo': r.consumo,
      'Sacos': r.sacos,
      'Linha': r.linha,
      'Classificador': r.classificador,
      'FFA Ponderado': r.ffa_ponderado
    }));

    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `moega_anterior_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Dados exportados com sucesso!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Quality"))}
            className="mb-4 hover:bg-[#860063]/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Qualidade
          </Button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Factory className="w-6 h-6 md:w-8 md:h-8 text-[#860063]" />
                Moega Dia Anterior
              </h1>
              <p className="text-sm md:text-base text-gray-600">Registro de consumo do dia anterior</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={exportToExcel}
                variant="outline"
                disabled={filteredRecords.length === 0}
                className="hover:bg-green-50"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Exportar
              </Button>
              {canEdit && (
                <Button
                  onClick={() => {
                    resetForm();
                    setShowForm(true);
                  }}
                  className="bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Registro
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Filtros */}
        <Card className="shadow-md border-none mb-4">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#860063]" />
                <span className="font-semibold text-gray-900">Filtros:</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
                <span className="text-gray-500 text-sm">até</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>

              <Select value={selectedOrigin} onValueChange={setSelectedOrigin}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Origens</SelectItem>
                  <SelectItem value="BAHIA">BAHIA</SelectItem>
                  <SelectItem value="PARÁ">PARÁ</SelectItem>
                  <SelectItem value="GHANA">GHANA</SelectItem>
                  <SelectItem value="MARFIM">MARFIM</SelectItem>
                  <SelectItem value="ESPIRITO SANTO">ESPIRITO SANTO</SelectItem>
                  <SelectItem value="RONDÔNIA">RONDÔNIA</SelectItem>
                  <SelectItem value="TOCANTINS">TOCANTINS</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar por Linha ou Classificador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Badge variant="outline" className="ml-auto">
                {filteredRecords.length} {filteredRecords.length === 1 ? 'registro' : 'registros'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Listagem - Tabela */}
        <Card className="shadow-xl border-none">
          <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5">
            <CardTitle className="text-lg md:text-xl font-bold">
              Registros de Moega
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#860063] mx-auto"></div>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <Factory className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum registro encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      <th className="px-3 py-3 text-left font-bold text-gray-700">Consuming Date</th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700">Origin</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">FFA</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">%Moisture</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">%Shell</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">Consumo</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">Sacos</th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700">Linha</th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700">Classificador</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700 bg-[#860063]/10">FFA Ponderado</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredRecords.map((record, index) => (
                        <motion.tr
                          key={record.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="border-b border-gray-100 hover:bg-[#860063]/5 transition-colors"
                        >
                          <td className="px-3 py-2 whitespace-nowrap">
                            {format(new Date(record.consuming_date), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {record.origin ? (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                {record.origin}
                              </Badge>
                            ) : "-"}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold">
                            {record.ffa != null ? record.ffa : "-"}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold">
                            {record.moisture_percent != null ? `${record.moisture_percent}%` : "-"}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold">
                            {record.shell_percent != null ? `${record.shell_percent}%` : "-"}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold">
                            {record.consumo != null ? record.consumo : "-"}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {record.sacos ? (
                              <Badge variant="outline" className="text-xs">
                                {record.sacos}
                              </Badge>
                            ) : "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {record.linha || "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {record.classificador || "-"}
                          </td>
                          <td className="px-3 py-2 text-center font-bold text-[#860063] bg-[#860063]/5">
                            {record.ffa_ponderado != null ? record.ffa_ponderado.toFixed(2) : "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                            {canEdit && (
                              <div className="flex gap-2 justify-center">
                                <Button
                                  onClick={() => handleEdit(record)}
                                  variant="outline"
                                  size="sm"
                                  className="hover:bg-blue-50"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  onClick={() => handleDelete(record.id)}
                                  variant="outline"
                                  size="sm"
                                  className="hover:bg-red-50 text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialog Formulário */}
      <Dialog open={showForm} onOpenChange={(open) => {
        setShowForm(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Factory className="w-5 h-5 text-[#860063]" />
              {editingRecord ? 'Editar Registro' : 'Novo Registro - Moega Dia Anterior'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            {/* Identificação */}
            <div className="bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3">Identificação</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="consuming_date">Consuming Date *</Label>
                  <Input
                    id="consuming_date"
                    type="date"
                    required
                    value={formData.consuming_date}
                    onChange={(e) => setFormData({ ...formData, consuming_date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="origin">Origin *</Label>
                  <Select value={formData.origin} onValueChange={(value) => setFormData({ ...formData, origin: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAHIA">BAHIA</SelectItem>
                      <SelectItem value="PARÁ">PARÁ</SelectItem>
                      <SelectItem value="GHANA">GHANA</SelectItem>
                      <SelectItem value="MARFIM">MARFIM</SelectItem>
                      <SelectItem value="ESPIRITO SANTO">ESPIRITO SANTO</SelectItem>
                      <SelectItem value="RONDÔNIA">RONDÔNIA</SelectItem>
                      <SelectItem value="TOCANTINS">TOCANTINS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Análises */}
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3">Análises</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ffa">FFA</Label>
                  <Input
                    id="ffa"
                    type="number"
                    step="0.01"
                    value={formData.ffa}
                    onChange={(e) => setFormData({ ...formData, ffa: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="moisture_percent">% Moisture</Label>
                  <Input
                    id="moisture_percent"
                    type="number"
                    step="0.01"
                    value={formData.moisture_percent}
                    onChange={(e) => setFormData({ ...formData, moisture_percent: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shell_percent">% Shell per origin</Label>
                  <Input
                    id="shell_percent"
                    type="number"
                    step="0.01"
                    value={formData.shell_percent}
                    onChange={(e) => setFormData({ ...formData, shell_percent: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Consumo e Linha */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3">Consumo e Linha</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="consumo">Consumo</Label>
                  <Input
                    id="consumo"
                    type="number"
                    step="0.01"
                    value={formData.consumo}
                    onChange={(e) => setFormData({ ...formData, consumo: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sacos">Sacos</Label>
                  <Select value={formData.sacos} onValueChange={(value) => setFormData({ ...formData, sacos: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sacos">Sacos</SelectItem>
                      <SelectItem value="Big Bags">Big Bags</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="linha">Linha</Label>
                  <Input
                    id="linha"
                    value={formData.linha}
                    onChange={(e) => setFormData({ ...formData, linha: e.target.value })}
                    placeholder="Linha"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="classificador">Classificador</Label>
                  <Select value={formData.classificador} onValueChange={(value) => setFormData({ ...formData, classificador: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o classificador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Andryo Borges">Andryo Borges</SelectItem>
                      <SelectItem value="Vinicius Teles">Vinicius Teles</SelectItem>
                      <SelectItem value="Igor Moura">Igor Moura</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* FFA Ponderado (calculado) */}
            <div className="bg-[#860063]/10 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3">Resultado Calculado</h3>
              <div className="space-y-2">
                <Label>FFA Ponderado (FFA × Consumo)</Label>
                <div className="text-2xl font-bold text-[#860063]">
                  {((parseFloat(formData.ffa) || 0) * (parseFloat(formData.consumo) || 0)).toFixed(2)}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063]"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : editingRecord ? 'Atualizar' : 'Criar Registro'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}