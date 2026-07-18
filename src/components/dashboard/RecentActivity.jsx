import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

export default function RecentActivity({ schedulings, isLoading }) {
  const statusIcons = {
    agendado: Clock,
    em_descarga: Clock,
    concluido: CheckCircle2,
    cancelado: AlertCircle
  };

  const statusColors = {
    agendado: "text-blue-500",
    em_descarga: "text-orange-500",
    concluido: "text-green-500",
    cancelado: "text-red-500"
  };

  const formatScheduleDate = (dateStr) => {
    if (!dateStr) return "-";
    try {
      const parsedDate = parseISO(dateStr);
      if (!isValid(parsedDate)) return dateStr;
      return format(parsedDate, "dd/MM", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="shadow-2xl border-2 border-blue-400/30 backdrop-blur-xl bg-gradient-to-br from-white/90 via-white/85 to-blue-50/30">
      <CardHeader className="border-b border-blue-400/20 bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-teal-500/10 backdrop-blur-sm p-3 relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-transparent to-cyan-500/5 animate-pulse" />
        
        <CardTitle className="text-base md:text-lg font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent relative z-10">
          Recente
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-start gap-2">
                <Skeleton className="w-7 h-7 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-full mb-1.5" />
                  <Skeleton className="h-2 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : schedulings.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 mx-auto mb-3 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
            <p className="text-xs text-gray-500 font-medium">Sem atividades</p>
          </div>
        ) : (
          <div className="space-y-2">
            {schedulings.map((schedule) => {
              if (!schedule) return null;
              const StatusIcon = statusIcons[schedule.status] || Clock;
              return (
                <div key={schedule.id} className="flex items-start gap-2 p-2 rounded-lg hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-cyan-50/50 transition-all duration-300 group backdrop-blur-sm border border-transparent hover:border-blue-200/50">
                  <div className={`p-1.5 rounded-lg bg-gradient-to-br from-white to-gray-50 group-hover:from-blue-50 group-hover:to-cyan-50 transition-all duration-300 shadow-sm ${statusColors[schedule.status] || 'text-gray-500'}`}>
                    <StatusIcon className="w-3 h-3" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 truncate">
                      {schedule.supplier || 'Sem fornecedor'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatScheduleDate(schedule.date)} • {schedule.start_time || '-'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}