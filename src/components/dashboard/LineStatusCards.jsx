import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Package, Building2, TrendingUp, Calendar, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function LineStatusCards({ schedulings, isDarkTheme = false, selectedDate, isToday = true }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [user, setUser] = useState(null);
  const [showEnableDialog, setShowEnableDialog] = useState(false);
  const [selectedLineConfig, setSelectedLineConfig] = useState(null);
  const queryClient = useQueryClient();

  const { data: lineConfigs = [] } = useQuery({
    queryKey: ['lineconfigs'],
    queryFn: () => base44.entities.AppConfig.filter({ config_type: 'line' }),
    placeholderData: [],
  });

  const { data: warehouseConfigs = [] } = useQuery({
    queryKey: ['warehouseconfigs'],
    queryFn: () => base44.entities.AppConfig.filter({ config_type: 'warehouse' }),
    placeholderData: [],
  });

  // Atualizar o tempo a cada minuto
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Atualiza a cada 60 segundos

    return () => clearInterval(interval);
  }, []);

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

  const updateLineConfigMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.AppConfig.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lineconfigs'] });
      setShowEnableDialog(false);
      toast.success('Linha habilitada com sucesso!');
    }
  });

  const lineHasCrew = (warehouse, lineNumber) => {
    const lineConfig = lineConfigs.find(
      l => l.warehouse_ref === warehouse && l.name === lineNumber
    );
    // Considerar tanto has_crew quanto enabled
    return lineConfig?.has_crew !== false && lineConfig?.enabled !== false;
  };

  const handleLineCardClick = (warehouse, lineNumber) => {
    const isSupervisor = user?.profile === 'supervisor' || user?.profile === 'admin';
    const hasCrew = lineHasCrew(warehouse, lineNumber);

    // Se não tem terno e é supervisor, mostrar opção de habilitar
    if (!hasCrew && isSupervisor) {
      const lineConfig = lineConfigs.find(
        l => l.warehouse_ref === warehouse && l.name === lineNumber
      );
      setSelectedLineConfig(lineConfig);
      setShowEnableDialog(true);
    }
  };

  const handleEnableLine = () => {
    if (selectedLineConfig) {
      updateLineConfigMutation.mutate({
        id: selectedLineConfig.id,
        data: { has_crew: true, enabled: true } // Ensure both are set to true when enabling
      });
    }
  };

  // Use selectedDate if provided, otherwise use today
  const dateStr = selectedDate || format(new Date(), 'yyyy-MM-dd');
  const currentTimeStr = format(currentTime, 'HH:mm');

  // Filtrar apenas linhas ativas (enabled !== false) e de warehouses ativos
  const allLines = [
    { warehouse: "central", line: "01" },
    { warehouse: "central", line: "02" },
    { warehouse: "central", line: "03" },
    { warehouse: "central", line: "04" },
    { warehouse: "fabrica", line: "01" },
    { warehouse: "barra", line: "01" },
    { warehouse: "ferraz", line: "01" }
  ];

  const lines = allLines.filter(({ warehouse, line }) => {
    // Verificar se o warehouse está ativo (case-insensitive)
    const warehouseConfig = warehouseConfigs.find(w => 
      w.name?.toLowerCase() === warehouse.toLowerCase()
    );
    
    // Se houver configuração de warehouse, verificar se está ativo
    // Se não houver configuração, considerar como ativo (retrocompatibilidade)
    const isWarehouseActive = warehouseConfig ? warehouseConfig.enabled !== false : true;
    
    // Verificar se a linha está ativa
    const lineConfig = lineConfigs.find(
      l => l.warehouse_ref === warehouse && l.name === line
    );
    const isLineActive = lineConfig?.enabled !== false;
    
    // Mostrar apenas se warehouse E linha estiverem ativos
    return isWarehouseActive && isLineActive;
  });

  // Calcular tempo de descarga em formato 0:00
  const calculateDischargeTime = (schedule) => {
    if (!schedule.start_time_actual && !schedule.start_time) return null;
    
    const startTime = schedule.start_time_actual || schedule.start_time;
    const [startH, startM] = startTime.split(':').map(Number);
    const currentH = currentTime.getHours();
    const currentM = currentTime.getMinutes();
    
    const totalMinutes = (currentH * 60 + currentM) - (startH * 60 + startM);
    if (totalMinutes < 0) return null;
    
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}:${String(mins).padStart(2, '0')}`;
  };

  const getLineStatus = (warehouse, line) => {
    const inProgress = schedulings.find(s => 
      s.warehouse === warehouse && 
      s.line === line && 
      s.status === 'em_descarga' &&
      s.date === dateStr
    );

    if (inProgress) {
      return {
        status: 'in_progress',
        schedule: inProgress
      };
    }

    const todaySchedulings = schedulings
      .filter(s => 
        s.warehouse === warehouse && 
        s.line === line && 
        s.date === dateStr &&
        (s.status === 'agendado' || s.status === 'aguardando')
      )
      .sort((a, b) => a.start_time.localeCompare(b.start_time));

    // Only show "late" if it's today and past the scheduled time
    const lateScheduling = isToday ? todaySchedulings.find(s => 
      s.status === 'agendado' && s.start_time < currentTimeStr
    ) : null;

    if (lateScheduling) {
      return {
        status: 'late',
        schedule: lateScheduling
      };
    }

    // Check for aguardando status
    const aguardandoScheduling = todaySchedulings.find(s => s.status === 'aguardando');
    if (aguardandoScheduling) {
      return {
        status: 'aguardando',
        schedule: aguardandoScheduling
      };
    }

    // Next scheduled for the selected date
    const nextToday = todaySchedulings.find(s => 
      !isToday || s.start_time >= currentTimeStr
    );

    if (nextToday) {
      return {
        status: 'scheduled_today',
        schedule: nextToday
      };
    }

    // Look for future schedules only if viewing today
    if (isToday) {
      const nextFuture = schedulings
        .filter(s => 
          s.warehouse === warehouse && 
          s.line === line && 
          s.date > dateStr &&
          s.status === 'agendado'
        )
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          return a.start_time.localeCompare(b.start_time);
        })[0];

      if (nextFuture) {
        return {
          status: 'scheduled_future',
          schedule: nextFuture
        };
      }
    }

    return {
      status: 'free',
      schedule: null
    };
  };

  const getWarehouseName = (warehouse) => {
    if (warehouse === 'central') return 'Central';
    if (warehouse === 'fabrica') return 'Fábrica';
    if (warehouse === 'barra') return 'Barra';
    if (warehouse === 'ferraz') return 'Ferraz';
    return warehouse;
  };

  const getLineDisplayName = (warehouse, lineNumber) => {
    const lineConfig = lineConfigs.find(
      l => l.warehouse_ref === warehouse && l.name === lineNumber
    );
    
    const warehouseName = getWarehouseName(warehouse);
    
    // Se houver value configurado, exibir entre parênteses com fonte pequena
    if (lineConfig?.value) {
      return (
        <>
          {warehouseName} <span className="text-[0.65rem] opacity-75">({lineConfig.value})</span>
        </>
      );
    }
    
    // Caso contrário, usar o formato padrão
    return warehouseName;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const parsedDate = parseISO(dateStr);
      if (!isValid(parsedDate)) return dateStr;
      return format(parsedDate, 'dd/MM');
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      <div className={`grid gap-2 md:gap-3 ${
        lines.length <= 2 ? 'grid-cols-2' :
        lines.length === 3 ? 'grid-cols-2 md:grid-cols-3' :
        lines.length === 4 ? 'grid-cols-2 md:grid-cols-4' :
        lines.length === 5 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5' :
        lines.length === 6 ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6' :
        'grid-cols-2 md:grid-cols-3 lg:grid-cols-7'
      }`}>
        {lines.map(({ warehouse, line }, index) => {
          const lineStatus = getLineStatus(warehouse, line);
          const { status, schedule } = lineStatus;
          const dischargeTime = status === 'in_progress' && schedule ? calculateDischargeTime(schedule) : null;
          const hasCrew = lineHasCrew(warehouse, line);
          const isSupervisor = user?.profile === 'supervisor' || user?.profile === 'admin';

          // Buscar a config da linha para verificar se está enabled
          const lineConfig = lineConfigs.find(
            l => l.warehouse_ref === warehouse && l.name === line
          );
          const isEnabled = lineConfig?.enabled !== false;

          return (
            <motion.div
              key={`${warehouse}-${line}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => handleLineCardClick(warehouse, line)}
              className={!hasCrew && isSupervisor ? 'cursor-pointer' : ''}
            >
              <Card className={`shadow-lg border-2 transition-all duration-300 ${
                !hasCrew 
                  ? 'bg-gray-200 border-gray-400 opacity-60'
                  : isDarkTheme 
                  ? `bg-black border-[#FFD700]/60 ${status === 'in_progress' ? 'shadow-[0_0_15px_rgba(255,215,0,0.5)]' : ''}`
                  : status === 'in_progress' 
                  ? 'border-[#F88D2A]/50 bg-gradient-to-br from-orange-50/90 to-white/80 shadow-[0_0_15px_rgba(248,141,42,0.3)]'
                  : status === 'late'
                  ? 'border-red-500/50 bg-gradient-to-br from-red-50/90 to-white/80 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                  : status === 'aguardando'
                  ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-50/90 to-white/80 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                  : status === 'scheduled_today'
                  ? 'border-blue-400/50 bg-gradient-to-br from-blue-50/90 to-white/80'
                  : status === 'scheduled_future'
                  ? 'border-gray-300/50 bg-white/80'
                  : 'border-green-300/50 bg-gradient-to-br from-green-50/90 to-white/80'
              }`}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <Building2 className={`w-3.5 h-3.5 flex-shrink-0 ${
                        !hasCrew 
                          ? 'text-gray-500'
                          : isDarkTheme 
                          ? 'text-[#FFD700]'
                          : status === 'in_progress' ? 'text-[#F88D2A]' : 
                          status === 'late' ? 'text-red-500' :
                          status === 'aguardando' ? 'text-yellow-600' :
                          'text-[#860063]'
                      }`} />
                      <span className={`text-xs font-bold truncate ${!hasCrew ? 'text-gray-600' : isDarkTheme ? 'text-white' : 'text-gray-700'}`}>
                        {getLineDisplayName(warehouse, line)}
                      </span>
                    </div>
                    <Badge className={`text-xs px-2 py-0.5 flex-shrink-0 ml-1 font-bold ${
                      !hasCrew
                        ? 'bg-gray-400 text-white border-gray-400'
                        : isDarkTheme
                        ? 'bg-[#FFD700] text-black border-[#FFD700]'
                        : status === 'in_progress' 
                        ? 'bg-[#F88D2A] text-white border-[#F88D2A]'
                        : status === 'late'
                        ? 'bg-red-500 text-white border-red-500'
                        : status === 'aguardando'
                        ? 'bg-yellow-500 text-white border-yellow-500'
                        : status === 'scheduled_today'
                        ? 'bg-blue-500 text-white border-blue-500'
                        : status === 'scheduled_future'
                        ? 'bg-gray-400 text-white border-gray-400'
                        : 'bg-green-500 text-white border-green-500'
                    }`}>
                      {line}
                    </Badge>
                  </div>

                  {!hasCrew ? (
                    <div className="text-center py-2">
                      <div className="w-8 h-8 mx-auto mb-1 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-lg text-gray-600">🔒</span>
                      </div>
                      <p className="text-xs font-semibold text-gray-600">
                        {!isEnabled ? 'Linha Inativa' : 'Sem Terno'}
                      </p>
                      {isSupervisor && (
                        <p className="text-xs mt-0.5 text-gray-500">Clique para habilitar</p>
                      )}
                    </div>
                  ) : (
                    <>
                      {status === 'in_progress' && schedule && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <div className={`w-1.5 h-1.5 ${isDarkTheme ? 'bg-[#FFD700]' : 'bg-[#F88D2A]'} rounded-full animate-pulse`} />
                              <span className={`text-xs font-bold ${isDarkTheme ? 'text-[#FFD700]' : 'text-[#F88D2A]'}`}>Em Descarga</span>
                            </div>
                            {dischargeTime && (
                              <div className={`flex items-center gap-1 font-semibold text-xs ${isDarkTheme ? 'text-[#FFD700]' : 'text-[#F88D2A]'}`}>
                                <Clock className="w-3 h-3" />
                                <span>{dischargeTime}</span>
                              </div>
                            )}
                          </div>
                          <p className={`text-xs truncate font-semibold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                            {schedule.supplier}
                          </p>
                          <div className={`flex items-center gap-1.5 text-xs ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                            <Package className={`w-3 h-3 ${isDarkTheme ? 'text-[#FFD700]' : 'text-[#F88D2A]'}`} />
                            <span>{schedule.quantity_bags?.toLocaleString('pt-BR')} sacos</span>
                          </div>
                          <div className={`flex items-center gap-1.5 text-xs ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                            <TrendingUp className="w-3 h-3 text-green-500" />
                            <span>Fim: {schedule.end_time_predicted}</span>
                          </div>
                        </div>
                      )}

                      {status === 'late' && schedule && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                            <span className="text-xs font-bold text-red-600">Atrasado</span>
                          </div>
                          <p className={`text-xs truncate font-semibold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                            {schedule.supplier}
                          </p>
                          <div className={`flex items-center gap-1.5 text-xs ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                            <Clock className="w-3 h-3 text-red-500" />
                            <span className="text-red-600">{schedule.start_time}</span>
                          </div>
                          <div className={`flex items-center gap-1.5 text-xs ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                            <Package className="w-3 h-3 text-red-500" />
                            <span>{schedule.quantity_bags?.toLocaleString('pt-BR')} sacos</span>
                          </div>
                        </div>
                      )}

                      {status === 'aguardando' && schedule && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-yellow-600" />
                            <span className={`text-xs font-semibold ${isDarkTheme ? 'text-[#FFD700]' : 'text-yellow-700'}`}>
                              Aguardando
                            </span>
                          </div>
                          <p className={`text-xs truncate font-medium ${isDarkTheme ? 'text-white' : 'text-gray-700'}`}>
                            {schedule.supplier}
                          </p>
                          <div className={`flex items-center gap-1.5 text-xs ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                            <Package className="w-3 h-3 text-yellow-600" />
                            <span>{schedule.quantity_bags?.toLocaleString('pt-BR')} sacos</span>
                          </div>
                          {schedule.arrival_time && (
                            <div className={`flex items-center gap-1.5 text-xs ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                              <Clock className="w-3 h-3 text-yellow-600" />
                              <span>Chegou: {schedule.arrival_time}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {status === 'scheduled_today' && schedule && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span className={`text-xs font-semibold ${isDarkTheme ? 'text-[#FFD700]' : 'text-blue-700'}`}>
                              {isToday ? 'Próximo: ' : ''}{schedule.start_time}
                            </span>
                          </div>
                          <p className={`text-xs truncate font-medium ${isDarkTheme ? 'text-white' : 'text-gray-700'}`}>
                            {schedule.supplier}
                          </p>
                          <div className={`flex items-center gap-1.5 text-xs ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                            <Package className="w-3 h-3 text-blue-500" />
                            <span>{schedule.quantity_bags?.toLocaleString('pt-BR')} sacos</span>
                          </div>
                        </div>
                      )}

                      {status === 'scheduled_future' && schedule && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-gray-500" />
                            <span className={`text-xs font-medium ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                              Próximo
                            </span>
                          </div>
                          <div className={`text-xs ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                            {formatDate(schedule.date)} • {schedule.start_time}
                          </div>
                          <p className={`text-xs truncate ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}>
                            {schedule.supplier}
                          </p>
                        </div>
                      )}

                      {status === 'free' && (
                        <div className="text-center py-2">
                          <div className={`w-8 h-8 mx-auto mb-1 ${isDarkTheme ? 'bg-[#FFD700]/20' : 'bg-green-100'} rounded-full flex items-center justify-center`}>
                            <span className="text-lg">✓</span>
                          </div>
                          <p className={`text-xs font-semibold ${isDarkTheme ? 'text-[#FFD700]' : 'text-green-600'}`}>Livre</p>
                          <p className={`text-xs mt-0.5 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>Sem agenda</p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Dialog - Habilitar Linha */}
      <Dialog open={showEnableDialog} onOpenChange={setShowEnableDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#860063]">
              <Package className="w-5 h-5" />
              Habilitar Linha
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 text-center mb-2">
                Deseja habilitar a <strong>Linha {selectedLineConfig?.name}</strong>?
              </p>
              <p className="text-xs text-blue-700 text-center">
                Após habilitar, a linha ficará disponível para agendamentos.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowEnableDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEnableLine}
                disabled={updateLineConfigMutation.isPending}
                className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f]"
              >
                {updateLineConfigMutation.isPending ? 'Habilitando...' : 'Habilitar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}