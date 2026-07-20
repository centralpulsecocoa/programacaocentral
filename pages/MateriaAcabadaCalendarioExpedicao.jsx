import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import MALayout from "@/components/materiaAcabada/MALayout";
import MAExpedicaoDetail from "@/components/materiaAcabada/MAExpedicaoDetail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Truck, ShieldCheck } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

const STATUS_COLORS = {
  agendado: "bg-blue-100 text-blue-800 border-blue-200",
  aguardando: "bg-yellow-100 text-yellow-800 border-yellow-200",
  em_carregamento: "bg-orange-100 text-orange-800 border-orange-200",
  concluido: "bg-green-100 text-green-800 border-green-200",
  cancelado: "bg-red-100 text-red-800 border-red-200",
};
const STATUS_LABELS = {
  agendado: "Agendado",
  aguardando: "Aguardando",
  em_carregamento: "Em Carregamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export default function MateriaAcabadaCalendarioExpedicao() {
  const queryClient = useQueryClient();
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["ma-expedicao"],
    queryFn: () => base44.entities.MAExpedicao.list("date"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MAExpedicao.update(id, data),
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["ma-expedicao"] });
      const fresh = await base44.entities.MAExpedicao.list("-date");
      const updated = fresh.find(r => r.id === variables.id);
      if (updated) setSelectedItem(updated);
    },
  });

  const dayRecords = useMemo(() => {
    let filtered = records.filter(r => r.date === selectedDate);
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.customer?.toLowerCase().includes(s) ||
        r.short_text?.toLowerCase().includes(s) ||
        r.sales_order_no?.toLowerCase().includes(s) ||
        r.pluto?.toLowerCase().includes(s)
      );
    }
    const order = { em_carregamento: 0, aguardando: 1, agendado: 2, concluido: 3, cancelado: 4 };
    return filtered.sort((a, b) => (order[a.status] ?? 2) - (order[b.status] ?? 2));
  }, [records, selectedDate, searchTerm]);

  const totalQty = dayRecords.reduce((s, r) => s + (r.quantity || 0), 0);

  const formatDisplayDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch { return dateStr; }
  };

  const customerSummary = useMemo(() => {
    const map = {};
    dayRecords.forEach(r => {
      if (!map[r.customer]) map[r.customer] = { count: 0, qty: 0 };
      map[r.customer].count += 1;
      map[r.customer].qty += r.quantity || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].qty - a[1].qty);
  }, [dayRecords]);

  return (
    <MALayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-[#860063]" />
              Calendário de Expedição
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Expedições programadas por data</p>
          </div>
          <div className="flex items-center gap-2 bg-white border-2 border-[#860063]/30 rounded-xl px-3 py-2 shadow">
            <CalendarIcon className="w-4 h-4 text-[#860063]" />
            <Input
              type="date"
              value={selectedDate}
              onChange={e => { setSelectedDate(e.target.value); setSelectedItem(null); }}
              className="border-0 focus:ring-0 bg-transparent font-semibold w-40 h-7 p-0"
            />
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <Input
            placeholder="Buscar cliente, produto, sales order, pluto..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* List */}
          <div className="lg:col-span-2">
            <Card className="shadow-lg border-2 border-[#860063]/20">
              <CardHeader className="border-b bg-gradient-to-r from-[#860063]/10 to-[#F88D2A]/10 py-3 px-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-bold text-[#860063]">
                    {formatDisplayDate(selectedDate)}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-[#860063]/30 text-xs">
                      {dayRecords.length} itens
                    </Badge>
                    {dayRecords.length > 0 && (
                      <Badge variant="outline" className="border-[#F88D2A]/50 text-[#F88D2A] text-xs">
                        {totalQty.toLocaleString("pt-BR", { minimumFractionDigits: 3 })} ton
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3">
                {isLoading ? (
                  <div className="text-center py-10">
                    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-[#860063] mx-auto" />
                  </div>
                ) : dayRecords.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Nenhuma expedição programada para esta data</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {dayRecords.map((item, i) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: -16 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 16 }}
                          transition={{ delay: i * 0.03 }}
                          whileHover={{ scale: 1.01, x: 3, transition: { duration: 0.15 } }}
                          onClick={() => setSelectedItem(item)}
                          className={`p-3 rounded-xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-md ${
                            selectedItem?.id === item.id
                              ? "border-[#860063]/60 bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5 shadow-[0_0_15px_rgba(134,0,99,0.2)]"
                              : item.status === "em_carregamento"
                              ? "border-orange-300 bg-orange-50/60"
                              : item.status === "aguardando"
                              ? "border-yellow-300 bg-yellow-50/60"
                              : item.status === "concluido"
                              ? "border-green-200 bg-green-50/40"
                              : "border-gray-200 bg-white hover:border-[#860063]/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-semibold text-gray-900 text-sm truncate">{item.customer}</span>
                                <Badge className={`${STATUS_COLORS[item.status || "agendado"]} border text-xs`}>
                                  {STATUS_LABELS[item.status || "agendado"]}
                                </Badge>
                                {item.pluto && (
                                  <Badge className="bg-[#860063]/10 text-[#860063] border-[#860063]/20 border text-xs">
                                    {item.pluto}
                                  </Badge>
                                )}
                                {item.quality_released && (
                                  <Badge className="bg-green-100 text-green-700 border-green-300 border text-xs flex items-center gap-1">
                                    <ShieldCheck className="w-3 h-3" /> Liberado
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 truncate mb-1">{item.short_text}</p>
                              <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                                <span>{item.sales_order_no}</span>
                                {item.vehicle_plate && (
                                  <span className="text-gray-600">🚛 {item.vehicle_plate}</span>
                                )}
                                {item.call_time && (
                                  <span className="text-green-600 font-medium">✓ Chamado {item.call_time}</span>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-[#860063] text-sm">
                                {item.quantity?.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                              </p>
                              <p className="text-xs text-gray-400">ton</p>
                              {item.actual_quantity != null && item.status === "concluido" && (
                                <p className="text-xs text-green-600 font-medium mt-0.5">
                                  ✓ {item.actual_quantity?.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                                </p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div>
            {selectedItem ? (
              <MAExpedicaoDetail
                item={selectedItem}
                allRecords={records}
                userProfile={user?.profile}
                userEmail={user?.email}
                onUpdate={(data) => updateMutation.mutate({ id: selectedItem.id, data })}
                onClose={() => setSelectedItem(null)}
              />
            ) : dayRecords.length > 0 ? (
              <Card className="shadow border border-gray-200">
                <CardHeader className="border-b py-3 px-4 bg-gray-50">
                  <CardTitle className="text-sm font-bold text-gray-700">Resumo por Cliente</CardTitle>
                </CardHeader>
                <CardContent className="p-3 space-y-1.5">
                  {customerSummary.map(([customer, data]) => (
                    <div key={customer} className="flex items-center justify-between text-xs py-1 border-b border-gray-100 last:border-0">
                      <span className="text-gray-700 font-medium truncate flex-1 mr-2">{customer}</span>
                      <div className="shrink-0 flex items-center gap-2">
                        <span className="text-gray-400">{data.count}x</span>
                        <span className="font-bold text-[#860063]">
                          {data.qty.toLocaleString("pt-BR", { minimumFractionDigits: 3 })} ton
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs pt-2 border-t-2 border-[#860063]/20 font-bold">
                    <span className="text-gray-700">TOTAL</span>
                    <span className="text-[#860063]">{totalQty.toLocaleString("pt-BR", { minimumFractionDigits: 3 })} ton</span>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="shadow border border-gray-200">
                <CardContent className="p-10 text-center">
                  <CalendarIcon className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Selecione um item para ver detalhes</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MALayout>
  );
}