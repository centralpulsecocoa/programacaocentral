import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitBranch, Calendar, Search, Shield, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { motion } from "framer-motion";

export default function WorkflowPage() {
  const { data: user = null } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 30000,
  });
  const TODAY = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(TODAY), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(TODAY), 'yyyy-MM-dd'));
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filtros por coluna
  const [columnFilters, setColumnFilters] = useState({
    agendamento: '',
    chamada: '',
    pesoBruto: '',
    inicioDescarga: '',
    fimDescarga: '',
    qualidade: '',
    pesoTara: ''
  });
  
  const [warehouseFilter, setWarehouseFilter] = useState('all');
  const [lineFilter, setLineFilter] = useState('all');

  const { data: schedulings = [], isLoading: loadingSchedulings } = useQuery({
    queryKey: ['workflow-schedulings'],
    queryFn: () => base44.entities.Scheduling.list('-date'),
    initialData: [],
  });

  const { data: qualityRecords = [], isLoading: loadingQuality } = useQuery({
    queryKey: ['workflow-quality'],
    queryFn: () => base44.entities.Quality.list(),
    initialData: [],
  });

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery({
    queryKey: ['workflow-transactions'],
    queryFn: () => base44.entities.TransactionLog.list('-timestamp'),
    initialData: [],
  });

  const workflowData = useMemo(() => {
    const filtered = schedulings.filter(s => {
      if (!s.date || s.date < startDate || s.date > endDate) return false;
      if (searchTerm && !s.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !s.wb_number?.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !s.load_number?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (warehouseFilter !== 'all' && s.warehouse !== warehouseFilter) return false;
      if (lineFilter !== 'all' && s.line !== lineFilter) return false;
      return true;
    });

    // Função para extrair primeiro nome do email
    const getFirstName = (email) => {
      if (!email) return '-';
      const username = email.split('@')[0];
      const firstName = username.split('.')[0];
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    };

    // Função para encontrar quem inseriu um campo específico
    const findFieldAuthor = (entityId, fieldName) => {
      const relevantTransactions = transactions.filter(t => 
        t.entity_id === entityId && 
        t.action === 'update' && 
        t.changed_fields?.includes(fieldName)
      );
      if (relevantTransactions.length > 0) {
        return relevantTransactions[0].user_email;
      }
      return null;
    };

    return filtered.map(s => {
      const quality = qualityRecords.find(q => q.sample === s.load_number);
      
      // Coletar todos os eventos com timestamps
      const events = [];

      // 1. Agendamento (criação do registro)
      if (s.created_date) {
        events.push({
          type: 'Agendamento',
          timestamp: new Date(s.created_date),
          user: getFirstName(s.created_by),
          time: format(new Date(s.created_date), 'HH:mm')
        });
      }

      // 2. Chamada
      if (s.call_time && s.date) {
        const [hours, minutes] = s.call_time.split(':');
        const callDateTime = new Date(s.date + `T${s.call_time}:00`);
        events.push({
          type: 'Chamada',
          timestamp: callDateTime,
          user: getFirstName(s.called_by),
          time: s.call_time
        });
      }

      // 3. Peso Bruto (aproximado pelo horário de início real)
      if (s.gross_weight && s.start_time_actual && s.date) {
        const [hours, minutes] = s.start_time_actual.split(':');
        const grossDateTime = new Date(s.date + `T${s.start_time_actual}:00`);
        const grossWeightAuthor = findFieldAuthor(s.id, 'gross_weight');
        events.push({
          type: 'Peso Bruto',
          timestamp: grossDateTime,
          user: getFirstName(grossWeightAuthor || s.updated_by || s.created_by),
          time: s.start_time_actual
        });
      }

      // 4. Início Descarga
      if (s.start_time_actual && s.date) {
        const [hours, minutes] = s.start_time_actual.split(':');
        const startDateTime = new Date(s.date + `T${s.start_time_actual}:00`);
        const startAuthor = findFieldAuthor(s.id, 'start_time_actual');
        events.push({
          type: 'Início Descarga',
          timestamp: startDateTime,
          user: getFirstName(startAuthor || s.updated_by || s.created_by),
          time: s.start_time_actual
        });
      }

      // 5. Fim Descarga
      if (s.end_time_actual && s.date) {
        const [hours, minutes] = s.end_time_actual.split(':');
        const endDateTime = new Date(s.date + `T${s.end_time_actual}:00`);
        const endAuthor = findFieldAuthor(s.id, 'end_time_actual');
        events.push({
          type: 'Fim Descarga',
          timestamp: endDateTime,
          user: getFirstName(endAuthor || s.updated_by || s.created_by),
          time: s.end_time_actual
        });
      }

      // 6. Qualidade
      if (quality) {
        let qualityTimestamp;
        let qualityTime;
        
        // Usar release_time se disponível, caso contrário usar created_date
        if (quality.release_time && quality.date) {
          qualityTime = quality.release_time;
          qualityTimestamp = new Date(quality.date + `T${quality.release_time}:00`);
        } else if (quality.created_date) {
          qualityTimestamp = new Date(quality.created_date);
          qualityTime = format(qualityTimestamp, 'HH:mm');
        }
        
        if (qualityTimestamp && qualityTime) {
          events.push({
            type: 'Qualidade',
            timestamp: qualityTimestamp,
            user: getFirstName(quality.released_by || quality.created_by),
            time: qualityTime
          });
        }
      }

      // 7. Peso Tara (aproximado pelo horário de fim)
      if (s.tare_weight && s.end_time_actual && s.date) {
        const [hours, minutes] = s.end_time_actual.split(':');
        const tareDateTime = new Date(s.date + `T${s.end_time_actual}:00`);
        const tareWeightAuthor = findFieldAuthor(s.id, 'tare_weight');
        events.push({
          type: 'Peso Tara',
          timestamp: tareDateTime,
          user: getFirstName(tareWeightAuthor || s.updated_by || s.created_by),
          time: s.end_time_actual
        });
      }

      // Ordenar eventos cronologicamente
      events.sort((a, b) => a.timestamp - b.timestamp);

      // Criar objeto com ordem numerada
      // IMPORTANTE: Agendamento sempre é ordem 1 (primeira etapa)
      const workflow = {};
      
      // Primeiro, processar Agendamento se existir
      const agendamentoEvent = events.find(e => e.type === 'Agendamento');
      if (agendamentoEvent) {
        workflow['Agendamento'] = {
          order: 1,
          user: agendamentoEvent.user,
          time: agendamentoEvent.time
        };
      }
      
      // Depois, processar os outros eventos em ordem cronológica
      let currentOrder = 2;
      events.forEach((event) => {
        const key = event.type;
        if (key !== 'Agendamento' && !workflow[key]) {
          workflow[key] = {
            order: currentOrder,
            user: event.user,
            time: event.time
          };
          currentOrder++;
        }
      });

      return {
        id: s.id,
        date: s.date,
        supplier: s.supplier,
        wb_number: s.wb_number,
        load_number: s.load_number,
        warehouse: s.warehouse,
        line: s.line,
        status: s.status,
        workflow
      };
    });
  }, [schedulings, qualityRecords, transactions, startDate, endDate, searchTerm, warehouseFilter, lineFilter]);

  // Aplicar filtros de coluna
  const filteredWorkflowData = useMemo(() => {
    return workflowData.filter(item => {
      // Filtro de agendamento (ordem numérica) - excluir se não tem a etapa
      if (columnFilters.agendamento) {
        if (!item.workflow['Agendamento']) return false;
        const order = item.workflow['Agendamento'].order.toString();
        if (!order.includes(columnFilters.agendamento)) return false;
      }
      
      // Filtro de chamada (ordem numérica) - excluir se não tem a etapa
      if (columnFilters.chamada) {
        if (!item.workflow['Chamada']) return false;
        const order = item.workflow['Chamada'].order.toString();
        if (!order.includes(columnFilters.chamada)) return false;
      }
      
      // Filtro de peso bruto (ordem numérica) - excluir se não tem a etapa
      if (columnFilters.pesoBruto) {
        if (!item.workflow['Peso Bruto']) return false;
        const order = item.workflow['Peso Bruto'].order.toString();
        if (!order.includes(columnFilters.pesoBruto)) return false;
      }
      
      // Filtro de início descarga (ordem numérica) - excluir se não tem a etapa
      if (columnFilters.inicioDescarga) {
        if (!item.workflow['Início Descarga']) return false;
        const order = item.workflow['Início Descarga'].order.toString();
        if (!order.includes(columnFilters.inicioDescarga)) return false;
      }
      
      // Filtro de fim descarga (ordem numérica) - excluir se não tem a etapa
      if (columnFilters.fimDescarga) {
        if (!item.workflow['Fim Descarga']) return false;
        const order = item.workflow['Fim Descarga'].order.toString();
        if (!order.includes(columnFilters.fimDescarga)) return false;
      }
      
      // Filtro de qualidade (ordem numérica) - excluir se não tem a etapa
      if (columnFilters.qualidade) {
        if (!item.workflow['Qualidade']) return false;
        const order = item.workflow['Qualidade'].order.toString();
        if (!order.includes(columnFilters.qualidade)) return false;
      }
      
      // Filtro de peso tara (ordem numérica) - excluir se não tem a etapa
      if (columnFilters.pesoTara) {
        if (!item.workflow['Peso Tara']) return false;
        const order = item.workflow['Peso Tara'].order.toString();
        if (!order.includes(columnFilters.pesoTara)) return false;
      }
      
      return true;
    });
  }, [workflowData, columnFilters]);

  // Calcular estatísticas de fluxo
  const flowStats = useMemo(() => {
    const stats = {
      completo: 0,
      incompleto: 0,
      foraFluxo: 0
    };

    filteredWorkflowData.forEach(item => {
      // Verificar se é transferência ou apanha
      const scheduling = schedulings.find(s => s.id === item.id);
      const isTransferenciaOuApanha = 
        scheduling?.contract === 'TRANSFERÊNCIA' || 
        scheduling?.apanha_status === 'Apanha' ||
        scheduling?.supplier?.toLowerCase().includes('transfer') ||
        scheduling?.supplier?.toLowerCase().includes('filial');

      const etapas = ['Agendamento', 'Chamada', 'Peso Bruto', 'Início Descarga', 'Fim Descarga', 'Qualidade', 'Peso Tara'];
      const etapasPresentes = etapas.filter(e => item.workflow[e]);
      
      // Função para validar ordem, com exceção para transferência/apanha
      const validarOrdem = (ordens) => {
        return ordens.every((ordem, idx) => {
          if (idx === 0) return true;
          
          // Se for transferência/apanha, permitir qualquer ordem entre Qualidade e Peso Tara
          if (isTransferenciaOuApanha) {
            const etapaAtual = etapasPresentes[idx];
            const etapaAnterior = etapasPresentes[idx - 1];
            
            // Qualidade e Peso Tara podem estar em qualquer ordem entre si
            if ((etapaAtual === 'Qualidade' && etapaAnterior === 'Peso Tara') ||
                (etapaAtual === 'Peso Tara' && etapaAnterior === 'Qualidade')) {
              // Verificar se ambas vêm depois de "Fim Descarga"
              const fimDescargaIdx = etapasPresentes.indexOf('Fim Descarga');
              if (fimDescargaIdx !== -1 && idx > fimDescargaIdx) {
                return true; // Ordem OK para transferência/apanha
              }
            }
          }
          
          return ordem > ordens[idx - 1];
        });
      };
      
      // Fluxo completo: tem todas as 7 etapas em ordem sequencial
      if (etapasPresentes.length === 7) {
        const ordens = etapas.map(e => item.workflow[e]?.order).filter(o => o);
        const estaEmOrdem = validarOrdem(ordens);
        if (estaEmOrdem) {
          stats.completo++;
        } else {
          stats.foraFluxo++;
        }
      } 
      // Fluxo incompleto: tem algumas etapas mas não todas
      else if (etapasPresentes.length > 0) {
        const ordens = etapasPresentes.map(e => item.workflow[e]?.order).filter(o => o);
        const estaEmOrdem = validarOrdem(ordens);
        if (estaEmOrdem) {
          stats.incompleto++;
        } else {
          stats.foraFluxo++;
        }
      }
    });

    return stats;
  }, [filteredWorkflowData, schedulings]);

  const isLoading = loadingSchedulings || loadingQuality || loadingTransactions;

  const isAdmin = user?.role === 'admin' || user?.email?.toLowerCase().includes('jjance') || ['jjancem@gmail.com'].includes(user?.email?.toLowerCase());

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <Card className="max-w-md shadow-2xl border-2 border-red-200">
          <CardContent className="p-8 text-center">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Restrito</h1>
            <p className="text-gray-600">Esta página está disponível apenas para administradores autorizados.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-full mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <GitBranch className="w-8 h-8 text-[#860063]" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Workflow de Agendamentos</h1>
              <p className="text-sm text-gray-600">Fluxo cronológico completo de cada operação</p>
            </div>
          </div>

          {/* Cards de Estatísticas de Fluxo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Card className="shadow-lg border-2 border-green-200">
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-semibold mb-1">Fluxo Completo</p>
                <p className="text-3xl font-black text-green-900">{flowStats.completo}</p>
                <p className="text-xs text-gray-500 mt-1">7 etapas em ordem</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-2 border-yellow-200">
              <CardContent className="p-4 text-center">
                <AlertCircle className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-semibold mb-1">Fluxo Incompleto</p>
                <p className="text-3xl font-black text-yellow-900">{flowStats.incompleto}</p>
                <p className="text-xs text-gray-500 mt-1">Etapas parciais em ordem</p>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-2 border-red-200">
              <CardContent className="p-4 text-center">
                <XCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-semibold mb-1">Fora de Fluxo</p>
                <p className="text-3xl font-black text-red-900">{flowStats.foraFluxo}</p>
                <p className="text-xs text-gray-500 mt-1">Etapas fora de ordem</p>
              </CardContent>
            </Card>
          </div>

          <Card className="shadow-lg border-none mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#860063]" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                  />
                  <span className="text-gray-500">até</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>

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

                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Armazém" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos Armazéns</SelectItem>
                    <SelectItem value="central">Central</SelectItem>
                    <SelectItem value="fabrica">Fábrica</SelectItem>
                    <SelectItem value="barra">Barra</SelectItem>
                    <SelectItem value="ferraz">Ferraz</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={lineFilter} onValueChange={setLineFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Linha" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas Linhas</SelectItem>
                    <SelectItem value="01">Linha 01</SelectItem>
                    <SelectItem value="02">Linha 02</SelectItem>
                    <SelectItem value="03">Linha 03</SelectItem>
                    <SelectItem value="04">Linha 04</SelectItem>
                    <SelectItem value="05">Linha 05</SelectItem>
                    <SelectItem value="06">Linha 06</SelectItem>
                  </SelectContent>
                </Select>

                <span className="text-sm font-semibold text-gray-600">
                  {filteredWorkflowData.length} agendamentos
                </span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Card className="shadow-xl border-none">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#860063] mx-auto"></div>
              </div>
            ) : filteredWorkflowData.length === 0 ? (
              <div className="text-center py-12">
                <GitBranch className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Nenhum agendamento encontrado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-3 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Data</th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Fornecedor</th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700 whitespace-nowrap">WB</th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Nº Carga</th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Armazém</th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Linha</th>
                      <th className="px-3 py-2 text-left font-bold text-blue-700 whitespace-nowrap bg-blue-50">
                        <div>1. Agendamento</div>
                        <Input
                          type="text"
                          placeholder="Ordem..."
                          value={columnFilters.agendamento}
                          onChange={(e) => setColumnFilters({...columnFilters, agendamento: e.target.value})}
                          className="mt-1 h-7 text-xs bg-white"
                        />
                      </th>
                      <th className="px-3 py-2 text-left font-bold text-green-700 whitespace-nowrap bg-green-50">
                        <div>2. Chamada</div>
                        <Input
                          type="text"
                          placeholder="Ordem..."
                          value={columnFilters.chamada}
                          onChange={(e) => setColumnFilters({...columnFilters, chamada: e.target.value})}
                          className="mt-1 h-7 text-xs bg-white"
                        />
                      </th>
                      <th className="px-3 py-2 text-left font-bold text-purple-700 whitespace-nowrap bg-purple-50">
                        <div>3. Peso Bruto</div>
                        <Input
                          type="text"
                          placeholder="Ordem..."
                          value={columnFilters.pesoBruto}
                          onChange={(e) => setColumnFilters({...columnFilters, pesoBruto: e.target.value})}
                          className="mt-1 h-7 text-xs bg-white"
                        />
                      </th>
                      <th className="px-3 py-2 text-left font-bold text-orange-700 whitespace-nowrap bg-orange-50">
                        <div>4. Início Descarga</div>
                        <Input
                          type="text"
                          placeholder="Ordem..."
                          value={columnFilters.inicioDescarga}
                          onChange={(e) => setColumnFilters({...columnFilters, inicioDescarga: e.target.value})}
                          className="mt-1 h-7 text-xs bg-white"
                        />
                      </th>
                      <th className="px-3 py-2 text-left font-bold text-red-700 whitespace-nowrap bg-red-50">
                        <div>5. Fim Descarga</div>
                        <Input
                          type="text"
                          placeholder="Ordem..."
                          value={columnFilters.fimDescarga}
                          onChange={(e) => setColumnFilters({...columnFilters, fimDescarga: e.target.value})}
                          className="mt-1 h-7 text-xs bg-white"
                        />
                      </th>
                      <th className="px-3 py-2 text-left font-bold text-indigo-700 whitespace-nowrap bg-indigo-50">
                        <div>6. Qualidade</div>
                        <Input
                          type="text"
                          placeholder="Ordem..."
                          value={columnFilters.qualidade}
                          onChange={(e) => setColumnFilters({...columnFilters, qualidade: e.target.value})}
                          className="mt-1 h-7 text-xs bg-white"
                        />
                      </th>
                      <th className="px-3 py-2 text-left font-bold text-pink-700 whitespace-nowrap bg-pink-50">
                        <div>7. Peso Tara</div>
                        <Input
                          type="text"
                          placeholder="Ordem..."
                          value={columnFilters.pesoTara}
                          onChange={(e) => setColumnFilters({...columnFilters, pesoTara: e.target.value})}
                          className="mt-1 h-7 text-xs bg-white"
                        />
                      </th>
                      <th className="px-3 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredWorkflowData.map((item, index) => (
                      <tr
                        key={item.id}
                        className={`border-b border-gray-100 hover:bg-[#860063]/5 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                        }`}
                      >
                        <td className="px-3 py-2 whitespace-nowrap font-semibold">{format(new Date(item.date), 'dd/MM/yyyy')}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-semibold text-[#860063]">{item.supplier}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{item.wb_number || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-semibold text-[#F88D2A]">{item.load_number || '-'}</td>
                        <td className="px-3 py-2 whitespace-nowrap capitalize">{item.warehouse}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-center">{item.line}</td>
                        
                        {/* Agendamento */}
                        <td className="px-3 py-2 whitespace-nowrap bg-blue-50/30">
                          {item.workflow['Agendamento'] ? (
                            <div>
                              <span className="font-bold text-blue-700">{item.workflow['Agendamento'].order}</span>
                              <span className="text-gray-600"> - {item.workflow['Agendamento'].user}</span>
                              <span className="text-gray-800 font-semibold"> - {item.workflow['Agendamento'].time}</span>
                            </div>
                          ) : '-'}
                        </td>

                        {/* Chamada */}
                        <td className="px-3 py-2 whitespace-nowrap bg-green-50/30">
                          {item.workflow['Chamada'] ? (
                            <div>
                              <span className="font-bold text-green-700">{item.workflow['Chamada'].order}</span>
                              <span className="text-gray-600"> - {item.workflow['Chamada'].user}</span>
                              <span className="text-gray-800 font-semibold"> - {item.workflow['Chamada'].time}</span>
                            </div>
                          ) : '-'}
                        </td>

                        {/* Peso Bruto */}
                        <td className="px-3 py-2 whitespace-nowrap bg-purple-50/30">
                          {item.workflow['Peso Bruto'] ? (
                            <div>
                              <span className="font-bold text-purple-700">{item.workflow['Peso Bruto'].order}</span>
                              <span className="text-gray-600"> - {item.workflow['Peso Bruto'].user}</span>
                              <span className="text-gray-800 font-semibold"> - {item.workflow['Peso Bruto'].time}</span>
                            </div>
                          ) : '-'}
                        </td>

                        {/* Início Descarga */}
                        <td className="px-3 py-2 whitespace-nowrap bg-orange-50/30">
                          {item.workflow['Início Descarga'] ? (
                            <div>
                              <span className="font-bold text-orange-700">{item.workflow['Início Descarga'].order}</span>
                              <span className="text-gray-600"> - {item.workflow['Início Descarga'].user}</span>
                              <span className="text-gray-800 font-semibold"> - {item.workflow['Início Descarga'].time}</span>
                            </div>
                          ) : '-'}
                        </td>

                        {/* Fim Descarga */}
                        <td className="px-3 py-2 whitespace-nowrap bg-red-50/30">
                          {item.workflow['Fim Descarga'] ? (
                            <div>
                              <span className="font-bold text-red-700">{item.workflow['Fim Descarga'].order}</span>
                              <span className="text-gray-600"> - {item.workflow['Fim Descarga'].user}</span>
                              <span className="text-gray-800 font-semibold"> - {item.workflow['Fim Descarga'].time}</span>
                            </div>
                          ) : '-'}
                        </td>

                        {/* Qualidade */}
                        <td className="px-3 py-2 whitespace-nowrap bg-indigo-50/30">
                          {item.workflow['Qualidade'] ? (
                            <div>
                              <span className="font-bold text-indigo-700">{item.workflow['Qualidade'].order}</span>
                              <span className="text-gray-600"> - {item.workflow['Qualidade'].user}</span>
                              <span className="text-gray-800 font-semibold"> - {item.workflow['Qualidade'].time}</span>
                            </div>
                          ) : '-'}
                        </td>

                        {/* Peso Tara */}
                        <td className="px-3 py-2 whitespace-nowrap bg-pink-50/30">
                          {item.workflow['Peso Tara'] ? (
                            <div>
                              <span className="font-bold text-pink-700">{item.workflow['Peso Tara'].order}</span>
                              <span className="text-gray-600"> - {item.workflow['Peso Tara'].user}</span>
                              <span className="text-gray-800 font-semibold"> - {item.workflow['Peso Tara'].time}</span>
                            </div>
                          ) : '-'}
                        </td>

                        {/* Status */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            item.status === 'concluido' ? 'bg-green-100 text-green-800' :
                            item.status === 'em_descarga' ? 'bg-orange-100 text-orange-800' :
                            item.status === 'aguardando' ? 'bg-yellow-100 text-yellow-800' :
                            item.status === 'cancelado' ? 'bg-red-100 text-red-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {item.status}
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
    </div>
  );
}