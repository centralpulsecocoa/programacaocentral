import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, X, ChevronDown, ChevronUp, Truck, MapPin, User, Phone, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

export default function CalledVehiclesPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasNewVehicle, setHasNewVehicle] = useState(false);
  const [previousCount, setPreviousCount] = useState(0);

  const TODAY = format(new Date(), 'yyyy-MM-dd');

  const { data: schedulings = [] } = useQuery({
    queryKey: ['schedulings-called'],
    queryFn: () => base44.entities.Scheduling.list('-call_time'),
    refetchInterval: 5000,
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
    retry: false,
  });

  const calledVehicles = schedulings.filter(s =>
    s.date === TODAY &&
    s.status === 'aguardando' &&
    s.call_time
  );

  const groupedByWarehouse = {
    central: calledVehicles.filter(v => v.warehouse === 'central'),
    fabrica: calledVehicles.filter(v => v.warehouse === 'fabrica')
  };

  useEffect(() => {
    if (calledVehicles.length > previousCount) {
      setHasNewVehicle(true);
      setIsOpen(true);
      
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      
      setTimeout(() => setHasNewVehicle(false), 5000);
    }
    setPreviousCount(calledVehicles.length);
  }, [calledVehicles.length]);

  const getUserName = (email) => {
    const user = users.find(u => u.email === email);
    return user?.full_name || email;
  };

  const getMostRecentVehicle = (vehicles) => {
    if (vehicles.length === 0) return null;
    return vehicles.reduce((latest, current) => 
      current.call_time > latest.call_time ? current : latest
    );
  };

  if (!isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 left-4 z-50 p-2.5 rounded-full shadow-2xl transition-all ${
          hasNewVehicle 
            ? 'bg-gradient-to-r from-yellow-500 to-orange-600 animate-pulse' 
            : 'bg-gradient-to-r from-blue-600 to-indigo-700'
        }`}
      >
        <div className="relative">
          <Bell className="w-5 h-5 text-white" />
          {calledVehicles.length > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1.5 -right-1.5 bg-white text-blue-600 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center"
            >
              {calledVehicles.length}
            </motion.span>
          )}
        </div>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ x: -400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -400, opacity: 0 }}
      className="fixed bottom-4 left-4 z-50 w-[320px] max-h-[70vh] flex flex-col"
    >
      <Card className={`shadow-2xl border-2 backdrop-blur-xl overflow-hidden ${
        hasNewVehicle 
          ? 'border-yellow-600 bg-yellow-50/95 animate-pulse' 
          : 'border-blue-500 bg-white/95'
      }`}>
        <CardHeader className={`border-b p-2 ${
          hasNewVehicle
            ? 'bg-gradient-to-r from-yellow-500 to-orange-600'
            : 'bg-gradient-to-r from-blue-600 to-indigo-700'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <motion.div
                animate={{ rotate: hasNewVehicle ? [0, -15, 15, -15, 15, 0] : 0 }}
                transition={{ repeat: hasNewVehicle ? Infinity : 0, duration: 0.8 }}
              >
                <Bell className="w-3.5 h-3.5 text-white" />
              </motion.div>
              <CardTitle className="text-xs font-bold text-white">
                {hasNewVehicle ? '🚛 NOVO VEÍCULO!' : 'Veículos Chamados'}
              </CardTitle>
              <Badge className="bg-white text-blue-600 border-white text-[10px] px-1">
                {calledVehicles.length}
              </Badge>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-5 w-5 hover:bg-blue-600/20"
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
                className="h-5 w-5 hover:bg-blue-600/20"
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
                {calledVehicles.length === 0 ? (
                  <div className="text-center py-4">
                    <Truck className="w-8 h-8 text-gray-300 mx-auto mb-1.5" />
                    <p className="text-[10px] text-gray-500">Nenhum veículo chamado</p>
                    <p className="text-[9px] text-gray-400 mt-0.5">Aguardando chamadas...</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {hasNewVehicle && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-md p-1.5 shadow-lg"
                      >
                        <p className="text-[10px] font-bold text-center">
                          🚛 Novo veículo chamado!
                        </p>
                      </motion.div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-md p-1">
                      <p className="text-[9px] text-blue-700 text-center font-medium">
                        📋 {calledVehicles.length} veículo{calledVehicles.length !== 1 ? 's' : ''} aguardando
                      </p>
                    </div>

                    {['central', 'fabrica'].map(warehouse => {
                      const vehicles = groupedByWarehouse[warehouse];
                      if (vehicles.length === 0) return null;

                      const mostRecent = getMostRecentVehicle(vehicles);

                      return (
                        <div key={warehouse} className="space-y-1.5">
                          <div className="flex items-center gap-1.5 px-1">
                            <MapPin className="w-3 h-3 text-blue-600" />
                            <span className="text-[10px] font-bold text-gray-900 uppercase">
                              {warehouse === 'central' ? 'Central' : 'Fábrica'}
                            </span>
                            <Badge className="bg-blue-100 text-blue-700 text-[9px] px-1">
                              {vehicles.length}
                            </Badge>
                          </div>

                          {vehicles.map((vehicle, index) => {
                            const isNewest = vehicle.id === mostRecent?.id;
                            return (
                              <motion.div
                                key={vehicle.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ delay: index * 0.1 }}
                                className={`rounded-md border transition-colors ${
                                  isNewest && hasNewVehicle
                                    ? 'border-yellow-600 bg-yellow-50 shadow-md'
                                    : 'border-blue-300 bg-blue-50/50'
                                }`}
                              >
                                <div className="p-1.5 space-y-1">
                                  {/* Fornecedor e Linha */}
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-900 truncate flex-1">
                                      {vehicle.supplier}
                                    </span>
                                    <Badge className="bg-blue-600 text-white text-[9px] px-1">
                                      L{vehicle.line}
                                    </Badge>
                                  </div>

                                  {/* Hora chamada e quantidade */}
                                  <div className="bg-white rounded p-1 border border-blue-200">
                                    <div className="flex items-center justify-between text-[9px]">
                                      <div className="flex items-center gap-0.5">
                                        <Clock className="w-2.5 h-2.5 text-blue-600" />
                                        <span className="text-gray-600">Chamado:</span>
                                        <span className="font-bold text-gray-900">{vehicle.call_time}</span>
                                      </div>
                                      <div className="flex items-center gap-0.5">
                                        <Truck className="w-2.5 h-2.5 text-orange-600" />
                                        <span className="font-bold text-gray-900">
                                          {vehicle.quantity_bags?.toLocaleString('pt-BR')} scs
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Motorista e Placa */}
                                  {(vehicle.driver_name || vehicle.vehicle_plate) && (
                                    <div className="flex gap-1">
                                      {vehicle.driver_name && (
                                        <div className="flex-1 flex items-center gap-0.5 text-[9px] text-gray-600 bg-gray-50 border border-gray-200 rounded px-1 py-0.5">
                                          <User className="w-2.5 h-2.5 text-gray-600 flex-shrink-0" />
                                          <span className="truncate">{vehicle.driver_name}</span>
                                        </div>
                                      )}
                                      {vehicle.vehicle_plate && (
                                        <div className="flex items-center gap-0.5 text-[9px] text-gray-600 bg-gray-50 border border-gray-200 rounded px-1 py-0.5">
                                          <span className="font-bold">{vehicle.vehicle_plate}</span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Quem chamou */}
                                  {vehicle.called_by && (
                                    <div className="bg-green-50 border border-green-200 rounded p-1">
                                      <div className="flex items-center gap-0.5 text-[9px] text-green-700">
                                        <User className="w-2.5 h-2.5 flex-shrink-0" />
                                        <span className="truncate">
                                          Por: <strong>{getUserName(vehicle.called_by)}</strong>
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
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
          🔄 Auto 5s
        </span>
      </motion.div>
    </motion.div>
  );
}