import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, Search, Droplets, Package, MapPin, CheckCircle, XCircle, User, Clock, Calendar, Filter, AlertTriangle, ThumbsUp, ThumbsDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ApprovalsPage() {
  const [user, setUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("pendente");
  const queryClient = useQueryClient();

  const { data: qualityRecords = [], isLoading } = useQuery({
    queryKey: ['quality-approvals'],
    queryFn: () => base44.entities.Quality.list('-created_date'),
    refetchInterval: 5000,
  });

  const { data: schedulings = [] } = useQuery({
    queryKey: ['schedulings'],
    queryFn: () => base44.entities.Scheduling.list(),
  });

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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Quality.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['quality-alerts'] });
    }
  });

  // Mutação via backend (asServiceRole) para aprovações do gerente - ignora RLS
  const approveViaBackend = async (id, data) => {
    const res = await base44.functions.invoke('approveQualityRecord', { recordId: id, data });
    queryClient.invalidateQueries({ queryKey: ['quality-approvals'] });
    queryClient.invalidateQueries({ queryKey: ['quality-alerts'] });
    return res;
  };

  // Parecer da Qualidade (informativo) — via backend para ignorar RLS
  const handleQualityOpinion = async (record, opinion) => {
    try {
      const now = new Date().toISOString();
      await approveViaBackend(record.id, {
        quality_opinion: opinion,
        quality_opinion_by: user.email,
        quality_opinion_date: now
      });
      toast.success(`Parecer "${opinion === 'favoravel' ? 'Favorável' : 'Desfavorável'}" registrado!`);
    } catch (error) {
      toast.error('Erro ao registrar parecer');
      console.error(error);
    }
  };

  // Aceitar como Filial (sem email - transferência interna)
  const handleAcceptFilial = async (record) => {
    try {
      const now = new Date().toISOString();
      await approveViaBackend(record.id, {
        moisture_approval_status: 'aprovado',
        moisture_approved_by: user.email,
        moisture_approval_date: now,
        justification: 'Filial - Transferência interna, não devolvemos'
      });
      toast.success(`Carga ${record.sample} aceita como Filial (transferência interna).`);
    } catch (error) {
      toast.error('Erro ao aceitar carga como filial');
      console.error(error);
    }
  };

  // Aprovação final (Gerente Originação)
  const handleApprove = async (record) => {
    try {
      const now = new Date().toISOString();
      await approveViaBackend(record.id, {
        moisture_approval_status: 'aprovado',
        moisture_approved_by: user.email,
        moisture_approval_date: now
      });
      
      // Enviar email de notificação
      try {
        await base44.functions.invoke('sendOriginationDecision', {
          sample: record.sample,
          decision: 'aprovado',
          approvedBy: user.email,
          approvalDate: now,
          moisturePercent: record.moisture_percent,
          ffa: record.ffa,
          origin: record.origin
        });
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
      }
      
      toast.success(`Carga ${record.sample} aprovada e emails enviados!`);
    } catch (error) {
      toast.error('Erro ao aprovar carga');
      console.error(error);
    }
  };

  const handleReject = async (record) => {
    try {
      const now = new Date().toISOString();
      await approveViaBackend(record.id, {
        moisture_approval_status: 'devolvido',
        moisture_approved_by: user.email,
        moisture_approval_date: now
      });
      
      // Enviar email de notificação
      try {
        await base44.functions.invoke('sendOriginationDecision', {
          sample: record.sample,
          decision: 'devolvido',
          approvedBy: user.email,
          approvalDate: now,
          moisturePercent: record.moisture_percent,
          ffa: record.ffa,
          origin: record.origin
        });
      } catch (emailError) {
        console.error('Erro ao enviar email:', emailError);
      }
      
      toast.success(`Carga ${record.sample} devolvida e emails enviados!`);
    } catch (error) {
      toast.error('Erro ao devolver carga');
      console.error(error);
    }
  };

  const getSchedulingInfo = (sample) => {
    return schedulings.find(s => s.load_number === sample);
  };

  // Permissões baseadas no perfil
  const isClassificador = user?.profile === 'classificador';
  const canGiveOpinion = user?.profile === 'qualidade';
  const canApprove = user?.profile === 'gerente_originacao' || user?.profile === 'admin';
  const isViewOnly = user?.profile === 'analista_qualidade' || user?.profile === 'supervisor';

  // Filtrar registros com umidade > 12.1%, fumaça > 6.0% ou mofo > 25%
  const alertRecords = qualityRecords.filter(q => {
    const highMoisture = q.moisture_percent != null && q.moisture_percent > 12.1;
    const highSmoke = q.fumaca != null && parseFloat(q.fumaca) > 6.0;
    const highMould = q.mouldy_percent != null && q.mouldy_percent > 25;
    return highMoisture || highSmoke || highMould;
  });

  // Aplicar filtros
  const filteredRecords = alertRecords.filter(record => {
    // Filtro de status
    if (filterStatus === "pendente") {
      if (record.moisture_approval_status && record.moisture_approval_status !== 'pendente') {
        return false;
      }
    } else if (filterStatus !== "all" && record.moisture_approval_status !== filterStatus) {
      return false;
    }

    // Filtro de busca
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const scheduling = getSchedulingInfo(record.sample);
      return (
        record.sample?.toLowerCase().includes(search) ||
        scheduling?.supplier?.toLowerCase().includes(search) ||
        record.released_by?.toLowerCase().includes(search)
      );
    }

    return true;
  });

  const pendingCount = alertRecords.filter(r => !r.moisture_approval_status || r.moisture_approval_status === 'pendente').length;
  const approvedCount = alertRecords.filter(r => r.moisture_approval_status === 'aprovado').length;
  const rejectedCount = alertRecords.filter(r => r.moisture_approval_status === 'devolvido').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-3">
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                <Bell className="w-5 h-5 md:w-6 md:h-6 text-[#860063]" />
                Aprovações de Qualidade
              </h1>
              <p className="text-xs md:text-sm text-gray-600">Umidade {'>'} 12.1% • Fumaça {'>'} 6.0% • Mofo {'>'} 25%</p>
            </div>
          </div>
        </motion.div>

        {/* Stats Cards - Compactos */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card className="shadow-md border border-yellow-400/30">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold mb-0.5">Pendentes</p>
                  <p className="text-2xl font-black text-gray-900">{pendingCount}</p>
                </div>
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl">
                  <Bell className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border border-green-400/30">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold mb-0.5">Aprovados</p>
                  <p className="text-2xl font-black text-gray-900">{approvedCount}</p>
                </div>
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-md border border-red-400/30">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 font-semibold mb-0.5">Devolvidos</p>
                  <p className="text-2xl font-black text-gray-900">{rejectedCount}</p>
                </div>
                <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
                  <XCircle className="w-4 h-4 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters - Compactos */}
        <Card className="shadow-md border-none mb-4">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-[#860063]" />
                <span className="text-sm font-semibold text-gray-900">Filtros:</span>
              </div>

              <Select value={filterStatus || "pendente"} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36 h-8 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pendente">Pendentes</SelectItem>
                  <SelectItem value="aprovado">Aprovados</SelectItem>
                  <SelectItem value="devolvido">Devolvidos</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
                <Input
                  type="text"
                  placeholder="Buscar por sample, fornecedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs"
                />
              </div>

              <Badge variant="outline" className="ml-auto text-xs">
                {filteredRecords.length}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* List - Layout Elegante e Compacto */}
        <Card className="shadow-xl border-none">
          <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5 py-2.5 px-4">
            <CardTitle className="text-sm font-bold">
              Lista de Aprovações
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-[#860063] mx-auto"></div>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-600 mb-1">Nenhum registro encontrado</p>
                <p className="text-xs text-gray-500">Ajuste os filtros</p>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredRecords.map((record, index) => {
                    const scheduling = getSchedulingInfo(record.sample);
                    const isPending = !record.moisture_approval_status || record.moisture_approval_status === 'pendente';
                    const highMoisture = record.moisture_percent != null && record.moisture_percent > 12.1;
                    const highSmoke = record.fumaca != null && parseFloat(record.fumaca) > 6.0;
                    const highMould = record.mouldy_percent != null && record.mouldy_percent > 25;
                    
                    return (
                      <motion.div
                        key={record.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: index * 0.03 }}
                        className={`border rounded-xl p-3 transition-all ${
                          isPending 
                            ? 'border-orange-300 bg-orange-50/30 hover:border-orange-400 hover:shadow-md' 
                            : record.moisture_approval_status === 'aprovado'
                            ? 'border-green-300 bg-green-50/30'
                            : 'border-red-300 bg-red-50/30'
                        }`}
                      >
                        <div className="flex flex-col lg:flex-row gap-3">
                          {/* Alertas - Destaque Compacto */}
                          <div className={`flex flex-col items-center justify-center p-2.5 rounded-lg border min-w-[140px] ${
                            isPending 
                              ? 'border-orange-400 bg-white shadow-sm' 
                              : record.moisture_approval_status === 'aprovado'
                              ? 'border-green-400 bg-white'
                              : 'border-red-400 bg-white'
                          }`}>
                            <div className="flex flex-wrap gap-2 justify-center">
                              {highMoisture && (
                                <div className="text-center">
                                  <Droplets className={`w-4 h-4 mx-auto mb-0.5 ${
                                    isPending ? 'text-orange-600' : record.moisture_approval_status === 'aprovado' ? 'text-green-600' : 'text-red-600'
                                  }`} />
                                  <span className="text-[9px] text-gray-600 block">Umidade</span>
                                  <span className={`text-lg font-black ${
                                    isPending ? 'text-orange-700' : record.moisture_approval_status === 'aprovado' ? 'text-green-700' : 'text-red-700'
                                  }`}>{record.moisture_percent}%</span>
                                </div>
                              )}
                              {highSmoke && (
                                <div className="text-center">
                                  <AlertTriangle className={`w-4 h-4 mx-auto mb-0.5 ${
                                    isPending ? 'text-orange-600' : record.moisture_approval_status === 'aprovado' ? 'text-green-600' : 'text-red-600'
                                  }`} />
                                  <span className="text-[9px] text-gray-600 block">Fumaça</span>
                                  <span className={`text-lg font-black ${
                                    isPending ? 'text-orange-700' : record.moisture_approval_status === 'aprovado' ? 'text-green-700' : 'text-red-700'
                                  }`}>{parseFloat(record.fumaca).toFixed(1)}%</span>
                                </div>
                              )}
                              {highMould && (
                                <div className="text-center">
                                  <AlertTriangle className={`w-4 h-4 mx-auto mb-0.5 ${
                                    isPending ? 'text-red-600' : 'text-red-600'
                                  }`} />
                                  <span className="text-[9px] text-gray-600 block">Mofo</span>
                                  <span className="text-lg font-black text-red-700">{record.mouldy_percent}%</span>
                                </div>
                              )}
                            </div>
                            <Badge className={`mt-1.5 text-[10px] px-2 py-0 ${
                              isPending 
                                ? 'bg-orange-600 text-white' 
                                : record.moisture_approval_status === 'aprovado'
                                ? 'bg-green-600 text-white'
                                : 'bg-red-600 text-white'
                            }`}>
                              {isPending ? 'Pendente' : record.moisture_approval_status === 'aprovado' ? 'Aprovado' : 'Devolvido'}
                            </Badge>
                          </div>

                          {/* Informações - Layout Compacto */}
                          <div className="flex-1 space-y-2">
                            {/* Sample e Data */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs text-gray-600">Sample:</span>
                                <span className="text-sm font-bold text-gray-900">{record.sample}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                                <span className="text-xs text-gray-600">{format(new Date(record.date), 'dd/MM/yyyy')}</span>
                              </div>
                            </div>

                            {scheduling && (
                              <div className="grid md:grid-cols-2 gap-2">
                                <div className="flex items-center gap-1.5 text-xs bg-white rounded-md p-1.5 border border-gray-200">
                                   <Package className="w-3.5 h-3.5 text-[#860063] flex-shrink-0" />
                                   <div className="flex-1 min-w-0">
                                     <span className="text-gray-500 text-[10px]">Fornecedor:</span>
                                     {isClassificador ? (
                                       <p className="font-bold bg-gray-300 text-gray-300 rounded select-none truncate">████████</p>
                                     ) : (
                                       <p className="font-bold text-gray-900 truncate">{scheduling.supplier}</p>
                                     )}
                                   </div>
                                 </div>

                                <div className="flex items-center gap-1.5 text-xs bg-white rounded-md p-1.5 border border-gray-200">
                                  <MapPin className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                  <div>
                                    <span className="text-gray-500 text-[10px]">Local:</span>
                                    <p className="font-bold text-gray-900 capitalize">
                                      {scheduling.warehouse} L{scheduling.line}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 text-xs bg-white rounded-md p-1.5 border border-gray-200">
                                  <Package className="w-3.5 h-3.5 text-orange-600 flex-shrink-0" />
                                  <div>
                                    <span className="text-gray-500 text-[10px]">Quantidade:</span>
                                    <p className="font-bold text-gray-900">
                                      {scheduling.quantity_bags?.toLocaleString('pt-BR')} scs
                                    </p>
                                  </div>
                                </div>

                                {record.released_by && (
                                  <div className="flex items-center gap-1.5 text-xs bg-white rounded-md p-1.5 border border-gray-200">
                                    <User className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-gray-500 text-[10px]">Liberado:</span>
                                      <p className="font-bold text-gray-900 truncate">{record.released_by}</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Parecer da Qualidade e Decisão Final - Compacto lado a lado */}
                            {((record.quality_opinion && record.quality_opinion !== 'pendente') || (!isPending && record.moisture_approved_by)) && (
                              <div className="grid grid-cols-2 gap-1.5">
                                {/* Parecer da Qualidade */}
                                {record.quality_opinion && record.quality_opinion !== 'pendente' ? (
                                  <div className={`flex flex-col text-[10px] rounded px-1.5 py-1 border ${
                                    record.quality_opinion === 'favoravel' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'
                                  }`}>
                                    <div className="flex items-center gap-1">
                                      {record.quality_opinion === 'favoravel' ? (
                                        <ThumbsUp className="w-3 h-3 text-green-600" />
                                      ) : (
                                        <ThumbsDown className="w-3 h-3 text-red-600" />
                                      )}
                                      <span className={`font-bold ${record.quality_opinion === 'favoravel' ? 'text-green-700' : 'text-red-700'}`}>
                                        Qualidade: {record.quality_opinion === 'favoravel' ? 'Favorável' : 'Desfavorável'}
                                      </span>
                                    </div>
                                    <div className="text-[9px] text-gray-500 mt-0.5 truncate">
                                      {record.quality_opinion_by?.split('@')[0]} {record.quality_opinion_date && `• ${format(new Date(record.quality_opinion_date), 'dd/MM HH:mm')}`}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-[10px] bg-gray-50 rounded px-1.5 py-1 border border-gray-200">
                                    <ThumbsUp className="w-3 h-3 text-gray-400" />
                                    <span className="font-bold text-gray-400">Qualidade: --</span>
                                  </div>
                                )}

                                {/* Decisão Final */}
                                {!isPending && record.moisture_approved_by ? (
                                  <div className={`flex flex-col text-[10px] rounded px-1.5 py-1 border ${
                                    record.moisture_approval_status === 'aprovado' ? 'bg-green-100 border-green-400' : 'bg-red-100 border-red-400'
                                  }`}>
                                    <div className="flex items-center gap-1">
                                      {record.moisture_approval_status === 'aprovado' ? (
                                        <CheckCircle className="w-3 h-3 text-green-600" />
                                      ) : (
                                        <XCircle className="w-3 h-3 text-red-600" />
                                      )}
                                      <span className={`font-bold ${record.moisture_approval_status === 'aprovado' ? 'text-green-700' : 'text-red-700'}`}>
                                        Originação: {record.moisture_approval_status === 'aprovado' ? 'Aprovado' : 'Devolvido'}
                                      </span>
                                    </div>
                                    <div className="text-[9px] text-gray-500 mt-0.5 truncate">
                                      {record.moisture_approved_by?.split('@')[0]} {record.moisture_approval_date && `• ${format(new Date(record.moisture_approval_date), 'dd/MM HH:mm')}`}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 text-[10px] bg-gray-50 rounded px-1.5 py-1 border border-gray-200">
                                    <Clock className="w-3 h-3 text-gray-400" />
                                    <span className="font-bold text-gray-400">Originação: --</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Botões de Ação - Ocultos para visualização apenas */}
                          {isPending && !isViewOnly && (
                            <div className="flex lg:flex-col gap-2 lg:min-w-[140px]">
                              {/* Mofo > 25% - Apenas devolução (exceto Filial/Transferência) */}
                              {highMould ? (
                                 <div className="space-y-2 w-full">
                                   <div className="bg-red-100 border border-red-300 rounded p-1.5 text-center">
                                     <p className="text-[10px] text-red-700 font-bold">
                                       ⚠️ Legislação Impede Recebimento
                                     </p>
                                   </div>
                                   {canApprove && (
                                     <>
                                       {scheduling?.contract === 'TRANSFERÊNCIA' && (
                                         <Button
                                           onClick={() => handleAcceptFilial(record)}
                                           disabled={updateMutation.isPending}
                                           className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-8 text-xs"
                                         >
                                           <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                           Aceitar - Filial
                                         </Button>
                                       )}
                                       <Button
                                         onClick={() => handleReject(record)}
                                         disabled={updateMutation.isPending}
                                         className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white h-8 text-xs"
                                       >
                                         <XCircle className="w-3.5 h-3.5 mr-1" />
                                         Devolver
                                       </Button>
                                     </>
                                   )}
                                 </div>
                               ) : (
                                <>
                                  {/* Qualidade - Parecer informativo */}
                                  {canGiveOpinion && (!record.quality_opinion || record.quality_opinion === 'pendente') && (
                                    <div className="space-y-1.5 w-full">
                                      <p className="text-[10px] text-center text-gray-600 font-medium">Seu parecer (informativo):</p>
                                      <Button
                                        onClick={() => handleQualityOpinion(record, 'favoravel')}
                                        disabled={updateMutation.isPending}
                                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white h-7 text-[10px]"
                                      >
                                        <ThumbsUp className="w-3 h-3 mr-1" />
                                        Favorável
                                      </Button>
                                      <Button
                                        onClick={() => handleQualityOpinion(record, 'desfavoravel')}
                                        disabled={updateMutation.isPending}
                                        variant="outline"
                                        className="w-full border-red-300 text-red-600 hover:bg-red-50 h-7 text-[10px]"
                                      >
                                        <ThumbsDown className="w-3 h-3 mr-1" />
                                        Desfavorável
                                      </Button>
                                    </div>
                                  )}

                                  {canGiveOpinion && record.quality_opinion && record.quality_opinion !== 'pendente' && (
                                    <div className="bg-gray-50 border border-gray-200 rounded p-2 text-center w-full">
                                      <p className="text-[10px] text-gray-600">✓ Parecer registrado</p>
                                      <p className="text-[10px] text-gray-500">Aguardando Originação</p>
                                    </div>
                                  )}

                                  {/* Gerente Originação - Decisão final */}
                                  {canApprove && (
                                    <div className="space-y-1.5 w-full">
                                      <p className="text-[10px] text-center text-[#860063] font-bold">Decisão Final:</p>
                                      {scheduling?.contract === 'TRANSFERÊNCIA' && (
                                        <Button
                                          onClick={() => handleAcceptFilial(record)}
                                          disabled={updateMutation.isPending}
                                          className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white h-8 text-xs"
                                        >
                                          <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                          Aceitar - Filial
                                        </Button>
                                      )}
                                      <Button
                                        onClick={() => handleApprove(record)}
                                        disabled={updateMutation.isPending}
                                        className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white h-8 text-xs"
                                      >
                                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                                        Aprovar
                                      </Button>
                                      <Button
                                        onClick={() => handleReject(record)}
                                        disabled={updateMutation.isPending}
                                        variant="outline"
                                        className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 h-8 text-xs"
                                      >
                                        <XCircle className="w-3.5 h-3.5 mr-1" />
                                        Devolver
                                      </Button>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}