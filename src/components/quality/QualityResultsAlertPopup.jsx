import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardCheck, X, Droplets, Activity, AlertCircle, Bell, ShieldAlert, Ban } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

// Limites de desvio de qualidade
const QUALITY_THRESHOLDS = {
  moisture_percent: { max: 12.1, label: "Umidade" },
  mouldy_percent: { max: 25, label: "Mofo" },
  fumaca: { max: 6.0, label: "Fumaça" },
};

function hasQualityDeviation(record) {
  if (record.moisture_percent != null && record.moisture_percent > QUALITY_THRESHOLDS.moisture_percent.max) return true;
  if (record.mouldy_percent != null && record.mouldy_percent > QUALITY_THRESHOLDS.mouldy_percent.max) return true;
  if (record.fumaca != null && !isNaN(parseFloat(record.fumaca)) && parseFloat(record.fumaca) > QUALITY_THRESHOLDS.fumaca.max) return true;
  return false;
}

function getDeviations(record) {
  const deviations = [];
  if (record.moisture_percent != null && record.moisture_percent > QUALITY_THRESHOLDS.moisture_percent.max) {
    deviations.push({ label: "Umidade", value: `${record.moisture_percent}%`, limit: `>${QUALITY_THRESHOLDS.moisture_percent.max}%` });
  }
  if (record.mouldy_percent != null && record.mouldy_percent > QUALITY_THRESHOLDS.mouldy_percent.max) {
    deviations.push({ label: "Mofo", value: `${record.mouldy_percent}%`, limit: `>${QUALITY_THRESHOLDS.mouldy_percent.max}%` });
  }
  if (record.fumaca != null && !isNaN(parseFloat(record.fumaca)) && parseFloat(record.fumaca) > QUALITY_THRESHOLDS.fumaca.max) {
    deviations.push({ label: "Fumaça", value: `${parseFloat(record.fumaca).toFixed(1)}%`, limit: `>${QUALITY_THRESHOLDS.fumaca.max}%` });
  }
  return deviations;
}

