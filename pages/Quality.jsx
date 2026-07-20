import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Plus, Search, Edit, Trash2, FileSpreadsheet, Clock, Filter, Calendar, Droplets, Activity, AlertCircle, Flame, Warehouse, Factory } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth, addDays } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function QualityPage() {
  const { data: user = null } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingQuality, setEditingQuality] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const TODAY = new Date();
  const [startDate, setStartDate] = useState(format(addDays(TODAY, -90), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(TODAY, 'yyyy-MM-dd'));
  const [selectedOrigin, setSelectedOrigin] = useState("all");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");

  const [formData, setFormData] = useState({
    date: format(TODAY, 'yyyy-MM-dd'),
    released_by: "",
    sample: "",
    reception_time: "",
    release_time: "",
    justification: "",
    observations: "",
    origin: "",
    germinated_percent: "",
    flat_percent: "",
    insect_damaged_percent: "",
    fumaca: "",
    slaty_percent: "",
    bean_count: "",
    moisture_percent: "",
    mouldy_percent: "",
    external_mould_percent: "",
    violet_percent: "",
    ffa: "",
    shell_percent: "",
    duplo: "",
    residuo: "",
    type: ""
  });

  const queryClient = useQueryClient();

  const { data: qualityRecords = [], isLoading } = useQuery({
    queryKey: ['quality'],
    queryFn: () => base44.entities.Quality.list('-date'),
  });

  const { data: schedulings = [] } = useQuery({
    queryKey: ['schedulings'],
    queryFn: () => base44.entities.Scheduling.list('-date'),
  });

  // Função para calcular Resíduo: (pó + nibs) / amostragem * 100 / 60
  const calculateResidue = (sample, qualityRecord) => {
    // Primeiro verificar se tem valor salvo no registro de qualidade
    if (qualityRecord?.residuo !== null && qualityRecord?.residuo !== undefined && qualityRecord?.residuo !== "") {
      return qualityRecord.residuo;
    }
    
    const scheduling = schedulings.find(s => s.load_number === sample);
    if (!scheduling || scheduling.amostragem == null || scheduling.nibs == null || scheduling.po == null) {
      return null;
    }
    const amostragem = parseFloat(scheduling.amostragem);
    const nibs = parseFloat(scheduling.nibs);
    const po = parseFloat(scheduling.po);
    
    if (isNaN(amostragem) || amostragem === 0) return null;
    
    return ((nibs + po) / amostragem * 100 / 60).toFixed(2);
  };

  // Função para calcular Duplo: duplo / amostragem * 100 / 60
  const calculateDuplo = (sample, qualityRecord) => {
    // Primeiro verificar se tem valor salvo no registro de qualidade
    if (qualityRecord?.duplo !== null && qualityRecord?.duplo !== undefined && qualityRecord?.duplo !== "") {
      return qualityRecord.duplo;
    }
    
    const scheduling = schedulings.find(s => s.load_number === sample);
    if (!scheduling || scheduling.amostragem == null || scheduling.duplo == null) {
      return null;
    }
    const amostragem = parseFloat(scheduling.amostragem);
    const duplo = parseFloat(scheduling.duplo);
    
    if (isNaN(amostragem) || amostragem === 0) return null;
    
    return (duplo / amostragem * 100 / 60).toFixed(2);
  };

  const isReadOnly = user?.profile === 'controladoria' || user?.profile === 'producao' || user?.profile === 'originacao';
  const canEdit = user?.role === 'admin' || user?.profile === 'qualidade' || user?.profile === 'analista_qualidade' || user?.profile === 'classificador';
  const canCreate = user?.role === 'admin' || user?.profile === 'qualidade' || user?.profile === 'analista_qualidade' || user?.profile === 'classificador';

  // Pré-preencher released_by quando user carrega
  useEffect(() => {
    if (user?.full_name) {
      setFormData(prev => prev.released_by ? prev : { ...prev, released_by: user.full_name });
    }
  }, [user?.full_name]);

  // Calcular tempo de liberação
  useEffect(() => {
    if (formData.reception_time && formData.release_time) {
      const [recH, recM] = formData.reception_time.split(':').map(Number);
      const [relH, relM] = formData.release_time.split(':').map(Number);
      const totalMinutes = (relH * 60 + relM) - (recH * 60 + recM);
      
      if (totalMinutes >= 0) {
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        const duration = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
        setFormData(prev => ({ ...prev, release_duration: duration }));
      }
    }
  }, [formData.reception_time, formData.release_time]);

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await base44.functions.invoke('createQualityRecord', { data });
      if (!response?.data?.success) {
        throw new Error(response?.data?.error || 'Erro ao criar registro');
      }
      return response.data.record;
    },
    onSuccess: () => {
      console.log('🎉 Mutation onSuccess disparado');
      queryClient.invalidateQueries({ queryKey: ['quality'] });
      resetForm();
      setShowForm(false);
      toast.success('Registro de qualidade criado com sucesso!');
    },
    onError: (error) => {
      console.error('❌ Mutation onError:', error);
      toast.error('Erro ao criar registro: ' + (error.message || error.toString()));
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const response = await base44.functions.invoke('updateEntityRecord', { entity: 'Quality', id, data, action: 'update' });
      if (!response?.data?.success) {
        throw new Error(response?.data?.error || 'Erro ao atualizar registro');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality'] });
      resetForm();
      setShowForm(false);
      setEditingQuality(null);
      toast.success('Registro atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar registro: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const quality = qualityRecords.find(q => q.id === id);
      await base44.entities.Quality.delete(id);
      base44.functions.invoke('logTransaction', {
        entity_type: 'Quality',
        entity_id: id,
        action: 'delete',
        data_before: quality,
        data_after: null
      }).catch(() => {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality'] });
      toast.success('Registro excluído com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir registro: ' + error.message);
    }
  });

  const handleSubmit = () => {
    // Validação manual com toast (evita bloqueio silencioso do HTML5 validation)
    if (!formData.sample?.trim()) {
      toast.error('❌ Campo obrigatório: Sample (Nº Carga)');
      return;
    }
    if (!formData.date) {
      toast.error('❌ Campo obrigatório: Data');
      return;
    }

    const processedData = {
      ...formData,
      // Converter campos enum vazios para null (evitar erro de validação)
      origin: formData.origin || null,
      type: formData.type || null,
      justification: formData.justification || null,
      // Converter campos numéricos
      germinated_percent: formData.germinated_percent !== "" ? Number(formData.germinated_percent) : null,
      flat_percent: formData.flat_percent !== "" ? Number(formData.flat_percent) : null,
      insect_damaged_percent: formData.insect_damaged_percent !== "" ? Number(formData.insect_damaged_percent) : null,
      slaty_percent: formData.slaty_percent !== "" ? Number(formData.slaty_percent) : null,
      bean_count: formData.bean_count !== "" ? Number(formData.bean_count) : null,
      moisture_percent: formData.moisture_percent !== "" ? Number(formData.moisture_percent) : null,
      mouldy_percent: formData.mouldy_percent !== "" ? Number(formData.mouldy_percent) : null,
      external_mould_percent: formData.external_mould_percent !== "" ? Number(formData.external_mould_percent) : null,
      violet_percent: formData.violet_percent !== "" ? Number(formData.violet_percent) : null,
      ffa: formData.ffa !== "" ? Number(formData.ffa) : null,
      shell_percent: formData.shell_percent !== "" ? Number(formData.shell_percent) : null,
    };

    if (editingQuality) {
      updateMutation.mutate({ id: editingQuality.id, data: processedData });
    } else {
      createMutation.mutate(processedData);
    }
  };

  const handleEdit = (quality) => {
    setEditingQuality(quality);
    setFormData({
      date: quality.date,
      released_by: quality.released_by || "",
      sample: quality.sample,
      reception_time: quality.reception_time || "",
      release_time: quality.release_time || "",
      release_duration: quality.release_duration || "",
      justification: quality.justification || "",
      observations: quality.observations || "",
      origin: quality.origin || "",
      germinated_percent: quality.germinated_percent ?? "",
      flat_percent: quality.flat_percent ?? "",
      insect_damaged_percent: quality.insect_damaged_percent ?? "",
      fumaca: quality.fumaca ?? "",
      slaty_percent: quality.slaty_percent ?? "",
      bean_count: quality.bean_count ?? "",
      moisture_percent: quality.moisture_percent ?? "",
      mouldy_percent: quality.mouldy_percent ?? "",
      external_mould_percent: quality.external_mould_percent ?? "",
      violet_percent: quality.violet_percent ?? "",
      ffa: quality.ffa ?? "",
      shell_percent: quality.shell_percent ?? "",
      duplo: quality.duplo ?? "",
      residuo: quality.residuo ?? "",
      type: quality.type ?? ""
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
      date: format(TODAY, 'yyyy-MM-dd'),
      released_by: user?.full_name || "",
      sample: "",
      reception_time: "",
      release_time: "",
      justification: "",
      observations: "",
      origin: "",
      germinated_percent: "",
      flat_percent: "",
      insect_damaged_percent: "",
      fumaca: "",
      slaty_percent: "",
      bean_count: "",
      moisture_percent: "",
      mouldy_percent: "",
      external_mould_percent: "",
      violet_percent: "",
      ffa: "",
      shell_percent: "",
      duplo: "",
      residuo: "",
      type: ""
    });
    setEditingQuality(null);
  };

  // Filtrar registros com base nos filtros
  const filteredRecords = useMemo(() => {
    return qualityRecords.filter(q => {
      // Filtro de data (período)
      if (q.date < startDate || q.date > endDate) return false;
      
      // Filtro de busca
      if (searchTerm) {
        const matchSearch = q.sample?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           q.released_by?.toLowerCase().includes(searchTerm.toLowerCase());
        if (!matchSearch) return false;
      }
      
      // Filtro de origem
      const matchOrigin = selectedOrigin === "all" || q.origin === selectedOrigin;
      if (!matchOrigin) return false;
      
      // Filtro de depósito (warehouse) - buscar no scheduling correspondente
      if (selectedWarehouse !== "all") {
        const relatedScheduling = schedulings.find(s => s.load_number === q.sample);
        if (!relatedScheduling || relatedScheduling.warehouse !== selectedWarehouse) return false;
      }
      
      return true;
    });
  }, [qualityRecords, startDate, endDate, searchTerm, selectedOrigin, selectedWarehouse, schedulings]);

  // Métricas calculadas
  const metrics = useMemo(() => {
    const records = filteredRecords;
    
    // Contagem de justificativas
    const justificationCounts = {};
    records.forEach(r => {
      if (r.justification) {
        justificationCounts[r.justification] = (justificationCounts[r.justification] || 0) + 1;
      }
    });
    
    // Calcular médias e máximos
    const moistureValues = records.filter(r => r.moisture_percent != null).map(r => r.moisture_percent);
    const ffaValues = records.filter(r => r.ffa != null).map(r => r.ffa);
    const mouldyValues = records.filter(r => r.mouldy_percent != null).map(r => r.mouldy_percent);
    
    // Fumaça como média (assumindo que é numérico ou pode ser convertido)
    const fumacaValues = records.filter(r => r.fumaca && !isNaN(parseFloat(r.fumaca))).map(r => parseFloat(r.fumaca));
    
    const avg = (arr) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : "N/A";
    const max = (arr) => arr.length > 0 ? Math.max(...arr).toFixed(2) : "N/A";
    
    // Calcular tempo médio de liberação
    const recordsWithTime = records.filter(r => r.reception_time && r.release_time);
    let avgReleaseTime = "N/A";
    
    if (recordsWithTime.length > 0) {
      const totalMinutes = recordsWithTime.reduce((sum, r) => {
        const [recH, recM] = r.reception_time.split(':').map(Number);
        const [relH, relM] = r.release_time.split(':').map(Number);
        const recMinutes = recH * 60 + recM;
        const relMinutes = relH * 60 + relM;
        return sum + (relMinutes - recMinutes);
      }, 0);
      
      const avgMinutes = Math.round(totalMinutes / recordsWithTime.length);
      const hours = Math.floor(avgMinutes / 60);
      const mins = avgMinutes % 60;
      avgReleaseTime = `${hours}h${String(mins).padStart(2, '0')}`;
    }
    
    return {
      justifications: justificationCounts,
      avgMoisture: avg(moistureValues),
      maxMoisture: max(moistureValues),
      avgFFA: avg(ffaValues),
      maxFFA: max(ffaValues),
      avgMouldy: avg(mouldyValues),
      maxMouldy: max(mouldyValues),
      avgFumaca: avg(fumacaValues),
      maxFumaca: max(fumacaValues),
      avgReleaseTime,
      totalRecords: records.length
    };
  }, [filteredRecords]);

  const exportToExcel = () => {
    const data = filteredRecords.map(q => ({
      'Data': format(new Date(q.date), 'dd/MM/yyyy'),
      'Sample': q.sample,
      'Liberado por': q.released_by,
      'Hora Recebimento': q.reception_time,
      'Hora Liberação': q.release_time,
      'Tempo Liberação': q.release_duration,
      'Origem': q.origin,
      '% Germinated': q.germinated_percent,
      '% Flat': q.flat_percent,
      '% Insect Damaged': q.insect_damaged_percent,
      'Fumaça': q.fumaca,
      '% Slaty': q.slaty_percent,
      'Bean Count': q.bean_count,
      '% Moisture': q.moisture_percent,
      '% Mouldy': q.mouldy_percent,
      '% External Mould': q.external_mould_percent,
      '% Violet': q.violet_percent,
      'FFA': q.ffa,
      '% SHELL': q.shell_percent,
      'Duplo': q.duplo,
      'Resíduo': q.residuo,
      'Type': q.type,
      'Justificativa': q.justification,
      'Observações': q.observations
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
    link.setAttribute('download', `qualidade_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Dados exportados com sucesso!');
  };

  // Buscar cargas disponíveis para usar como Sample - APENAS da data selecionada no formulário
  const availableLoads = useMemo(() => {
    return [...new Set(schedulings
      .filter(s => s.load_number && s.date === formData.date)
      .map(s => s.load_number))].sort();
  }, [schedulings, formData.date]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <ClipboardCheck className="w-6 h-6 md:w-8 md:h-8 text-[#860063]" />
                Controle de Qualidade
              </h1>
              <p className="text-sm md:text-base text-gray-600">Gestão de análises de qualidade das cargas</p>
              <div className="mt-3 flex gap-3">
                <Link 
                  to={createPageUrl("TransferDeposits")}
                  className="inline-flex items-center gap-2 text-sm bg-[#860063] text-white hover:bg-[#F88D2A] px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Warehouse className="w-4 h-4" />
                  Transf. Depósitos
                </Link>
                <Link 
                  to={createPageUrl("MoegaAnterior")}
                  className="inline-flex items-center gap-2 text-sm bg-[#860063] text-white hover:bg-[#F88D2A] px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  <Factory className="w-4 h-4" />
                  Moega Dia Anterior
                </Link>
              </div>
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
              {canCreate && (
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
        <Card className="shadow-md border-none mb-2">
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

              <Select value={selectedOrigin || "all"} onValueChange={setSelectedOrigin}>
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

              <Select value={selectedWarehouse || "all"} onValueChange={setSelectedWarehouse}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Depósito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="central">Central</SelectItem>
                  <SelectItem value="fabrica">Fábrica</SelectItem>
                  <SelectItem value="barra">Barra</SelectItem>
                  <SelectItem value="ferraz">Ferraz</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar por Sample ou Responsável..."
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

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-2">
          {/* Umidade Média */}
          <Card className="shadow-xl border-2 border-blue-400/40 backdrop-blur-xl bg-gradient-to-br from-white/90 to-blue-50/30">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Umidade Média</p>
                  <p className="text-3xl font-black text-gray-900 mt-1">
                    {metrics.avgMoisture !== "N/A" ? `${metrics.avgMoisture}%` : "N/A"}
                  </p>
                  {metrics.maxMoisture !== "N/A" && (
                    <p className="text-xs text-red-600 font-semibold mt-1">
                      Máx: {metrics.maxMoisture}%
                    </p>
                  )}
                </div>
                <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl shadow-lg">
                  <Droplets className="w-6 h-6 text-white drop-shadow-md" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* FFA Médio */}
          <Card className="shadow-xl border-2 border-purple-400/40 backdrop-blur-xl bg-gradient-to-br from-white/90 to-purple-50/30">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">FFA Médio</p>
                  <p className="text-3xl font-black text-gray-900 mt-1">
                    {metrics.avgFFA !== "N/A" ? `${metrics.avgFFA}%` : "N/A"}
                  </p>
                  {metrics.maxFFA !== "N/A" && (
                    <p className="text-xs text-red-600 font-semibold mt-1">
                      Máx: {metrics.maxFFA}%
                    </p>
                  )}
                </div>
                <div className="p-3 bg-gradient-to-br from-[#860063] to-purple-600 rounded-2xl shadow-lg">
                  <Activity className="w-6 h-6 text-white drop-shadow-md" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Mofo Médio */}
          <Card className="shadow-xl border-2 border-green-400/40 backdrop-blur-xl bg-gradient-to-br from-white/90 to-green-50/30">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Mofo Médio</p>
                  <p className="text-3xl font-black text-gray-900 mt-1">
                    {metrics.avgMouldy !== "N/A" ? `${metrics.avgMouldy}%` : "N/A"}
                  </p>
                  {metrics.maxMouldy !== "N/A" && (
                    <p className="text-xs text-red-600 font-semibold mt-1">
                      Máx: {metrics.maxMouldy}%
                    </p>
                  )}
                </div>
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                  <AlertCircle className="w-6 h-6 text-white drop-shadow-md" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fumaça Média */}
          <Card className="shadow-xl border-2 border-orange-400/40 backdrop-blur-xl bg-gradient-to-br from-white/90 to-orange-50/30">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Fumaça Média</p>
                  <p className="text-3xl font-black text-gray-900 mt-1">
                    {metrics.avgFumaca !== "N/A" ? `${metrics.avgFumaca}%` : "N/A"}
                  </p>
                  {metrics.maxFumaca !== "N/A" && (
                    <p className="text-xs text-red-600 font-semibold mt-1">
                      Máx: {metrics.maxFumaca}%
                    </p>
                  )}
                </div>
                <div className="p-3 bg-gradient-to-br from-[#F88D2A] to-orange-600 rounded-2xl shadow-lg">
                  <Flame className="w-6 h-6 text-white drop-shadow-md" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tempo Médio de Liberação */}
          <Card className="shadow-xl border-2 border-indigo-400/40 backdrop-blur-xl bg-gradient-to-br from-white/90 to-indigo-50/30">
            <CardContent className="p-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Tempo Médio</p>
                  <p className="text-3xl font-black text-gray-900 mt-1">
                    {metrics.avgReleaseTime}
                  </p>
                  <p className="text-xs text-gray-500 font-semibold mt-1">
                    Liberação
                  </p>
                </div>
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl shadow-lg">
                  <Clock className="w-6 h-6 text-white drop-shadow-md" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Justificativas */}
        {Object.keys(metrics.justifications).length > 0 && (
          <Card className="shadow-md border-none mb-6">
            <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5 py-3">
              <CardTitle className="text-base font-bold">Justificativas</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="flex flex-wrap gap-2">
                {Object.entries(metrics.justifications)
                  .sort((a, b) => b[1] - a[1])
                  .map(([justification, count]) => (
                    <Badge key={justification} variant="outline" className="px-3 py-1">
                      {justification}: <strong className="ml-1">{count}</strong>
                    </Badge>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Listagem - Tabela */}
        <Card className="shadow-xl border-none">
          <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5">
            <CardTitle className="text-lg md:text-xl font-bold">
              Registros de Qualidade
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#860063] mx-auto"></div>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum registro encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gray-50">
                      <th className="px-3 py-3 text-left font-bold text-gray-700">Data</th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700">Sample</th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700">Classificador</th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700">Origem</th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700">Tipo</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">Tempo</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">%Umidade</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">FFA</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">%Mofo</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">Fumaça</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">%Germ.</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">%Flat</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">%Slaty</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">Bean Ct.</th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700">Justificativa</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">Resíduo</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">Duplo</th>
                      <th className="px-3 py-3 text-center font-bold text-gray-700">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredRecords.map((quality, index) => (
                        <motion.tr
                          key={quality.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ delay: index * 0.02 }}
                          className="border-b border-gray-100 hover:bg-[#860063]/5 transition-colors"
                        >
                          <td className="px-3 py-2 whitespace-nowrap">
                            {quality.date.split('-').reverse().join('/')}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap font-semibold text-[#860063]">
                            {quality.sample}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {quality.released_by || "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {quality.origin ? (
                              <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">
                                {quality.origin}
                              </Badge>
                            ) : "-"}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs">
                            {quality.type || "-"}
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            {quality.release_duration ? (
                              <span className="flex items-center justify-center gap-1 text-[#F88D2A] font-semibold">
                                <Clock className="w-3 h-3" />
                                {quality.release_duration}
                              </span>
                            ) : "-"}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold">
                            {quality.moisture_percent != null ? `${quality.moisture_percent}%` : "-"}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold">
                            {quality.ffa != null ? quality.ffa : "-"}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold">
                            {quality.mouldy_percent != null ? `${quality.mouldy_percent}%` : "-"}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold">
                            {quality.fumaca || "-"}
                          </td>
                          <td className="px-3 py-2 text-center text-xs text-gray-600">
                            {quality.germinated_percent != null ? `${quality.germinated_percent}%` : "-"}
                          </td>
                          <td className="px-3 py-2 text-center text-xs text-gray-600">
                            {quality.flat_percent != null ? `${quality.flat_percent}%` : "-"}
                          </td>
                          <td className="px-3 py-2 text-center text-xs text-gray-600">
                            {quality.slaty_percent != null ? `${quality.slaty_percent}%` : "-"}
                          </td>
                          <td className="px-3 py-2 text-center text-xs text-gray-600">
                            {quality.bean_count || "-"}
                          </td>
                          <td className="px-3 py-2 text-xs max-w-xs truncate">
                            {quality.justification || "-"}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-purple-700">
                            {(() => {
                              const val = calculateResidue(quality.sample, quality);
                              return val !== null && val !== undefined ? `${val}%` : "-";
                            })()}
                          </td>
                          <td className="px-3 py-2 text-center font-semibold text-orange-700">
                            {(() => {
                              const val = calculateDuplo(quality.sample, quality);
                              return val !== null && val !== undefined ? `${val}%` : "-";
                            })()}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-sm">
                               <div className="flex gap-2">
                                 {canEdit && (
                                <>
                                  <Button
                                    onClick={() => handleEdit(quality)}
                                    variant="outline"
                                    size="sm"
                                    className="hover:bg-blue-50"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    onClick={() => handleDelete(quality.id)}
                                    variant="outline"
                                    size="sm"
                                    className="hover:bg-red-50 text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </>
                              )}
                            </div>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#860063]" />
              {editingQuality ? 'Editar Registro' : 'Novo Registro de Qualidade'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {/* Identificação */}
            <div className="bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3">Identificação</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="released_by">Classificador</Label>
                  <Input
                    id="released_by"
                    value={formData.released_by}
                    onChange={(e) => setFormData({ ...formData, released_by: e.target.value })}
                    placeholder="Nome do classificador"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sample">Sample (Nº Carga) *</Label>
                  <div className="relative">
                    <Input
                      id="sample"
                      value={formData.sample}
                      onChange={(e) => setFormData({ ...formData, sample: e.target.value })}
                      placeholder="Digite ou selecione o nº da carga"
                        list="available-loads"
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                    />
                    <datalist id="available-loads">
                      {availableLoads.map((load) => (
                        <option key={load} value={load} />
                      ))}
                    </datalist>
                  </div>
                  <p className="text-xs text-gray-500">
                    💡 Digite manualmente ou selecione das cargas do dia: {format(new Date(formData.date), 'dd/MM/yyyy')}
                  </p>
                </div>
              </div>
            </div>

            {/* Tempos */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3">Horários</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reception_time">Hora de Recebimento</Label>
                  <Input
                    id="reception_time"
                    type="time"
                    value={formData.reception_time}
                    onChange={(e) => setFormData({ ...formData, reception_time: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="release_time">Hora de Liberação</Label>
                  <Input
                    id="release_time"
                    type="time"
                    value={formData.release_time}
                    onChange={(e) => setFormData({ ...formData, release_time: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="release_duration">Tempo de Liberação</Label>
                  <Input
                    id="release_duration"
                    value={formData.release_duration}
                    disabled
                    className="bg-gray-100"
                    placeholder="Calculado automaticamente"
                  />
                </div>
              </div>
            </div>

            {/* Origem e Tipo */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="origin">Origem</Label>
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

              <div className="space-y-2">
                <Label htmlFor="type">Tipo do Produto</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sem fumaça">Sem fumaça</SelectItem>
                    <SelectItem value="Fora de Tipo">Fora de Tipo</SelectItem>
                    <SelectItem value="Comum">Comum</SelectItem>
                    <SelectItem value="Tipo 1">Tipo 1</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Análises Percentuais */}
            <div className="bg-green-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3">Análises Percentuais (%)</h3>
              <div className="grid md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="germinated_percent">% Germinated</Label>
                  <Input
                    id="germinated_percent"
                    type="number"
                    step="0.01"
                    value={formData.germinated_percent}
                    onChange={(e) => setFormData({ ...formData, germinated_percent: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="flat_percent">% Flat</Label>
                  <Input
                    id="flat_percent"
                    type="number"
                    step="0.01"
                    value={formData.flat_percent}
                    onChange={(e) => setFormData({ ...formData, flat_percent: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="insect_damaged_percent">% Insect Damaged</Label>
                  <Input
                    id="insect_damaged_percent"
                    type="number"
                    step="0.01"
                    value={formData.insect_damaged_percent}
                    onChange={(e) => setFormData({ ...formData, insect_damaged_percent: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slaty_percent">% Slaty</Label>
                  <Input
                    id="slaty_percent"
                    type="number"
                    step="0.01"
                    value={formData.slaty_percent}
                    onChange={(e) => setFormData({ ...formData, slaty_percent: e.target.value })}
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
                  <Label htmlFor="mouldy_percent">% Mouldy</Label>
                  <Input
                    id="mouldy_percent"
                    type="number"
                    step="0.01"
                    value={formData.mouldy_percent}
                    onChange={(e) => setFormData({ ...formData, mouldy_percent: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="external_mould_percent">% External Mould</Label>
                  <Input
                    id="external_mould_percent"
                    type="number"
                    step="0.01"
                    value={formData.external_mould_percent}
                    onChange={(e) => setFormData({ ...formData, external_mould_percent: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="violet_percent">% Violet</Label>
                  <Input
                    id="violet_percent"
                    type="number"
                    step="0.01"
                    value={formData.violet_percent}
                    onChange={(e) => setFormData({ ...formData, violet_percent: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shell_percent">% SHELL</Label>
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

            {/* Outros Parâmetros */}
            <div className="bg-yellow-50 rounded-lg p-4">
              <h3 className="font-bold text-gray-900 mb-3">Outros Parâmetros</h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bean_count">Bean Count</Label>
                  <Input
                    id="bean_count"
                    type="number"
                    value={formData.bean_count}
                    onChange={(e) => setFormData({ ...formData, bean_count: e.target.value })}
                  />
                </div>

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
                  <Label htmlFor="fumaca">Fumaça</Label>
                  <Input
                    id="fumaca"
                    value={formData.fumaca}
                    onChange={(e) => setFormData({ ...formData, fumaca: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="residuo">Resíduo (%)</Label>
                  <Input
                    id="residuo"
                    type="number"
                    step="0.01"
                    value={formData.residuo}
                    onChange={(e) => setFormData({ ...formData, residuo: e.target.value })}
                    placeholder="Ex: 0 ou 1.5"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duplo">Duplo (%)</Label>
                  <Input
                    id="duplo"
                    type="number"
                    step="0.01"
                    value={formData.duplo}
                    onChange={(e) => setFormData({ ...formData, duplo: e.target.value })}
                    placeholder="Ex: 0 ou 2.3"
                  />
                </div>
              </div>
            </div>

            {/* Justificativa e Observações */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="justification">Justificativa</Label>
                <Select value={formData.justification} onValueChange={(value) => setFormData({ ...formData, justification: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a justificativa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Carga ao mesmo tempo">Carga ao mesmo tempo</SelectItem>
                    <SelectItem value="Almoço">Almoço</SelectItem>
                    <SelectItem value="Janta">Janta</SelectItem>
                    <SelectItem value="Blend">Blend</SelectItem>
                    <SelectItem value="Classificação">Classificação</SelectItem>
                    <SelectItem value="Ohaus">Ohaus</SelectItem>
                    <SelectItem value="Amostra entregue no final do turno">Amostra entregue no final do turno</SelectItem>
                    <SelectItem value="Sem internet">Sem internet</SelectItem>
                    <SelectItem value="Treinamento">Treinamento</SelectItem>
                    <SelectItem value="Computador em uso">Computador em uso</SelectItem>
                    <SelectItem value="Digitação SAP">Digitação SAP</SelectItem>
                    <SelectItem value="Prioridade solicitada em outra carga">Prioridade solicitada em outra carga</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observations">Observações</Label>
                <Textarea
                  id="observations"
                  value={formData.observations}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  rows={3}
                />
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
                type="button"
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063]"
              >
                {createMutation.isPending || updateMutation.isPending ? 'Salvando...' : editingQuality ? 'Atualizar' : 'Criar Registro'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}