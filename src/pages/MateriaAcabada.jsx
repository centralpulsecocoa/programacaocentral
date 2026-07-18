import React, { useMemo, useState } from "react";
import MALayout from "@/components/materiaAcabada/MALayout";
import { Card, CardContent } from "@/components/ui/card";
import { Package, Truck, ShoppingCart, ClipboardList, CheckCircle2, Activity, XCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const STATUS_LABELS = {
  agendado: "Agendado",
  aguardando: "Aguardando",
  em_carregamento: "Em Carregamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};
const STATUS_COLORS = {
  agendado: "bg-blue-100 text-blue-800",
  aguardando: "bg-yellow-100 text-yellow-800",
  em_carregamento: "bg-orange-100 text-orange-800",
  concluido: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

export default function MateriaAcabada() {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const [selectedDate, setSelectedDate] = useState(todayStr);

  const { data: records = [] } = useQuery({
    queryKey: ["ma-expedicao"],
    queryFn: () => base44.entities.MAExpedicao.list("-date"),
    initialData: [],
  });

  const dayRecords = useMemo(() => records.filter(r => r.date === selectedDate), [records, selectedDate]);
  const totalMT = dayRecords.reduce((s, r) => s + (r.quantity || 0), 0);
  const concluidos = dayRecords.filter(r => r.status === "concluido").length;
  const pctConclusao = dayRecords.length > 0 ? Math.round((concluidos / dayRecords.length) * 100) : 0;
  const totalPedidos = dayRecords.length;
  const comDelivery = dayRecords.filter(r => r.delivery).length;
  const emAndamento = dayRecords.filter(r => r.status === "em_carregamento").length;
  const comLiberacao = dayRecords.filter(r => r.quality_released === true).length;
  const semLiberacao = dayRecords.filter(r => !r.quality_released && r.status !== "cancelado").length;

  const dateFilter = (
    <div className="flex items-center gap-2">
      <Label className="text-sm whitespace-nowrap text-white">Data:</Label>
      <Input
        type="date"
        value={selectedDate}
        onChange={e => setSelectedDate(e.target.value)}
        className="w-40 h-8 text-sm bg-white/10 border-white/30 text-white placeholder-white/60 focus:bg-white/20"
      />
    </div>
  );

  return (
    <MALayout headerRight={dateFilter}>
      <div className="p-5" style={{ paddingTop: 20 }}>

        {/* KPI Cards */}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <Card className="border-l-4 border-l-[#860063] shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Volume Programado</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {totalMT.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                    <span className="text-base font-normal text-gray-400 ml-1">MT</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{pctConclusao}% concluído</p>
                </div>
                <div className="w-10 h-10 bg-[#860063]/10 rounded-xl flex items-center justify-center">
                  <Truck className="w-5 h-5 text-[#860063]" />
                </div>
              </div>
              <div className="mt-3 bg-gray-100 rounded-full h-1.5">
                <div className="bg-[#860063] h-1.5 rounded-full transition-all" style={{ width: `${pctConclusao}%` }} />
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#F88D2A] shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pedidos</p>
                  <p className="text-3xl font-bold text-gray-900">{totalPedidos}</p>
                  <p className="text-xs text-gray-400 mt-1">{comDelivery} com delivery</p>
                </div>
                <div className="w-10 h-10 bg-[#F88D2A]/10 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-[#F88D2A]" />
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                <ClipboardList className="w-3.5 h-3.5" />
                <span>{totalPedidos - comDelivery} sem delivery</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-400 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Em Andamento</p>
                  <p className="text-3xl font-bold text-orange-500">{emAndamento}</p>
                  <p className="text-xs text-gray-400 mt-1">em carregamento</p>
                </div>
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                  <Activity className="w-5 h-5 text-orange-400" />
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" />
                <span>{concluidos} concluídos</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-green-500 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Liberação de Embarques</p>
                  <p className="text-3xl font-bold text-green-600">
                    {comLiberacao}
                    <span className="text-base font-normal text-gray-400 ml-1">liberados</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">com liberação de qualidade</p>
                </div>
                <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
              </div>
              <div className="mt-3 text-xs flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-red-500 font-medium">{semLiberacao} pendentes</span>
                <span className="text-gray-400 ml-1">sem liberação</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de embarques do dia */}
        <Card>
          <CardContent className="p-0">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#860063]" />
                Embarques — {selectedDate.split("-").reverse().join("/")}
              </h2>
              <span className="text-xs text-gray-400">{dayRecords.length} registro(s)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    {["Cliente", "Produto", "Sales Order", "Customer PO", "Qty (ton)", "Delivery", "Pluto", "Status", "Qual."].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dayRecords.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="text-center py-8 text-gray-400">Nenhum embarque para esta data</td>
                    </tr>
                  ) : (
                    dayRecords.map((r, i) => (
                      <tr key={r.id} className={`border-b border-gray-50 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}`}>
                        <td className="px-3 py-2 font-medium text-gray-800 whitespace-nowrap">{r.customer || "-"}</td>
                        <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate" title={r.short_text}>{r.short_text || "-"}</td>
                        <td className="px-3 py-2 font-mono text-gray-600">{r.sales_order_no || "-"}</td>
                        <td className="px-3 py-2 text-gray-600">{r.customer_po_no || "-"}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-gray-800">
                          {r.quantity != null ? r.quantity.toLocaleString("pt-BR", { minimumFractionDigits: 3 }) : "-"}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{r.delivery || "-"}</td>
                        <td className="px-3 py-2 font-mono text-gray-600">{r.pluto || "-"}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[r.status] || "bg-gray-100 text-gray-600"}`}>
                             {STATUS_LABELS[r.status] || r.status || "Agendado"}
                           </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          {r.quality_released
                            ? <span className="text-green-600 font-bold text-sm">✓</span>
                            : <span className="text-gray-300 text-sm">—</span>
                          }
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {dayRecords.length > 0 && (
                  <tfoot>
                    <tr className="bg-[#860063]/5 border-t-2 border-[#860063]/20 font-bold">
                      <td colSpan={4} className="px-3 py-2 text-gray-700">Total — {dayRecords.length} itens</td>
                      <td className="px-3 py-2 text-right tabular-nums text-gray-900">
                        {totalMT.toLocaleString("pt-BR", { minimumFractionDigits: 3 })}
                      </td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MALayout>
  );
}