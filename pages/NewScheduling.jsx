import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar, Save, ArrowLeft, Clock, Package, MapPin, AlertCircle, CheckCircle, Utensils } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function NewScheduling() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  const TODAY = new Date();
  const todayStr = format(TODAY, 'yyyy-MM-dd');
  const tomorrowStr = format(addDays(TODAY, 1), 'yyyy-MM-dd');

  const [formData, setFormData] = useState({
    date: todayStr,
    start_time: "",
    supplier: "",
    quantity_bags: "",
    tracking_code: "",
    warehouse: "",
    line: "",
    contract: "",
    eudr_cvn: "",
    apanha_status: "NA",
    notes: ""
  });

  const [predictedEndTime, setPredictedEndTime] = useState("");
  const [predictedDuration, setPredictedDuration] = useState(0);
  const [lineAvailability, setLineAvailability] = useState({});

  const [showCutoffDialog, setShowCutoffDialog] = useState(false);
  const [showNoCrewDialog, setShowNoCrewDialog] = useState(false);
  const [showMealBreakDialog, setShowMealBreakDialog] = useState(false);
  const [mealBreakType, setMealBreakType] = useState("");
  const [showBagLimitDialog, setShowBagLimitDialog] = useState(false);
  const [bagLimitInfo, setBagLimitInfo] = useState({ line: "", limit: 0, quantity: 0 });
  const [showCertificationDialog, setShowCertificationDialog] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const [showLunchSpanDialog, setShowLunchSpanDialog] = useState(false);
  const [lunchSpanInfo, setLunchSpanInfo] = useState({ addedMinutes: 60 });
  const [showChristmasDialog, setShowChristmasDialog] = useState(false);
  const [openSupplierCombobox, setOpenSupplierCombobox] = useState(false);
  const [showLineRequiredDialog, setShowLineRequiredDialog] = useState(false);


  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-fn'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getSuppliers', {});
      return res.data?.suppliers || [];
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: schedulings = [] } = useQuery({
    queryKey: ['schedulings'],
    queryFn: () => base44.entities.Scheduling.list(),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: lineConfigsData } = useQuery({
    queryKey: ['lineconfigs-fn'],
    queryFn: async () => {
      const res = await base44.functions.invoke('getLineConfigs', {});
      return res.data || { lineConfigs: [], warehouseConfigs: [] };
    },
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const lineConfigs = lineConfigsData?.lineConfigs || [];
  const warehouseConfigs = lineConfigsData?.warehouseConfigs || [];

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      // Comprador não pode agendar para hoje — inicializa com amanhã
      if (currentUser?.profile === 'comprador') {
        setFormData(prev => ({ ...prev, date: tomorrowStr }));
      }
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  useEffect(() => {
    calculatePredictedEndTime();
  }, [formData.start_time, formData.quantity_bags]);

  useEffect(() => {
    if (formData.date && formData.warehouse && formData.quantity_bags) {
      calculateLineAvailability();
    }
  }, [formData.date, formData.warehouse, formData.quantity_bags, schedulings, lineConfigs]);

  const lineHasCrew = (warehouse, lineNumber) => {
    const lineConfig = lineConfigs.find(
      l => l.warehouse_ref === warehouse && l.name === lineNumber
    );
    // Considerar tanto has_crew quanto enabled
    return lineConfig?.has_crew !== false && lineConfig?.enabled !== false;
  };

  const getLineBagLimit = (warehouse, lineNumber) => {
    const lineConfig = lineConfigs.find(
      l => l.warehouse_ref === warehouse && l.name === lineNumber
    );
    return lineConfig?.max_bags || 0;
  };

  const isProducerLine = (warehouse, lineNumber) => {
    const lineConfig = lineConfigs.find(
      l => l.warehouse_ref === warehouse && l.name === lineNumber
    );
    return lineConfig?.value?.toLowerCase().includes('produtor');
  };

  const isLineDisabledByPeriod = (warehouse, lineNumber, selectedDate) => {
    const lineConfig = lineConfigs.find(
      l => l.warehouse_ref === warehouse && l.name === lineNumber
    );
    
    if (!lineConfig?.settings?.disabled_start_date || !lineConfig?.settings?.disabled_end_date) {
      return false;
    }
    
    const checkDate = selectedDate || formData.date;
    return checkDate >= lineConfig.settings.disabled_start_date && checkDate <= lineConfig.settings.disabled_end_date;
  };

  const checkCutoffRule = (selectedDate) => {
    if (user?.profile !== 'comprador') return true;

    // Se for linha Produtor, permite agendamento a qualquer momento
    if (formData.warehouse && formData.line && isProducerLine(formData.warehouse, formData.line)) {
      return true;
    }

    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    const tomorrow = format(addDays(now, 1), 'yyyy-MM-dd');
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    if (selectedDate === today) {
      return false;
    }

    if (selectedDate === tomorrow) {
      if (currentHour > 16 || (currentHour === 16 && currentMinute >= 1)) {
        return false;
      }
      return true;
    }

    return true;
  };

  const calculateDuration = (quantity) => {
    if (!quantity) return 0;
    const qty = Number(quantity);
    if (qty <= 100) {
      return 60;
    } else {
      return Math.ceil((qty * 90) / 230);
    }
  };

  const calculatePredictedEndTime = () => {
    if (!formData.start_time || !formData.quantity_bags) {
      setPredictedEndTime("");
      setPredictedDuration(0);
      return;
    }

    let totalMinutes = calculateDuration(formData.quantity_bags);
    
    const [hours, minutes] = formData.start_time.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    let endMinutes = startMinutes + totalMinutes;

    // Verificar se a descarga atravessa o período de almoço (12:00 - 13:00)
    const lunchBlockStart = 12 * 60; // 12:00
    const lunchBlockEnd = 13 * 60;   // 13:00
    
    // Verificar se a descarga atravessa o período de janta (18:00 - 18:30)
    const dinnerBlockStart = 18 * 60; // 18:00
    const dinnerBlockEnd = 18 * 60 + 30; // 18:30

    // Se inicia antes das 12h e termina após 13h, soma 1h de intervalo de almoço
    if (startMinutes < lunchBlockStart && endMinutes > lunchBlockEnd) {
      endMinutes += 60;
      totalMinutes += 60;
    }
    // Se inicia antes das 18h e termina após 18:30, soma 1h de intervalo de janta
    else if (startMinutes < dinnerBlockStart && endMinutes > dinnerBlockEnd) {
      endMinutes += 60;
      totalMinutes += 60;
    }

    setPredictedDuration(totalMinutes);

    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;

    setPredictedEndTime(`${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`);
  };

  const checkMealBreak = () => {
    if (!predictedEndTime || !formData.start_time) {
      return { isValid: true, type: "", spansLunch: false, spansDinner: false };
    }

    const [startH, startM] = formData.start_time.split(':').map(Number);
    const startMinutes = startH * 60 + startM;

    const [endH, endM] = predictedEndTime.split(':').map(Number);
    const endMinutes = endH * 60 + endM;

    const lunchStart = 11 * 60 + 30;
    const lunchEnd = 12 * 60 + 30;
    const dinnerStart = 17 * 60 + 30;
    const dinnerEnd = 18 * 60 + 30;

    // Nova regra: Se linha 1, inicia antes das 12h e termina após as 13h, soma 1h de intervalo
    // (descarga atravessa o horário de almoço)
    const lunchBlockStart = 12 * 60; // 12:00
    const lunchBlockEnd = 13 * 60;   // 13:00
    const dinnerBlockStart = 18 * 60; // 18:00
    const dinnerBlockEnd = 18 * 60 + 30; // 18:30

    // Verifica se a descarga atravessa o período de almoço (inicia antes das 12h e termina após 13h)
    if (startMinutes < lunchBlockStart && endMinutes > lunchBlockEnd) {
      return { isValid: true, type: "almoço", spansLunch: true, spansDinner: false, addedMinutes: 60 };
    }

    // Verifica se a descarga atravessa o período de janta (inicia antes das 18h e termina após 18:30)
    if (startMinutes < dinnerBlockStart && endMinutes > dinnerBlockEnd) {
      return { isValid: true, type: "janta", spansLunch: false, spansDinner: true, addedMinutes: 60 };
    }

    // Regra: Se termina entre 11:30 e 12:30, avisa sobre intervalo de 1h para próximo agendamento (mas permite continuar)
    if (endMinutes >= lunchStart && endMinutes <= lunchEnd) {
      return { isValid: true, type: "almoço", spansLunch: false, spansDinner: false, endsInMealWindow: true };
    }

    // Regra: Se termina entre 17:30 e 18:30, avisa sobre intervalo de 1h para próximo agendamento (mas permite continuar)
    if (endMinutes >= dinnerStart && endMinutes <= dinnerEnd) {
      return { isValid: true, type: "janta", spansLunch: false, spansDinner: false, endsInMealWindow: true };
    }

    return { isValid: true, type: "", spansLunch: false, spansDinner: false };
  };

  const calculateLineAvailability = () => {
    const lines = getAvailableLines();
    const availability = {};

    lines.forEach(line => {
      const lineSchedulings = schedulings.filter(s =>
        s.date === formData.date &&
        s.line === line &&
        s.warehouse === formData.warehouse &&
        s.status !== 'cancelado' &&
        s.status !== 'concluido'
      );

      const occupiedSlots = [];
      
      lineSchedulings.forEach(s => {
        // Pular registros sem end_time_predicted (evita crash silencioso que libera todos os horários)
        if (!s.start_time || !s.end_time_predicted) return;
        const [startH, startM] = s.start_time.split(':').map(Number);
        const [endH, endM] = s.end_time_predicted.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        occupiedSlots.push({
          start: startMinutes,
          end: endMinutes,
          type: 'scheduling'
        });

        const lunchStart = 11 * 60 + 30;
        const lunchEnd = 12 * 60 + 30;
        const dinnerStart = 17 * 60 + 30;
        const dinnerEnd = 18 * 60 + 30;

        if (endMinutes >= lunchStart && endMinutes <= lunchEnd) {
          occupiedSlots.push({
            start: endMinutes,
            end: endMinutes + 60,
            type: 'lunch_break',
            reason: 'Intervalo de Almoço'
          });
        }

        if (endMinutes >= dinnerStart && endMinutes <= dinnerEnd) {
          occupiedSlots.push({
            start: endMinutes,
            end: endMinutes + 60,
            type: 'dinner_break',
            reason: 'Intervalo de Janta'
          });
        }
      });

      occupiedSlots.sort((a, b) => a.start - b.start);

      const mergedSlots = [];
      for (const slot of occupiedSlots) {
        if (mergedSlots.length === 0) {
          mergedSlots.push({ ...slot });
        } else {
          const lastSlot = mergedSlots[mergedSlots.length - 1];
          if (slot.start <= lastSlot.end) {
            lastSlot.end = Math.max(lastSlot.end, slot.end);
            if (slot.type.includes('break')) {
              lastSlot.type = slot.type;
              lastSlot.reason = slot.reason;
            }
          } else {
            mergedSlots.push({ ...slot });
          }
        }
      }

      const operationalStart = 7 * 60 + 30;
      const operationalEnd = 23 * 60;
      const duration = calculateDuration(formData.quantity_bags);

      const availableSlots = [];
      let currentTime = operationalStart;

      for (const occupied of mergedSlots) {
        if (currentTime + duration <= occupied.start) {
          availableSlots.push({
            start: currentTime,
            end: occupied.start,
            startTime: `${String(Math.floor(currentTime / 60)).padStart(2, '0')}:${String(currentTime % 60).padStart(2, '0')}`
          });
        }
        currentTime = Math.max(currentTime, occupied.end);
      }

      if (currentTime + duration <= operationalEnd) {
        availableSlots.push({
          start: currentTime,
          end: operationalEnd,
          startTime: `${String(Math.floor(currentTime / 60)).padStart(2, '0')}:${String(currentTime % 60).padStart(2, '0')}`
        });
      }

      availability[line] = {
        isAvailable: availableSlots.length > 0,
        slots: availableSlots,
        occupiedCount: mergedSlots.length,
        mergedSlots: mergedSlots
      };
    });

    setLineAvailability(availability);
  };

  const getAvailableLines = () => {
    let allLines = [];
    if (formData.warehouse === "central") {
      allLines = ["01", "02", "03", "04"];
    } else if (formData.warehouse === "fabrica") {
      allLines = ["01"];
    } else if (formData.warehouse === "barra") {
      allLines = ["01"];
    } else if (formData.warehouse === "ferraz") {
      allLines = ["01"];
    }
    
    // Filtrar apenas linhas ativas e visíveis
    // Se lineConfigs ainda não carregou, não mostrar nenhuma linha (evita exibir linhas indisponíveis)
    if (lineConfigs.length === 0) return [];
    
    return allLines.filter(line => {
      const lineConfig = lineConfigs.find(
        l => l.warehouse_ref === formData.warehouse && l.name === line
      );
      // Linha sem configuração no banco = não exibir
      if (!lineConfig) return false;
      return lineConfig.enabled !== false && lineConfig.visible !== false;
    });
  };

  const isTimeSlotAvailable = () => {
    if (!formData.date || !formData.start_time || !predictedEndTime || !formData.line || !formData.warehouse) {
      return { available: true, hasConflict: false, conflictType: null };
    }

    const conflicts = schedulings.filter(s =>
      s.date === formData.date &&
      s.line === formData.line &&
      s.warehouse === formData.warehouse &&
      s.status !== 'cancelado' &&
      s.status !== 'concluido'
    );

    const [startH, startM] = formData.start_time.split(':').map(Number);
    const [endH, endM] = predictedEndTime.split(':').map(Number);
    const newStart = startH * 60 + startM;
    const newEnd = endH * 60 + endM;

    for (const conflict of conflicts) {
      // Pular registros sem end_time_predicted — sem previsão, tratar como bloqueio total para Central
      if (!conflict.start_time || !conflict.end_time_predicted) {
        if (formData.warehouse === 'central') {
          return { available: false, hasConflict: true, conflictType: 'scheduling' };
        }
        continue;
      }
      const [cStartH, cStartM] = conflict.start_time.split(':').map(Number);
      const [cEndH, cEndM] = conflict.end_time_predicted.split(':').map(Number);
      const cStart = cStartH * 60 + cStartM;
      const cEnd = cEndH * 60 + cEndM;

      if ((newStart >= cStart && newStart < cEnd) || (newEnd > cStart && newEnd <= cEnd) || (newStart <= cStart && newEnd >= cEnd)) {
        // Central: bloqueio estrito — nenhum agendamento simultâneo na mesma linha
        if (formData.warehouse === 'central') {
          return { available: false, hasConflict: true, conflictType: 'scheduling' };
        }
        if (formData.warehouse === 'fabrica') {
          return { available: true, hasConflict: true, conflictType: 'scheduling' };
        }
        // Exceção: Ferraz + fornecedor PORTO permite agendamentos simultâneos
        if (formData.warehouse === 'ferraz' && formData.supplier && formData.supplier.toUpperCase().includes('PORTO')) {
          return { available: true, hasConflict: true, conflictType: 'scheduling' };
        }
        return { available: false, hasConflict: true, conflictType: 'scheduling' };
      }

      const lunchStart = 11 * 60 + 30;
      const lunchEnd = 12 * 60 + 30;
      const dinnerStart = 17 * 60 + 30;
      const dinnerEnd = 18 * 60 + 30;

      let mealBreakStart = null;
      let mealBreakEnd = null;
      let mealBreakType = null;

      if (cEnd >= lunchStart && cEnd <= lunchEnd) {
        mealBreakStart = cEnd;
        mealBreakEnd = cEnd + 60;
        mealBreakType = 'almoço';
      }

      if (cEnd >= dinnerStart && cEnd <= dinnerEnd) {
        mealBreakStart = cEnd;
        mealBreakEnd = cEnd + 60;
        mealBreakType = 'janta';
      }

      if (mealBreakStart !== null && mealBreakEnd !== null) {
        const hasBreakConflict = (
          (newStart >= mealBreakStart && newStart < mealBreakEnd) ||
          (newEnd > mealBreakStart && newEnd <= mealBreakEnd) ||
          (newStart <= mealBreakStart && newEnd >= mealBreakEnd)
        );

        if (hasBreakConflict) {
          return { 
            available: false, 
            hasConflict: true, 
            conflictType: 'meal_break',
            mealBreakType: mealBreakType,
            mealBreakStart: `${String(Math.floor(mealBreakStart / 60)).padStart(2, '0')}:${String(mealBreakStart % 60).padStart(2, '0')}`,
            mealBreakEnd: `${String(Math.floor(mealBreakEnd / 60)).padStart(2, '0')}:${String(mealBreakEnd % 60).padStart(2, '0')}`
          };
        }
      }
    }

    return { available: true, hasConflict: false, conflictType: null };
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Usa backend com asServiceRole para ignorar RLS (evita falhas para perfil comprador)
      const res = await base44.functions.invoke('createSchedulingRecord', { data });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data?.schedule;
    },
    onSuccess: (newSchedule) => {
      setShowCertificationDialog(false);
      base44.functions.invoke('logTransaction', {
        entity_type: 'Scheduling',
        entity_id: newSchedule.id,
        action: 'create',
        data_before: null,
        data_after: newSchedule
      }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['schedulings'] });
      toast.success('\u2705 Agendamento criado com sucesso!', {
        description: 'O ve\u00edculo foi agendado e aparecer\u00e1 no calend\u00e1rio.',
        duration: 4000,
      });
      navigate(createPageUrl("Calendar"));
    },
    onError: (error) => {
      setShowCertificationDialog(false);
      console.error('Erro ao criar agendamento:', error);
      const msg = error?.response?.data?.message || error?.response?.data?.detail || error?.message || 'Sem permiss\u00e3o ou erro interno.';
      toast.error('\u274c Erro ao criar agendamento', {
        description: msg,
        duration: 8000,
      });
    }
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar campo obrigatório: linha
    if (!formData.line) {
      setShowLineRequiredDialog(true);
      return;
    }

    // Bloquear agendamentos para 24 e 25 de dezembro de 2025
    if (formData.date === '2025-12-24' || formData.date === '2025-12-25') {
      setShowChristmasDialog(true);
      return;
    }

    if (!checkCutoffRule(formData.date)) {
      setShowCutoffDialog(true);
      return;
    }

    if (formData.warehouse && formData.line && !lineHasCrew(formData.warehouse, formData.line)) {
      setShowNoCrewDialog(true);
      return;
    }

    if (formData.warehouse && formData.line && formData.quantity_bags) {
      const bagLimit = getLineBagLimit(formData.warehouse, formData.line);
      const quantity = Number(formData.quantity_bags);
      
      if (bagLimit > 0 && quantity > bagLimit) {
        setBagLimitInfo({
          line: formData.line,
          limit: bagLimit,
          quantity: quantity
        });
        setShowBagLimitDialog(true);
        return;
      }
    }

    const mealCheck = checkMealBreak();
    
    // Se a descarga atravessa o horário de almoço ou janta, mostrar popup de aviso
    if (mealCheck.spansLunch || mealCheck.spansDinner) {
      setLunchSpanInfo({ 
        addedMinutes: mealCheck.addedMinutes,
        type: mealCheck.type
      });
      setShowLunchSpanDialog(true);
      return;
    }

    // Se termina durante janela de refeição (11:30-12:30 ou 17:30-18:30), mostrar aviso informativo
    if (mealCheck.endsInMealWindow) {
      setMealBreakType(mealCheck.type);
      setShowMealBreakDialog(true);
      return;
    }

    const timeSlot = isTimeSlotAvailable();

    if (!timeSlot.available && formData.warehouse !== 'fabrica') {
      if (timeSlot.conflictType === 'meal_break') {
        setMealBreakType(timeSlot.mealBreakType);
        setShowMealBreakDialog(true);
      } else {
        toast.error('Horário não disponível. Já existe um agendamento conflitante.');
      }
      return;
    }

    // Abrir popup de certificação antes de criar
    if (!formData.contract) {
      toast.error('Selecione o tipo de Contrato');
      return;
    }

    setShowCertificationDialog(true);
    };



  const handleConfirmCertification = () => {
    if (!formData.eudr_cvn) {
      toast.error('Selecione uma opção de Certificação');
      return;
    }

    const tons = (Number(formData.quantity_bags) * 60) / 1000;

    const schedulingData = {
      date: formData.date,
      start_time: formData.start_time,
      supplier: formData.supplier,
      quantity_bags: Number(formData.quantity_bags),
      quantity_tons: tons,
      warehouse: formData.warehouse,
      line: formData.line,
      contract: formData.contract,
      eudr_cvn: formData.eudr_cvn,
      apanha_status: formData.apanha_status,
      end_time_predicted: predictedEndTime,
      status: "agendado",
      created_by_name: user?.full_name || user?.email || '',
      ...(formData.tracking_code && { tracking_code: formData.tracking_code }),
      ...(formData.notes && { notes: formData.notes }),
    };

    console.log('Criando agendamento:', schedulingData);
    createMutation.mutate(schedulingData);
  };

  const handleQuickSelectTime = (time) => {
    setFormData({ ...formData, start_time: time });
  };

  const handleLineSelect = (lineValue) => {
    if (formData.warehouse) {
      const hasCrew = lineHasCrew(formData.warehouse, lineValue);
      const isDisabled = isLineDisabledByPeriod(formData.warehouse, lineValue, formData.date);

      if (!hasCrew) {
        setShowNoCrewDialog(true);
        return;
      }

      if (isDisabled) {
        toast.error('Linha temporariamente desabilitada para novos agendamentos neste período');
        return;
      }
    }
    setFormData({ ...formData, line: lineValue });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="mb-2 hover:bg-[#860063]/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900">
            Novo Agendamento
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Preencha os dados para agendar uma descarga</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-xl border-none">
            <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5 py-2.5">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="w-4 h-4 text-[#860063]" />
                Dados do Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="date" className="text-sm">Data *</Label>
                    <Input
                      id="date"
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      min={
                        user?.profile === 'comprador' && !isProducerLine(formData.warehouse, formData.line)
                          ? format(addDays(new Date(), 1), 'yyyy-MM-dd')
                          : undefined
                      }
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9"
                    />
                    {user?.profile === 'comprador' && !isProducerLine(formData.warehouse, formData.line) && (
                      <p className="text-xs text-orange-600 font-medium">
                        ⚠️ Agendamento permitido apenas a partir de amanhã
                      </p>
                    )}
                    {user?.profile === 'comprador' && isProducerLine(formData.warehouse, formData.line) && (
                      <p className="text-xs text-green-600 font-medium">
                        ✅ Linha Produtor: pode agendar para qualquer dia
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="start_time" className="text-sm">Horário de Início *</Label>
                    <Input
                      id="start_time"
                      type="time"
                      required
                      min="07:30"
                      max="23:00"
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9"
                    />
                    <p className="text-xs text-gray-500">Janela: 07:30 às 23:00</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="supplier" className="text-sm">Fornecedor *</Label>
                  <Popover open={openSupplierCombobox} onOpenChange={setOpenSupplierCombobox}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openSupplierCombobox}
                        className="w-full justify-between border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9 font-normal"
                      >
                        {formData.supplier || "Selecione o fornecedor"}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Digite para buscar fornecedor..." className="h-9" />
                        <CommandList>
                          <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                          <CommandGroup>
                            {suppliers.map((supplier) => (
                              <CommandItem
                                key={supplier.id}
                                value={supplier.name}
                                onSelect={(currentValue) => {
                                  setFormData({ ...formData, supplier: currentValue });
                                  setOpenSupplierCombobox(false);
                                }}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${
                                    formData.supplier === supplier.name ? "opacity-100" : "opacity-0"
                                  }`}
                                />
                                {supplier.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="quantity_bags" className="text-sm">Quantidade (sacos) *</Label>
                    <Input
                      id="quantity_bags"
                      type="number"
                      required
                      min="1"
                      value={formData.quantity_bags}
                      onChange={(e) => setFormData({ ...formData, quantity_bags: e.target.value })}
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9"
                    />
                    {formData.quantity_bags && (
                      <div className="space-y-0.5">
                        <p className="text-xs text-gray-600">
                          = {((formData.quantity_bags * 60) / 1000).toFixed(2)} toneladas
                        </p>
                        <p className="text-xs text-purple-700 font-semibold">
                          Peso estimado: {(formData.quantity_bags * 0.15).toFixed(2)} kg
                        </p>
                        <p className="text-xs text-gray-600">
                          {Number(formData.quantity_bags) <= 100
                            ? 'Tempo estimado: 1 hora'
                            : `Tempo estimado: ${Math.ceil((Number(formData.quantity_bags) * 90) / 230)} minutos`
                          }
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="tracking_code" className="text-sm">Código de Rastreio</Label>
                    <Input
                      id="tracking_code"
                      type="text"
                      value={formData.tracking_code}
                      onChange={(e) => setFormData({ ...formData, tracking_code: e.target.value })}
                      placeholder="Ex: BR123456789"
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="warehouse" className="text-sm">Armazém *</Label>
                    <Select
                      value={formData.warehouse}
                      onValueChange={(value) => {
                        setFormData({ 
                          ...formData, 
                          warehouse: value, 
                          line: (value === 'fabrica' || value === 'barra') ? '01' : '' 
                        });
                      }}
                      required
                    >
                      <SelectTrigger className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9">
                        <SelectValue placeholder="Selecione o armazém" />
                      </SelectTrigger>
                      <SelectContent>
                        {[
                          { value: 'central', label: 'Central' },
                          { value: 'fabrica', label: 'Fábrica' },
                          { value: 'barra', label: 'Barra' },
                          { value: 'ferraz', label: 'Ferraz' }
                        ].filter(warehouse => {
                          const config = warehouseConfigs.find(w => 
                            w.name?.toLowerCase() === warehouse.value.toLowerCase()
                          );
                          return config?.enabled !== false;
                        }).map(warehouse => (
                          <SelectItem key={warehouse.value} value={warehouse.value}>
                            {warehouse.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="line" className="text-sm">Linha *</Label>
                    <Select
                      value={formData.line}
                      onValueChange={handleLineSelect}
                      required
                      disabled={!formData.warehouse}
                    >
                      <SelectTrigger className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9">
                        <SelectValue placeholder="Selecione a linha" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailableLines().map((line) => {
                          const availability = lineAvailability[line];
                          const isAvailable = availability?.isAvailable !== false;
                          const hasCrew = lineHasCrew(formData.warehouse, line);
                          const bagLimit = getLineBagLimit(formData.warehouse, line);
                          const isDisabledByPeriod = isLineDisabledByPeriod(formData.warehouse, line, formData.date);

                          return (
                            <SelectItem
                              key={line}
                              value={line}
                              disabled={!isAvailable || !hasCrew || isDisabledByPeriod}
                              className={((!hasCrew || isDisabledByPeriod) ? 'text-gray-400' : '')}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className={(!hasCrew || isDisabledByPeriod) ? 'text-gray-400' : ''}>
                                  Linha {line} {!hasCrew && '(Sem terno)'} {isDisabledByPeriod && '(Desabilitada)'} {bagLimit > 0 && `(Max: ${bagLimit} sacos)`}
                                </span>
                                {availability && !isDisabledByPeriod && (
                                  <span className={`ml-2 text-xs ${isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                                    {isAvailable ? `✓ ${availability.slots.length} slot(s)` : '✗ Ocupada'}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.line && lineAvailability[formData.line] && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-2.5 bg-blue-50 rounded-lg border border-blue-200"
                  >
                    <div className="flex items-start gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="font-semibold text-blue-900 text-xs mb-1.5">
                          Horários Disponíveis - Linha {formData.line}
                        </p>
                        <div className="space-y-1">
                          {lineAvailability[formData.line].slots.length > 0 ? (
                            lineAvailability[formData.line].slots.map((slot, idx) => (
                              <div key={idx} className="flex items-center justify-between bg-white p-1.5 rounded border border-blue-200">
                                <span className="text-xs text-gray-700">
                                  A partir de {slot.startTime}
                                </span>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleQuickSelectTime(slot.startTime)}
                                  className="text-xs hover:bg-[#860063] hover:text-white h-6 px-2"
                                >
                                  Usar
                                </Button>
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-gray-700">Nenhum horário disponível para a quantidade e data selecionadas.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {predictedEndTime && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-2.5 bg-gradient-to-r from-[#860063]/10 to-[#F88D2A]/10 rounded-lg border-2 border-[#F88D2A]/30"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <Clock className="w-3.5 h-3.5 text-[#F88D2A]" />
                      <span className="font-semibold text-gray-900 text-xs">Previsão de Conclusão</span>
                    </div>
                    <p className="text-xl font-bold text-[#860063]">{predictedEndTime}</p>
                    {(() => {
                      const timeSlot = isTimeSlotAvailable();
                      if (timeSlot.hasConflict) {
                        if (timeSlot.conflictType === 'meal_break') {
                          return (
                            <div className="flex items-center gap-2 mt-1.5 text-red-600">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <p className="text-xs">
                                ⚠️ Conflito com intervalo de {timeSlot.mealBreakType} ({timeSlot.mealBreakStart} - {timeSlot.mealBreakEnd})
                              </p>
                            </div>
                          );
                        } else if (formData.warehouse === 'fabrica') {
                          return (
                            <div className="flex items-center gap-2 mt-1.5 text-yellow-600">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <p className="text-xs">
                                ⚠️ Atenção: Conflito de horário detectado. Fábrica permite agendamentos simultâneos.
                              </p>
                            </div>
                          );
                        } else {
                          return (
                            <div className="flex items-center gap-2 mt-1.5 text-red-600">
                              <AlertCircle className="w-3.5 h-3.5" />
                              <p className="text-xs">
                                Conflito de horário! Escolha um dos horários sugeridos acima.
                              </p>
                            </div>
                          );
                        }
                      }
                      return null;
                    })()}
                  </motion.div>
                )}

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="contract" className="text-sm">Contrato *</Label>
                    <Select
                      value={formData.contract}
                      onValueChange={(value) => setFormData({ ...formData, contract: value })}
                      required
                    >
                      <SelectTrigger className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9">
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RFP">RFP</SelectItem>
                        <SelectItem value="PTBF">PTBF</SelectItem>
                        <SelectItem value="DIF">DIF</SelectItem>
                        <SelectItem value="TRANSFERÊNCIA">TRANSFERÊNCIA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-sm">Frete *</Label>
                    <RadioGroup
                      value={formData.apanha_status}
                      onValueChange={(value) => setFormData({ ...formData, apanha_status: value })}
                      className="flex gap-3 h-9 items-center"
                    >
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="Apanha" id="apanha" />
                        <Label htmlFor="apanha" className="cursor-pointer font-normal text-sm">Apanha</Label>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <RadioGroupItem value="NA" id="na" />
                        <Label htmlFor="na" className="cursor-pointer font-normal text-sm">NA</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="notes" className="text-sm">Observações</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] text-sm"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate(createPageUrl("Dashboard"))}
                    className="flex-1 h-9"
                  >
                    Cancelar
                  </Button>
                  <Button
                  type="submit"
                  disabled={createMutation.isPending}
                   className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063] text-white h-9"
                  >
                    <Save className="w-3.5 h-3.5 mr-2" />
                    {createMutation.isPending ? 'Salvando...' : 'Criar Agendamento'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <Dialog open={showCutoffDialog} onOpenChange={setShowCutoffDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Horário de Corte
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              {(() => {
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();
                const selectedDate = formData.date;
                const today = format(now, 'yyyy-MM-dd');
                const tomorrow = format(addDays(now, 1), 'yyyy-MM-dd');

                if (selectedDate === today) {
                  return (
                    <>
                      <p className="text-sm text-red-800 mb-2">
                        🚫 <strong>Não é permitido criar agendamentos para o dia atual.</strong>
                      </p>
                      <p className="text-sm text-red-700">
                        Por favor, agende para <strong>amanhã ({format(addDays(now, 1), "dd/MM/yyyy")})</strong> ou datas posteriores.
                      </p>
                    </>
                  );
                }

                if (selectedDate === tomorrow && (currentHour > 16 || (currentHour === 16 && currentMinute >= 1))) {
                  return (
                    <>
                      <p className="text-sm text-red-800 mb-2">
                        ⏰ <strong>Após 16h</strong>, não é permitido criar agendamentos para o dia seguinte.
                      </p>
                      <p className="text-sm text-red-700">
                        Por favor, agende para <strong>{format(addDays(now, 2), "dd/MM/yyyy")}</strong> ou datas posteriores.
                      </p>
                    </>
                  );
                }

                return (
                  <p className="text-sm text-red-800">
                    Data selecionada não está disponível para agendamento.
                  </p>
                );
              })()}
            </div>
            <Button
              onClick={() => setShowCutoffDialog(false)}
              className="w-full bg-gradient-to-r from-[#860063] to-[#6b004f]"
            >
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showNoCrewDialog} onOpenChange={setShowNoCrewDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertCircle className="w-5 h-5" />
              Linha Indisponível
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800 text-center">
                <strong>Linha sem terno</strong>
              </p>
              <p className="text-sm text-orange-700 text-center mt-2">
                Favor contatar <strong>Murilo DC</strong>
              </p>
            </div>
            <Button
              onClick={() => setShowNoCrewDialog(false)}
              className="w-full bg-gradient-to-r from-[#860063] to-[#6b004f]"
            >
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showMealBreakDialog} onOpenChange={setShowMealBreakDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Utensils className="w-5 h-5" />
              Conflito com Intervalo de Refeição
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              {(() => {
                const timeSlot = isTimeSlotAvailable();
                
                if (timeSlot.conflictType === 'meal_break') {
                  return (
                    <>
                      <p className="text-sm text-orange-800 mb-3">
                        <strong>⚠️ Seu agendamento conflita com intervalo de {timeSlot.mealBreakType}</strong>
                      </p>
                      <p className="text-sm text-orange-700 mb-3">
                        Período de intervalo: <strong>{timeSlot.mealBreakStart} - {timeSlot.mealBreakEnd}</strong>
                      </p>
                      <div className="bg-white rounded-lg p-3 border border-orange-300">
                        <p className="text-xs text-orange-800 font-semibold mb-2">
                          📋 Regra de Intervalo:
                        </p>
                        <ul className="text-xs text-orange-700 space-y-1">
                          <li>• Descargas não podem ser agendadas durante o intervalo de refeição</li>
                          <li>• Intervalo de 60 minutos após descargas que terminam entre {timeSlot.mealBreakType === 'almoço' ? '11:30-12:30' : '17:30-18:30'}</li>
                          <li>• Escolha um horário que não conflite com o intervalo</li>
                        </ul>
                      </div>
                    </>
                  );
                }

                return (
                  <>
                    <p className="text-sm text-orange-800 mb-3">
                      <strong>ℹ️ Descarga termina durante período de {mealBreakType}</strong>
                    </p>
                    <p className="text-sm text-orange-700 mb-3">
                      Término previsto: <strong>{predictedEndTime}</strong>
                    </p>
                    <div className="bg-white rounded-lg p-3 border border-orange-300">
                      <p className="text-xs text-orange-800 font-semibold mb-2">
                        📋 Informação Importante:
                      </p>
                      <ul className="text-xs text-orange-700 space-y-1">
                        {mealBreakType === "almoço" ? (
                          <>
                            <li>• Esta descarga termina entre <strong>11:30 e 12:30</strong></li>
                            <li>• O <strong>próximo agendamento</strong> nesta linha deverá respeitar <strong>1h de intervalo</strong></li>
                            <li>• Para garantir intervalo de almoço da equipe</li>
                          </>
                        ) : (
                          <>
                            <li>• Esta descarga termina entre <strong>17:30 e 18:30</strong></li>
                            <li>• O <strong>próximo agendamento</strong> nesta linha deverá respeitar <strong>1h de intervalo</strong></li>
                            <li>• Para garantir intervalo de janta da equipe</li>
                          </>
                        )}
                      </ul>
                    </div>
                  </>
                );
              })()}

              {formData.line && lineAvailability[formData.line] && lineAvailability[formData.line].slots.length > 0 && (
                <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-900 mb-2">
                    ✅ Horários Disponíveis:
                  </p>
                  <div className="space-y-1.5">
                    {lineAvailability[formData.line].slots.slice(0, 3).map((slot, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white p-2 rounded border border-blue-300">
                        <span className="text-xs text-gray-700 font-medium">
                          A partir de {slot.startTime}
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            handleQuickSelectTime(slot.startTime);
                            setShowMealBreakDialog(false);
                          }}
                          className="text-xs h-6 px-2 bg-gradient-to-r from-[#860063] to-[#6b004f]"
                        >
                          Usar
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowMealBreakDialog(false)}
                className="flex-1"
              >
                Voltar e Ajustar
              </Button>
              <Button
                onClick={() => {
                  setShowMealBreakDialog(false);
                  setShowCertificationDialog(true);
                }}
                className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f]"
              >
                Continuar Mesmo Assim
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBagLimitDialog} onOpenChange={setShowBagLimitDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Package className="w-5 h-5" />
              Limite de Quantidade Excedido
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 mb-3 text-center">
                <strong>⚠️ Quantidade excede o limite da linha</strong>
              </p>
              
              <div className="bg-white rounded-lg p-3 border border-red-300 mb-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600 text-xs">Linha selecionada:</p>
                    <p className="font-semibold text-gray-900">Linha {bagLimitInfo.line}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-xs">Limite máximo:</p>
                    <p className="font-semibold text-orange-600">{bagLimitInfo.limit} sacos</p>
                  </div>
                  <div className="col-span-2 border-t pt-2">
                    <p className="text-gray-600 text-xs">Quantidade solicitada:</p>
                    <p className="font-semibold text-red-600 text-lg">{bagLimitInfo.quantity} sacos</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 font-semibold mb-2">
                  💡 Sugestões:
                </p>
                <ul className="text-xs text-blue-700 space-y-1 ml-4 list-disc">
                  <li>Reduza a quantidade para até {bagLimitInfo.limit} sacos</li>
                  <li>Escolha outra linha sem limite ou com limite maior</li>
                </ul>
              </div>
            </div>

            <Button
              onClick={() => setShowBagLimitDialog(false)}
              className="w-full bg-gradient-to-r from-[#860063] to-[#6b004f]"
            >
              Entendi, vou ajustar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de aviso quando descarga atravessa horário de refeição */}
      <Dialog open={showLunchSpanDialog} onOpenChange={setShowLunchSpanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-600">
              <Utensils className="w-5 h-5" />
              Intervalo de {lunchSpanInfo.type === 'almoço' ? 'Almoço' : 'Janta'} Incluído
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm text-orange-800 mb-3 text-center">
                <strong>⚠️ Esta descarga atravessa o horário de {lunchSpanInfo.type}</strong>
              </p>
              
              <div className="bg-white rounded-lg p-3 border border-orange-300 mb-3">
                <div className="flex items-center justify-center gap-2 text-orange-700">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">+1 hora adicionada ao tempo previsto</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-800 font-semibold mb-2">
                  📋 Regra Aplicada:
                </p>
                <ul className="text-xs text-blue-700 space-y-1">
                  {lunchSpanInfo.type === 'almoço' ? (
                    <>
                      <li>• Descarga inicia antes das <strong>12:00</strong></li>
                      <li>• Descarga termina após as <strong>13:00</strong></li>
                      <li>• <strong>1 hora</strong> de intervalo de almoço foi adicionada</li>
                    </>
                  ) : (
                    <>
                      <li>• Descarga inicia antes das <strong>18:00</strong></li>
                      <li>• Descarga termina após as <strong>18:30</strong></li>
                      <li>• <strong>1 hora</strong> de intervalo de janta foi adicionada</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-green-700">Término Previsto:</span>
                  <span className="text-xl font-bold text-green-700">{predictedEndTime}</span>
                </div>
                <p className="text-xs text-green-600 mt-1 text-center">
                  (já inclui o intervalo de {lunchSpanInfo.type})
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowLunchSpanDialog(false)}
                className="flex-1"
              >
                Voltar e Ajustar
              </Button>
              <Button
                onClick={() => {
                  setShowLunchSpanDialog(false);
                  setShowCertificationDialog(true);
                }}
                className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063]"
              >
                Continuar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Christmas Dialog */}
      <Dialog open={showChristmasDialog} onOpenChange={setShowChristmasDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl font-bold text-[#860063]">
              🎄 Feliz Natal! 🎄
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {/* Guirlanda de Natal */}
            <div className="flex justify-center mb-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-8 border-green-600 bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center shadow-xl">
                  <div className="text-6xl">🎅</div>
                </div>
                {/* Decorações da guirlanda */}
                <div className="absolute -top-2 -right-2 text-3xl animate-bounce">🔴</div>
                <div className="absolute -bottom-2 -left-2 text-3xl animate-bounce" style={{ animationDelay: '0.2s' }}>🔴</div>
                <div className="absolute top-1/2 -left-3 text-2xl animate-pulse">⭐</div>
                <div className="absolute top-1/2 -right-3 text-2xl animate-pulse" style={{ animationDelay: '0.3s' }}>⭐</div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#860063]/10 to-[#F88D2A]/10 border-2 border-[#860063]/30 rounded-lg p-6">
              <p className="text-center text-lg font-semibold text-gray-800 mb-4">
                🎁 Mensagem Especial 🎁
              </p>
              <p className="text-center text-gray-700 mb-4 leading-relaxed">
                <strong className="text-[#860063]">O sistema estará fechado</strong> nos dias <strong>24 e 25 de dezembro</strong> para que todos possam celebrar o Natal com suas famílias.
              </p>
              <div className="bg-white rounded-lg p-4 border-2 border-[#F88D2A]/50 mb-4">
                <p className="text-center text-sm text-gray-600 italic">
                  "Que esta época festiva traga alegria, paz e prosperidade para você e sua família. Feliz Natal!"
                </p>
              </div>
              <p className="text-center font-bold text-[#860063] text-lg">
                ❤️ Equipe Central Pulse ❤️
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 text-2xl">
              <span className="animate-bounce">🎄</span>
              <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>🎅</span>
              <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>🎁</span>
              <span className="animate-bounce" style={{ animationDelay: '0.3s' }}>⭐</span>
              <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>🔔</span>
            </div>

            <Button
              onClick={() => setShowChristmasDialog(false)}
              className="w-full bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824] text-white font-bold py-3"
            >
              ✨ Entendi, Feliz Natal! ✨
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCertificationDialog} onOpenChange={setShowCertificationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#860063]">
              <CheckCircle className="w-5 h-5" />
              Selecione a Certificação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-800 mb-4 text-center">
                <strong>⚠️ Selecione a certificação correta para este agendamento</strong>
              </p>
              
              <RadioGroup
                value={formData.eudr_cvn}
                onValueChange={(value) => setFormData({ ...formData, eudr_cvn: value })}
                className="flex flex-col gap-3"
              >
                <div className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.eudr_cvn === "EUDR" 
                    ? "border-[#860063] bg-[#860063]/5" 
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                  <RadioGroupItem value="EUDR" id="eudr-popup" />
                  <Label htmlFor="eudr-popup" className="cursor-pointer font-semibold text-base flex-1">
                    EUDR
                  </Label>
                </div>
                <div className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  formData.eudr_cvn === "CVN" 
                    ? "border-[#860063] bg-[#860063]/5" 
                    : "border-gray-200 hover:border-gray-300"
                }`}>
                  <RadioGroupItem value="CVN" id="cvn-popup" />
                  <Label htmlFor="cvn-popup" className="cursor-pointer font-semibold text-base flex-1">
                    CVN
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowCertificationDialog(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmCertification}
                disabled={!formData.eudr_cvn || createMutation.isPending}
                className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063]"
              >
                <Save className="w-4 h-4 mr-2" />
                {createMutation.isPending ? 'Salvando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLineRequiredDialog} onOpenChange={setShowLineRequiredDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Campo Obrigatório
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800 mb-3 text-center">
                <strong>⚠️ Selecione a linha de recebimento</strong>
              </p>
              <p className="text-sm text-red-700 text-center">
                A linha é obrigatória para criar um agendamento. Por favor, escolha uma linha antes de continuar.
              </p>
            </div>
            <Button
              onClick={() => setShowLineRequiredDialog(false)}
              className="w-full bg-gradient-to-r from-[#860063] to-[#6b004f]"
            >
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}