import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, ChevronDown, ChevronUp, Droplets, Package, MapPin, CheckCircle, XCircle, User, Clock, Bell } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";

export default function MoistureAlertPopup({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  
  const [hasNewAlert, setHasNewAlert] = useState(false);
  const queryClient = useQueryClient();

  // Verificar se o usuário tem permissão para ver alertas
  const canViewAlerts = user?.profile === 'gerente_originacao' || user?.profile === 'admin' || user?.profile === 'qualidade';
  // Qualidade pode dar parecer (informativo)
  const canGiveOpinion = user?.profile === 'qualidade';
  // Apenas Gerente Originação/Admin pode aprovar/devolver (decisão final)
  const canApprove = user?.profile === 'gerente_originacao' || user?.role === 'admin';

  const { data: qualityRecords = [] } = useQuery({
    queryKey: ['quality-alerts'],
    queryFn: () => base44.entities.Quality.list('-created_date'),
    initialData: [],
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
    enabled: canViewAlerts,
  });

  const { data: schedulings = [] } = useQuery({
    queryKey: ['schedulings'],
    queryFn: () => base44.entities.Scheduling.list(),
    initialData: [],
    enabled: canViewAlerts,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Quality.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quality-alerts'] });
    }
  });

  // Aprovação via backend (asServiceRole) para ignorar RLS
  const approveViaBackend = async (id, data) => {
    await base44.functions.invoke('approveQualityRecord', { recordId: id, data });
    queryClient.invalidateQueries({ queryKey: ['quality-alerts'] });
    queryClient.invalidateQueries({ queryKey: ['quality-approvals'] });
  };

  // Filtrar registros com umidade > 12.1%, fumaça > 6.0% ou mofo > 25%
  // Alertas ficam pendentes até que o usuário clique (qualidade dá parecer, originação aprova/devolve)
  const alertRecords = qualityRecords.filter(q => {
    const highMoisture = q.moisture_percent != null && q.moisture_percent > 12.1;
    const highSmoke = q.fumaca != null && parseFloat(q.fumaca) > 6.0;
    const highMould = q.mouldy_percent != null && q.mouldy_percent > 25;
    
    const hasAlert = highMoisture || highSmoke || highMould;
    if (!hasAlert) return false;
    
    // Para Qualidade: mostrar até dar parecer
    if (canGiveOpinion) {
      const needsOpinion = !q.quality_opinion || q.quality_opinion === 'pendente';
      return needsOpinion;
    }
    
    // Para Gerente Originação/Admin: mostrar até aprovar/devolver
    if (canApprove) {
      const needsApproval = !q.moisture_approval_status || q.moisture_approval_status === 'pendente';
      return needsApproval;
    }
    
    // Para outros perfis (visualização): mostrar pendentes de aprovação
    const isPending = !q.moisture_approval_status || q.moisture_approval_status === 'pendente';
    return isPending;
  });

  // Auto-open se houver alertas
  useEffect(() => {
    if (alertRecords.length > 0 && !isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
    }
  }, [alertRecords.length, isOpen]);

  // Detectar novo alerta e enviar email (apenas 1 vez por registro)
  useEffect(() => {
    // Verificar se há alertas que ainda não tiveram email enviado
    const alertsWithoutEmail = alertRecords.filter(r => !r.alert_email_sent);
    
    if (alertsWithoutEmail.length > 0) {
      setHasNewAlert(true);
      // Vibrar se suportado
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 200]);
      }
      
      // Enviar email apenas para alertas que ainda não foram notificados
      alertsWithoutEmail.forEach(async (record) => {
        const scheduling = getSchedulingInfo(record.sample);
        try {
          await base44.functions.invoke('sendQualityAlert', {
            recordId: record.id,
            sample: record.sample,
            moisture: record.moisture_percent,
            fumaca: record.fumaca,
            mould: record.mouldy_percent,
            supplier: scheduling?.supplier,
            warehouse: scheduling?.warehouse,
            line: scheduling?.line,
            quantity: scheduling?.quantity_bags
          });
          // Marcar que o email foi enviado
          await base44.entities.Quality.update(record.id, { alert_email_sent: true });
        } catch (error) {
          console.error('Erro ao enviar email de alerta:', error);
        }
      });
      
      // Resetar após 5 segundos
      setTimeout(() => setHasNewAlert(false), 5000);
    }
  }, [alertRecords, schedulings]);

  // Parecer da Qualidade (informativo) — via backend para ignorar RLS
  const handleQualityOpinion = async (record, opinion) => {
    try {
      const now = new Date().toISOString();
      await base44.functions.invoke('approveQualityRecord', {
        recordId: record.id,
        data: {
          quality_opinion: opinion,
          quality_opinion_by: user.email,
          quality_opinion_date: now
        }
      });
      queryClient.invalidateQueries({ queryKey: ['quality-alerts'] });
      toast.success(`Parecer "${opinion === 'favoravel' ? 'Favorável' : 'Desfavorável'}" registrado!`);
    } catch (error) {
      toast.error('Erro ao registrar parecer');
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
      toast.success(`Carga ${record.sample} aprovada!`);
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
      toast.success(`Carga ${record.sample} devolvida!`);
    } catch (error) {
      toast.error('Erro ao devolver carga');
      console.error(error);
    }
  };

  // Buscar informações do scheduling relacionado
  const getSchedulingInfo = (sample) => {
    return schedulings.find(s => s.load_number === sample);
  };

  if (!canViewAlerts) {
    return null;
  }

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 z-50 p-2.5 rounded-full shadow-2xl transition-all ${
          hasNewAlert 
            ? 'bg-gradient-to-r from-red-600 to-red-700 animate-pulse' 
            : 'bg-gradient-to-r from-orange-500 to-red-600'
        }`}
      >
        <div className="relative">
          <Bell className="w-5 h-5 text-white" />
          {alertRecords.length > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1.5 -right-1.5 bg-white text-red-600 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center"
            >
              {alertRecords.length}
            </motion.span>
          )}
        </div>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      className="fixed bottom-4 right-4 z-50 w-[320px] max-h-[70vh] flex flex-col"
    >
      <Card className={`shadow-2xl border-2 backdrop-blur-xl overflow-hidden ${
        hasNewAlert 
          ? 'border-red-600 bg-red-50/95 animate-pulse' 
          : 'border-orange-500 bg-white/95'
      }`}>
        <CardHeader className={`border-b p-2 ${
          hasNewAlert
            ? 'bg-gradient-to-r from-red-600 to-red-700'
            : 'bg-gradient-to-r from-orange-500 to-red-600'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <motion.div
                animate={{ rotate: hasNewAlert ? [0, -15, 15, -15, 15, 0] : 0 }}
                transition={{ repeat: hasNewAlert ? Infinity : 0, duration: 0.8 }}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-white" />
              </motion.div>
              <CardTitle className="text-xs font-bold text-white">
                {hasNewAlert ? '🚨 ALERTA!' : 'Qualidade'}
              </CardTitle>
              <Badge className="bg-white text-red-600 border-white text-[10px] px-1">
                {alertRecords.length}
              </Badge>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-5 w-5 hover:bg-red-600/20"
              >
                {isMinimized ? (
                  <ChevronUp className="w-3 h-3 text-white" />
                ) : (
                  <ChevronDown className="w-3 h-3 text-white" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-5 w-5 hover:bg-red-600/20"
              >
                <X className="w-3 h-3 text-white" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <AnimatePresence>
          {!isMinimized && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="p-2 max-h-[calc(70vh-2.5rem)] overflow-y-auto">
                {alertRecords.length === 0 ? (
                  <div className="text-center py-4">
                    <Droplets className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
                    <p className="text-[10px] text-gray-500">Nenhum alerta</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">Umidade {'>'} 12.1% • Fumaça {'>'} 6.0% • Mofo {'>'} 25%</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {hasNewAlert && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="bg-gradient-to-r from-red-600 to-red-700 text-white rounded-md p-1.5 shadow-lg"
                      >
                        <p className="text-[10px] font-bold text-center">
                          🚨 Alerta de qualidade!
                        </p>
                      </motion.div>
                    )}

                    <div className="bg-orange-50 border border-orange-200 rounded-md p-1">
                      <p className="text-[9px] text-orange-700 text-center font-medium">
                        ⚠️ Umidade {'>'} 12.1% • Fumaça {'>'} 6.0% • Mofo {'>'} 25%
                      </p>
                    </div>
                    
                    {alertRecords.map((record, index) => {
                      const scheduling = getSchedulingInfo(record.sample);
                      const highMoisture = record.moisture_percent != null && record.moisture_percent > 12.1;
                      const highSmoke = record.fumaca != null && parseFloat(record.fumaca) > 6.0;
                      const highMould = record.mouldy_percent != null && record.mouldy_percent > 25;
                      
                      return (
                        <motion.div
                          key={record.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20 }}
                          transition={{ delay: index * 0.1 }}
                          className={`rounded-md border transition-colors ${
                            hasNewAlert && index === 0
                              ? 'border-red-600 bg-red-50 shadow-md'
                              : 'border-orange-300 bg-orange-50/50'
                          }`}
                        >
                          {/* Alertas - DESTAQUE COMPACTO */}
                          <div className={`p-1.5 border-b ${
                            hasNewAlert && index === 0 ? 'border-red-300' : 'border-orange-300'
                          }`}>
                            <div className="flex flex-wrap gap-1 justify-center">
                              {highMoisture && (
                                <div className="flex-1 min-w-[90px] text-center">
                                  <div className="flex items-center justify-center gap-1 mb-0.5">
                                    <Droplets className={`w-3 h-3 ${
                                      hasNewAlert && index === 0 ? 'text-red-600' : 'text-orange-600'
                                    }`} />
                                    <span className="text-[9px] font-medium text-gray-600 uppercase">
                                      UMIDADE
                                    </span>
                                  </div>
                                  <div className={`text-xl font-black ${
                                    hasNewAlert && index === 0 ? 'text-red-700' : 'text-orange-700'
                                  }`}>
                                    {record.moisture_percent}%
                                  </div>
                                  <Badge className={`text-[8px] px-1 py-0 ${
                                    hasNewAlert && index === 0 
                                      ? 'bg-red-600 text-white' 
                                      : 'bg-orange-600 text-white'
                                  }`}>
                                    {'>'} 12.1%
                                  </Badge>
                                </div>
                              )}
                              {highSmoke && (
                                <div className="flex-1 min-w-[90px] text-center">
                                  <div className="flex items-center justify-center gap-1 mb-0.5">
                                    <AlertTriangle className={`w-3 h-3 ${
                                      hasNewAlert && index === 0 ? 'text-red-600' : 'text-orange-600'
                                    }`} />
                                    <span className="text-[9px] font-medium text-gray-600 uppercase">
                                      FUMAÇA
                                    </span>
                                  </div>
                                  <div className={`text-xl font-black ${
                                    hasNewAlert && index === 0 ? 'text-red-700' : 'text-orange-700'
                                  }`}>
                                    {parseFloat(record.fumaca).toFixed(1)}%
                                  </div>
                                  <Badge className={`text-[8px] px-1 py-0 ${
                                    hasNewAlert && index === 0 
                                      ? 'bg-red-600 text-white' 
                                      : 'bg-orange-600 text-white'
                                  }`}>
                                    {'>'} 6.0%
                                  </Badge>
                                </div>
                              )}
                              {highMould && (
                                <div className="flex-1 min-w-[90px] text-center">
                                  <div className="flex items-center justify-center gap-1 mb-0.5">
                                    <AlertTriangle className={`w-3 h-3 ${
                                      hasNewAlert && index === 0 ? 'text-red-600' : 'text-orange-600'
                                    }`} />
                                    <span className="text-[9px] font-medium text-gray-600 uppercase">
                                      MOFO
                                    </span>
                                  </div>
                                  <div className={`text-xl font-black ${
                                    hasNewAlert && index === 0 ? 'text-red-700' : 'text-orange-700'
                                  }`}>
                                    {record.mouldy_percent}%
                                  </div>
                                  <Badge className={`text-[8px] px-1 py-0 ${
                                    hasNewAlert && index === 0 
                                      ? 'bg-red-600 text-white' 
                                      : 'bg-orange-600 text-white'
                                  }`}>
                                    {'>'} 25%
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Informações Compactas */}
                          <div className="p-1.5 space-y-1">
                            {/* Sample e Data */}
                            <div className="bg-white rounded p-1 border border-orange-200">
                              <div className="flex items-center justify-between text-[9px]">
                                <div>
                                  <span className="text-gray-500">Sample:</span>
                                  <span className="font-bold text-gray-900 ml-0.5">{record.sample}</span>
                                </div>
                                <div>
                                  <span className="text-gray-500">Data:</span>
                                  <span className="font-bold text-gray-900 ml-0.5">
                                    {format(new Date(record.date), 'dd/MM')}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {scheduling && (
                              <>
                                {/* Fornecedor - Oculto para analista_qualidade */}
                                {user?.profile !== 'analista_qualidade' && (
                                  <div className="bg-white rounded p-1 border border-orange-200">
                                    <div className="flex items-center gap-1 text-[9px]">
                                      <Package className="w-2.5 h-2.5 text-orange-600 flex-shrink-0" />
                                      <div className="flex-1 min-w-0 truncate">
                                        <span className="font-bold text-gray-900">{scheduling.supplier}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Armazém e Quantidade */}
                                <div className="bg-white rounded p-1 border border-orange-200">
                                  <div className="flex items-center justify-between gap-1.5 text-[9px]">
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-2.5 h-2.5 text-blue-600 flex-shrink-0" />
                                      <span className="font-bold text-gray-900 capitalize">
                                        {scheduling.warehouse} L{scheduling.line}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Package className="w-2.5 h-2.5 text-orange-600 flex-shrink-0" />
                                      <span className="font-bold text-gray-900">
                                        {scheduling.quantity_bags?.toLocaleString('pt-BR')} scs
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}

                            {/* Info adicional */}
                            {(record.released_by || record.release_time) && (
                              <div className="flex gap-1">
                                {record.released_by && (
                                  <div className="flex-1 flex items-center gap-0.5 text-[9px] text-gray-600 bg-blue-50 border border-blue-200 rounded px-1 py-0.5">
                                    <User className="w-2.5 h-2.5 text-blue-600 flex-shrink-0" />
                                    <span className="truncate">{record.released_by}</span>
                                  </div>
                                )}
                                {record.release_time && (
                                  <div className="flex items-center gap-0.5 text-[9px] text-gray-600 bg-gray-50 border border-gray-200 rounded px-1 py-0.5">
                                    <Clock className="w-2.5 h-2.5 text-gray-600" />
                                    <span>{record.release_time}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Parecer da Qualidade (informativo) */}
                            {record.quality_opinion && record.quality_opinion !== 'pendente' && (
                              <div className={`rounded p-1 text-center border ${
                                record.quality_opinion === 'favoravel' 
                                  ? 'bg-green-50 border-green-300' 
                                  : 'bg-red-50 border-red-300'
                              }`}>
                                <p className={`text-[9px] font-bold ${
                                  record.quality_opinion === 'favoravel' ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  📋 Qualidade: {record.quality_opinion === 'favoravel' ? 'Favorável' : 'Desfavorável'}
                                </p>
                                {record.quality_opinion_by && (
                                  <p className="text-[8px] text-gray-500">{record.quality_opinion_by}</p>
                                )}
                              </div>
                            )}

                            {/* Botões de Ação */}
                            {canGiveOpinion ? (
                              (!record.quality_opinion || record.quality_opinion === 'pendente') ? (
                                <div className="space-y-1 pt-0.5">
                                  <p className="text-[9px] text-center text-gray-600 font-medium">Parecer da Qualidade:</p>
                                  <div className="flex gap-1">
                                    <Button
                                      onClick={() => handleQualityOpinion(record, 'favoravel')}
                                      disabled={updateMutation.isPending}
                                      size="sm"
                                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white h-6 text-[9px] px-2"
                                    >
                                      <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                                      Favorável
                                    </Button>
                                    <Button
                                      onClick={() => handleQualityOpinion(record, 'desfavoravel')}
                                      disabled={updateMutation.isPending}
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 h-6 text-[9px] px-2"
                                    >
                                      <XCircle className="w-2.5 h-2.5 mr-0.5" />
                                      Desfavorável
                                    </Button>
                                  </div>
                                  <p className="text-[8px] text-center text-gray-400">Parecer informativo - decisão final é da Originação</p>
                                </div>
                              ) : (
                                <div className="bg-gray-50 border border-gray-200 rounded p-1 text-center">
                                  <p className="text-[9px] text-gray-600">
                                    ✓ Parecer já registrado
                                  </p>
                                </div>
                              )
                            ) : canApprove ? (
                              highMould ? (
                                <div className="space-y-1 pt-0.5">
                                  <div className="bg-red-100 border border-red-300 rounded p-1 text-center">
                                    <p className="text-[9px] text-red-700 font-bold">
                                      ⚠️ Legislação Impede o Recebimento
                                    </p>
                                  </div>
                                  <Button
                                    onClick={() => handleReject(record)}
                                    disabled={updateMutation.isPending}
                                    size="sm"
                                    className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white h-6 text-[9px] px-2"
                                  >
                                    <XCircle className="w-2.5 h-2.5 mr-0.5" />
                                    Devolver Carga
                                  </Button>
                                </div>
                              ) : (
                                <div className="space-y-1 pt-0.5">
                                  <p className="text-[9px] text-center text-[#860063] font-bold">Decisão Final (Originação):</p>
                                  <div className="flex gap-1">
                                    <Button
                                      onClick={() => handleApprove(record)}
                                      disabled={updateMutation.isPending}
                                      size="sm"
                                      className="flex-1 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white h-6 text-[9px] px-2"
                                    >
                                      <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                                      Aprovar
                                    </Button>
                                    <Button
                                      onClick={() => handleReject(record)}
                                      disabled={updateMutation.isPending}
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 h-6 text-[9px] px-2"
                                    >
                                      <XCircle className="w-2.5 h-2.5 mr-0.5" />
                                      Devolver
                                    </Button>
                                  </div>
                                </div>
                              )
                            ) : (
                              <div className="bg-blue-50 border border-blue-200 rounded p-1 text-center">
                                <p className="text-[9px] text-blue-700 font-medium">
                                  👁️ Aguardando decisão
                                </p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Indicador de atualização */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-1 text-center"
      >
        <span className="text-[9px] text-gray-500 bg-white/90 px-1.5 py-0.5 rounded-full shadow-md">
          🔄 Auto 30s
        </span>
      </motion.div>
    </motion.div>
  );
}