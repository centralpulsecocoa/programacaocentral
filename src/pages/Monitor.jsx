import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, Truck, Weight, Clock, Maximize2, Minimize2, Menu, Moon, Sun } from "lucide-react";
import { motion } from "framer-motion";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import LineStatusCards from "../components/dashboard/LineStatusCards";
import StatsCard from "../components/dashboard/StatsCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";

const OFI_LOGO_URL = "https://ofiturkey.com.tr/Content/images/ofi-logo-reverse.svg";

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
  concluido: "Concluido",
  cancelado: "Cancelado"
};

export default function Monitor() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null); // Added user state
  const TODAY = new Date();
  const todayStr = format(TODAY, 'yyyy-MM-dd');

  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [warehouseFilter, setWarehouseFilter] = useState({ central: true, fabrica: true, barra: true, ferraz: true });
  const [columnFilters, setColumnFilters] = useState({
    status: 'all',
    deposito: 'all',
    linha: 'all',
    certif: 'all',
    frete: 'all',
    contrato: 'all'
  });
  const { setOpen, open } = useSidebar();

  const { data: schedulings = [], isLoading } = useQuery({
    queryKey: ['schedulings'],
    queryFn: () => base44.entities.Scheduling.list('-date'),
    placeholderData: [],
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });



  // Auto-refresh a cada 30 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['schedulings'] });
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  // Atualizar relógio a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Detectar mudanças no fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Load user on mount
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

  // Verificar se é admin pelo role OU pelo email especial
  const isAdmin = () => {
    if (!user) return false;
    return user.role === 'admin' || user.email?.toLowerCase().includes('jjance');
  };

  const todaySchedulings = schedulings.filter(s => {
    try {
      if (s.date !== selectedDate) return false;
      
      const { central, fabrica, barra } = warehouseFilter;
      const warehouse = s.warehouse;

      // Verificar se o depósito está selecionado
      if (!warehouseFilter[warehouse]) return false;

      // Filtros de coluna
      if (columnFilters.status !== 'all' && s.status !== columnFilters.status) return false;
      if (columnFilters.deposito !== 'all' && s.warehouse !== columnFilters.deposito) return false;
      if (columnFilters.linha !== 'all' && s.line !== columnFilters.linha) return false;
      if (columnFilters.certif !== 'all' && (s.eudr_cvn || '-') !== columnFilters.certif) return false;
      if (columnFilters.frete !== 'all' && (s.apanha_status || '-') !== columnFilters.frete) return false;
      if (columnFilters.contrato !== 'all' && (s.contract || '-') !== columnFilters.contrato) return false;

      return true;
    } catch (e) {
      console.error("Error filtering scheduling:", e);
      return false;
    }
  }).sort((a, b) => a.start_time.localeCompare(b.start_time));

  // Opções únicas para os filtros (baseado nos dados do dia selecionado)
  const filterOptions = React.useMemo(() => {
    const daySchedulings = schedulings.filter(s => s.date === selectedDate);
    return {
      status: [...new Set(daySchedulings.map(s => s.status))].filter(Boolean),
      deposito: [...new Set(daySchedulings.map(s => s.warehouse))].filter(Boolean),
      linha: [...new Set(daySchedulings.map(s => s.line))].filter(Boolean).sort(),
      certif: [...new Set(daySchedulings.map(s => s.eudr_cvn || '-'))],
      frete: [...new Set(daySchedulings.map(s => s.apanha_status || '-'))],
      contrato: [...new Set(daySchedulings.map(s => s.contract || '-'))]
    };
  }, [schedulings, selectedDate]);

  const handleWarehouseFilterChange = (warehouse) => {
    setWarehouseFilter(prev => ({
      ...prev,
      [warehouse]: !prev[warehouse]
    }));
  };

  const activeSchedulings = schedulings.filter(s => s.status === 'em_descarga' && s.date === selectedDate);
  const completedToday = todaySchedulings.filter(s => s.status === 'concluido');

  const receivedToday = todaySchedulings.filter(s =>
    s.status === 'concluido'
  );
  const totalBagsReceived = receivedToday.reduce((sum, s) => sum + (s.quantity_bags || 0), 0);
  const totalTonsReceived = (totalBagsReceived * 60) / 1000;

  const totalBagsToday = todaySchedulings.reduce((sum, s) => sum + (s.quantity_bags || 0), 0);
  const totalTonsToday = (totalBagsToday * 60) / 1000;

  const percentReceived = totalBagsToday > 0
    ? Math.round((totalBagsReceived / totalBagsToday) * 100)
    : 0;

  const avgDischargeTime = () => {
    const completedTodayWithTime = todaySchedulings.filter(s =>
      s.status === 'concluido' && s.end_time_actual
    );

    if (completedTodayWithTime.length === 0) return "00:00";

    let totalWeightedMinutes = 0;
    let totalBags = 0;

    completedTodayWithTime.forEach(s => {
      const startTime = s.start_time_actual || s.start_time;
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

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return "-";
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setOpen(false);
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
  };

  const toggleSidebar = () => {
    setOpen(!open);
  };

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
  };

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

  const themeColors = isDarkTheme ? {
    bg: 'bg-[#646464]',
    banner: {
      primary: 'from-black via-gray-900 to-black',
      white: 'from-white via-gray-100 to-white',
      accent: 'from-[#FFD700] via-[#FFA500] to-[#FFD700]'
    },
    card: 'bg-gradient-to-br from-black to-gray-900',
    cardBorder: 'border-[#FFD700]/60',
    text: 'text-[#FFD700]',
    textSecondary: 'text-white',
    textMuted: 'text-gray-300',
    tableBg: 'bg-black',
    tableHeader: 'bg-black border-[#FFD700]',
    tableRow: 'border-[#FFD700]/40',
    tableText: 'text-white'
  } : {
    bg: 'bg-gradient-to-br from-gray-50 to-gray-100',
    banner: {
      primary: 'from-[#860063] via-[#a0007d] to-[#860063]',
      white: 'from-white via-gray-100 to-white',
      accent: 'from-[#F88D2A] via-[#ff9d3d] to-[#F88D2A]'
    },
    card: 'bg-white/95',
    cardBorder: 'border-purple-400/30',
    text: 'text-gray-900',
    textSecondary: 'text-gray-700',
    textMuted: 'text-gray-500',
    tableBg: 'bg-white/95',
    tableHeader: 'bg-gray-100 border-gray-200',
    tableRow: 'border-gray-200',
    tableText: 'text-gray-900'
  };

  return (
    <div className={`min-h-screen ${themeColors.bg} relative`}>
      {/* Banner com listras */}
      <div className="relative overflow-hidden shadow-xl">
        <div className={`bg-gradient-to-r ${themeColors.banner.primary} h-[90%] absolute top-0 left-0 right-0`} />
        <div className={`bg-gradient-to-r ${themeColors.banner.white} h-[6%] absolute left-0 right-0`} style={{ top: '90%' }} />
        <div className={`bg-gradient-to-r ${themeColors.banner.accent} h-[4%] absolute bottom-0 left-0 right-0`} />

        <div className="relative z-10 max-w-full mx-auto px-4 md:px-6 py-2 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-16 h-12 md:w-20 md:h-14 flex items-center justify-center">
              <img
                src={OFI_LOGO_URL}
                alt="OFI Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-base md:text-xl font-black text-white tracking-tight drop-shadow-lg">
                Central Pulse
              </h1>
              <p className="text-xs text-white/90 font-medium drop-shadow-md">
                Monitor de Operações
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-2 md:gap-3 w-full md:w-auto">
            <div className="flex gap-1">
              {!open && (
                <Button
                  onClick={toggleSidebar}
                  variant="outline"
                  size="sm"
                  className={`h-7 w-7 p-0 backdrop-blur-sm shadow-md border ${
                    isDarkTheme
                      ? 'bg-gradient-to-br from-[#FFD700] to-[#FFA500] hover:from-[#FFA500] hover:to-[#FFD700] border-[#FFD700]/50'
                      : 'bg-white hover:bg-gray-50 border-gray-300'
                  }`}
                  title="Mostrar Menu"
                >
                  <Menu className={`w-3 h-3 ${isDarkTheme ? 'text-gray-900' : 'text-[#860063]'}`} />
                </Button>
              )}
              {/* Botão de Tema - APENAS ADMIN */}
              {isAdmin() && (
                <Button
                  onClick={toggleTheme}
                  variant="outline"
                  size="sm"
                  className={`h-7 w-7 p-0 backdrop-blur-sm shadow-md border ${
                    isDarkTheme
                      ? 'bg-gradient-to-br from-[#FFD700] to-[#FFA500] hover:from-[#FFA500] hover:to-[#FFD700] border-[#FFD700]/50'
                      : 'bg-white hover:bg-gray-50 border-gray-300'
                  }`}
                  title={isDarkTheme ? "Tema Claro" : "Tema Escuro"}
                >
                  {isDarkTheme ? (
                    <Sun className="w-3 h-3 text-gray-900" />
                  ) : (
                    <Moon className="w-3 h-3 text-[#860063]" />
                  )}
                </Button>
              )}
              <Button
                onClick={toggleFullscreen}
                variant="outline"
                size="sm"
                className={`h-7 w-7 p-0 backdrop-blur-sm shadow-md border ${
                  isDarkTheme
                    ? 'bg-gradient-to-br from-[#FFD700] to-[#FFA500] hover:from-[#FFA500] hover:to-[#FFD700] border-[#FFD700]/50'
                    : 'bg-white hover:bg-gray-50 border-gray-300'
                }`}
                title={isFullscreen ? "Sair do Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className={`w-3 h-3 ${isDarkTheme ? 'text-gray-900' : 'text-[#860063]'}`} />
                ) : (
                  <Maximize2 className={`w-3 h-3 ${isDarkTheme ? 'text-gray-900' : 'text-[#860063]'}`} />
                )}
              </Button>
            </div>

            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md border backdrop-blur-sm ${
              isDarkTheme
                ? 'bg-black/50 border-[#FFD700]/50'
                : 'bg-white/90 border-gray-300'
            }`}>
              <Calendar className={`w-3 h-3 md:w-4 md:h-4 ${isDarkTheme ? 'text-[#FFD700]' : 'text-[#860063]'}`} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className={`bg-transparent border-none outline-none font-semibold text-xs ${
                  isDarkTheme ? 'text-white' : 'text-gray-900'
                }`}
              />
            </div>

            <div className="text-center md:text-right">
              <div className="text-white/90 text-xs drop-shadow-md">
                {format(currentTime, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </div>
              <div className="text-lg md:text-xl font-bold text-white font-mono drop-shadow-lg">
                {format(currentTime, 'HH:mm:ss')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - USANDO StatsCard */}
      <div className="max-w-full mx-auto px-4 md:px-6 py-2 md:py-3">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-2 md:mb-3"
        >
          <motion.div variants={item}>
            <StatsCard
              title="Recebido Hoje"
              value={`${percentReceived}%`}
              icon={Calendar}
              color="purple"
              subtitle={`${totalBagsReceived.toLocaleString('pt-BR')} sacos`}
              isDarkTheme={isDarkTheme}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatsCard
              title="Em Descarga"
              value={activeSchedulings.length}
              icon={Truck}
              color="orange"
              subtitle={`${completedToday.length} concluídos`}
              isDarkTheme={isDarkTheme}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatsCard
              title="Volume Programado"
              value={`${totalTonsToday.toFixed(1)}MT`}
              icon={Weight}
              color="blue"
              subtitle={`${(totalBagsToday / 1000).toFixed(0)}k sacos`}
              isDarkTheme={isDarkTheme}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatsCard
              title="Tempo Médio Hoje"
              value={avgDischargeTime()}
              icon={Clock}
              color="green"
              subtitle="por descarga"
              isDarkTheme={isDarkTheme}
            />
          </motion.div>
        </motion.div>

        {/* Line Status Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-2 md:mb-3"
        >
          <LineStatusCards
            schedulings={schedulings}
            isDarkTheme={isDarkTheme}
            selectedDate={selectedDate}
            isToday={selectedDate === todayStr}
          />
        </motion.div>

        {/* Tabela de Agendamentos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card className={`shadow-xl border ${themeColors.cardBorder} backdrop-blur-xl ${themeColors.tableBg}`}>
            <CardHeader className={`border-b ${isDarkTheme ? 'border-[#FFD700]/40 bg-black' : 'border-purple-400/20 bg-gradient-to-r from-[#860063]/10 via-purple-500/10 to-[#F88D2A]/10'} py-2 md:py-3`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <CardTitle className={`text-sm md:text-base font-bold ${isDarkTheme ? 'text-[#FFD700]' : 'bg-gradient-to-r from-[#860063] to-[#F88D2A] bg-clip-text text-transparent'}`}>
                  Agendamentos - {(() => {
                    try {
                      const date = new Date(selectedDate + 'T00:00:00');
                      return format(date, "dd/MM/yyyy");
                    } catch {
                      return selectedDate;
                    }
                  })()}
                </CardTitle>
                
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="filter-central"
                      checked={warehouseFilter.central}
                      onChange={() => handleWarehouseFilterChange('central')}
                      className="w-4 h-4 rounded border-2 border-gray-300 text-[#860063] focus:ring-[#860063] focus:ring-2 cursor-pointer"
                    />
                    <label
                      htmlFor="filter-central"
                      className={`text-xs font-medium cursor-pointer ${isDarkTheme ? 'text-white' : 'text-gray-700'}`}
                    >
                      Central
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="filter-fabrica"
                      checked={warehouseFilter.fabrica}
                      onChange={() => handleWarehouseFilterChange('fabrica')}
                      className="w-4 h-4 rounded border-2 border-gray-300 text-[#F88D2A] focus:ring-[#F88D2A] focus:ring-2 cursor-pointer"
                    />
                    <label
                      htmlFor="filter-fabrica"
                      className={`text-xs font-medium cursor-pointer ${isDarkTheme ? 'text-white' : 'text-gray-700'}`}
                    >
                      Fábrica
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="filter-barra"
                      checked={warehouseFilter.barra}
                      onChange={() => handleWarehouseFilterChange('barra')}
                      className="w-4 h-4 rounded border-2 border-gray-300 text-blue-600 focus:ring-blue-600 focus:ring-2 cursor-pointer"
                    />
                    <label
                      htmlFor="filter-barra"
                      className={`text-xs font-medium cursor-pointer ${isDarkTheme ? 'text-white' : 'text-gray-700'}`}
                    >
                      Barra
                    </label>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      id="filter-ferraz"
                      checked={warehouseFilter.ferraz}
                      onChange={() => handleWarehouseFilterChange('ferraz')}
                      className="w-4 h-4 rounded border-2 border-gray-300 text-purple-600 focus:ring-purple-600 focus:ring-2 cursor-pointer"
                    />
                    <label
                      htmlFor="filter-ferraz"
                      className={`text-xs font-medium cursor-pointer ${isDarkTheme ? 'text-white' : 'text-gray-700'}`}
                    >
                      Ferraz
                    </label>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className={`${themeColors.tableHeader} border-b`}>
                    <tr>
                      <th className={`px-2 py-1.5 text-left font-semibold ${themeColors.text}`}>
                        <select
                          value={columnFilters.status}
                          onChange={(e) => setColumnFilters({ ...columnFilters, status: e.target.value })}
                          className={`bg-transparent border-none outline-none cursor-pointer font-semibold text-xs w-full ${themeColors.text}`}
                        >
                          <option value="all">Status</option>
                          {filterOptions.status.map(s => (
                            <option key={s} value={s}>{statusLabels[s] || s}</option>
                          ))}
                        </select>
                      </th>
                      <th className={`px-2 py-1.5 text-left font-semibold ${themeColors.text}`}>Fornecedor</th>
                      <th className={`px-2 py-1.5 text-left font-semibold ${themeColors.text}`}>Qtd Sacos</th>
                      <th className={`px-2 py-1.5 text-left font-semibold ${themeColors.text}`}>
                        <select
                          value={columnFilters.deposito}
                          onChange={(e) => setColumnFilters({ ...columnFilters, deposito: e.target.value })}
                          className={`bg-transparent border-none outline-none cursor-pointer font-semibold text-xs w-full ${themeColors.text}`}
                        >
                          <option value="all">Depósito</option>
                          {filterOptions.deposito.map(d => (
                            <option key={d} value={d}>{d === 'central' ? 'Central' : d === 'fabrica' ? 'Fábrica' : d === 'barra' ? 'Barra' : d === 'ferraz' ? 'Ferraz' : d}</option>
                          ))}
                        </select>
                      </th>
                      <th className={`px-2 py-1.5 text-left font-semibold ${themeColors.text}`}>
                        <select
                          value={columnFilters.linha}
                          onChange={(e) => setColumnFilters({ ...columnFilters, linha: e.target.value })}
                          className={`bg-transparent border-none outline-none cursor-pointer font-semibold text-xs w-full ${themeColors.text}`}
                        >
                          <option value="all">Linha</option>
                          {filterOptions.linha.map(l => (
                            <option key={l} value={l}>L{l}</option>
                          ))}
                        </select>
                      </th>
                      <th className={`px-2 py-1.5 text-left font-semibold ${themeColors.text}`}>Início Agend.</th>
                      <th className={`px-2 py-1.5 text-left font-semibold ${themeColors.text}`}>Início Real</th>
                      <th className={`px-2 py-1.5 text-left font-semibold ${themeColors.text}`}>Fim Agend.</th>
                      <th className={`px-2 py-1.5 text-left font-semibold ${themeColors.text}`}>Fim Real</th>
                      <th className={`px-2 py-1.5 text-left font-semibold ${themeColors.text}`}>Duração</th>
                      <th className={`px-2 py-1.5 text-left font-semibold ${themeColors.text}`}>WB</th>
                      <th className={`px-2 py-1.5 text-left font-semibold ${themeColors.text}`}>Nº Carga</th>
                      <th className={`px-2 py-1.5 text-left font-semibold ${themeColors.text}`}>Rastreio</th>
                      <th className={`px-2 py-1.5 text-left font-semibold ${themeColors.text}`}>
                        <select
                          value={columnFilters.certif}
                          onChange={(e) => setColumnFilters({ ...columnFilters, certif: e.target.value })}
                          className={`bg-transparent border-none outline-none cursor-pointer font-semibold text-xs w-full ${themeColors.text}`}
                        >
                          <option value="all">Certif.</option>
                          {filterOptions.certif.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </th>
                      <th className={`px-2 py-1.5 text-left font-semibold ${themeColors.text}`}>
                        <select
                          value={columnFilters.frete}
                          onChange={(e) => setColumnFilters({ ...columnFilters, frete: e.target.value })}
                          className={`bg-transparent border-none outline-none cursor-pointer font-semibold text-xs w-full ${themeColors.text}`}
                        >
                          <option value="all">Frete</option>
                          {filterOptions.frete.map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </th>
                      <th className={`px-2 py-1.5 text-left font-semibold ${themeColors.text}`}>
                        <select
                          value={columnFilters.contrato}
                          onChange={(e) => setColumnFilters({ ...columnFilters, contrato: e.target.value })}
                          className={`bg-transparent border-none outline-none cursor-pointer font-semibold text-xs w-full ${themeColors.text}`}
                        >
                          <option value="all">Contrato</option>
                          {filterOptions.contrato.map(c => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {todaySchedulings.length === 0 ? (
                      <tr>
                        <td colSpan="16" className={`px-2 py-6 text-center ${themeColors.textMuted}`}>
                          Nenhum agendamento para esta data ou filtro selecionado
                        </td>
                      </tr>
                    ) : (
                      todaySchedulings.map((schedule, idx) => (
                        <tr
                          key={schedule.id}
                          className={`border-b ${themeColors.tableRow} ${isDarkTheme ? 'hover:bg-gray-900' : 'hover:bg-gray-50'} transition-colors ${
                            idx % 2 === 0
                              ? isDarkTheme ? 'bg-black' : 'bg-white'
                              : isDarkTheme ? 'bg-gray-950' : 'bg-gray-50/50'
                          }`}
                        >
                          <td className="px-2 py-1.5">
                            <Badge className={`${statusColors[schedule.status]} text-xs px-1.5 py-0`}>
                              {statusLabels[schedule.status]}
                            </Badge>
                          </td>
                          <td className={`px-2 py-1.5 font-medium ${themeColors.tableText}`}>{schedule.supplier}</td>
                          <td className={`px-2 py-1.5 ${themeColors.tableText}`}>{schedule.quantity_bags?.toLocaleString('pt-BR')}</td>
                          <td className={`px-2 py-1.5 ${themeColors.tableText} capitalize`}>{schedule.warehouse}</td>
                          <td className={`px-2 py-1.5 ${themeColors.tableText}`}>L{schedule.line}</td>
                          <td className={`px-2 py-1.5 ${themeColors.tableText}`}>{schedule.start_time}</td>
                          <td className={`px-2 py-1.5 ${themeColors.tableText}`}>{schedule.start_time_actual || '-'}</td>
                          <td className={`px-2 py-1.5 ${themeColors.tableText}`}>{schedule.end_time_predicted}</td>
                          <td className={`px-2 py-1.5 ${themeColors.tableText}`}>{schedule.end_time_actual || '-'}</td>
                          <td className={`px-2 py-1.5 ${themeColors.tableText}`}>
                            {schedule.end_time_actual && schedule.start_time_actual 
                              ? calculateDuration(schedule.start_time_actual, schedule.end_time_actual) 
                              : schedule.end_time_actual 
                              ? calculateDuration(schedule.start_time, schedule.end_time_actual)
                              : '-'}
                          </td>
                          <td className={`px-2 py-1.5 ${themeColors.tableText}`}>{schedule.wb_number || '-'}</td>
                          <td className={`px-2 py-1.5 ${themeColors.tableText}`}>
                            {schedule.load_number
                              ? <span className={`font-semibold ${isDarkTheme ? 'text-[#FFD700]' : 'text-[#860063]'}`}>{schedule.load_number}</span>
                              : <span className="text-gray-400">-</span>
                            }
                          </td>
                          <td className={`px-2 py-1.5 ${themeColors.tableText}`}>{schedule.tracking_code || '-'}</td>
                          <td className={`px-2 py-1.5 ${themeColors.tableText}`}>{schedule.eudr_cvn || '-'}</td>
                          <td className={`px-2 py-1.5 ${themeColors.tableText}`}>{schedule.apanha_status || '-'}</td>
                          <td className={`px-2 py-1.5 ${themeColors.tableText}`}>{schedule.contract || '-'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}