import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Package } from "lucide-react";
import { motion } from "framer-motion";

export default function DaySummary({ schedulings, isLoading, selectedDate }) {
  if (isLoading) {
    return (
      <Card className="shadow-lg rounded-lg overflow-hidden">
        <div className="bg-[#860063] p-3">
          <CardTitle className="text-base md:text-lg flex items-center gap-2 text-white font-black">
            <Package className="w-5 h-5 text-white" />
            Resumo do Dia
          </CardTitle>
        </div>
        <div className="bg-white" style={{ height: '3px' }}></div>
        <div className="bg-[#F88D2A]" style={{ height: '10px' }}></div>
        <CardContent className="p-3">
          <div className="text-center text-gray-500">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  // Agrupar por armazém e linha
  const summary = {};
  schedulings.forEach(s => {
    const key = `${s.warehouse}-${s.line}`;
    if (!summary[key]) {
      summary[key] = {
        warehouse: s.warehouse,
        line: s.line,
        bags: 0,
        count: 0
      };
    }
    summary[key].bags += s.quantity_bags || 0;
    summary[key].count += 1;
  });

  // Converter para array e ordenar
  const summaryArray = Object.values(summary).sort((a, b) => {
    if (a.warehouse !== b.warehouse) {
      return a.warehouse.localeCompare(b.warehouse);
    }
    return a.line.localeCompare(b.line);
  });

  const getWarehouseName = (warehouse) => {
    if (warehouse === 'central') return 'Central';
    if (warehouse === 'fabrica') return 'Fábrica';
    if (warehouse === 'barra') return 'Barra';
    if (warehouse === 'ferraz') return 'Ferraz';
    return warehouse;
  };

  const totalBags = summaryArray.reduce((sum, item) => sum + item.bags, 0);
  const totalVehicles = summaryArray.reduce((sum, item) => sum + item.count, 0);

  return (
    <Card className="shadow-lg border-2 border-[#860063]/20">
      <CardHeader className="border-b bg-gradient-to-r from-[#860063]/10 to-[#F88D2A]/10">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <Package className="w-5 h-5 text-[#860063]" />
          Resumo do Dia
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {summaryArray.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-[#860063]/20 to-[#F88D2A]/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <Package className="w-8 h-8 text-[#860063]" />
            </div>
            <p className="text-sm text-gray-600">Nenhum agendamento</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Totais Gerais */}
            <div className="bg-gradient-to-r from-[#860063]/10 to-[#F88D2A]/10 rounded-lg p-3 border border-[#860063]/20">
              <div className="grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Total Veículos</p>
                  <p className="text-2xl font-black text-[#860063]">{totalVehicles}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 font-semibold">Total Sacos</p>
                  <p className="text-2xl font-black text-[#F88D2A]">{totalBags.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>

            {/* Por Linha */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {summaryArray.map((item, index) => (
                <motion.div
                  key={`${item.warehouse}-${item.line}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="group relative p-2.5 rounded-xl border-2 border-gray-200/60 bg-white/70 hover:border-[#860063]/40 hover:bg-white/85 hover:shadow-[0_0_15px_rgba(134,0,99,0.15)] cursor-pointer transition-all duration-300 backdrop-blur-md shadow-md hover:shadow-lg"
                >
                  {/* Shimmer effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" 
                       style={{ transform: 'skewX(-20deg)' }} />

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#860063]" />
                        <span className="font-bold text-sm text-gray-900">
                          {getWarehouseName(item.warehouse)} - L{item.line}
                        </span>
                      </div>
                      <div className="bg-[#860063] text-white text-xs font-bold px-2 py-1 rounded">
                        {item.count} veíc.
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <Package className="w-3 h-3 text-gray-500" />
                        <span className="font-semibold text-gray-700">
                          {item.bags.toLocaleString('pt-BR')} sacos
                        </span>
                      </div>
                      <span className="text-gray-500">
                        {((item.bags * 60) / 1000).toFixed(1)} MT
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}