import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Package, TrendingUp, Clock, Truck, Weight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { format, isSameDay, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import StatsCard from "../components/dashboard/StatsCard";
import TodaySchedules from "../components/dashboard/TodaySchedules";
import DaySummary from "../components/dashboard/DaySummary";
import LineStatusCards from "../components/dashboard/LineStatusCards";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  const TODAY = new Date();
  
  // Estado para data selecionada - começa com hoje
  const [selectedDate, setSelectedDate] = useState(format(TODAY, 'yyyy-MM-dd'));

  const { data: schedulings = [], isLoading } = useQuery({
    queryKey: ['schedulings'],
    queryFn: () => base44.entities.Scheduling.list('-date'),
    placeholderData: [],
  });

  useEffect(() => {
    loadUser();
  }, []);

  // Auto-refresh a cada 30 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['schedulings'] });
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  // Usar selectedDate ao invés de todayStr
  const todaySchedulings = schedulings.filter(s => {
    try {
      return s.date === selectedDate;
    } catch {
      return false;
    }
  });

  const tomorrowSchedulings = schedulings.filter(s => {
    try {
      const tomorrow = format(addDays(new Date(selectedDate), 1), 'yyyy-MM-dd');
      return s.date === tomorrow;
    } catch {
      return false;
    }
  });

  const activeSchedulings = schedulings.filter(s => s.status === 'em_descarga' && s.date === selectedDate);
  const completedToday = todaySchedulings.filter(s => s.status === 'concluido');

  // Total recebido no dia selecionado (APENAS concluídos)
  const receivedToday = todaySchedulings.filter(s => 
    s.status === 'concluido'
  );
  const totalBagsReceived = receivedToday.reduce((sum, s) => sum + (s.quantity_bags || 0), 0);
  const totalTonsReceived = (totalBagsReceived * 60) / 1000;

  const totalBagsToday = todaySchedulings.reduce((sum, s) => sum + (s.quantity_bags || 0), 0);
  const totalTonsToday = (totalBagsToday * 60) / 1000;

  // Calcular percentual recebido (apenas concluídos)
  const percentReceived = totalBagsToday > 0 
    ? Math.round((totalBagsReceived / totalBagsToday) * 100) 
    : 0;

  const avgDischargeTime = () => {
    // Calcular tempo médio PONDERADO dos concluídos no dia selecionado
    const completedTodayWithTime = todaySchedulings.filter(s => 
      s.status === 'concluido' && s.end_time_actual
    );
    
    if (completedTodayWithTime.length === 0) return "00:00";
    
    let totalWeightedMinutes = 0;
    let totalBags = 0;
    
    completedTodayWithTime.forEach(s => {
      const startTime = s.start_time_actual || s.start_time;
      if (!startTime || !s.end_time_actual) return;
      
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = s.end_time_actual.split(':').map(Number);
      const minutes = (endH * 60 + endM) - (startH * 60 + startM);
      const bags = s.quantity_bags || 0;
      
      totalWeightedMinutes += minutes * bags;
      totalBags += bags;
    });
    
    if (totalBags === 0) return "00:00";
    
    const avgMinutes = Math.round(totalWeightedMinutes / totalBags);
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // Verificar se é hoje
  const isToday = selectedDate === format(TODAY, 'yyyy-MM-dd');

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-3"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 mb-1">
                Olá, {user?.full_name?.split(' ')[0] || 'Usuário'}
              </h1>
              <p className="text-xs md:text-sm text-gray-600">
                {format(new Date(selectedDate), "EEEE, d 'de' MMMM", { locale: ptBR })}
              </p>
            </div>
            
            {/* Filtro de Data */}
            <div className="flex items-center gap-2 backdrop-blur-xl bg-white/90 p-2 rounded-xl border-2 border-[#860063]/30 shadow-lg">
              <Calendar className="w-5 h-5 text-[#860063]" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-64 border-0 focus:border-0 focus:ring-0 bg-transparent font-semibold"
              />
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-3"
        >
          <motion.div variants={item}>
            <StatsCard
              title="Recebido"
              value={`${percentReceived}%`}
              icon={Calendar}
              color="purple"
              subtitle={`${totalBagsReceived.toLocaleString('pt-BR')} sacos recebidos`}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatsCard
              title="Em Descarga"
              value={activeSchedulings.length}
              icon={Truck}
              color="orange"
              subtitle={`${completedToday.length} concluídos`}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatsCard
              title="Volume Programado"
              value={`${totalTonsToday.toFixed(1)}MT`}
              icon={Weight}
              color="blue"
              subtitle={`${totalBagsToday.toLocaleString('pt-BR')} sacos`}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatsCard
              title="Tempo Médio"
              value={avgDischargeTime()}
              icon={Clock}
              color="green"
              subtitle="por descarga"
            />
          </motion.div>
        </motion.div>

        {/* Line Status Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-3"
        >
          <LineStatusCards 
            schedulings={schedulings}
            selectedDate={selectedDate}
            isToday={isToday}
          />
        </motion.div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2">
            <TodaySchedules 
              schedulings={todaySchedulings} 
              isLoading={isLoading}
              userProfile={user?.profile}
            />
          </div>
          <div>
            <DaySummary 
              schedulings={todaySchedulings} 
              isLoading={isLoading}
              selectedDate={selectedDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}