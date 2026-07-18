import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Calendar, Search, Filter } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { motion } from "framer-motion";

export default function AllDataPage() {
  const TODAY = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(TODAY), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(TODAY), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");

  const { data: schedulings = [], isLoading } = useQuery({
    queryKey: ['all-schedulings'],
    queryFn: async () => {
      let all = [], skip = 0;
      while (true) {
        const batch = await base44.entities.Scheduling.list('-date', 5000, skip);
        all = [...all, ...batch];
        if (batch.length < 5000) break;
        skip += 5000;
      }
      return all;
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: qualityRecords = [] } = useQuery({
    queryKey: ['all-quality'],
    queryFn: () => base44.entities.Quality.list('-date', 5000),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const getQualityData = (loadNumber) => {
    return qualityRecords.find(q => q.sample === loadNumber);
  };

  const filteredSchedulings = schedulings.filter(s => {
    if (!s.date) return false;
    if (s.date < startDate || s.date > endDate) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (warehouseFilter !== "all" && s.warehouse !== warehouseFilter) return false;
    if (searchTerm && !s.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !s.wb_number?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !s.load_number?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  });

  const parseBatches = (s) => {
    try { return JSON.parse(s.batches || '[]'); } catch { return []; }
  };

  const maxBatches = Math.max(0, ...filteredSchedulings.map(s => parseBatches(s).length));

  const exportToExcel = () => {
    const data = filteredSchedulings.map(s => {
      const quality = getQualityData(s.load_number);
      return {
        'Data': format(new Date(s.date), 'dd/MM/yyyy'),
        'Fornecedor': s.supplier,
        'WB': s.wb_number || '-',
        'Nº Carga': s.load_number || '-',
        'NF': s.invoice_number || '-',
        'Contrato': s.contract || '-',
        'Qtd Programada (sacos)': s.quantity_bags,
        'Qtd Toneladas': s.quantity_tons?.toFixed(2),
        'Qtd Recebida (sacos)': s.actual_bags || '-',
        'Armazém': s.warehouse,
        'Linha': s.line,
        'Horário Agendado': s.start_time,
        'Horário Previsto Fim': s.end_time_predicted,
        'Horário Real Início': s.start_time_actual || '-',
        'Horário Real Fim': s.end_time_actual || '-',
        'Horário Chegada': s.arrival_time || '-',
        'Horário Chamada': s.call_time || '-',
        'Placa': s.vehicle_plate || '-',
        'Motorista': s.driver_name || '-',
        'Telefone': s.driver_phone || '-',
        'Peso Bruto (kg)': s.gross_weight || '-',
        'Peso Tara (kg)': s.tare_weight || '-',
        'Peso Líquido (kg)': s.net_weight || '-',
        'Balancinha (kg)': s.balancinha || '-',
        'Código Rastreio': s.tracking_code || '-',
        'EUDR/CVN': s.eudr_cvn || '-',
        'Frete': s.apanha_status || '-',
        'Amostragem': s.amostragem || '-',
        'Duplo': s.duplo || '-',
        'Nibs': s.nibs || '-',
        'Pó': s.po || '-',
        ...(() => {
          const blist = parseBatches(s);
          const cols = {};
          for (let i = 0; i < maxBatches; i++) {
            cols[`Lote ${i+1}`] = blist[i]?.lote || '-';
            cols[`Qtd Lote ${i+1}`] = blist[i]?.quantidade || '-';
          }
          return cols;
        })(),
        'GR': s.gr || '-',
        'Status': s.status,
        'Observações': s.notes || '-',
        'Criado por': s.created_by,
        'Data Criação': format(new Date(s.created_date), 'dd/MM/yyyy HH:mm'),
        // Dados de Qualidade
        'Q: Origem': quality?.origin || '-',
        'Q: % Germinated': quality?.germinated_percent || '-',
        'Q: % Flat': quality?.flat_percent || '-',
        'Q: % Insect Damaged': quality?.insect_damaged_percent || '-',
        'Q: Fumaça': quality?.fumaca || '-',
        'Q: % Slaty': quality?.slaty_percent || '-',
        'Q: Bean Count': quality?.bean_count || '-',
        'Q: % Moisture': quality?.moisture_percent || '-',
        'Q: % Mouldy': quality?.mouldy_percent || '-',
        'Q: % External Mould': quality?.external_mould_percent || '-',
        'Q: % Violet': quality?.violet_percent || '-',
        'Q: FFA': quality?.ffa || '-',
        'Q: % Shell': quality?.shell_percent || '-',
        'Q: Duplo': quality?.duplo || '-',
        'Q: Resíduo': quality?.residuo || '-',
        'Q: Tipo': quality?.type || '-',
        'Q: Liberado por': quality?.released_by || '-',

      };
    });

    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => `"${row[header] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `agendamentos_completo_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-full mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 md:w-8 md:h-8 text-[#860063]" />
                Todos os Dados
              </h1>
              <p className="text-sm md:text-base text-gray-600">Visualização completa de todos os agendamentos</p>
            </div>
            <Button
              onClick={exportToExcel}
              disabled={filteredSchedulings.length === 0}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>

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

                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Armazém" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="central">Central</SelectItem>
                    <SelectItem value="fabrica">Fábrica</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="aguardando">Aguardando</SelectItem>
                    <SelectItem value="em_descarga">Em Descarga</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Buscar fornecedor, WB, carga..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <span className="text-sm font-semibold text-gray-600 ml-auto">
                  {filteredSchedulings.length} registros
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Card className="shadow-xl border-none">
          <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5">
            <CardTitle className="text-lg md:text-xl font-bold">Tabela Completa</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#860063] mx-auto"></div>
              </div>
            ) : filteredSchedulings.length === 0 ? (
              <div className="text-center py-12">
                <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum registro encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Data</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Fornecedor</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">WB</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Nº Carga</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">NF</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Contrato</th>
                      <th className="px-2 py-3 text-center font-bold text-gray-700 whitespace-nowrap">Qtd Prog.<br/>(sacos)</th>
                      <th className="px-2 py-3 text-center font-bold text-gray-700 whitespace-nowrap">Qtd<br/>(ton)</th>
                      <th className="px-2 py-3 text-center font-bold text-gray-700 whitespace-nowrap">Qtd Receb.<br/>(sacos)</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Armazém</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Linha</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Hr Agend.</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Hr Prev. Fim</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Hr Real Início</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Hr Real Fim</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Hr Chegada</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Hr Chamada</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Placa</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Motorista</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Telefone</th>
                      <th className="px-2 py-3 text-center font-bold text-gray-700 whitespace-nowrap">Peso Bruto<br/>(kg)</th>
                      <th className="px-2 py-3 text-center font-bold text-gray-700 whitespace-nowrap">Peso Tara<br/>(kg)</th>
                      <th className="px-2 py-3 text-center font-bold text-gray-700 whitespace-nowrap">Peso Líq.<br/>(kg)</th>
                      <th className="px-2 py-3 text-center font-bold text-gray-700 whitespace-nowrap">Balancinha<br/>(kg)</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Cód. Rastreio</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">EUDR/CVN</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Frete</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Amostragem</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Duplo</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Nibs</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Pó</th>
                      {Array.from({length: maxBatches}, (_, i) => (
                        <React.Fragment key={i}>
                          <th className="px-2 py-3 text-left font-bold text-purple-700 whitespace-nowrap bg-purple-50">Lote {i+1}</th>
                          <th className="px-2 py-3 text-center font-bold text-purple-700 whitespace-nowrap bg-purple-50">Qtd L{i+1}</th>
                        </React.Fragment>
                      ))}
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">GR</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Status</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Observações</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Criado por</th>
                      <th className="px-2 py-3 text-left font-bold text-green-700 whitespace-nowrap bg-green-50">Q: Origem</th>
                      <th className="px-2 py-3 text-center font-bold text-green-700 whitespace-nowrap bg-green-50">Q: %<br/>Germ.</th>
                      <th className="px-2 py-3 text-center font-bold text-green-700 whitespace-nowrap bg-green-50">Q: %<br/>Flat</th>
                      <th className="px-2 py-3 text-center font-bold text-green-700 whitespace-nowrap bg-green-50">Q: %<br/>Insect</th>
                      <th className="px-2 py-3 text-center font-bold text-green-700 whitespace-nowrap bg-green-50">Q: Fumaça</th>
                      <th className="px-2 py-3 text-center font-bold text-green-700 whitespace-nowrap bg-green-50">Q: %<br/>Slaty</th>
                      <th className="px-2 py-3 text-center font-bold text-green-700 whitespace-nowrap bg-green-50">Q: Bean<br/>Count</th>
                      <th className="px-2 py-3 text-center font-bold text-green-700 whitespace-nowrap bg-green-50">Q: %<br/>Moist.</th>
                      <th className="px-2 py-3 text-center font-bold text-green-700 whitespace-nowrap bg-green-50">Q: %<br/>Mouldy</th>
                      <th className="px-2 py-3 text-center font-bold text-green-700 whitespace-nowrap bg-green-50">Q: % Ext.<br/>Mould</th>
                      <th className="px-2 py-3 text-center font-bold text-green-700 whitespace-nowrap bg-green-50">Q: %<br/>Violet</th>
                      <th className="px-2 py-3 text-center font-bold text-green-700 whitespace-nowrap bg-green-50">Q: FFA</th>
                      <th className="px-2 py-3 text-center font-bold text-green-700 whitespace-nowrap bg-green-50">Q: %<br/>Shell</th>
                      <th className="px-2 py-3 text-left font-bold text-green-700 whitespace-nowrap bg-green-50">Q: Duplo</th>
                      <th className="px-2 py-3 text-left font-bold text-green-700 whitespace-nowrap bg-green-50">Q: Resíduo</th>
                      <th className="px-2 py-3 text-left font-bold text-green-700 whitespace-nowrap bg-green-50">Q: Tipo</th>
                      <th className="px-2 py-3 text-left font-bold text-green-700 whitespace-nowrap bg-green-50">Q: Liberado</th>

                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchedulings.map((s, index) => {
                      const quality = getQualityData(s.load_number);
                      return (
                      <tr 
                        key={s.id} 
                        className={`border-b border-gray-100 hover:bg-[#860063]/5 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="px-2 py-2 whitespace-nowrap">{s.date.split('-').reverse().join('/')}</td>
                        <td className="px-2 py-2 whitespace-nowrap font-semibold text-[#860063]">{s.supplier}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{s.wb_number || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap font-semibold text-[#F88D2A]">{s.load_number || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{s.invoice_number || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{s.contract || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap font-semibold">{s.quantity_bags?.toLocaleString('pt-BR')}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">{s.quantity_tons?.toFixed(2)}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap font-semibold text-green-700">{s.actual_bags?.toLocaleString('pt-BR') || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap capitalize">{s.warehouse}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">{s.line}</td>
                        <td className="px-2 py-2 whitespace-nowrap font-semibold">{s.start_time}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{s.end_time_predicted}</td>
                        <td className="px-2 py-2 whitespace-nowrap text-green-600">{s.start_time_actual || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap text-green-600">{s.end_time_actual || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap text-yellow-600">{s.arrival_time || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap text-blue-600">{s.call_time || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{s.vehicle_plate || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{s.driver_name || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{s.driver_phone || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">{s.gross_weight?.toLocaleString('pt-BR') || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">{s.tare_weight?.toLocaleString('pt-BR') || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap font-semibold text-green-700">{s.net_weight?.toLocaleString('pt-BR') || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">{s.balancinha || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{s.tracking_code || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{s.eudr_cvn || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{s.apanha_status || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{s.amostragem || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{s.duplo || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{s.nibs || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{s.po || '-'}</td>
                        {Array.from({length: maxBatches}, (_, i) => {
                          const blist = parseBatches(s);
                          return (
                            <React.Fragment key={i}>
                              <td className="px-2 py-2 whitespace-nowrap text-purple-700 font-semibold bg-purple-50/30">{blist[i]?.lote || '-'}</td>
                              <td className="px-2 py-2 text-center whitespace-nowrap text-purple-700 bg-purple-50/30">{blist[i]?.quantidade?.toLocaleString('pt-BR') || '-'}</td>
                            </React.Fragment>
                          );
                        })}
                        <td className="px-2 py-2 whitespace-nowrap text-purple-700 font-semibold">{s.gr || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            s.status === 'concluido' ? 'bg-green-100 text-green-800' :
                            s.status === 'em_descarga' ? 'bg-orange-100 text-orange-800' :
                            s.status === 'aguardando' ? 'bg-yellow-100 text-yellow-800' :
                            s.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-2 py-2 max-w-xs truncate">{s.notes || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap text-gray-600">{s.created_by?.split('@')[0]}</td>
                        <td className="px-2 py-2 whitespace-nowrap bg-green-50/50">{quality?.origin || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap bg-green-50/50">{quality?.germinated_percent || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap bg-green-50/50">{quality?.flat_percent || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap bg-green-50/50">{quality?.insect_damaged_percent || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap bg-green-50/50">{quality?.fumaca || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap bg-green-50/50">{quality?.slaty_percent || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap bg-green-50/50">{quality?.bean_count || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap bg-green-50/50 font-semibold">{quality?.moisture_percent || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap bg-green-50/50">{quality?.mouldy_percent || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap bg-green-50/50">{quality?.external_mould_percent || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap bg-green-50/50">{quality?.violet_percent || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap bg-green-50/50">{quality?.ffa || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap bg-green-50/50">{quality?.shell_percent || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap bg-green-50/50">{quality?.duplo || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap bg-green-50/50">{quality?.residuo || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap bg-green-50/50">{quality?.type || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap bg-green-50/50">{quality?.released_by || '-'}</td>

                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}