export default function QualityResultsAlertPopup({ user }) {
  const [dismissed, setDismissed] = useState([]);
  const [showAlert, setShowAlert] = useState(false);
  const [showBlockAlert, setShowBlockAlert] = useState(false);
  const audioRef = useRef(null);
  const previousCountRef = useRef(0);
  const previousBlockCountRef = useRef(0);

  const canReadQuality = user?.role === 'admin' || ['qualidade', 'analista_qualidade', 'classificador', 'gerente_originacao', 'supervisor', 'producao'].includes(user?.profile);

  const { data: qualityRecords = [] } = useQuery({
    queryKey: ['quality-recent'],
    queryFn: () => base44.entities.Quality.list('-created_date'),
    initialData: [],
    enabled: canReadQuality,
    retry: false,
    refetchInterval: canReadQuality ? 30000 : false,
  });

  const { data: schedulings = [] } = useQuery({
    queryKey: ['schedulings-recent'],
    queryFn: () => base44.entities.Scheduling.list('-updated_date'),
    initialData: [],
    refetchInterval: 30000,
  });

  const today = format(new Date(), 'yyyy-MM-dd');

  // Registros de qualidade recentes (últimos 10 minutos) do dia atual
  const recentQualityRecords = qualityRecords.filter(q => {
    if (dismissed.includes(q.id)) return false;
    if (q.date !== today) return false;
    const diffMinutes = (new Date() - new Date(q.created_date)) / (1000 * 60);
    return diffMinutes <= 10;
  });

  // Mapear sample (laudo) para fornecedor
  const getSupplierBySample = (sample) => {
    const scheduling = schedulings.find(s => s.load_number === sample || s.wb_number === sample);
    return scheduling?.supplier || 'Desconhecido';
  };

  // Separar: com desvio (bloqueio) vs sem desvio (liberar)
  const blockedRecords = recentQualityRecords.filter(q => hasQualityDeviation(q));
  const normalRecords = recentQualityRecords.filter(q => !hasQualityDeviation(q));

  // Agendamentos concluídos recentes (Transferência / Apanha)
  const recentTransfersApanha = schedulings.filter(s => {
    if (dismissed.includes(`schedule-${s.id}`)) return false;
    if (s.status !== 'concluido') return false;
    if (s.date !== today) return false;
    if (s.contract !== 'TRANSFERÊNCIA' && s.apanha_status !== 'Apanha') return false;
    const diffMinutes = (new Date() - new Date(s.updated_date)) / (1000 * 60);
    return diffMinutes <= 10;
  });

  const normalRecordsAll = [
    ...normalRecords.map(q => ({ ...q, type: 'quality' })),
    ...recentTransfersApanha.map(s => ({ ...s, type: 'schedule' }))
  ].sort((a, b) => new Date(b.created_date || b.updated_date) - new Date(a.created_date || a.updated_date));

  // Detectar novos registros normais
  useEffect(() => {
    if (normalRecordsAll.length > previousCountRef.current && previousCountRef.current > 0) {
      setShowAlert(true);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      setTimeout(() => setShowAlert(false), 3000);
    }
    previousCountRef.current = normalRecordsAll.length;
  }, [normalRecordsAll.length]);

  // Detectar novos registros com desvio (alerta mais urgente)
  useEffect(() => {
    if (blockedRecords.length > previousBlockCountRef.current) {
      setShowBlockAlert(true);
      if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
      setTimeout(() => setShowBlockAlert(false), 6000);
    }
    previousBlockCountRef.current = blockedRecords.length;
  }, [blockedRecords.length]);

  const handleDismiss = (recordId) => {
    setDismissed(prev => [...prev, recordId]);
  };

  const handleDismissAll = () => {
    const allIds = [
      ...blockedRecords.map(r => r.id),
      ...normalRecordsAll.map(r => r.type === 'schedule' ? `schedule-${r.id}` : r.id)
    ];
    setDismissed(prev => [...prev, ...allIds]);
  };

  const totalCount = blockedRecords.length + normalRecordsAll.length;
  if (totalCount === 0) return null;

  return (
    <>
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVK3q8K9fGg1Fp+PyvmwhBTCF0PPUgjQGHmy/7+OZSA0PU6vq8K1cFwxEpuLyvmwhBTGH0fPUgjMHHmy+7+OZSA0PUqvq8K1dFwxEp+PyvmwhBTCG0PPTgjMGHmy+7+OYSA0PUqvq8K1dFwxEp+PyvmwhBTCG0PPTgjMGHmy+7+OYSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OYSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OYSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OYSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OYSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OYSA0PUqvq8K1dFwxEp+PyvmwhBTCG0PPTgjMGHmy+7+OZSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OZSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OZSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OZSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OZSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OZSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OZSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OZSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OZSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OZSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OZSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OZSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OZSA0PUqvq8K1dFwxEp+PyvmwhBTCG0PPTgjMGHmy+7+OZSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OZSA0PUqvq8K1dFwxEp+PyvmshBTCG0PPTgjMGHmy+7+OZSA0PUqvq8K1dFwxEp+Py" />

      {/* Flash de alerta - desvio crítico */}
      <AnimatePresence>
        {showBlockAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-gradient-to-r from-red-600 to-red-800 text-white px-8 py-6 rounded-2xl shadow-2xl border-4 border-white pointer-events-auto">
              <div className="flex items-center gap-4">
                <div className="animate-bounce">
                  <Ban className="w-12 h-12" />
                </div>
                <div>
                  <p className="text-2xl font-black">⛔ BLOQUEIO DE SAÍDA!</p>
                  <p className="text-lg">Desvio de qualidade detectado — aguardar liberação</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Flash de alerta normal */}
      <AnimatePresence>
        {showAlert && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none"
          >
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-6 rounded-2xl shadow-2xl border-4 border-white pointer-events-auto">
              <div className="flex items-center gap-4">
                <div className="animate-bounce">
                  <Bell className="w-12 h-12" />
                </div>
                <div>
                  <p className="text-2xl font-black">Nova Análise!</p>
                  <p className="text-lg">Resultado de qualidade disponível</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Fixo */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed bottom-6 right-6 z-[100] max-w-md w-full"
      >
        <Card className={`shadow-2xl border-4 bg-white ${blockedRecords.length > 0 ? 'border-red-500' : 'border-green-500'}`}>
          <CardHeader className={`border-b py-3 px-4 ${blockedRecords.length > 0 ? 'bg-gradient-to-r from-red-50 to-red-100' : 'bg-gradient-to-r from-green-500/10 to-emerald-500/10'}`}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                {blockedRecords.length > 0 ? (
                  <ShieldAlert className="w-4 h-4 text-red-600 animate-pulse" />
                ) : (
                  <ClipboardCheck className="w-4 h-4 text-green-600 animate-pulse" />
                )}
                Análises ({totalCount})
                {blockedRecords.length > 0 && (
                  <Badge className="bg-red-600 text-white text-xs ml-1">
                    {blockedRecords.length} BLOQUEIO
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleDismissAll} className="h-7 text-xs hover:bg-gray-100">
                  Dispensar Todas
                </Button>
                <div className={`w-2 h-2 rounded-full animate-pulse ${blockedRecords.length > 0 ? 'bg-red-500' : 'bg-green-500'}`} />
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-3 max-h-[70vh] overflow-y-auto space-y-2">

            {/* Registros com DESVIO (bloqueados) */}
            <AnimatePresence>
              {blockedRecords.map((record) => {
                const deviations = getDeviations(record);
                return (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="border-2 border-red-400 rounded-lg p-3 bg-gradient-to-r from-red-50 to-white"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className="bg-red-600 text-white font-bold">
                            ⛔ BLOQUEADO
                          </Badge>
                          <Badge className="bg-gray-700 text-white font-bold text-xs">
                            Laudo: {record.sample}
                          </Badge>
                          <span className="text-xs font-semibold text-red-700">
                            {record.release_time || format(new Date(record.created_date), 'HH:mm')}
                          </span>
                        </div>
                        {record.released_by && (
                          <p className="text-xs text-gray-600">
                            Classificador: <strong>{record.released_by}</strong>
                          </p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismiss(record.id)}
                        className="h-6 w-6 p-0 hover:bg-red-100"
                      >
                        <X className="w-4 h-4 text-gray-400 hover:text-red-600" />
                      </Button>
                    </div>

                    {/* Desvios detectados */}
                    <div className="flex flex-wrap gap-1 mb-2">
                      {deviations.map((d, i) => (
                        <Badge key={i} className="bg-red-100 text-red-800 border border-red-300 text-xs">
                          ⚠️ {d.label}: {d.value} (lim. {d.limit})
                        </Badge>
                      ))}
                    </div>

                    {/* Caixa de bloqueio */}
                    <div className="mt-2 p-2 bg-red-600 border border-red-700 rounded text-center">
                      <p className="text-xs font-black text-white">
                        🚫 BLOQUEAR SAÍDA DO VEÍCULO
                      </p>
                      <p className="text-xs text-red-100 mt-1">
                        <strong>{getSupplierBySample(record.sample)}</strong>
                      </p>
                      <p className="text-xs text-red-100 mt-0.5">
                        Aguardar liberação de <strong>Silvalan</strong> ou <strong>Jance</strong>
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Registros normais (sem desvio) */}
            <AnimatePresence>
              {normalRecordsAll.map((record) => {
                const isSchedule = record.type === 'schedule';
                const recordId = isSchedule ? `schedule-${record.id}` : record.id;

                return (
                  <motion.div
                    key={recordId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="border-2 border-green-200 rounded-lg p-3 bg-gradient-to-r from-green-50/50 to-white hover:border-green-400 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {isSchedule ? (
                            <>
                              <Badge className="bg-blue-600 text-white font-bold">Liberar Sem Laudo</Badge>
                              {record.end_time_actual && (
                                <span className="text-xs font-semibold text-blue-700">{record.end_time_actual}</span>
                              )}
                            </>
                          ) : (
                            <>
                              <Badge className="bg-green-600 text-white font-bold">Laudo: {record.sample}</Badge>
                              <span className="text-xs font-semibold text-green-700">
                                {record.release_time || format(new Date(record.created_date), 'HH:mm')}
                              </span>
                            </>
                          )}
                        </div>
                        {isSchedule ? (
                          <>
                            <p className="text-xs text-gray-600 font-bold">{record.supplier}</p>
                            <p className="text-xs text-gray-500">
                              {record.contract === 'TRANSFERÊNCIA' ? '🚚 Transferência' : '🍃 Apanha'}
                            </p>
                          </>
                        ) : (
                          record.released_by && (
                            <p className="text-xs text-gray-600">
                              Classificador: <strong>{record.released_by}</strong>
                            </p>
                          )
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDismiss(recordId)}
                        className="h-6 w-6 p-0 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 text-gray-400 hover:text-red-600" />
                      </Button>
                    </div>

                    {isSchedule ? (
                      <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-center">
                        <p className="text-xs font-semibold text-blue-800">✅ Pode liberar o veículo sem análise</p>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {record.moisture_percent != null && (
                            <div className="text-center bg-white rounded p-1.5 border border-blue-200">
                              <Droplets className="w-3 h-3 text-blue-600 mx-auto mb-0.5" />
                              <p className="text-[9px] text-gray-600">Umidade</p>
                              <p className={`text-sm font-bold ${record.moisture_percent > 12.1 ? 'text-red-600' : 'text-blue-600'}`}>
                                {record.moisture_percent}%
                              </p>
                            </div>
                          )}
                          {record.fumaca != null && (
                            <div className="text-center bg-white rounded p-1.5 border border-orange-200">
                              <AlertCircle className="w-3 h-3 text-orange-600 mx-auto mb-0.5" />
                              <p className="text-[9px] text-gray-600">Fumaça</p>
                              <p className={`text-sm font-bold ${parseFloat(record.fumaca) > 6.0 ? 'text-red-600' : 'text-orange-600'}`}>
                                {parseFloat(record.fumaca).toFixed(1)}%
                              </p>
                            </div>
                          )}
                          {record.mouldy_percent != null && (
                            <div className="text-center bg-white rounded p-1.5 border border-red-200">
                              <AlertCircle className="w-3 h-3 text-red-600 mx-auto mb-0.5" />
                              <p className="text-[9px] text-gray-600">Mofo</p>
                              <p className={`text-sm font-bold ${record.mouldy_percent > 25 ? 'text-red-600' : 'text-orange-600'}`}>
                                {record.mouldy_percent}%
                              </p>
                            </div>
                          )}
                        </div>
                        {record.origin && (
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">{record.origin}</Badge>
                          </div>
                        )}
                        <div className="mt-2 p-1.5 bg-green-50 border border-green-200 rounded text-center">
                          <p className="text-xs font-semibold text-green-800">✅ Qualidade OK — pode liberar</p>
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

          </CardContent>
        </Card>
      </motion.div>
    </>
  );
}