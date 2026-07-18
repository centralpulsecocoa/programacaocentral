import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, PieChart, Pie, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Calendar, Shield, Mail } from "lucide-react";
import { motion } from "framer-motion";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import html2canvas from "html2canvas";

const COLORS = ['#860063', '#F88D2A', '#6b004f', '#d97824', '#9d1876', '#22c55e', '#3b82f6', '#ef4444', '#8b5cf6', '#14b8a6'];

export default function VisaoPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const TODAY = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(TODAY), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(TODAY), 'yyyy-MM-dd'));
  const [warehouseFilter, setWarehouseFilter] = useState({ central: true, fabrica: true, barra: true, ferraz: true });
  const [originFilter, setOriginFilter] = useState("all");

  const { data: schedulings = [] } = useQuery({
    queryKey: ['visao-schedulings'],
    queryFn: () => base44.entities.Scheduling.list('-date'),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: qualityRecords = [] } = useQuery({
    queryKey: ['visao-quality'],
    queryFn: () => base44.entities.Quality.list('-date'),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ['visao-transfers'],
    queryFn: () => base44.entities.Transfer2082.list('-date'),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: deposits = [] } = useQuery({
    queryKey: ['visao-deposits'],
    queryFn: () => base44.entities.TransferDeposit.list('-date'),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: emailConfigs = [] } = useQuery({
    queryKey: ['email-configs'],
    queryFn: () => base44.entities.AppConfig.filter({ config_type: 'email_group' }),
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    staleTime: 0,
    refetchOnMount: 'always',
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

  const normalizeDate = (dateStr) => {
    if (!dateStr) return '';
    const str = String(dateStr);
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const parts = str.split(/[T ]/);
    return parts[0];
  };

  const filteredSchedulings = schedulings.filter(s => {
    if (!s.date) return false;
    const itemDate = normalizeDate(s.date);
    return itemDate >= startDate && itemDate <= endDate && warehouseFilter[s.warehouse];
  });
  const filteredQuality = qualityRecords.filter(q => {
    if (!q.date) return false;
    const itemDate = normalizeDate(q.date);
    if (itemDate < startDate || itemDate > endDate) return false;
    if (originFilter !== "all" && q.origin !== originFilter) return false;
    return true;
  });
  const filteredTransfers = transfers.filter(t => {
    if (!t.date) return false;
    const itemDate = normalizeDate(t.date);
    return itemDate >= startDate && itemDate <= endDate && warehouseFilter[t.location];
  });
  const filteredDeposits = deposits.filter(d => {
    if (!d.date) return false;
    const itemDate = normalizeDate(d.date);
    return itemDate >= startDate && itemDate <= endDate;
  });

  // === MÉTRICAS GERAIS ===
  const totalReceivedBags = filteredSchedulings.filter(s => s.status === 'concluido').reduce((sum, s) => sum + (s.actual_bags || 0), 0);
  const totalReceivedTons = (totalReceivedBags * 60) / 1000;
  const totalSchedulings = filteredSchedulings.length;
  const completedSchedulings = filteredSchedulings.filter(s => s.status === 'concluido').length;
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

    const cleanSupplierName = (name) => {
      const cleaned = name.replace(/^\d{1,7}\s*/, '').trim();
      const words = cleaned.split(/\s+/);
      const twoWords = words.slice(0, 2).join(' ');
      return twoWords.length > 17 ? twoWords.substring(0, 17) : twoWords;
    };

    return Object.entries(grouped)
      .map(([supplier, bags]) => ({
        supplier: cleanSupplierName(supplier),
        bags,
        tons: ((bags * 60) / 1000).toFixed(1),
        label: `${((bags * 60) / 1000).toFixed(1)}MT`
      }))
      .sort((a, b) => b.bags - a.bags)
      .slice(0, 10);
  }, [filteredSchedulings]);

  // === VOLUME POR ARMAZÉM ===
  const volumeByWarehouse = useMemo(() => {
    const grouped = { central: 0, fabrica: 0, barra: 0, ferraz: 0 };
    filteredSchedulings.filter(s => s.status === 'concluido').forEach(s => {
      if (s.warehouse && grouped[s.warehouse] !== undefined) {
        grouped[s.warehouse] += s.actual_bags || 0;
      }
    });
    const warehouseLabels = { central: 'Central', fabrica: 'Fábrica', barra: 'Barra', ferraz: 'Ferraz' };
    return Object.entries(grouped)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => ({ name: warehouseLabels[key], value }));
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

  // === QUALIDADE - UMIDADE MÉDIA PONDERADA POR ORIGEM ===
  const moistureByOrigin = useMemo(() => {
    const grouped = {};
    filteredQuality.forEach(q => {
      if (q.origin && q.moisture_percent != null) {
        if (!grouped[q.origin]) grouped[q.origin] = { sum: 0, count: 0 };
        grouped[q.origin].sum += q.moisture_percent;
        grouped[q.origin].count += 1;
      }
    });
    return Object.entries(grouped).map(([origin, { sum, count }]) => ({
      origin,
      avgMoisture: (sum / count).toFixed(2)
    })).sort((a, b) => b.avgMoisture - a.avgMoisture);
  }, [filteredQuality]);

  // === QUALIDADE - FFA MÉDIO PONDERADO POR ORIGEM ===
  const ffaByOrigin = useMemo(() => {
    const grouped = {};
    filteredQuality.forEach(q => {
      if (q.origin && q.ffa != null) {
        if (!grouped[q.origin]) grouped[q.origin] = { sum: 0, count: 0 };
        grouped[q.origin].sum += q.ffa;
        grouped[q.origin].count += 1;
      }
    });
    return Object.entries(grouped).map(([origin, { sum, count }]) => ({
      origin,
      avgFFA: (sum / count).toFixed(2)
    })).sort((a, b) => b.avgFFA - a.avgFFA);
  }, [filteredQuality]);

  // === QUALIDADE - MOFO MÉDIO PONDERADO POR ORIGEM ===
  const mouldByOrigin = useMemo(() => {
    const grouped = {};
    filteredQuality.forEach(q => {
      if (q.origin && q.mouldy_percent != null) {
        if (!grouped[q.origin]) grouped[q.origin] = { sum: 0, count: 0 };
        grouped[q.origin].sum += q.mouldy_percent;
        grouped[q.origin].count += 1;
      }
    });
    return Object.entries(grouped).map(([origin, { sum, count }]) => ({
      origin,
      avgMould: (sum / count).toFixed(2)
    })).sort((a, b) => b.avgMould - a.avgMould);
  }, [filteredQuality]);

  // === QUALIDADE - FUMAÇA MÉDIA PONDERADA POR ORIGEM ===
  const fumacaByOrigin = useMemo(() => {
    const grouped = {};
    filteredQuality.forEach(q => {
      const val = q.fumaca != null ? Number(q.fumaca) : null;
      if (q.origin && val != null && !isNaN(val)) {
        if (!grouped[q.origin]) grouped[q.origin] = { sum: 0, count: 0 };
        grouped[q.origin].sum += val;
        grouped[q.origin].count += 1;
      }
    });
    return Object.entries(grouped).map(([origin, { sum, count }]) => ({
      origin,
      avgFumaca: (sum / count).toFixed(2)
    })).sort((a, b) => b.avgFumaca - a.avgFumaca);
  }, [filteredQuality]);

  // === APROVAÇÕES DE QUALIDADE ===
  const approvalStats = useMemo(() => {
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

  // === VOLUME DIÁRIO ===
  const dailyVolume = useMemo(() => {
    const grouped = {};
    filteredSchedulings.filter(s => s.status === 'concluido' && s.date).forEach(s => {
      try {
        const dateStr = normalizeDate(s.date);
        const [year, month, day] = dateStr.split('-');
        const date = `${day}/${month}`;
        grouped[date] = (grouped[date] || 0) + (s.actual_bags || 0);
      } catch (e) {}
    });
    return Object.entries(grouped)
      .map(([date, bags]) => ({ date, bags }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30);
  }, [filteredSchedulings]);

  // === PERFORMANCE POR DEPÓSITO (T/H) ===
  const performancePorDeposito = useMemo(() => {
    const concluded = filteredSchedulings.filter(s =>
      s.status === 'concluido' && s.start_time_actual && s.end_time_actual && s.date
    );
    const dataByWarehouseAndDay = {};
    concluded.forEach(s => {
      const warehouse = s.warehouse === 'central' ? 'Central' :
                      s.warehouse === 'fabrica' ? 'Fábrica' :
                      s.warehouse === 'barra' ? 'Barra' : 'Ferraz';
      const day = s.date;
      const key = `${warehouse}_${day}`;
      const bags = s.actual_bags || s.quantity_bags || 0;
      const tons = (bags * 60) / 1000;
      if (!dataByWarehouseAndDay[key]) {
        dataByWarehouseAndDay[key] = { warehouse, day, totalTons: 0, startTimes: [], endTimes: [] };
      }
      dataByWarehouseAndDay[key].totalTons += tons;
      dataByWarehouseAndDay[key].startTimes.push(s.start_time_actual);
      dataByWarehouseAndDay[key].endTimes.push(s.end_time_actual);
    });
    const tonsPerHourByDay = Object.values(dataByWarehouseAndDay).map(dayData => {
      const startMinutes = Math.min(...dayData.startTimes.map(t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; }));
      const endMinutes = Math.max(...dayData.endTimes.map(t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; }));
      let totalMinutes = endMinutes - startMinutes;
      if (startMinutes < 12 * 60 && endMinutes > 12 * 60) totalMinutes -= 60;
      if (startMinutes < 18 * 60 && endMinutes > 18 * 60) totalMinutes -= 60;
      const totalHours = totalMinutes / 60;
      const tonsPerHour = totalHours > 0 ? dayData.totalTons / totalHours : 0;
      return { warehouse: dayData.warehouse, tonsPerHour };
    });
    const avgByWarehouse = {};
    tonsPerHourByDay.forEach(item => {
      if (!avgByWarehouse[item.warehouse]) avgByWarehouse[item.warehouse] = [];
      avgByWarehouse[item.warehouse].push(item.tonsPerHour);
    });
    return Object.entries(avgByWarehouse)
      .map(([warehouse, values]) => ({
        warehouse,
        tonsPerHour: (values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2)
      }))
      .sort((a, b) => b.tonsPerHour - a.tonsPerHour);
  }, [filteredSchedulings]);

  // === TEMPOS MÉDIOS ===
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
      if (!s.end_time_actual || !s.load_number) return;
      const qualityRecord = qualityRecords.find(q => q.sample === s.load_number);
      if (!qualityRecord || !qualityRecord.reception_time) return;
      try {
        const [endH, endM] = s.end_time_actual.split(':').map(Number);
        const [recH, recM] = qualityRecord.reception_time.split(':').map(Number);
        let diffMinutes = (recH * 60 + recM) - (endH * 60 + endM);
        if (diffMinutes < 0) return;
        if (diffMinutes > 0 && diffMinutes <= 120) matched.push(diffMinutes);
      } catch (e) {}
    });
    if (matched.length === 0) return null;
    const avgMinutes = Math.round(matched.reduce((sum, m) => sum + m, 0) / matched.length);
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    return { avgTime: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`, avgMinutes };
  }, [filteredSchedulings, qualityRecords]);

  const tempoMedioLiberacao = useMemo(() => {
    const withRelease = filteredSchedulings.filter(s => s.release_requested_date && s.released_date);
    if (withRelease.length === 0) return null;
    let totalMinutes = 0;
    withRelease.forEach(s => {
      const minutes = Math.round((new Date(s.released_date) - new Date(s.release_requested_date)) / (1000 * 60));
      if (minutes >= 0) totalMinutes += minutes;
    });
    const avgMinutes = Math.round(totalMinutes / withRelease.length);
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    return { avgTime: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`, avgMinutes };
  }, [filteredSchedulings]);

  const tempoCiclo = useMemo(() => {
    const peso = tempoMedioPesoBruto?.avgMinutes || 0;
    const descarga = tempoMedioDescarga?.avgMinutes || 0;
    const qualidade = tempoMedioQualidade?.avgMinutes || 0;
    const totalMinutes = peso + descarga + qualidade;
    if (totalMinutes === 0) return null;
    const avgMinutes = Math.round(totalMinutes);
    const hours = Math.floor(avgMinutes / 60);
    const mins = avgMinutes % 60;
    return { avgTime: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`, avgMinutes };
  }, [tempoMedioPesoBruto, tempoMedioDescarga, tempoMedioQualidade]);

  const sendEmail = async () => {
    setIsSending(true);
    const recipient = 'jose.j.santos@ofi.com';
    try {
      toast.info("Capturando página...", { duration: 2000 });
      const sendButton = document.querySelector('[data-email-send-button]');
      const datePickers = document.querySelectorAll('[data-date-picker]');
      const dateDisplays = document.querySelectorAll('[data-date-display]');
      if (sendButton) sendButton.style.display = 'none';
      datePickers.forEach(picker => picker.style.display = 'none');
      dateDisplays.forEach(display => display.style.display = 'block');
      await new Promise(resolve => setTimeout(resolve, 500));
      const element = document.querySelector('.min-h-screen.bg-white');
      if (!element) throw new Error('Elemento não encontrado');
      const canvas = await html2canvas(element, { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', logging: false });
      if (sendButton) sendButton.style.display = '';
      datePickers.forEach(picker => picker.style.display = '');
      dateDisplays.forEach(display => display.style.display = 'none');
      toast.info('Processando imagem...', { duration: 2000 });
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => { if (b) resolve(b); else reject(new Error('Falha ao converter canvas')); }, 'image/png', 0.95);
      });
      toast.info('Fazendo upload...', { duration: 3000 });
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => { reader.onloadend = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(blob); });
      const base64Data = await base64Promise;
      const uploadResponse = await base44.functions.invoke('uploadInsightsImage', { imageData: base64Data, fileName: `visao-${Date.now()}.png` });
      if (!uploadResponse?.data?.file_url) throw new Error('Upload falhou');
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const [year, month] = startDate.split('-');
      const monthYear = `${monthNames[parseInt(month) - 1]}/${year}`;
      const emailBody = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f5f5f5;"><div style="max-width:100%;margin:0 auto;"><img src="${uploadResponse.data.file_url}" alt="Visão Executiva" style="max-width:100%;height:auto;display:block;" /></div></body></html>`;
      await base44.integrations.Core.SendEmail({ to: recipient, subject: `Visão Executiva Central Pulse - ${monthYear}`, body: emailBody });
      toast.success('✅ Email enviado com sucesso!', { description: `Enviado para ${recipient}`, duration: 5000 });
    } catch (error) {
      toast.error('❌ Erro ao enviar email', { description: error.message, duration: 6000 });
    } finally {
      setIsSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[#860063]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-2 md:p-4">
      <div className="max-w-full mx-auto">
        {/* HEADER */}
        <div className="mb-4 rounded-lg overflow-hidden shadow-lg">
          <div className="bg-[#860063] p-4">
            <div className="flex items-start gap-4 mb-3">
              <div className="w-24 h-16 flex items-center justify-center flex-shrink-0">
                <img src="https://ofiturkey.com.tr/Content/images/ofi-logo-reverse.svg" alt="OFI Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 text-center">
                <p className="text-white font-bold text-xs tracking-wider mb-1">OLAM FOOD INGREDIENTS</p>
                <h1 className="text-2xl font-black text-white mb-2">📊 VISÃO EXECUTIVA</h1>
              </div>

            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-white flex-shrink-0" />
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-40 bg-white/90 border-0 text-sm font-semibold" data-date-picker />
                <span className="text-white font-bold" data-date-display style={{ display: 'none' }}>{startDate.split('-').reverse().join('/')}</span>
                <span className="text-white font-bold">até</span>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-40 bg-white/90 border-0 text-sm font-semibold" data-date-picker />
                <span className="text-white font-bold" data-date-display style={{ display: 'none' }}>{endDate.split('-').reverse().join('/')}</span>
              </div>
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <span className="text-white text-xs font-bold">Origem:</span>
                <select value={originFilter} onChange={(e) => setOriginFilter(e.target.value)} className="bg-white/90 text-gray-800 text-xs font-semibold rounded px-2 py-1 border-0 cursor-pointer">
                  <option value="all">Todas</option>
                  <option value="BAHIA">Bahia</option>
                  <option value="PARÁ">Pará</option>
                  <option value="GHANA">Ghana</option>
                  <option value="MARFIM">Marfim</option>
                  <option value="ESPIRITO SANTO">Espírito Santo</option>
                  <option value="RONDÔNIA">Rondônia</option>
                  <option value="TOCANTINS">Tocantins</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-white text-xs font-bold">Depósito:</span>
                {['central', 'fabrica', 'barra', 'ferraz'].map(wh => (
                  <div key={wh} className="flex items-center gap-1.5">
                    <input type="checkbox" id={`filter-${wh}`} checked={warehouseFilter[wh]} onChange={() => setWarehouseFilter(prev => ({ ...prev, [wh]: !prev[wh] }))} className="w-4 h-4 rounded border-2 border-white/30 bg-white/20 text-white focus:ring-white focus:ring-2 cursor-pointer" />
                    <label htmlFor={`filter-${wh}`} className="text-white text-xs font-medium cursor-pointer capitalize">{wh === 'fabrica' ? 'Fábrica' : wh.charAt(0).toUpperCase() + wh.slice(1)}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-white" style={{ height: '5px' }}></div>
          <div className="bg-[#F88D2A]" style={{ height: '16px' }}></div>
        </div>

        {/* CARDS COMPACTOS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #860063 0%, #6b004f 100%)' }}>
            <div className="p-3 text-center">
              <div className="text-2xl mb-1">📦</div>
              <p className="text-white/80 text-xs font-bold mb-1">Total Recebido</p>
              <p className="text-2xl font-black text-white">{totalReceivedTons.toFixed(1)} MT</p>
              <p className="text-white/70 text-xs">{totalReceivedBags.toLocaleString('pt-BR')} sacos</p>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}>
            <div className="p-3 text-center">
              <div className="text-2xl mb-1">✅</div>
              <p className="text-white/80 text-xs font-bold mb-1">Agendamentos</p>
              <p className="text-2xl font-black text-white">{totalSchedulings}</p>
              <p className="text-white/70 text-xs">{completedSchedulings} concluídos</p>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}>
            <div className="p-3 text-center">
              <div className="text-2xl mb-1">🛡️</div>
              <p className="text-white/80 text-xs font-bold mb-1">Qualidade</p>
              <p className="text-2xl font-black text-white">{filteredQuality.length}</p>
              <p className="text-white/70 text-xs">{deviatedQualityRecords} desvios</p>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #F88D2A 0%, #d97824 100%)' }}>
            <div className="p-3 text-center">
              <div className="text-2xl mb-1">🚚</div>
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
              <div className="flex items-center gap-2"><span className="text-lg">📈</span><h3 className="text-sm font-black text-white">VOLUME DIÁRIO</h3></div>
            </div>
            <div className="bg-white p-3">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={dailyVolume}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#6b7280' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '2px solid #860063', fontSize: '11px' }} />
                  <Line type="monotone" dataKey="bags" stroke="#860063" strokeWidth={2} name="Sacos" dot={{ fill: '#F88D2A', r: 4 }} label={{ position: 'top', fontSize: 9, fontWeight: 'bold' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-lg overflow-hidden shadow border-2 border-[#F88D2A]/20">
            <div className="bg-gradient-to-r from-[#F88D2A] to-[#860063] p-3">
              <div className="flex items-center gap-2"><span className="text-lg">📦</span><h3 className="text-sm font-black text-white">TOP 10 FORNECEDORES</h3></div>
            </div>
            <div className="bg-white p-3">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={receiptBySupplier} layout="vertical" margin={{ right: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#6b7280' }} />
                  <YAxis dataKey="supplier" type="category" width={70} tick={{ fontSize: 7, fill: '#6b7280' }} interval={0} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '2px solid #F88D2A', fontSize: '11px' }} />
                  <Bar dataKey="bags" fill="#F88D2A" name="Sacos" radius={[0, 4, 4, 0]} label={{ position: 'right', dataKey: 'label', fontSize: 9, fontWeight: 'bold', fill: '#6b7280' }}>
                    {receiptBySupplier.map((entry, index) => (<Cell key={`cell-${index}`} fill="#F88D2A" />))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* PIZZAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {[
            { title: 'VOLUME ARMAZÉM', emoji: '📦', data: volumeByWarehouse, dataKey: 'value', color: '#860063', nameKey: 'name', colorMap: { 'Central': '#860063', 'Fábrica': '#F88D2A', 'Barra': '#3b82f6', 'Ferraz': '#22c55e' } },
            { title: 'STATUS', emoji: '⏰', data: statusDistribution, dataKey: 'value', color: '#F88D2A', nameKey: 'name', colorMap: { 'Cancelado': '#ef4444', 'Agendado': '#3b82f6', 'Aguardando': '#eab308', 'Em Descarga': '#F88D2A', 'Concluído': '#860063' } },
            { title: 'APROVAÇÕES', emoji: '✅', data: approvalStats, dataKey: 'value', color: '#22c55e', nameKey: 'name', colorMap: { 'Aprovados': '#22c55e', 'Devolvidos': '#ef4444' } },
          ].map(({ title, emoji, data, dataKey, color, nameKey, colorMap }) => (
            <div key={title} className="rounded-lg overflow-hidden shadow">
              <div className="bg-[#860063] p-2"><div className="flex items-center gap-2"><span className="text-sm">{emoji}</span><h3 className="text-xs font-black text-white">{title}</h3></div></div>
              <div className="bg-white" style={{ height: '3px' }}></div>
              <div className="bg-[#F88D2A]" style={{ height: '8px' }}></div>
              <div className="bg-white p-2">
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={data} cx="55%" cy="50%" outerRadius={45} dataKey={dataKey} label={(entry) => entry[dataKey]} labelLine={false} style={{ fontSize: '10px', fontWeight: 'bold' }}>
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colorMap[entry[nameKey]] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: `2px solid ${color}`, fontSize: '9px' }} />
                    <Legend layout="vertical" align="left" verticalAlign="middle" wrapperStyle={{ fontSize: '8px', paddingLeft: '5px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>

        {/* TEMPOS MÉDIOS */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 mb-4">
          {tempoMedioPesoBruto && (
            <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #d97824 0%, #c46d1f 100%)' }}>
              <div className="p-2 text-center">
                <p className="text-white/90 text-[10px] font-bold mb-1">Chamada → Peso</p>
                <p className="text-xl font-black text-white">{tempoMedioPesoBruto.avgTime}</p>
                <p className="text-white/70 text-[10px]">{tempoMedioPesoBruto.avgMinutes} minutos</p>
              </div>
            </div>
          )}
          {tempoMedioDescarga && (
            <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #b85d38 0%, #a54d4d 100%)' }}>
              <div className="p-2 text-center">
                <p className="text-white/90 text-[10px] font-bold mb-1">Tempo de Descarga</p>
                <p className="text-xl font-black text-white">{tempoMedioDescarga.avgTime}</p>
                <p className="text-white/70 text-[10px]">{tempoMedioDescarga.avgMinutes} minutos</p>
              </div>
            </div>
          )}
          {tempoMedioQualidade && (
            <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #9d3d56 0%, #8e2f58 100%)' }}>
              <div className="p-2 text-center">
                <p className="text-white/90 text-[10px] font-bold mb-1">Fim → Qualidade</p>
                <p className="text-xl font-black text-white">{tempoMedioQualidade.avgTime}</p>
                <p className="text-white/70 text-[10px]">{tempoMedioQualidade.avgMinutes} minutos</p>
              </div>
            </div>
          )}
          {tempoCiclo && (
            <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #860063 0%, #6b004f 100%)' }}>
              <div className="p-2 text-center">
                <p className="text-white/90 text-[10px] font-bold mb-1">Tempo de Ciclo</p>
                <p className="text-xl font-black text-white">{tempoCiclo.avgTime}</p>
                <p className="text-white/70 text-[10px]">{tempoCiclo.avgMinutes} minutos</p>
              </div>
            </div>
          )}
          {tempoMedioLiberacao && (
            <div className="rounded-lg overflow-hidden shadow" style={{ background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' }}>
              <div className="p-2 text-center">
                <p className="text-white/90 text-[10px] font-bold mb-1">Tempo Liberação GR</p>
                <p className="text-xl font-black text-white">{tempoMedioLiberacao.avgTime}</p>
                <p className="text-white/70 text-[10px]">{tempoMedioLiberacao.avgMinutes} minutos</p>
              </div>
            </div>
          )}
        </div>

        {/* PERFORMANCE POR DEPÓSITO */}
        <div className="rounded-lg overflow-hidden shadow border-2 border-orange-200 mb-4">
          <div className="bg-gradient-to-r from-[#F88D2A] to-[#860063] p-2">
            <div className="flex items-center gap-2"><span className="text-sm">📈</span><h3 className="text-xs font-black text-white">PERFORMANCE POR DEPÓSITO (T/H)</h3></div>
          </div>
          <div className="bg-white p-3">
            <div className="flex gap-3">
              {performancePorDeposito.map((item, idx) => {
                const bgColors = ['linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', 'linear-gradient(135deg, #F88D2A 0%, #d97824 100%)', 'linear-gradient(135deg, #860063 0%, #6b004f 100%)', 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'];
                return (
                  <div key={item.warehouse} className="flex-1 text-center p-3 rounded-lg" style={{ background: bgColors[idx % bgColors.length] }}>
                    <p className="text-xs font-bold text-white mb-1">{item.warehouse}</p>
                    <p className="text-2xl font-black text-white">{item.tonsPerHour}</p>
                    <p className="text-[10px] text-white/80">ton/hora</p>
                  </div>
                );
              })}
              {performancePorDeposito.length === 0 && (<div className="w-full text-center text-gray-500 py-4 text-xs">Sem dados de performance</div>)}
            </div>
          </div>
        </div>

        {/* BARRAS QUALIDADE */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[
            { title: 'UMIDADE POR ORIGEM', emoji: '💧', data: moistureByOrigin, dataKey: 'avgMoisture', nameKey: 'origin', color: '#3b82f6', borderColor: '#3b82f6' },
            { title: 'FFA POR ORIGEM', emoji: '📊', data: ffaByOrigin, dataKey: 'avgFFA', nameKey: 'origin', color: '#8b5cf6', borderColor: '#8b5cf6' },
            { title: 'MOFO POR ORIGEM', emoji: '⚠️', data: mouldByOrigin, dataKey: 'avgMould', nameKey: 'origin', color: '#ef4444', borderColor: '#ef4444' },
            { title: 'FUMAÇA POR ORIGEM', emoji: '🌫️', data: fumacaByOrigin, dataKey: 'avgFumaca', nameKey: 'origin', color: '#64748b', borderColor: '#64748b' },
          ].map(({ title, emoji, data, dataKey, nameKey, color, borderColor }) => (
            <div key={title} className="rounded-lg overflow-hidden shadow">
              <div className="bg-[#860063] p-2"><div className="flex items-center gap-2"><span className="text-sm">{emoji}</span><h3 className="text-xs font-black text-white">{title}</h3></div></div>
              <div className="bg-white" style={{ height: '3px' }}></div>
              <div className="bg-[#F88D2A]" style={{ height: '8px' }}></div>
              <div className="bg-white p-3">
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey={nameKey} interval={0} height={45} tick={(props) => {
                      const { x, y, payload, index } = props;
                      const offset = index % 2 === 0 ? 8 : 22;
                      return <text x={x} y={y + offset} textAnchor="middle" fontSize={8} fill="#6b7280">{payload.value}</text>;
                    }} />
                    <YAxis tick={{ fontSize: 9, fill: '#6b7280' }} domain={[0, (dataMax) => dataMax === 0 ? 1 : parseFloat((dataMax * 1.5).toFixed(2))]} allowDataOverflow={false} tickFormatter={(v) => Number(v).toFixed(2)} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: `2px solid ${borderColor}`, fontSize: '10px' }} />
                    <Bar dataKey={dataKey} fill={color} name={title} radius={[4, 4, 0, 0]} minPointSize={2} label={{ position: 'top', fontSize: 9, fontWeight: 'bold' }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>

        {/* RODAPÉ */}
        <div className="rounded-lg overflow-hidden shadow mt-4" style={{ background: 'linear-gradient(135deg, #860063 0%, #F88D2A 100%)' }}>
          <div className="p-3 text-center">
            <p className="text-white text-xs font-bold">🏭 OLAM FOOD INGREDIENTS • Central Pulse</p>
          </div>
        </div>
      </div>
    </div>
  );
}