import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Package, MapPin, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

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

export default function TodaySchedules({ schedulings, isLoading, userProfile }) {
  const navigate = useNavigate();

  const sortedSchedulings = [...schedulings].sort((a, b) => {
    if (a.status === 'em_descarga' && b.status !== 'em_descarga') return -1;
    if (a.status !== 'em_descarga' && b.status === 'em_descarga') return 1;
    if (a.status === 'aguardando' && b.status !== 'aguardando' && b.status !== 'em_descarga') return -1;
    if (a.status !== 'aguardando' && a.status !== 'em_descarga' && b.status === 'aguardando') return 1;
    return a.start_time.localeCompare(b.start_time);
  });

  return (
    <Card className="shadow-lg rounded-lg overflow-hidden">
      <div className="bg-[#860063] p-3">
        <CardTitle className="text-base md:text-lg flex items-center gap-2 text-white font-black">
          <Clock className="w-5 h-5 text-white" />
          Hoje
        </CardTitle>
      </div>
      <div className="bg-white" style={{ height: '3px' }}></div>
      <div className="bg-[#F88D2A]" style={{ height: '10px' }}></div>
      <CardContent className="p-3">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : schedulings.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-[#860063]/20 to-[#F88D2A]/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Clock className="w-8 h-8 text-[#860063]" />
            </div>
            <p className="text-sm text-gray-600">Nenhum agendamento</p>
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
                  whileHover={{ scale: 1.01, x: 2, transition: { duration: 0.2 } }}
                  onClick={() => navigate(createPageUrl(`Calendar?id=${schedule.id}`))}
                  className={`group relative p-2.5 rounded-xl border-2 cursor-pointer transition-all duration-300 backdrop-blur-md shadow-md hover:shadow-lg ${
                    schedule.status === 'em_descarga' 
                      ? 'border-[#F88D2A]/50 bg-gradient-to-r from-orange-50/80 via-white/70 to-white/60 hover:from-orange-50/90 hover:via-white/80 hover:to-white/70 shadow-[0_0_15px_rgba(248,141,42,0.2)]' 
                      : schedule.status === 'aguardando'
                      ? 'border-yellow-500/50 bg-gradient-to-r from-yellow-50/80 via-white/70 to-white/60 hover:from-yellow-50/90 hover:via-white/80 hover:to-white/70 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                      : 'border-gray-200/60 bg-white/70 hover:border-[#860063]/40 hover:bg-white/85 hover:shadow-[0_0_15px_rgba(134,0,99,0.15)]'
                  }`}
                >
                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" 
                       style={{ transform: 'skewX(-20deg)' }} />
                  
                  <div className="flex items-start justify-between gap-3 relative z-10">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h4 className="font-bold text-gray-900 truncate text-sm md:text-base">
                          {schedule.supplier}
                        </h4>
                        <Badge className={`${statusColors[schedule.status]} border text-xs px-1.5 py-0.5`}>
                          {statusLabels[schedule.status]}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                          <Clock className="w-3 h-3 text-[#860063]" />
                          <span>{schedule.start_time}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                          <Package className="w-3 h-3 text-[#F88D2A]" />
                          <span>{schedule.quantity_bags?.toLocaleString('pt-BR')} sacos</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                          <MapPin className="w-3 h-3 text-blue-500" />
                          <span className="capitalize">{schedule.warehouse ? schedule.warehouse[0].toUpperCase() : ''}{schedule.line}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-700 font-medium">
                          <TrendingUp className="w-3 h-3 text-green-500" />
                          <span>{schedule.end_time_predicted}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </CardContent>
    </Card>
  );
}