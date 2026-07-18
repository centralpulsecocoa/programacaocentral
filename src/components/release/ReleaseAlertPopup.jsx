import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Package, CheckCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { toast } from "sonner";

export default function ReleaseAlertPopup({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [lastCount, setLastCount] = useState(0);
  const [hasNewAlert, setHasNewAlert] = useState(false);
  const queryClient = useQueryClient();

  const { data: schedulings = [], refetch } = useQuery({
    queryKey: ['schedulings-release-pending'],
    queryFn: () => base44.entities.Scheduling.filter({ release_status: 'aguardando_liberacao' }),
    initialData: [],
    refetchInterval: 30000,
    enabled: user?.profile === 'analista_qualidade' || user?.profile === 'admin' || user?.profile === 'classificador',
  });

  const { data: transfers = [] } = useQuery({
    queryKey: ['transfers-release-pending'],
    queryFn: () => base44.entities.Transfer2082.filter({ release_status: 'aguardando_liberacao' }),
    initialData: [],
    refetchInterval: 30000,
    enabled: user?.profile === 'analista_qualidade' || user?.profile === 'admin' || user?.profile === 'classificador',
  });

  const pendingSchedulings = schedulings.filter(s => s.status === 'concluido' && s.release_status === 'aguardando_liberacao');
  const pendingTransfers = transfers.filter(t => t.status === 'concluido' && t.release_status === 'aguardando_liberacao');
  const pendingReleases = [...pendingSchedulings, ...pendingTransfers];

  useEffect(() => {
    if (pendingReleases.length > lastCount && lastCount > 0) {
      setHasNewAlert(true);
      setIsOpen(true);
      setIsMinimized(false);
      
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      
      toast.info('🔔 Nova solicitação de liberação!', {
        description: 'Uma carga aguarda sua aprovação',
        duration: 5000,
      });
    }
    setLastCount(pendingReleases.length);
  }, [pendingReleases.length]);

  const handleRelease = async (item) => {
    try {
      const isTransfer = item.transfer_group_id !== undefined;
      const releaseData = {
        release_status: 'liberado',
        released_by: user?.email,
        released_date: new Date().toISOString()
      };

      await base44.functions.invoke('updateEntityRecord', {
        entity: isTransfer ? 'Transfer2082' : 'Scheduling',
        id: item.id,
        data: releaseData
      });

      if (isTransfer) {
        queryClient.invalidateQueries({ queryKey: ['transfers-release-pending'] });
        queryClient.invalidateQueries({ queryKey: ['transfers'] });
      } else {
        queryClient.invalidateQueries({ queryKey: ['schedulings-release-pending'] });
        queryClient.invalidateQueries({ queryKey: ['schedulings'] });
      }

      toast.success('✅ Carga liberada com sucesso!');

      if (pendingReleases.length === 1) {
        setIsOpen(false);
        setIsMinimized(true);
      }
    } catch (error) {
      toast.error('❌ Erro ao liberar carga: ' + error.message);
    }
  };

  const handleToggle = () => {
    if (isMinimized) {
      setIsOpen(true);
      setIsMinimized(false);
      setHasNewAlert(false);
    } else {
      setIsOpen(false);
      setIsMinimized(true);
    }
  };

  if (pendingReleases.length === 0 && isMinimized) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {isMinimized && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <button
              onClick={handleToggle}
              className={`relative p-4 rounded-full shadow-2xl transition-all ${
                hasNewAlert
                  ? 'bg-gradient-to-br from-orange-500 to-red-600 animate-pulse'
                  : 'bg-gradient-to-br from-[#860063] to-[#F88D2A] hover:scale-110'
              }`}
            >
              <Bell className="w-6 h-6 text-white" />
              {pendingReleases.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
                  {pendingReleases.length}
                </span>
              )}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-50 w-96 max-h-[80vh] overflow-hidden"
          >
            <Card className="shadow-2xl border-2 border-orange-400/50 bg-white">
              <CardHeader className="border-b bg-gradient-to-r from-orange-500/10 to-red-500/10 py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Bell className="w-5 h-5 text-orange-600 animate-pulse" />
                    Liberações Pendentes
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsOpen(false);
                      setIsMinimized(true);
                      setHasNewAlert(false);
                    }}
                    className="h-7 w-7 p-0"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 max-h-[60vh] overflow-y-auto">
                {pendingReleases.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">Nenhuma liberação pendente</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingReleases.map((item) => {
                      const isTransfer = item.transfer_group_id !== undefined;
                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="p-3 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border-2 border-orange-200"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              {isTransfer ? (
                                <>
                                  <h4 className="font-bold text-gray-900 text-sm">Transferência 2082</h4>
                                  <p className="text-xs text-gray-600 mt-1">
                                    {item.location === 'central' ? 'Central' : item.location === 'fabrica' ? 'Fábrica' : 'Ferraz'} - {item.origin}
                                  </p>
                                </>
                              ) : (
                                <>
                                  {user?.profile === 'classificador' || user?.profile === 'analista_qualidade' ? (
                                    <h4 className="font-bold text-gray-500 text-sm">Fornecedor Oculto</h4>
                                  ) : (
                                    <h4 className="font-bold text-gray-900 text-sm">{item.supplier}</h4>
                                  )}
                                </>
                              )}
                              <p className="text-xs text-gray-600 mt-1">
                                Data: {format(new Date(item.date), 'dd/MM/yyyy')}
                              </p>
                            </div>
                            <Package className="w-5 h-5 text-orange-600" />
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                            <div>
                              <p className="text-gray-500">WB:</p>
                              <p className="font-semibold text-[#860063]">{item.wb_number || "-"}</p>
                            </div>
                            {!isTransfer && (
                              <>
                                <div>
                                  <p className="text-gray-500">Carga:</p>
                                  <p className="font-semibold text-[#F88D2A]">{item.load_number || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Lote:</p>
                                  <p className="font-semibold text-purple-700">{item.batch || "-"}</p>
                                </div>
                              </>
                            )}
                            {isTransfer && (
                              <>
                                <div>
                                  <p className="text-gray-500">Fase:</p>
                                  <p className="font-semibold text-[#F88D2A]">{item.phase === 'carga' ? 'Carga' : 'Descarga'}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Lote:</p>
                                  <p className="font-semibold text-purple-700">{item.batch || "-"}</p>
                                </div>
                              </>
                            )}
                            <div>
                              <p className="text-gray-500">GR:</p>
                              <p className="font-semibold text-purple-700">{item.gr || "-"}</p>
                            </div>
                            {!isTransfer && (
                              <>
                                <div>
                                  <p className="text-gray-500">Resíduo:</p>
                                  <p className="font-semibold text-green-700">
                                    {item.amostragem && (item.nibs != null || item.po != null) 
                                      ? `${(((parseFloat(item.nibs || 0) + parseFloat(item.po || 0)) / parseFloat(item.amostragem) * 100) / 60).toFixed(2)}%` 
                                      : "-"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Duplo:</p>
                                  <p className="font-semibold text-blue-700">
                                    {item.amostragem && item.duplo != null 
                                      ? `${((parseFloat(item.duplo) / parseFloat(item.amostragem) * 100) / 60).toFixed(2)}%` 
                                      : "-"}
                                  </p>
                                </div>
                              </>
                            )}
                          </div>

                          <div className="bg-white/60 rounded p-2 mb-2 text-xs">
                            <p className="text-gray-600">
                              <strong>Solicitado por:</strong> {item.release_requested_by?.split('@')[0] || 'N/A'}
                            </p>
                            {item.release_requested_date && (
                              <p className="text-gray-600 text-xs mt-1">
                                {format(new Date(item.release_requested_date), "dd/MM/yyyy 'às' HH:mm")}
                              </p>
                            )}
                          </div>

                          <Button
                            onClick={() => handleRelease(item)}
                            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white h-8 text-xs"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Liberar Carga
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}