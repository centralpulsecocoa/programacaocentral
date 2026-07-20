import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History as HistoryIcon, Calendar, Clock, Package, MapPin, FileText, Filter, FileSpreadsheet, Truck, TrendingUp, CheckCircle, XCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const statusColors = {
  agendado: "bg-blue-100 text-blue-800 border-blue-200",
  em_descarga: "bg-orange-100 text-orange-800 border-orange-200",
  concluido: "bg-green-100 text-green-800 border-green-200",
  cancelado: "bg-red-100 text-red-800 border-red-200"
};

const statusLabels = {
  agendado: "Agendado",
  em_descarga: "Em Descarga",
  concluido: "Concluído",
  cancelado: "Cancelado"
};

export default function HistoryPage() {
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("concluido");
  const [selectedSupplier, setSelectedSupplier] = useState("all");
  const [expandedId, setExpandedId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);

  const { data: schedulings = [], isLoading } = useQuery({
    queryKey: ['schedulings'],
    queryFn: () => base44.entities.Scheduling.list('-date'),
    initialData: [],
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list(),
    initialData: [],
  });

  const filteredSchedulings = schedulings.filter(s => {
    // Filtro de status
    if (selectedStatus !== "all" && s.status !== selectedStatus) return false;
    
    // Filtro de data
    if (selectedDate && s.date !== selectedDate) return false;
    
    // Filtro de fornecedor
    if (selectedSupplier !== "all" && s.supplier !== selectedSupplier) return false;
    
    return true;
  });

  const sortedSchedulings = [...filteredSchedulings].sort((a, b) => {
    // Ordenar por data (mais recente primeiro) e depois por horário
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return (b.start_time || '').localeCompare(a.start_time || '');
  });

  // Get unique suppliers from schedulings
  const uniqueSuppliers = [...new Set(schedulings.map(s => s.supplier).filter(Boolean))].sort();

  // Calcular estatísticas do fornecedor selecionado
  const supplierStats = selectedSupplier !== "all" ? (() => {
    const supplierSchedulings = schedulings.filter(s => s.supplier === selectedSupplier);
    const concluded = supplierSchedulings.filter(s => s.status === 'concluido');
    const cancelled = supplierSchedulings.filter(s => s.status === 'cancelado');
    
    const totalBags = concluded.reduce((sum, s) => sum + (s.actual_bags || s.quantity_bags || 0), 0);
    const totalTons = (totalBags * 60) / 1000;
    
    const avgBags = concluded.length > 0 ? Math.round(totalBags / concluded.length) : 0;
    
    // Calcular duração média
    const durationsInMinutes = concluded
      .filter(s => s.start_time && s.end_time_actual)
      .map(s => {
        const [startH, startM] = s.start_time.split(':').map(Number);
        const [endH, endM] = s.end_time_actual.split(':').map(Number);
        return (endH * 60 + endM) - (startH * 60 + startM);
      });
    
    const avgDuration = durationsInMinutes.length > 0
      ? durationsInMinutes.reduce((a, b) => a + b, 0) / durationsInMinutes.length
      : 0;
    
    const avgDurationFormatted = avgDuration > 0
      ? `${String(Math.floor(avgDuration / 60)).padStart(2, '0')}:${String(Math.round(avgDuration % 60)).padStart(2, '0')}`
      : "-";
    
    // Calcular entregas por depósito
    const warehouseBreakdown = concluded.reduce((acc, s) => {
      const warehouse = s.warehouse === 'central' ? 'Central' : 
                       s.warehouse === 'fabrica' ? 'Fábrica' : 
                       s.warehouse === 'barra' ? 'Barra' : 
                       s.warehouse === 'ferraz' ? 'Ferraz' : s.warehouse;
      acc[warehouse] = (acc[warehouse] || 0) + 1;
      return acc;
    }, {});
    
    const warehousesUsed = Object.entries(warehouseBreakdown)
      .map(([warehouse, count]) => `${warehouse} (${count})`)
      .join(', ');
    
    return {
      total: supplierSchedulings.length,
      concluded: concluded.length,
      cancelled: cancelled.length,
      totalBags,
      totalTons: totalTons.toFixed(2),
      avgBags,
      avgDuration: avgDurationFormatted,
      warehousesUsed: warehousesUsed || '-'
    };
  })() : null;

  const formatDisplayDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const formatDisplayDateLong = (dateStr) => {
    try {
      return format(parseISO(dateStr), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return "-";
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      const data = sortedSchedulings.map(s => ({
        'Data': formatDisplayDate(s.date),
        'Fornecedor': s.supplier,
        'Armazém': s.warehouse === 'central' ? 'Central' : 'Fábrica',
        'Linha': s.line,
        'Início': s.start_time,
        'Fim Previsto': s.end_time_predicted,
        'Fim Real': s.end_time_actual || '-',
        'Duração': s.end_time_actual ? calculateDuration(s.start_time, s.end_time_actual) : '-',
        'Sacos': s.quantity_bags,
        'Toneladas': s.quantity_tons?.toFixed(2),
        'Status': statusLabels[s.status] || s.status,
        'WB': s.wb_number || '-',
        'Nº Carga': s.load_number || '-',
        'Código Rastreio': s.tracking_code || '-',
        'Certificação': s.eudr_cvn || '-',
        'Observações': s.notes || '-'
      }));

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => {
          const value = row[header];
          return `"${value}"`;
        }).join(','))
      ].join('\n');

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      
      const dateFilter = selectedDate ? `_${selectedDate}` : '';
      const statusFilter = selectedStatus !== 'all' ? `_${selectedStatus}` : '';
      const supplierFilter = selectedSupplier !== 'all' ? `_${selectedSupplier.replace(/\s+/g, '_')}` : '';
      link.setAttribute('download', `historico_agendamentos${dateFilter}${statusFilter}${supplierFilter}.csv`);
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Histórico exportado com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar histórico');
      console.error(error);
    }
    setIsExporting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <HistoryIcon className="w-6 h-6 md:w-8 md:h-8 text-[#860063]" />
                Histórico de Agendamentos
              </h1>
              <p className="text-sm md:text-base text-gray-600">Consulte agendamentos concluídos e cancelados</p>
            </div>
            <Button
              onClick={exportToExcel}
              disabled={isExporting || sortedSchedulings.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              {isExporting ? 'Exportando...' : 'Exportar Excel'}
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <Card className="shadow-md border-none mb-6">
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
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-48"
                  placeholder="Todas as datas"
                />
              </div>

              <Select value={selectedStatus || "concluido"} onValueChange={setSelectedStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="concluido">Concluído</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                  <SelectItem value="agendado">Agendado</SelectItem>
                  <SelectItem value="em_descarga">Em Descarga</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedSupplier || "all"} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Fornecedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os fornecedores</SelectItem>
                  {uniqueSuppliers.map((supplier) => (
                    <SelectItem key={supplier} value={supplier}>
                      {supplier}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Badge variant="outline" className="ml-auto">
                {sortedSchedulings.length} {sortedSchedulings.length === 1 ? 'registro' : 'registros'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas do Fornecedor */}
        {supplierStats && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="shadow-xl border-2 border-[#860063]/20">
              <CardHeader className="border-b bg-gradient-to-r from-[#860063]/10 to-[#F88D2A]/10 py-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#860063]" />
                  Estatísticas - {selectedSupplier}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3 border-2 border-blue-200">
                    <p className="text-xs text-blue-700 mb-1 font-semibold">Total de Agendamentos</p>
                    <p className="text-2xl font-black text-blue-900">{supplierStats.total}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3 border-2 border-green-200">
                    <div className="flex items-center gap-1 mb-1">
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      <p className="text-xs text-green-700 font-semibold">Concluídos</p>
                    </div>
                    <p className="text-2xl font-black text-green-900">{supplierStats.concluded}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border-2 border-red-200">
                    <div className="flex items-center gap-1 mb-1">
                      <XCircle className="w-3 h-3 text-red-600" />
                      <p className="text-xs text-red-700 font-semibold">Cancelados</p>
                    </div>
                    <p className="text-2xl font-black text-red-900">{supplierStats.cancelled}</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-3 border-2 border-purple-200">
                    <p className="text-xs text-purple-700 mb-1 font-semibold">Volume Total</p>
                    <p className="text-2xl font-black text-purple-900">{supplierStats.totalTons}t</p>
                    <p className="text-xs text-purple-600 mt-0.5">{supplierStats.totalBags.toLocaleString('pt-BR')} sacos</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-3 border-2 border-orange-200">
                    <p className="text-xs text-orange-700 mb-1 font-semibold">Média por Descarga</p>
                    <p className="text-2xl font-black text-orange-900">{supplierStats.avgBags}</p>
                    <p className="text-xs text-orange-600 mt-0.5">sacos</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-lg p-3 border-2 border-indigo-200">
                    <div className="flex items-center gap-1 mb-1">
                      <Clock className="w-3 h-3 text-indigo-600" />
                      <p className="text-xs text-indigo-700 font-semibold">Duração Média</p>
                    </div>
                    <p className="text-2xl font-black text-indigo-900">{supplierStats.avgDuration}</p>
                    <p className="text-xs text-indigo-600 mt-0.5">horas</p>
                  </div>
                  
                  <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-lg p-3 border-2 border-teal-200 md:col-span-2">
                    <div className="flex items-center gap-1 mb-1">
                      <MapPin className="w-3 h-3 text-teal-600" />
                      <p className="text-xs text-teal-700 font-semibold">Depósitos Utilizados</p>
                    </div>
                    <p className="text-sm font-bold text-teal-900">{supplierStats.warehousesUsed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Results */}
        <Card className="shadow-xl border-none">
          <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5">
            <CardTitle className="text-lg md:text-xl font-bold">
              Resultados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#860063] mx-auto"></div>
              </div>
            ) : sortedSchedulings.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <HistoryIcon className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-2">Nenhum registro encontrado</p>
                <p className="text-sm text-gray-500">Ajuste os filtros para ver mais resultados</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {sortedSchedulings.map((schedule, index) => (
                    <motion.div
                      key={schedule.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-[#860063]/30 transition-all"
                    >
                      <div
                        onClick={() => setExpandedId(expandedId === schedule.id ? null : schedule.id)}
                        className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <h4 className="font-semibold text-gray-900 text-lg">
                                {schedule.supplier}
                              </h4>
                              <Badge className={`${statusColors[schedule.status]} border`}>
                                {statusLabels[schedule.status]}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                {formatDisplayDate(schedule.date)}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                              <div className="flex items-center gap-2 text-gray-600">
                                <Clock className="w-4 h-4 text-[#860063]" />
                                <span>{schedule.start_time}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <Package className="w-4 h-4 text-[#F88D2A]" />
                                <span>{schedule.quantity_bags?.toLocaleString('pt-BR')} sacos</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-600">
                                <MapPin className="w-4 h-4 text-blue-500" />
                                <span className="capitalize">{schedule.warehouse} - L{schedule.line}</span>
                              </div>
                              {schedule.load_number && (
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Truck className="w-4 h-4 text-orange-500" />
                                  <span>Carga: {schedule.load_number}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {expandedId === schedule.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-gray-200 bg-gray-50"
                          >
                            <div className="p-4 grid md:grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500 mb-1">Data Completa</p>
                                <p className="font-semibold text-gray-900">
                                  {formatDisplayDateLong(schedule.date)}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-gray-500 mb-1">Horários</p>
                                <p className="font-semibold text-gray-900">
                                  Início: {schedule.start_time} | 
                                  Previsto: {schedule.end_time_predicted}
                                  {schedule.end_time_actual && ` | Real: ${schedule.end_time_actual}`}
                                </p>
                                {schedule.end_time_actual && (
                                  <p className="text-green-600 text-xs mt-1">
                                    Duração: {calculateDuration(schedule.start_time, schedule.end_time_actual)}
                                  </p>
                                )}
                              </div>

                              <div>
                                <p className="text-gray-500 mb-1">Volume</p>
                                <p className="font-semibold text-gray-900">
                                  {schedule.quantity_bags?.toLocaleString('pt-BR')} sacos 
                                  ({schedule.quantity_tons?.toFixed(2)}t)
                                </p>
                                {schedule.actual_bags && (
                                  <p className="text-green-600 text-xs mt-1">
                                    Real: {schedule.actual_bags?.toLocaleString('pt-BR')} sacos
                                  </p>
                                )}
                              </div>

                              <div>
                                <p className="text-gray-500 mb-1">Local</p>
                                <p className="font-semibold text-gray-900 capitalize">
                                  {schedule.warehouse} - Linha {schedule.line}
                                </p>
                              </div>

                              {schedule.load_number && (
                                <div>
                                  <p className="text-gray-500 mb-1">Número de Carga</p>
                                  <p className="font-semibold text-gray-900">{schedule.load_number}</p>
                                </div>
                              )}

                              {schedule.wb_number && (
                                <div>
                                  <p className="text-gray-500 mb-1">WB</p>
                                  <p className="font-semibold text-gray-900">{schedule.wb_number}</p>
                                </div>
                              )}

                              {schedule.tracking_code && (
                                <div>
                                  <p className="text-gray-500 mb-1">Código de Rastreio</p>
                                  <p className="font-semibold text-gray-900">{schedule.tracking_code}</p>
                                </div>
                              )}

                              {schedule.eudr_cvn && (
                                <div>
                                  <p className="text-gray-500 mb-1">Certificação</p>
                                  <p className="font-semibold text-gray-900">{schedule.eudr_cvn}</p>
                                </div>
                              )}

                              {schedule.notes && (
                                <div className="md:col-span-2">
                                  <p className="text-gray-500 mb-1">Observações</p>
                                  <p className="text-gray-900">{schedule.notes}</p>
                                </div>
                              )}

                              {schedule.created_by && (
                                <div className="md:col-span-2">
                                  <p className="text-gray-500 mb-1">Criado por</p>
                                  <p className="text-gray-700 text-xs">{schedule.created_by}</p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}