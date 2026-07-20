import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, History, Search, Filter, Calendar, User, FileText, Edit, Trash2, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function TransactionsPage() {
  const { data: user = null } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 30000,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [entityFilter, setEntityFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loadNumberFilter, setLoadNumberFilter] = useState('');
  const [wbNumberFilter, setWbNumberFilter] = useState('');
  const [entityIdFilter, setEntityIdFilter] = useState('');

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.TransactionLog.list('-timestamp'),
    initialData: [],
  });

  const getStatusPriority = (status) => {
    const priorities = {
      'concluido': 1,
      'em_descarga': 2,
      'aguardando': 3,
      'agendado': 4,
      'cancelado': 5
    };
    return priorities[status] || 999;
  };

  const groupedTransactions = () => {
    const filtered = transactions.filter(t => {
      if (searchTerm && !t.entity_id?.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !t.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !t.user_name?.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (entityFilter !== 'all' && t.entity_type !== entityFilter) return false;
      if (actionFilter !== 'all' && t.action !== actionFilter) return false;
      if (startDate && t.timestamp < startDate) return false;
      if (endDate && t.timestamp > endDate + 'T23:59:59') return false;
      
      // Filtro por load_number/sample
      if (loadNumberFilter) {
        const hasLoadNumber = t.data_after?.load_number?.toLowerCase().includes(loadNumberFilter.toLowerCase()) ||
                             t.data_before?.load_number?.toLowerCase().includes(loadNumberFilter.toLowerCase()) ||
                             t.data_after?.sample?.toLowerCase().includes(loadNumberFilter.toLowerCase()) ||
                             t.data_before?.sample?.toLowerCase().includes(loadNumberFilter.toLowerCase());
        if (!hasLoadNumber) return false;
      }
      
      // Filtro por WB
      if (wbNumberFilter) {
        const hasWB = t.data_after?.wb_number?.toLowerCase().includes(wbNumberFilter.toLowerCase()) ||
                     t.data_before?.wb_number?.toLowerCase().includes(wbNumberFilter.toLowerCase());
        if (!hasWB) return false;
      }
      
      // Filtro por entity_id
      if (entityIdFilter && !t.entity_id?.toLowerCase().includes(entityIdFilter.toLowerCase())) {
        return false;
      }
      
      return true;
    });

    // Criar mapeamento de load_numbers/samples para agrupar agendamentos e qualidade
    const loadNumberMap = new Map();
    const wbNumberMap = new Map();
    
    filtered.forEach(t => {
      const loadNumber = t.data_after?.load_number || t.data_before?.load_number;
      const sample = t.data_after?.sample || t.data_before?.sample;
      const wb = t.data_after?.wb_number || t.data_before?.wb_number;
      
      // Agendamentos têm load_number, Qualidade tem sample
      if (loadNumber) {
        if (!loadNumberMap.has(loadNumber)) {
          loadNumberMap.set(loadNumber, []);
        }
        loadNumberMap.get(loadNumber).push(t);
      }
      
      if (sample) {
        if (!loadNumberMap.has(sample)) {
          loadNumberMap.set(sample, []);
        }
        loadNumberMap.get(sample).push(t);
      }
      
      if (wb) {
        if (!wbNumberMap.has(wb)) {
          wbNumberMap.set(wb, []);
        }
        wbNumberMap.get(wb).push(t);
      }
    });

    // Agrupar transações relacionadas
    const grouped = {};
    const processed = new Set();
    
    filtered.forEach(t => {
      if (processed.has(t.id)) return;
      
      const loadNumber = t.data_after?.load_number || t.data_before?.load_number;
      const sample = t.data_after?.sample || t.data_before?.sample;
      const wb = t.data_after?.wb_number || t.data_before?.wb_number;
      
      const groupKey = wb || loadNumber || sample || t.entity_id;
      
      if (!grouped[groupKey]) {
        grouped[groupKey] = [];
      }
      
      // Adicionar transação atual
      grouped[groupKey].push(t);
      processed.add(t.id);
      
      // Adicionar todas as transações relacionadas por load_number/sample
      const relatedByLoad = loadNumberMap.get(loadNumber) || loadNumberMap.get(sample) || [];
      relatedByLoad.forEach(related => {
        if (!processed.has(related.id)) {
          grouped[groupKey].push(related);
          processed.add(related.id);
        }
      });
      
      // Adicionar todas as transações relacionadas por WB
      const relatedByWB = wbNumberMap.get(wb) || [];
      relatedByWB.forEach(related => {
        if (!processed.has(related.id)) {
          grouped[groupKey].push(related);
          processed.add(related.id);
        }
      });
    });

    // Ordenar cada grupo por status (prioridade) e depois por timestamp (mais recentes primeiro)
    const result = [];
    Object.keys(grouped).forEach(groupKey => {
      const group = grouped[groupKey].sort((a, b) => {
        const statusA = a.data_after?.status || a.data_before?.status || '';
        const statusB = b.data_after?.status || b.data_before?.status || '';
        
        // Primeiro por prioridade de status
        const priorityDiff = getStatusPriority(statusA) - getStatusPriority(statusB);
        if (priorityDiff !== 0) return priorityDiff;
        
        // Depois por timestamp (mais recentes primeiro)
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateB - dateA;
      });
      result.push(...group);
    });

    return result;
  };

  const filteredTransactions = (() => {
    const grouped = groupedTransactions();

    // Remover duplicatas: mesma entidade, mesmo minuto, mesmos campos alterados
    const seen = new Map();
    return grouped.filter(t => {
      const minute = t.timestamp.substring(0, 16); // YYYY-MM-DD HH:MM
      const changedFields = t.changed_fields?.sort().join(',') || '';
      const key = `${t.entity_id}-${minute}-${changedFields}`;

      if (seen.has(key)) {
        return false; // Duplicata, ignorar
      }
      seen.set(key, true);
      return true;
    });
  })();

  const getActionIcon = (action) => {
    if (action === 'create') return <Plus className="w-4 h-4 text-green-600" />;
    if (action === 'update') return <Edit className="w-4 h-4 text-blue-600" />;
    if (action === 'delete') return <Trash2 className="w-4 h-4 text-red-600" />;
    return <FileText className="w-4 h-4 text-gray-600" />;
  };

  const getActionLabel = (action) => {
    if (action === 'create') return 'Criação';
    if (action === 'update') return 'Alteração';
    if (action === 'delete') return 'Exclusão';
    return action;
  };

  const getActionColor = (action) => {
    if (action === 'create') return 'bg-green-100 border-green-300 text-green-800';
    if (action === 'update') return 'bg-blue-100 border-blue-300 text-blue-800';
    if (action === 'delete') return 'bg-red-100 border-red-300 text-red-800';
    return 'bg-gray-100 border-gray-300 text-gray-800';
  };

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

  const stats = {
    total: filteredTransactions.length,
    creates: filteredTransactions.filter(t => t.action === 'create').length,
    updates: filteredTransactions.filter(t => t.action === 'update').length,
    deletes: filteredTransactions.filter(t => t.action === 'delete').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <History className="w-8 h-8 text-[#860063]" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Histórico de Transações</h1>
              <p className="text-sm text-gray-600">Auditoria completa de todas as operações do sistema</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="shadow-lg border-2 border-purple-200">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 font-semibold mb-1">Total</p>
              <p className="text-3xl font-black text-purple-900">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-green-200">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 font-semibold mb-1">Criações</p>
              <p className="text-3xl font-black text-green-900">{stats.creates}</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-blue-200">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 font-semibold mb-1">Alterações</p>
              <p className="text-3xl font-black text-blue-900">{stats.updates}</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-red-200">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 font-semibold mb-1">Exclusões</p>
              <p className="text-3xl font-black text-red-900">{stats.deletes}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-lg border-none mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#860063]" />
                <span className="font-semibold text-gray-900">Filtros:</span>
              </div>

              <div className="flex items-center gap-2 flex-1">
                <Search className="w-5 h-5 text-gray-500" />
                <Input
                  placeholder="Buscar por ID, usuário..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 max-w-sm"
                />
              </div>

              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tipo de Entidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Entidades</SelectItem>
                  <SelectItem value="Scheduling">Agendamentos</SelectItem>
                  <SelectItem value="Transfer2082">Transferências 2082</SelectItem>
                  <SelectItem value="Quality">Qualidade</SelectItem>
                  <SelectItem value="Supplier">Fornecedores</SelectItem>
                </SelectContent>
              </Select>

              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Tipo de Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Ações</SelectItem>
                  <SelectItem value="create">Criação</SelectItem>
                  <SelectItem value="update">Alteração</SelectItem>
                  <SelectItem value="delete">Exclusão</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
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

              <Input
                placeholder="Nº Carga / Sample..."
                value={loadNumberFilter}
                onChange={(e) => setLoadNumberFilter(e.target.value)}
                className="w-48"
              />

              <Input
                placeholder="Nº WB..."
                value={wbNumberFilter}
                onChange={(e) => setWbNumberFilter(e.target.value)}
                className="w-40"
              />

              <Input
                placeholder="ID da Transação..."
                value={entityIdFilter}
                onChange={(e) => setEntityIdFilter(e.target.value)}
                className="w-48"
              />
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card className="shadow-lg border-none">
          <CardHeader className="border-b bg-gradient-to-r from-[#860063]/10 to-[#F88D2A]/10">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#860063]" />
              Registro de Transações ({filteredTransactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="text-center py-12 text-gray-500">Carregando transações...</div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-12">
                <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Nenhuma transação encontrada</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr className="border-b-2 border-gray-200">
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Data/Hora</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Ação</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Tipo</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">WB</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Nº Carga</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">ID Registro</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Usuário</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Resumo da Operação</th>
                      <th className="px-2 py-3 text-left font-bold text-gray-700 whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction, index) => {
                      // Verificar se é o primeiro registro de um novo grupo (entity_id diferente do anterior)
                      const isFirstInGroup = index === 0 || filteredTransactions[index - 1].entity_id !== transaction.entity_id;
                      const isLastInGroup = index === filteredTransactions.length - 1 || filteredTransactions[index + 1].entity_id !== transaction.entity_id;
                      // Gerar resumo detalhado e específico
                      let resumo = '-';

                      if (transaction.action === 'create') {
                        resumo = `Criação - ${transaction.entity_type === 'Scheduling' ? 'agendamento' : 
                                  transaction.entity_type === 'Quality' ? 'registro qualidade' : 
                                  transaction.entity_type === 'Transfer2082' ? 'transferência' : 'registro'}`;
                        if (transaction.data_after?.date) resumo += ` (${transaction.data_after.date})`;
                        if (transaction.data_after?.start_time) resumo += ` às ${transaction.data_after.start_time}`;
                      } else if (transaction.action === 'update' && transaction.changed_fields?.length > 0) {
                        const fields = transaction.changed_fields;
                        const detalhes = [];

                        // Detectar alterações específicas e mostrar a ação com mais detalhes
                        if (fields.includes('status')) {
                          const newStatus = transaction.data_after?.status;
                          const oldStatus = transaction.data_before?.status;
                          detalhes.push(`Status: ${oldStatus || '?'} → ${newStatus}`);
                        }

                        if (fields.includes('start_time_actual')) {
                          detalhes.push(`Início: ${transaction.data_after?.start_time_actual}`);
                        }

                        if (fields.includes('end_time_actual')) {
                          detalhes.push(`Fim: ${transaction.data_after?.end_time_actual}`);
                        }

                        if (fields.includes('arrival_time')) {
                          detalhes.push(`Chegada: ${transaction.data_after?.arrival_time}`);
                        }

                        if (fields.includes('call_time')) {
                          detalhes.push(`Chamado: ${transaction.data_after?.call_time}`);
                        }

                        if (fields.includes('gross_weight')) {
                          detalhes.push(`P.Bruto: ${transaction.data_after?.gross_weight}kg`);
                        }

                        if (fields.includes('tare_weight')) {
                          detalhes.push(`P.Tara: ${transaction.data_after?.tare_weight}kg`);
                        }

                        if (fields.includes('batch')) {
                          detalhes.push(`Lote: ${transaction.data_after?.batch}`);
                        }

                        if (fields.includes('gr')) {
                          detalhes.push(`GR: ${transaction.data_after?.gr}`);
                        }

                        if (fields.includes('moisture_percent')) {
                          detalhes.push(`Umidade: ${transaction.data_after?.moisture_percent}%`);
                        }

                        if (fields.includes('ffa')) {
                          detalhes.push(`FFA: ${transaction.data_after?.ffa}`);
                        }

                        if (fields.includes('release_status')) {
                          const newRelease = transaction.data_after?.release_status;
                          detalhes.push(`Liberação: ${newRelease}`);
                        }

                        if (fields.includes('actual_bags')) {
                          detalhes.push(`Sacos: ${transaction.data_after?.actual_bags}`);
                        }

                        if (fields.includes('notes')) {
                          const notes = transaction.data_after?.notes;
                          if (notes) detalhes.push(`Obs: ${notes.substring(0, 20)}...`);
                        }

                        // Se temos detalhes específicos, usar eles
                        if (detalhes.length > 0) {
                          resumo = detalhes.join(' | ');
                        } else {
                          // Fallback: mostrar campos alterados
                          resumo = `Alteração: ${fields.slice(0, 3).join(', ')}`;
                          if (fields.length > 3) resumo += ` +${fields.length - 3}`;
                        }
                      } else if (transaction.action === 'delete') {
                        resumo = 'Exclusão de registro';
                      }

                      return (
                        <tr 
                          key={transaction.id} 
                          className={`hover:bg-[#860063]/5 transition-colors ${
                            isFirstInGroup ? 'border-t-4 border-[#860063]' : 'border-t border-gray-200'
                          } ${isLastInGroup ? 'border-b-4 border-[#860063]' : 'border-b border-gray-100'} ${
                            index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="px-2 py-2 whitespace-nowrap">
                            {transaction.timestamp ? format(new Date(transaction.timestamp), "dd/MM/yy HH:mm", { locale: ptBR }) : '-'}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded ${getActionColor(transaction.action)}`}>
                              {getActionLabel(transaction.action)}
                            </span>
                          </td>
                          <td className="px-2 py-2 font-semibold text-[#860063] whitespace-nowrap">{transaction.entity_type}</td>
                          <td className="px-2 py-2 whitespace-nowrap font-semibold text-[#F88D2A]">
                            {transaction.data_after?.wb_number || transaction.data_before?.wb_number || '-'}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap font-semibold text-[#F88D2A]">
                            {transaction.data_after?.load_number || transaction.data_before?.load_number || '-'}
                          </td>
                          <td className="px-2 py-2 text-gray-600 font-mono text-[10px] cursor-pointer hover:text-[#F88D2A] hover:underline" 
                              title={`Clique para filtrar por: ${transaction.entity_id}`}
                              onClick={() => setEntityIdFilter(transaction.entity_id)}>
                            {transaction.entity_id}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">{transaction.user_name}</td>
                          <td className="px-2 py-2 max-w-md">
                            <div className="truncate">
                              {resumo}
                            </div>
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap">
                            {transaction.data_after?.status || transaction.data_before?.status ? (
                              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                (transaction.data_after?.status || transaction.data_before?.status) === 'concluido' ? 'bg-green-100 text-green-800' :
                                (transaction.data_after?.status || transaction.data_before?.status) === 'em_descarga' ? 'bg-orange-100 text-orange-800' :
                                (transaction.data_after?.status || transaction.data_before?.status) === 'aguardando' ? 'bg-yellow-100 text-yellow-800' :
                                (transaction.data_after?.status || transaction.data_before?.status) === 'cancelado' ? 'bg-red-100 text-red-800' :
                                'bg-blue-100 text-blue-800'
                              }`}>
                                {transaction.data_after?.status || transaction.data_before?.status}
                              </span>
                            ) : '-'}
                          </td>
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