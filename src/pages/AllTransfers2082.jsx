import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet, Calendar, Search, Filter, Truck } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { motion } from "framer-motion";

const statusLabels = {
  aguardando: "Aguardando",
  em_descarga: "Em Progresso",
  concluido: "Concluído",
};

const statusColors = {
  aguardando: "bg-yellow-100 text-yellow-800",
  em_descarga: "bg-orange-100 text-orange-800",
  concluido: "bg-green-100 text-green-800",
};

export default function AllTransfers2082Page() {
  const TODAY = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(TODAY), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(TODAY), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  const { data: transfers = [], isLoading } = useQuery({
    queryKey: ['all-transfers-2082'],
    queryFn: () => base44.entities.Transfer2082.list('-date'),
  });

  const { data: deposits = [] } = useQuery({
    queryKey: ['transfer-deposits'],
    queryFn: () => base44.entities.TransferDeposit.list('-date'),
  });

  const { data: pileQualities = [] } = useQuery({
    queryKey: ['pile-qualities'],
    queryFn: () => base44.entities.PileQuality.list('-formation_date'),
  });

  // Mapa batch -> formation_moisture
  const pileMoistureByBatch = React.useMemo(() => {
    const map = {};
    pileQualities.forEach(p => {
      if (p.pile_lot && p.formation_moisture != null) {
        map[p.pile_lot] = p.formation_moisture;
      }
    });
    return map;
  }, [pileQualities]);

  // Mapa NF -> moisture_percent
  const depositMoistureByNF = React.useMemo(() => {
    const map = {};
    deposits.forEach(d => {
      if (d.nf && d.moisture_percent != null) {
        map[d.nf] = d.moisture_percent;
      }
    });
    return map;
  }, [deposits]);

  const filtered = transfers.filter(t => {
    if (!t.date) return false;
    if (t.date < startDate || t.date > endDate) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (phaseFilter !== "all" && t.phase !== phaseFilter) return false;
    if (locationFilter !== "all" && t.location !== locationFilter) return false;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      if (
        !t.batch?.toLowerCase().includes(s) &&
        !t.origin?.toLowerCase().includes(s) &&
        !t.invoice_number?.toLowerCase().includes(s) &&
        !t.wb_number?.toLowerCase().includes(s) &&
        !t.gr?.toLowerCase().includes(s)
      ) return false;
    }
    return true;
  });

  const exportToCSV = () => {
    const data = filtered.map(t => ({
      'Data': t.date ? t.date.split('-').reverse().join('/') : '-',
      'Fase': t.phase === 'carga' ? 'CARGA' : 'DESCARGA',
      'Local': t.location || '-',
      'Tipo Pallet': t.pallet_type || '-',
      'Lote': t.batch || '-',
      'Origem': t.origin || '-',
      'Qtd por Carreta (bags)': t.quantity_per_truck || '-',
      'NF': t.invoice_number || '-',
      'WB': t.wb_number || '-',
      'Início': t.start_time || '-',
      'Fim': t.end_time || '-',
      'Peso Bruto (kg)': t.gross_weight || '-',
      'Peso Tara (kg)': t.tare_weight || '-',
      'Peso Líquido (kg)': t.net_weight || '-',
      'GR': t.gr || '-',
      'Status': statusLabels[t.status] || t.status,
      'Status Liberação': t.release_status || '-',
      'Solicitado por': t.release_requested_by || '-',
      'Liberado por': t.released_by || '-',
      '%Moisture': t.invoice_number && depositMoistureByNF[t.invoice_number] != null ? depositMoistureByNF[t.invoice_number] : '-',
      'Umidade Formação': t.batch && pileMoistureByBatch[t.batch] != null ? pileMoistureByBatch[t.batch] : '-',
      'Peso Padrão (kg)': t.pallet_type === '1MT' ? 1020 * (t.quantity_per_truck || 0) : t.pallet_type === '1.5MT' ? 1500 * (t.quantity_per_truck || 0) : '-',
      'Perda Umidade (%)': (() => {
        const fm = t.batch ? pileMoistureByBatch[t.batch] : null;
        const cm = t.invoice_number ? depositMoistureByNF[t.invoice_number] : null;
        return (fm != null && cm != null) ? (fm - cm).toFixed(2) : '-';
      })(),
      'Perda Peso (kg)': (() => {
        const pp = t.pallet_type === '1MT' ? 1020 * (t.quantity_per_truck || 0) : t.pallet_type === '1.5MT' ? 1500 * (t.quantity_per_truck || 0) : null;
        return (pp != null && t.net_weight != null) ? (pp - t.net_weight) : '-';
      })(),
      'Perda/Ganho (%)': (() => {
        const fm = t.batch ? pileMoistureByBatch[t.batch] : null;
        const cm = t.invoice_number ? depositMoistureByNF[t.invoice_number] : null;
        const pp = t.pallet_type === '1MT' ? 1020 * (t.quantity_per_truck || 0) : t.pallet_type === '1.5MT' ? 1500 * (t.quantity_per_truck || 0) : null;
        const perdaPeso = (pp != null && t.net_weight != null) ? pp - t.net_weight : null;
        const percPerdaPeso = (pp && pp > 0 && perdaPeso != null) ? (perdaPeso / pp) * 100 : null;
        const percPerdaUmidade = (fm != null && cm != null) ? fm - cm : null;
        return (percPerdaPeso != null && percPerdaUmidade != null) ? (percPerdaPeso - percPerdaUmidade).toFixed(2) : '-';
      })(),
      'Observações': t.notes || '-',
      'Grupo': t.transfer_group_id || '-',
    }));

    const headers = Object.keys(data[0] || {});
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `transferencias_2082_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-full mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Truck className="w-6 h-6 md:w-8 md:h-8 text-[#860063]" />
                Dados Transferências 2082
              </h1>
              <p className="text-sm md:text-base text-gray-600">Visualização completa de todas as transferências</p>
            </div>
            <Button
              onClick={exportToCSV}
              disabled={filtered.length === 0}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Exportar Excel
            </Button>
          </div>

          <Card className="shadow-md border-none mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-5 h-5 text-[#860063]" />
                  <span className="font-semibold text-gray-900">Filtros:</span>
                </div>

                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-gray-500" />
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-40" />
                  <span className="text-gray-500 text-sm">até</span>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-40" />
                </div>

                <Select value={phaseFilter} onValueChange={setPhaseFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Fase" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as fases</SelectItem>
                    <SelectItem value="carga">Carga</SelectItem>
                    <SelectItem value="descarga">Descarga</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-36"><SelectValue placeholder="Local" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os locais</SelectItem>
                    <SelectItem value="central">Central</SelectItem>
                    <SelectItem value="fabrica">Fábrica</SelectItem>
                    <SelectItem value="ferraz">Ferraz</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="aguardando">Aguardando</SelectItem>
                    <SelectItem value="em_descarga">Em Progresso</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>

                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Buscar lote, origem, NF, WB, GR..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <span className="text-sm font-semibold text-gray-600 ml-auto">
                  {filtered.length} registros
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Card className="shadow-xl border-none">
          <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5">
            <CardTitle className="text-lg md:text-xl font-bold">Tabela Completa — Transferências 2082</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#860063] mx-auto" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum registro encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Data</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Fase</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Local</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Tipo Pallet</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Lote</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Origem</th>
                      <th className="px-2 py-3 text-center font-bold text-gray-700 whitespace-nowrap">Qtd/Carreta<br/>(bags)</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">NF</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">WB</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Início</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Fim</th>
                      <th className="px-2 py-3 text-center font-bold text-gray-700 whitespace-nowrap">Peso Bruto<br/>(kg)</th>
                      <th className="px-2 py-3 text-center font-bold text-gray-700 whitespace-nowrap">Peso Tara<br/>(kg)</th>
                      <th className="px-2 py-3 text-center font-bold text-gray-700 whitespace-nowrap">Peso Líq.<br/>(kg)</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">GR</th>
                      <th className="px-2 py-3 text-center font-bold text-blue-700 whitespace-nowrap bg-blue-50">%Moisture</th>
                      <th className="px-2 py-3 text-center font-bold text-teal-700 whitespace-nowrap bg-teal-50">Umidade<br/>Formação</th>
                      <th className="px-2 py-3 text-center font-bold text-indigo-700 whitespace-nowrap bg-indigo-50">Peso<br/>Padrão (kg)</th>
                      <th className="px-2 py-3 text-center font-bold text-red-700 whitespace-nowrap bg-red-50">Perda<br/>Umidade (%)</th>
                      <th className="px-2 py-3 text-center font-bold text-red-700 whitespace-nowrap bg-red-50">Perda<br/>Peso (kg)</th>
                      <th className="px-2 py-3 text-center font-bold text-amber-700 whitespace-nowrap bg-amber-50">Perda/<br/>Ganho (%)</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Status</th>
                      <th className="px-2 py-3 text-left font-bold text-orange-700 whitespace-nowrap bg-orange-50">Lib. Status</th>
                      <th className="px-2 py-3 text-left font-bold text-orange-700 whitespace-nowrap bg-orange-50">Solicitado por</th>
                      <th className="px-2 py-3 text-left font-bold text-orange-700 whitespace-nowrap bg-orange-50">Liberado por</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Observações</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-500 whitespace-nowrap">Grupo ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t, index) => (
                      <tr
                        key={t.id}
                        className={`border-b border-gray-100 hover:bg-[#860063]/5 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="px-2 py-2 whitespace-nowrap font-semibold">{t.date ? t.date.split('-').reverse().join('/') : '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${t.phase === 'carga' ? 'bg-[#860063]/10 text-[#860063]' : 'bg-[#F88D2A]/10 text-[#F88D2A]'}`}>
                            {t.phase === 'carga' ? 'CARGA' : 'DESCARGA'}
                          </span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap capitalize">{t.location || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{t.pallet_type || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap font-semibold text-purple-700">{t.batch || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{t.origin || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap font-semibold">{t.quantity_per_truck?.toLocaleString('pt-BR') || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{t.invoice_number || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{t.wb_number || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap text-green-600">{t.start_time || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap text-green-600">{t.end_time || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">{t.gross_weight?.toLocaleString('pt-BR') || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap">{t.tare_weight?.toLocaleString('pt-BR') || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap font-semibold text-green-700">{t.net_weight?.toLocaleString('pt-BR') || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap text-purple-700 font-semibold">{t.gr || '-'}</td>
                        <td className="px-2 py-2 text-center whitespace-nowrap bg-blue-50/50 font-semibold text-blue-700">
                         {t.invoice_number && depositMoistureByNF[t.invoice_number] != null ? `${depositMoistureByNF[t.invoice_number]}%` : '-'}
                        </td>
                        <td className="px-2 py-2 text-center whitespace-nowrap bg-teal-50/50 font-semibold text-teal-700">
                          {t.batch && pileMoistureByBatch[t.batch] != null ? `${pileMoistureByBatch[t.batch]}%` : '-'}
                        </td>
                        <td className="px-2 py-2 text-center whitespace-nowrap bg-indigo-50/50 font-semibold text-indigo-700">
                          {t.pallet_type === '1MT' ? (1020 * (t.quantity_per_truck || 0)).toLocaleString('pt-BR') :
                           t.pallet_type === '1.5MT' ? (1500 * (t.quantity_per_truck || 0)).toLocaleString('pt-BR') : '-'}
                        </td>
                        {(() => {
                          const formacaoMoisture = t.batch ? pileMoistureByBatch[t.batch] : null;
                          const cargaMoisture = t.invoice_number ? depositMoistureByNF[t.invoice_number] : null;
                          const pesopadrao = t.pallet_type === '1MT' ? 1020 * (t.quantity_per_truck || 0) :
                                             t.pallet_type === '1.5MT' ? 1500 * (t.quantity_per_truck || 0) : null;
                          const perdaUmidade = (formacaoMoisture != null && cargaMoisture != null)
                            ? (formacaoMoisture - cargaMoisture) : null;
                          const perdaPeso = (pesopadrao != null && t.net_weight != null)
                            ? (pesopadrao - t.net_weight) : null;
                          const percPerdaPeso = (pesopadrao != null && pesopadrao > 0 && perdaPeso != null)
                            ? (perdaPeso / pesopadrao) * 100 : null;
                          const percPerdaUmidade = perdaUmidade;
                          const perdaGanho = (percPerdaPeso != null && percPerdaUmidade != null)
                            ? (percPerdaPeso - percPerdaUmidade) : null;
                          return (
                            <>
                              <td className="px-2 py-2 text-center whitespace-nowrap bg-red-50/50 font-semibold" style={{ color: perdaUmidade == null ? '#9ca3af' : perdaUmidade > 0 ? '#dc2626' : '#16a34a' }}>
                                {perdaUmidade != null ? `${perdaUmidade.toFixed(2)}%` : '-'}
                              </td>
                              <td className="px-2 py-2 text-center whitespace-nowrap bg-red-50/50 font-semibold" style={{ color: perdaPeso == null ? '#9ca3af' : perdaPeso > 0 ? '#dc2626' : '#16a34a' }}>
                                {perdaPeso != null ? perdaPeso.toLocaleString('pt-BR') : '-'}
                              </td>
                              <td className="px-2 py-2 text-center whitespace-nowrap bg-amber-50/50 font-semibold" style={{ color: perdaGanho == null ? '#9ca3af' : perdaGanho > 0 ? '#dc2626' : '#16a34a' }}>
                                {perdaGanho != null ? `${perdaGanho.toFixed(2)}%` : '-'}
                              </td>
                            </>
                          );
                        })()}
                        <td className="px-2 py-2 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[t.status] || 'bg-gray-100 text-gray-700'}`}>
                            {statusLabels[t.status] || t.status}
                          </span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap bg-orange-50/50">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            t.release_status === 'liberado' ? 'bg-green-100 text-green-800' :
                            t.release_status === 'aguardando_liberacao' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {t.release_status === 'liberado' ? 'Liberado' : t.release_status === 'aguardando_liberacao' ? 'Aguardando' : 'Pendente'}
                          </span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap bg-orange-50/50 text-gray-600">{t.release_requested_by?.split('@')[0] || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap bg-orange-50/50 text-gray-600">{t.released_by?.split('@')[0] || '-'}</td>
                        <td className="px-2 py-2 max-w-xs truncate">{t.notes || '-'}</td>
                        <td className="px-2 py-2 whitespace-nowrap text-gray-400 font-mono text-[10px]">{t.transfer_group_id?.slice(-8) || '-'}</td>
                      </tr>
                    ))}
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