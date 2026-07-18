import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { TrendingUp, Package, CheckCircle, AlertCircle, Truck, Clock, Calendar, Shield, Activity, Droplets } from "lucide-react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth } from "date-fns";

const COLORS = ['#860063', '#F88D2A', '#6b004f', '#d97824', '#9d1876', '#22c55e', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6'];

export default function Insights2Page() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const TODAY = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(TODAY), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(TODAY), 'yyyy-MM-dd'));

  const { data: schedulings = [] } = useQuery({
    queryKey: ['insights-schedulings'],
    queryFn: () => base44.entities.Scheduling.list('-date'),
    initialData: [],
  });

  const { data: qualityRecords = [] } = useQuery({
    queryKey: ['insights-quality'],
    queryFn: () => base44.entities.Quality.list('-date'),
    initialData: [],
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ['insights-transfers'],
    queryFn: () => base44.entities.Transfer2082.list('-date'),
    initialData: [],
  });

  const { data: deposits = [] } = useQuery({
    queryKey: ['insights-deposits'],
    queryFn: () => base44.entities.TransferDeposit.list('-date'),
    initialData: [],
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setLoading(false);
    } catch (error) {
      console.error("Error loading user:", error);
      setLoading(false);
    }
  };

  // Filtrar dados pelo período
  const filteredSchedulings = schedulings.filter(s => s.date >= startDate && s.date <= endDate);
  const filteredQuality = qualityRecords.filter(q => q.date >= startDate && q.date <= endDate);
  const filteredTransfers = transfers.filter(t => t.date >= startDate && t.date <= endDate);
  const filteredDeposits = deposits.filter(d => d.date >= startDate && d.date <= endDate);

  // === MÉTRICAS GERAIS ===
  const totalReceivedBags = filteredSchedulings.filter(s => s.status === 'concluido').reduce((sum, s) => sum + (s.actual_bags || 0), 0);
  const totalReceivedTons = (totalReceivedBags * 60) / 1000;
  const totalSchedulings = filteredSchedulings.length;
  const completedSchedulings = filteredSchedulings.filter(s => s.status === 'concluido').length;
  const completionRate = totalSchedulings > 0 ? ((completedSchedulings / totalSchedulings) * 100).toFixed(1) : 0;
  const deviatedQualityRecords = filteredQuality.filter(q => {
    return (
      (q.moisture_percent != null && q.moisture_percent > 12.1) ||
      (q.fumaca != null && Number(q.fumaca) > 6) ||
      (q.mouldy_percent != null && q.mouldy_percent > 25)
    );
  }).length;

  // === RECEBIMENTO POR FORNECEDOR (TOP 10) ===
  const receiptBySupplier = useMemo(() => {
    const grouped = {};
    filteredSchedulings
      .filter(s => 
        s.status === 'concluido' && 
        s.supplier && 
        !s.supplier.toLowerCase().includes('transfer') &&
        !s.supplier.toLowerCase().includes('filial')
      )
      .forEach(s => {
        if (!grouped[s.supplier]) grouped[s.supplier] = 0;
        grouped[s.supplier] += s.actual_bags || 0;
      });
    
    const abbreviateName = (name) => {
      if (name.length <= 13) return name;
      return name.substring(0, 13);
    };
    
    return Object.entries(grouped)
      .map(([supplier, bags]) => ({ 
        supplier: abbreviateName(supplier), 
        bags,
        tons: ((bags * 60) / 1000).toFixed(1)
      }))
      .sort((a, b) => b.bags - a.bags)
      .slice(0, 10);
  }, [filteredSchedulings]);

  // === VOLUME POR ARMAZÉM ===
  const volumeByWarehouse = useMemo(() => {
    const grouped = { central: 0, fabrica: 0 };
    filteredSchedulings.filter(s => s.status === 'concluido').forEach(s => {
      grouped[s.warehouse] = (grouped[s.warehouse] || 0) + (s.actual_bags || 0);
    });
    return [
      { name: 'Central', value: grouped.central },
      { name: 'Fábrica', value: grouped.fabrica }
    ];
  }, [filteredSchedulings]);

  // === STATUS DOS AGENDAMENTOS ===
  const statusDistribution = useMemo(() => {
    const grouped = {};
    filteredSchedulings.forEach(s => {
      grouped[s.status] = (grouped[s.status] || 0) + 1;
    });
    const labels = {
      agendado: 'Agendado',
      aguardando: 'Aguardando',
      em_descarga: 'Em Descarga',
      concluido: 'Concluído',
      cancelado: 'Cancelado'
    };
    return Object.entries(grouped).map(([status, count]) => ({
      name: labels[status] || status,
      value: count
    }));
  }, [filteredSchedulings]);

  // === QUALIDADE - UMIDADE MÉDIA POR ORIGEM ===
  const moistureByOrigin = useMemo(() => {
    const grouped = {};
    filteredQuality.forEach(q => {
      if (q.origin && q.moisture_percent != null) {
        if (!grouped[q.origin]) grouped[q.origin] = [];
        grouped[q.origin].push(q.moisture_percent);
      }
    });
    return Object.entries(grouped).map(([origin, values]) => ({
      origin,
      avgMoisture: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
    })).sort((a, b) => b.avgMoisture - a.avgMoisture);
  }, [filteredQuality]);

  // === QUALIDADE - FFA MÉDIO POR ORIGEM ===
  const ffaByOrigin = useMemo(() => {
    const grouped = {};
    filteredQuality.forEach(q => {
      if (q.origin && q.ffa != null) {
        if (!grouped[q.origin]) grouped[q.origin] = [];
        grouped[q.origin].push(q.ffa);
      }
    });
    return Object.entries(grouped).map(([origin, values]) => ({
      origin,
      avgFFA: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
    })).sort((a, b) => b.avgFFA - a.avgFFA);
  }, [filteredQuality]);

  // === QUALIDADE - MOFO MÉDIO POR ORIGEM ===
  const mouldByOrigin = useMemo(() => {
    const grouped = {};
    filteredQuality.forEach(q => {
      if (q.origin && q.mouldy_percent != null) {
        if (!grouped[q.origin]) grouped[q.origin] = [];
        grouped[q.origin].push(q.mouldy_percent);
      }
    });
    return Object.entries(grouped).map(([origin, values]) => ({
      origin,
      avgMould: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2)
    })).sort((a, b) => b.avgMould - a.avgMould);
  }, [filteredQuality]);

  // === APROVAÇÕES DE QUALIDADE ===
  const approvalStats = useMemo(() => {
    const total = filteredQuality.filter(q => q.moisture_approval_status && q.moisture_approval_status !== 'pendente').length;
    const approved = filteredQuality.filter(q => q.moisture_approval_status === 'aprovado').length;
    const rejected = filteredQuality.filter(q => q.moisture_approval_status === 'devolvido').length;
    return [
      { name: 'Aprovados', value: approved },
      { name: 'Devolvidos', value: rejected }
    ];
  }, [filteredQuality]);

  // === PRODUTOR (LINHA 04, ATÉ 50 SACOS) ===
  const producerStats = useMemo(() => {
    const producerSchedulings = filteredSchedulings.filter(s => 
      s.status === 'concluido' && 
      s.line === '04' && 
      s.quantity_bags <= 50
    );
    const totalBags = producerSchedulings.reduce((sum, s) => sum + (s.actual_bags || 0), 0);
    const totalTons = (totalBags * 60) / 1000;
    const uniqueProducers = new Set(producerSchedulings.map(s => s.supplier)).size;
    return { totalBags, totalTons, uniqueProducers };
  }, [filteredSchedulings]);

  // === DEPÓSITOS - STATUS ===
  const depositStats = useMemo(() => {
    const pending = filteredDeposits.filter(d => d.status === 'Pendente').length;
    const ok = filteredDeposits.filter(d => d.status === 'OK').length;
    return [
      { name: 'Pendente', value: pending },
      { name: 'OK', value: ok }
    ];
  }, [filteredDeposits]);

  // === VOLUME DIÁRIO ===
  const dailyVolume = useMemo(() => {
    const grouped = {};
    filteredSchedulings.filter(s => s.status === 'concluido').forEach(s => {
      const date = format(new Date(s.date), 'dd/MM');
      grouped[date] = (grouped[date] || 0) + (s.actual_bags || 0);
    });
    return Object.entries(grouped)
      .map(([date, bags]) => ({ date, bags }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [filteredSchedulings]);

  // === PERFORMANCE POR DEPÓSITO (T/H) ===
  const performancePorDeposito = useMemo(() => {
    const concluded = filteredSchedulings.filter(s => 
      s.status === 'concluido' && s.start_time_actual && s.end_time_actual
    );

    const dataByWarehouse = {};

    concluded.forEach(s => {
      const [startH, startM] = s.start_time_actual.split(':').map(Number);
      const [endH, endM] = s.end_time_actual.split(':').map(Number);
      const durationHours = ((endH * 60 + endM) - (startH * 60 + startM)) / 60;

      if (durationHours > 0) {
        const warehouse = s.warehouse === 'central' ? 'Central' : s.warehouse === 'fabrica' ? 'Fábrica' : 'Barra';
        const bags = s.actual_bags || s.quantity_bags || 0;
        const tons = (bags * 60) / 1000;

        if (!dataByWarehouse[warehouse]) {
          dataByWarehouse[warehouse] = { totalTons: 0, totalHours: 0 };
        }
        dataByWarehouse[warehouse].totalTons += tons;
        dataByWarehouse[warehouse].totalHours += durationHours;
      }
    });

    return Object.entries(dataByWarehouse)
      .map(([warehouse, data]) => ({
        warehouse,
        tonsPerHour: (data.totalTons / data.totalHours).toFixed(2)
      }))
      .sort((a, b) => b.tonsPerHour - a.tonsPerHour);
  }, [filteredSchedulings]);

  // === TEMPOS MÉDIOS ===
  const tempoMedioFila = useMemo(() => {
    const withQueueTime = filteredSchedulings.filter(s => s.arrival_time && s.call_time);
    if (withQueueTime.length === 0) return null;
    let totalMinutes = 0;
    withQueueTime.forEach(s => {
      const [arrivalH, arrivalM] = s.arrival_time.split(':').map(Number);
      const [callH, callM] = s.call_time.split(':').map(Number);
      const minutes = (callH * 60 + callM) - (arrivalH * 60 + arrivalM);
      if (minutes >= 0) totalMinutes += minutes;
    });
    const avgMinutes = Math.round(totalMinutes / withQueueTime.length);
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    return { avgTime: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`, avgMinutes };
  }, [filteredSchedulings]);

  const tempoMedioPesoBruto = useMemo(() => {
    const matched = [];
    filteredSchedulings.forEach(s => {
      if (!s.call_time || !s.gross_weight || !s.start_time_actual) return;
      const [callH, callM] = s.call_time.split(':').map(Number);
      const [startH, startM] = s.start_time_actual.split(':').map(Number);
      const minutes = (startH * 60 + startM) - (callH * 60 + callM);
      if (minutes >= 0) matched.push(minutes);
    });
    if (matched.length === 0) return null;
    const avgMinutes = Math.round(matched.reduce((sum, m) => sum + m, 0) / matched.length);
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    return { avgTime: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`, avgMinutes };
  }, [filteredSchedulings]);

  const tempoMedioDescarga = useMemo(() => {
    const matched = [];
    filteredSchedulings.forEach(s => {
      if (!s.start_time_actual || !s.end_time_actual) return;
      const [startH, startM] = s.start_time_actual.split(':').map(Number);
      const [endH, endM] = s.end_time_actual.split(':').map(Number);
      const minutes = (endH * 60 + endM) - (startH * 60 + startM);
      if (minutes >= 0) matched.push(minutes);
    });
    if (matched.length === 0) return null;
    const avgMinutes = Math.round(matched.reduce((sum, m) => sum + m, 0) / matched.length);
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    return { avgTime: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`, avgMinutes };
  }, [filteredSchedulings]);

  const tempoMedioQualidade = useMemo(() => {
    const matched = [];
    filteredSchedulings.forEach(s => {
      if (s.status !== 'concluido' || !s.updated_date || !s.load_number) return;
      const qualityRecord = filteredQuality.find(q => q.sample === s.load_number);
      if (!qualityRecord || !qualityRecord.created_date) return;
      const concludedDateTime = new Date(s.updated_date);
      const qualityDateTime = new Date(qualityRecord.created_date);
      const concludedDateStr = format(concludedDateTime, 'yyyy-MM-dd');
      const qualityDateStr = format(qualityDateTime, 'yyyy-MM-dd');
      if (concludedDateStr !== qualityDateStr) return;
      const diffMinutes = Math.round((qualityDateTime - concludedDateTime) / (1000 * 60));
      if (diffMinutes >= 0) matched.push(diffMinutes);
    });
    if (matched.length === 0) return null;
    const avgMinutes = Math.round(matched.reduce((sum, m) => sum + m, 0) / matched.length);
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    return { avgTime: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`, avgMinutes };
  }, [filteredSchedulings, filteredQuality]);

  const tempoMedioLiberacao = useMemo(() => {
    const withRelease = filteredSchedulings.filter(s => s.release_requested_date && s.released_date);
    if (withRelease.length === 0) return null;
    let totalMinutes = 0;
    withRelease.forEach(s => {
      const requestedDate = new Date(s.release_requested_date);
      const releasedDate = new Date(s.released_date);
      const minutes = Math.round((releasedDate - requestedDate) / (1000 * 60));
      if (minutes >= 0) totalMinutes += minutes;
    });
    const avgMinutes = Math.round(totalMinutes / withRelease.length);
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    return { avgTime: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`, avgMinutes };
  }, [filteredSchedulings]);

  const tempoCiclo = useMemo(() => {
    const matched = [];
    filteredSchedulings.forEach(s => {
      if (!s.call_time || !s.gross_weight || !s.start_time_actual || !s.end_time_actual || !s.tare_weight || !s.load_number) return;
      const qualityRecord = filteredQuality.find(q => q.sample === s.load_number);
      if (!qualityRecord || !qualityRecord.created_date) return;
      const qualityDateTime = new Date(qualityRecord.created_date);
      const schedulingDate = new Date(s.date + 'T00:00:00');
      if (format(schedulingDate, 'yyyy-MM-dd') !== format(qualityDateTime, 'yyyy-MM-dd')) return;
      const [callH, callM] = s.call_time.split(':').map(Number);
      const [startH, startM] = s.start_time_actual.split(':').map(Number);
      const [endH, endM] = s.end_time_actual.split(':').map(Number);
      const callMinutes = callH * 60 + callM;
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;
      const qualityMinutes = qualityDateTime.getHours() * 60 + qualityDateTime.getMinutes();
      if (callMinutes >= startMinutes || startMinutes >= endMinutes || endMinutes >= qualityMinutes) return;
      const minutes = qualityMinutes - callMinutes;
      if (minutes >= 0) matched.push(minutes);
    });
    if (matched.length === 0) return null;
    const avgMinutes = Math.round(matched.reduce((sum, m) => sum + m, 0) / matched.length);
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    return { avgTime: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`, avgMinutes };
  }, [filteredSchedulings, filteredQuality]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#860063] to-[#F88D2A] flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-white"></div>
      </div>
    );
  }

  if (user?.email !== 'jjancem@gmail.com') {
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
    <div className="min-h-screen bg-white p-2 md:p-4">
      <div className="max-w-full mx-auto">
        {/* HEADER COMPACTO PARA EMAIL */}
        <div className="mb-4 rounded-lg overflow-hidden shadow-lg">
          {/* Faixa Roxa 70% */}
          <div className="bg-[#860063] p-4" style={{ minHeight: '70%' }}>
            <div className="flex items-start gap-4 mb-3">
              <div className="w-24 h-16 flex items-center justify-center flex-shrink-0">
                <img
                  src="https://ofiturkey.com.tr/Content/images/ofi-logo-reverse.svg"
                  alt="OFI Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex-1 text-center">
                <p className="text-white font-bold text-xs tracking-wider mb-1">OLAM FOOD INGREDIENTS</p>
                <h1 className="text-2xl font-black text-white mb-2">📊 INSIGHTS OPERACIONAIS</h1>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <Calendar className="w-4 h-4 text-white flex-shrink-0" />
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40 bg-white/90 border-0 text-sm font-semibold"
              />
              <span className="text-white font-bold">até</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40 bg-white/90 border-0 text-sm font-semibold"
              />
            </div>
          </div>
          {/* Faixa Branca 10% */}
          <div className="bg-white" style={{ height: '5px' }}></div>
          {/* Faixa Laranja 20% */}
          <div className="bg-[#F88D2A]" style={{ height: '16px' }}></div>
        </div>

        {/* CARDS COMPACTOS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #860063 0%, #6b004f 100%)' }}>
            <div className="p-3 text-center">
              <Package className="w-6 h-6 text-white mx-auto mb-1" />
              <p className="text-white/80 text-xs font-bold mb-1">Total Recebido</p>
              <p className="text-2xl font-black text-white">{totalReceivedTons.toFixed(1)} MT</p>
              <p className="text-white/70 text-xs">{totalReceivedBags.toLocaleString('pt-BR')} sacos</p>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}>
            <div className="p-3 text-center">
              <CheckCircle className="w-6 h-6 text-white mx-auto mb-1" />
              <p className="text-white/80 text-xs font-bold mb-1">Agendamentos</p>
              <p className="text-2xl font-black text-white">{totalSchedulings}</p>
              <p className="text-white/70 text-xs">{completedSchedulings} concluídos</p>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
            <div className="p-3 text-center">
              <Shield className="w-6 h-6 text-white mx-auto mb-1" />
              <p className="text-white/80 text-xs font-bold mb-1">Qualidade</p>
              <p className="text-2xl font-black text-white">{filteredQuality.length}</p>
              <p className="text-white/70 text-xs">{deviatedQualityRecords} desvios</p>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #F88D2A 0%, #d97824 100%)' }}>
            <div className="p-3 text-center">
              <Truck className="w-6 h-6 text-white mx-auto mb-1" />
              <p className="text-white/80 text-xs font-bold mb-1">Produtor</p>
              <p className="text-2xl font-black text-white">{producerStats.totalTons.toFixed(1)} MT</p>
              <p className="text-white/70 text-xs">{producerStats.uniqueProducers} produtores</p>
            </div>
          </div>
        </div>

        {/* GRÁFICOS COMPACTOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
          <div className="rounded-lg overflow-hidden shadow border-2 border-[#860063]/20">
            <div className="bg-gradient-to-r from-[#860063] to-[#F88D2A] p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-white" />
                <h3 className="text-sm font-black text-white">VOLUME DIÁRIO</h3>
              </div>
            </div>
            <div className="bg-white p-3">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailyVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '2px solid #860063', fontSize: '11px' }} />
                  <Line type="monotone" dataKey="bags" stroke="#860063" strokeWidth={2} name="Sacos" dot={{ fill: '#F88D2A', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden shadow border-2 border-[#F88D2A]/20">
            <div className="bg-gradient-to-r from-[#F88D2A] to-[#860063] p-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-white" />
                <h3 className="text-sm font-black text-white">TOP 10 FORNECEDORES</h3>
              </div>
            </div>
            <div className="bg-white p-3">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={receiptBySupplier} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#6b7280' }} />
                  <YAxis dataKey="supplier" type="category" width={70} tick={{ fontSize: 7, fill: '#6b7280' }} interval={0} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '2px solid #F88D2A', fontSize: '11px' }} />
                  <Bar dataKey="bags" fill="#F88D2A" name="Sacos" radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (value, entry) => `${((value * 60) / 1000).toFixed(1)}MT`, fontSize: 9 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* PIZZAS COMPACTAS COM HEADER TRICOLOR */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg overflow-hidden shadow">
            <div className="bg-[#860063] p-2">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-white" />
                <h3 className="text-xs font-black text-white">VOLUME ARMAZÉM</h3>
              </div>
            </div>
            <div className="bg-white" style={{ height: '3px' }}></div>
            <div className="bg-[#F88D2A]" style={{ height: '8px' }}></div>
            <div className="bg-white p-2">
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie 
                    data={volumeByWarehouse} 
                    cx="60%" 
                    cy="50%" 
                    outerRadius={50} 
                    dataKey="value" 
                    label={(entry) => entry.value}
                    labelLine={false}
                    style={{ fontSize: '10px', fontWeight: 'bold' }}
                  >
                    <Cell fill="#860063" />
                    <Cell fill="#F88D2A" />
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '2px solid #860063', fontSize: '9px' }} />
                  <Legend layout="vertical" align="left" verticalAlign="middle" wrapperStyle={{ fontSize: '8px', paddingLeft: '5px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden shadow">
            <div className="bg-[#860063] p-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-white" />
                <h3 className="text-xs font-black text-white">STATUS</h3>
              </div>
            </div>
            <div className="bg-white" style={{ height: '3px' }}></div>
            <div className="bg-[#F88D2A]" style={{ height: '8px' }}></div>
            <div className="bg-white p-2">
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie 
                    data={statusDistribution} 
                    cx="60%" 
                    cy="50%" 
                    outerRadius={50} 
                    dataKey="value" 
                    label={(entry) => entry.value}
                    labelLine={false}
                    style={{ fontSize: '10px', fontWeight: 'bold' }}
                  >
                    {statusDistribution.map((entry, index) => {
                      const statusColors = {
                        'Cancelado': '#ef4444',
                        'Agendado': '#3b82f6',
                        'Aguardando': '#eab308',
                        'Em Descarga': '#F88D2A',
                        'Concluído': '#860063'
                      };
                      return <Cell key={`cell-${index}`} fill={statusColors[entry.name] || COLORS[index % COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '2px solid #F88D2A', fontSize: '9px' }} />
                  <Legend layout="vertical" align="left" verticalAlign="middle" wrapperStyle={{ fontSize: '8px', paddingLeft: '5px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden shadow">
            <div className="bg-[#860063] p-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-white" />
                <h3 className="text-xs font-black text-white">APROVAÇÕES</h3>
              </div>
            </div>
            <div className="bg-white" style={{ height: '3px' }}></div>
            <div className="bg-[#F88D2A]" style={{ height: '8px' }}></div>
            <div className="bg-white p-2">
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie 
                    data={approvalStats} 
                    cx="60%" 
                    cy="50%" 
                    outerRadius={50} 
                    dataKey="value" 
                    label={(entry) => entry.value}
                    labelLine={false}
                    style={{ fontSize: '10px', fontWeight: 'bold' }}
                  >
                    <Cell fill="#22c55e" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '2px solid #22c55e', fontSize: '9px' }} />
                  <Legend layout="vertical" align="left" verticalAlign="middle" wrapperStyle={{ fontSize: '8px', paddingLeft: '5px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* TEMPOS MÉDIOS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
          {tempoMedioFila && (
            <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' }}>
              <div className="p-2 text-center">
                <p className="text-white/90 text-[10px] font-bold mb-1">Tempo na Fila</p>
                <p className="text-xl font-black text-white">{tempoMedioFila.avgTime}</p>
                <p className="text-white/70 text-[10px]">{tempoMedioFila.avgMinutes} minutos</p>
              </div>
            </div>
          )}
          {tempoMedioPesoBruto && (
            <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
              <div className="p-2 text-center">
                <p className="text-white/90 text-[10px] font-bold mb-1">Chamada → Peso</p>
                <p className="text-xl font-black text-white">{tempoMedioPesoBruto.avgTime}</p>
                <p className="text-white/70 text-[10px]">{tempoMedioPesoBruto.avgMinutes} minutos</p>
              </div>
            </div>
          )}
          {tempoMedioDescarga && (
            <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}>
              <div className="p-2 text-center">
                <p className="text-white/90 text-[10px] font-bold mb-1">Tempo de Descarga</p>
                <p className="text-xl font-black text-white">{tempoMedioDescarga.avgTime}</p>
                <p className="text-white/70 text-[10px]">{tempoMedioDescarga.avgMinutes} minutos</p>
              </div>
            </div>
          )}
          {tempoMedioQualidade && (
            <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              <div className="p-2 text-center">
                <p className="text-white/90 text-[10px] font-bold mb-1">Fim → Qualidade</p>
                <p className="text-xl font-black text-white">{tempoMedioQualidade.avgTime}</p>
                <p className="text-white/70 text-[10px]">{tempoMedioQualidade.avgMinutes} minutos</p>
              </div>
            </div>
          )}
          {tempoCiclo && (
            <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)' }}>
              <div className="p-2 text-center">
                <p className="text-white/90 text-[10px] font-bold mb-1">Tempo de Ciclo</p>
                <p className="text-xl font-black text-white">{tempoCiclo.avgTime}</p>
                <p className="text-white/70 text-[10px]">{tempoCiclo.avgMinutes} minutos</p>
              </div>
            </div>
          )}
          {tempoMedioLiberacao && (
            <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)' }}>
              <div className="p-2 text-center">
                <p className="text-white/90 text-[10px] font-bold mb-1">Tempo Liberação</p>
                <p className="text-xl font-black text-white">{tempoMedioLiberacao.avgTime}</p>
                <p className="text-white/70 text-[10px]">{tempoMedioLiberacao.avgMinutes} minutos</p>
              </div>
            </div>
          )}
        </div>

        {/* BARRAS QUALIDADE COM HEADER TRICOLOR */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg overflow-hidden shadow">
            <div className="bg-[#860063] p-2">
              <div className="flex items-center gap-2">
                <Droplets className="w-4 h-4 text-white" />
                <h3 className="text-xs font-black text-white">UMIDADE POR ORIGEM</h3>
              </div>
            </div>
            <div className="bg-white" style={{ height: '3px' }}></div>
            <div className="bg-[#F88D2A]" style={{ height: '8px' }}></div>
            <div className="bg-white p-3">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={moistureByOrigin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="origin" tick={{ fontSize: 8, fill: '#6b7280' }} interval={0} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} domain={['dataMin - 0.5', 'dataMax + 0.5']} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '2px solid #3b82f6', fontSize: '10px' }} />
                  <Bar dataKey="avgMoisture" fill="#3b82f6" name="Umidade %" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 9, fontWeight: 'bold' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden shadow">
            <div className="bg-[#860063] p-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-white" />
                <h3 className="text-xs font-black text-white">FFA POR ORIGEM</h3>
              </div>
            </div>
            <div className="bg-white" style={{ height: '3px' }}></div>
            <div className="bg-[#F88D2A]" style={{ height: '8px' }}></div>
            <div className="bg-white p-3">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={ffaByOrigin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="origin" tick={{ fontSize: 8, fill: '#6b7280' }} interval={0} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} domain={['dataMin - 0.1', 'dataMax + 0.1']} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '2px solid #8b5cf6', fontSize: '10px' }} />
                  <Bar dataKey="avgFFA" fill="#8b5cf6" name="FFA" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 9, fontWeight: 'bold' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg overflow-hidden shadow">
            <div className="bg-[#860063] p-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-white" />
                <h3 className="text-xs font-black text-white">MOFO POR ORIGEM</h3>
              </div>
            </div>
            <div className="bg-white" style={{ height: '3px' }}></div>
            <div className="bg-[#F88D2A]" style={{ height: '8px' }}></div>
            <div className="bg-white p-3">
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={mouldByOrigin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="origin" tick={{ fontSize: 8, fill: '#6b7280' }} interval={0} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} domain={[0, (dataMax) => Math.ceil(dataMax)]} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '2px solid #ef4444', fontSize: '10px' }} />
                  <Bar dataKey="avgMould" fill="#ef4444" name="Mofo %" radius={[4, 4, 0, 0]} label={{ position: 'top', fontSize: 9, fontWeight: 'bold' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* PERFORMANCE POR DEPÓSITO */}
        <div className="rounded-lg overflow-hidden shadow border-2 border-orange-200 mb-4">
          <div className="bg-gradient-to-r from-[#F88D2A] to-[#860063] p-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-white" />
              <h3 className="text-xs font-black text-white">PERFORMANCE POR DEPÓSITO (T/H)</h3>
            </div>
          </div>
          <div className="bg-white p-3">
            <div className="grid grid-cols-3 gap-3">
              {performancePorDeposito.map((item, idx) => (
                <div key={item.warehouse} className="text-center p-3 rounded-lg" style={{ 
                  background: idx === 0 ? 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)' : 
                              idx === 1 ? 'linear-gradient(135deg, #F88D2A 0%, #d97824 100%)' : 
                              'linear-gradient(135deg, #860063 0%, #6b004f 100%)'
                }}>
                  <p className="text-xs font-bold text-white mb-1">{item.warehouse}</p>
                  <p className="text-2xl font-black text-white">{item.tonsPerHour}</p>
                  <p className="text-[10px] text-white/80">ton/hora</p>
                </div>
              ))}
              {performancePorDeposito.length === 0 && (
                <div className="col-span-3 text-center text-gray-500 py-4 text-xs">
                  Sem dados de performance
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RODAPÉ COMPACTO */}
        <div className="rounded-lg overflow-hidden shadow mt-4" style={{ background: 'linear-gradient(135deg, #860063 0%, #F88D2A 100%)' }}>
          <div className="p-3 text-center">
            <p className="text-white text-xs font-bold">🏭 OLAM FOOD INGREDIENTS • Central Pulse</p>
          </div>
        </div>
      </div>
    </div>
  );
}