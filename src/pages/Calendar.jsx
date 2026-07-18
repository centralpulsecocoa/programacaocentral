import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar as CalendarIcon, Clock, Package, MapPin } from "lucide-react";
import { format, parseISO, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import ScheduleDetails from "../components/calendar/ScheduleDetails";
import OperatorControls from "../components/calendar/OperatorControls";
import WeighbridgeControls from "../components/calendar/WeighbridgeControls";
import FilterBar from "../components/calendar/FilterBar";
import { toast } from "sonner";
import { showOFISuccessToast } from "../components/shared/OFISuccessToast";

const statusColors = {
  agendado: "bg-blue-100 text-blue-800 border-blue-200",
  aguardando: "bg-yellow-100 text-yellow-800 border-yellow-200",
  em_descarga: "bg-orange-100 text-orange-800 border-orange-200",
  concluido: "bg-green-100 text-green-800 border-green-200",
  cancelado: "bg-red-100 text-red-800 border-red-200"
};

const statusLabels = {
  agendado: "Agendado",
  aguardando: "Aguardando",
  em_descarga: "Em Descarga",
  concluido: "Concluído",
  cancelado: "Cancelado"
};

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const { data: user = null } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
    staleTime: 30000,
    refetchOnWindowFocus: true,
  });
  
  // Data atual do sistema como padrão
  const TODAY = new Date();
  const todayStr = format(TODAY, 'yyyy-MM-dd');
  
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [filters, setFilters] = useState({
    warehouse: "all",
    line: "all",
    status: "all"
  });

  const { data: schedulings = [], isLoading } = useQuery({
    queryKey: ['schedulings'],
    queryFn: () => base44.entities.Scheduling.list('-date'),
    placeholderData: [],
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const scheduleId = urlParams.get('id');
    if (scheduleId) {
      const schedule = schedulings.find(s => s.id === scheduleId);
      if (schedule) {
        setSelectedSchedule(schedule);
        setSelectedDate(schedule.date);
      }
    }
  }, [schedulings]);

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const schedule = schedulings.find(s => s.id === id);
      await base44.entities.Scheduling.delete(id);
      try {
        base44.functions.invoke('logTransaction', {
          entity_type: 'Scheduling',
          entity_id: id,
          action: 'delete',
          data_before: schedule,
          data_after: null
        }).catch(() => {});
      } catch {}
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulings'] });
      setSelectedSchedule(null);
      
      // Mostrar toast OFI para supervisores e admins
      if (user?.profile === 'supervisor' || user?.profile === 'admin') {
        showOFISuccessToast(
          '🗑️ Agendamento excluído',
          'O registro foi removido do servidor'
        );
      } else {
        toast.success('Agendamento excluído com sucesso!');
      }
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      await base44.functions.invoke('updateEntityRecord', { entity: 'Scheduling', id, data });
    },
    onSuccess: (_, variables) => {
      setSelectedSchedule(prev =>
        prev?.id === variables.id ? { ...prev, ...variables.data } : prev
      );
      queryClient.invalidateQueries({ queryKey: ['schedulings'] });
    },
    onError: (error) => {
      console.error('Erro ao salvar:', error);
      toast.error('❌ Erro ao salvar', {
        description: error?.message || 'Verifique sua conexão e tente novamente.',
        duration: 5000,
      });
    }
  });

  const handleCallVehicle = (scheduleId) => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    updateMutation.mutate({
      id: scheduleId,
      data: { 
        call_time: currentTime,
        called_by: user?.email
      }
    });
    toast.success('Veículo chamado com sucesso!');
  };

  const filteredSchedulings = schedulings.filter(s => {
    if (filters.warehouse !== "all" && s.warehouse !== filters.warehouse) return false;
    if (filters.line !== "all" && s.line !== filters.line) return false;
    if (filters.status !== "all" && s.status !== filters.status) return false;
    
    return s.date === selectedDate;
  });

  const sortedSchedulings = [...filteredSchedulings].sort((a, b) => {
    if (a.status === 'em_descarga' && b.status !== 'em_descarga') return -1;
    if (a.status !== 'em_descarga' && b.status === 'em_descarga') return 1;
    if (a.status === 'aguardando' && b.status !== 'aguardando' && b.status !== 'em_descarga') return -1;
    if (a.status !== 'aguardando' && a.status !== 'em_descarga' && b.status === 'aguardando') return 1;
    return a.start_time.localeCompare(b.start_time);
  });

  const formatDisplayDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const isReadOnly = user?.profile === 'producao' || user?.profile === 'originacao';
  const isClassificador = user?.profile === 'classificador';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-purple-50/30 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <CalendarIcon className="w-6 h-6 md:w-8 md:h-8 text-[#860063]" />
                Calendário de Agendamentos
              </h1>
              <p className="text-sm md:text-base text-gray-600">Visualize e gerencie os agendamentos por data</p>
            </div>
            
            <div className="flex items-center gap-2 backdrop-blur-xl bg-white/90 p-2 rounded-xl border-2 border-[#860063]/30 shadow-lg">
              <CalendarIcon className="w-5 h-5 text-[#860063]" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-64 border-0 focus:border-0 focus:ring-0 bg-transparent font-semibold"
              />
            </div>
          </div>
        </motion.div>

        <FilterBar filters={filters} setFilters={setFilters} />

        <div className="grid lg:grid-cols-3 gap-4 md:gap-5">
          <div className="lg:col-span-2">
            <Card className="shadow-2xl border-2 border-purple-400/30 backdrop-blur-xl bg-gradient-to-br from-white/90 via-white/85 to-purple-50/30">
              <CardHeader className="border-b border-purple-400/20 bg-gradient-to-r from-[#860063]/10 via-purple-500/10 to-[#F88D2A]/10 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#860063]/5 via-transparent to-[#F88D2A]/5 animate-pulse" />
                
                <div className="flex items-center justify-between relative z-10">
                  <CardTitle className="text-lg md:text-xl font-bold bg-gradient-to-r from-[#860063] to-[#F88D2A] bg-clip-text text-transparent">
                    Agendamentos - {formatDisplayDate(selectedDate)}
                  </CardTitle>
                  <Badge variant="outline" className="bg-white/90 backdrop-blur-sm text-xs md:text-sm border-2 border-purple-400/30 shadow-md">
                    {sortedSchedulings.length} {sortedSchedulings.length === 1 ? 'agendamento' : 'agendamentos'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-5">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#860063] mx-auto"></div>
                  </div>
                ) : sortedSchedulings.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#860063]/20 to-[#F88D2A]/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <CalendarIcon className="w-10 h-10 text-[#860063]" />
                    </div>
                    <p className="text-gray-600 mb-2">Nenhum agendamento para esta data</p>
                    <p className="text-sm text-gray-500">Selecione outra data acima</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {sortedSchedulings.map((schedule, index) => (
                        <motion.div
                          key={schedule.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.02, x: 4, transition: { duration: 0.2 } }}
                          className={`p-3 md:p-4 rounded-2xl border-2 transition-all duration-300 backdrop-blur-md shadow-lg hover:shadow-2xl ${
                            selectedSchedule?.id === schedule.id
                              ? 'border-[#860063]/60 bg-gradient-to-r from-purple-50/90 via-pink-50/80 to-orange-50/70 shadow-[0_0_25px_rgba(134,0,99,0.4)]'
                              : schedule.status === 'em_descarga' 
                              ? 'border-[#F88D2A]/50 bg-gradient-to-r from-orange-50/80 via-white/70 to-white/60 hover:from-orange-50/90 hover:via-white/80 hover:to-white/70 shadow-[0_0_20px_rgba(248,141,42,0.3)]' 
                              : schedule.status === 'aguardando'
                              ? 'border-[#FFD700]/50 bg-gradient-to-r from-yellow-50/80 via-white/70 to-white/60 hover:from-yellow-50/90 hover:via-white/80 hover:to-white/70 shadow-[0_0_20px_rgba(255,215,0,0.3)]'
                              : 'border-gray-200/60 bg-white/70 hover:border-[#860063]/40 hover:bg-white/85 hover:shadow-[0_0_20px_rgba(134,0,99,0.2)]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div 
                              className="flex-1 min-w-0 cursor-pointer"
                              onClick={() => setSelectedSchedule(schedule)}
                            >
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-semibold text-gray-900 truncate">
                                  {isClassificador ? (
                                    <span className="inline-block bg-gray-300 text-gray-300 rounded select-none px-2">Fornecedor oculto</span>
                                  ) : schedule.supplier}
                                </h4>
                                <Badge className={`${statusColors[schedule.status]} border`}>
                                  {statusLabels[schedule.status]}
                                </Badge>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 text-sm mb-2">
                                 <div className="flex items-center gap-2 text-gray-600">
                                   <Clock className="w-4 h-4 text-[#860063]" />
                                   <span>{schedule.start_time} - {schedule.end_time_predicted}</span>
                                 </div>
                                 <div className="flex items-center gap-2 text-gray-600">
                                   <Package className="w-4 h-4 text-[#F88D2A]" />
                                   <span>{schedule.quantity_bags?.toLocaleString('pt-BR')} sacos</span>
                                 </div>
                                 </div>

                              <div className="flex justify-end">
                                <div className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-200">
                                  <MapPin className="w-3 h-3 text-blue-500" />
                                  <span className="capitalize font-medium">{schedule.warehouse} - L{schedule.line}</span>
                                </div>
                              </div>
                            </div>

                            {user?.profile === "operador" && !isReadOnly && schedule.status === "aguardando" && (
                              <div className="flex flex-col items-end gap-1.5">
                                {!schedule.call_time ? (
                                  <Button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCallVehicle(schedule.id);
                                    }}
                                    size="sm"
                                    className="bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-black font-semibold shadow-lg whitespace-nowrap"
                                  >
                                    📢 Chamar Veículo
                                  </Button>
                                ) : (
                                  <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-md border border-green-200">
                                    ✓ Chamado às {schedule.call_time}
                                  </span>
                                )}
                              </div>
                            )}

                            {(user?.profile !== "operador" || isReadOnly) && schedule.call_time && (
                              <div className="flex flex-col items-end gap-1.5">
                                <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-md border border-green-200">
                                  ✓ Chamado às {schedule.call_time}
                                </span>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            {selectedSchedule ? (
              <>
                <ScheduleDetails
                  schedule={selectedSchedule}
                  onClose={() => setSelectedSchedule(null)}
                  userProfile={user?.profile}
                  onDelete={() => deleteMutation.mutate(selectedSchedule.id)}
                  onUpdate={async (data) => { await updateMutation.mutateAsync({ id: selectedSchedule.id, data }); }}
                  isReadOnly={isReadOnly}
                />
                
                {user?.profile === "op_balanca" && !isReadOnly && (
                  <WeighbridgeControls
                    schedule={selectedSchedule}
                    onUpdate={async (data) => {
                      try {
                        await updateMutation.mutateAsync({ id: selectedSchedule.id, data });
                      } catch (error) {
                        console.error('Erro ao atualizar:', error);
                        throw error;
                      }
                    }}
                  />
                )}

                {(user?.profile === "operador" || user?.profile === "supervisor" || user?.profile === "admin") && !isReadOnly && (
                  <OperatorControls
                    schedule={selectedSchedule}
                    onUpdate={async (data) => {
                      await updateMutation.mutateAsync({ id: selectedSchedule.id, data });
                    }}
                    userProfile={user?.profile}
                    allSchedulings={schedulings}
                  />
                )}
              </>
            ) : (
              <Card className="shadow-2xl border-2 border-gray-300/30 backdrop-blur-xl bg-gradient-to-br from-white/90 to-gray-50/30">
                <CardContent className="p-12 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-gray-200/50 to-gray-300/30 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <CalendarIcon className="w-10 h-10 text-gray-400" />
                  </div>
                  <p className="text-gray-500 font-medium">
                    Selecione um agendamento para ver os detalhes
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}