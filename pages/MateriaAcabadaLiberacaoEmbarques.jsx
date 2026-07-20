import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import MALayout from "@/components/materiaAcabada/MALayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck, ShieldX } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

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

export default function MateriaAcabadaLiberacaoEmbarques() {
  const queryClient = useQueryClient();
  const currentMonth = format(new Date(), "yyyy-MM");
  const [filterMode, setFilterMode] = useState("month");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [search, setSearch] = useState("");
  const [filterQuality, setFilterQuality] = useState("all"); // all | pending | released
  const [user, setUser] = useState(null);
  const [releaseNotes, setReleaseNotes] = useState({});

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["ma-expedicao"],
    queryFn: () => base44.entities.MAExpedicao.list("date"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.MAExpedicao.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ma-expedicao"] }),
  });

  const handleRelease = (record) => {
    updateMutation.mutate({
      id: record.id,
      data: {
        quality_released: true,
        quality_released_by: user?.email,
        quality_released_at: new Date().toISOString(),
        quality_release_notes: releaseNotes[record.id] || null,
      },
    });
    toast.success("✅ Embarque liberado!");
  };

  const handleRevoke = (record) => {
    updateMutation.mutate({
      id: record.id,
      data: {
        quality_released: false,
        quality_released_by: null,
        quality_released_at: null,
        quality_release_notes: null,
      },
    });
    toast.info("Liberação removida.");
  };

  const filtered = useMemo(() => {
    let data = records.filter(r => r.status !== "cancelado");

    if (filterMode === "month") {
      data = data.filter(r => r.date && r.date.startsWith(selectedMonth));
    } else {
      data = data.filter(r => r.date && r.date >= startDate && r.date <= endDate);
    }

    if (filterQuality === "pending") data = data.filter(r => !r.quality_released);
    if (filterQuality === "released") data = data.filter(r => r.quality_released);

    if (search) {
      const s = search.toLowerCase();
      data = data.filter(r =>
        [r.customer, r.material_no, r.sales_order_no, r.short_text, r.delivery]
          .some(v => v && String(v).toLowerCase().includes(s))
      );
    }

    return data;
  }, [records, filterMode, selectedMonth, startDate, endDate, search, filterQuality]);

  const pendingCount = filtered.filter(r => !r.quality_released).length;
  const releasedCount = filtered.filter(r => r.quality_released).length;

  return (
    <MALayout>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#860063]" />
            Liberação de Embarques
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Aprovação de qualidade para expedições</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white border border-gray-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-gray-800">{filtered.length}</p>
            <p className="text-xs text-gray-500">Total</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-orange-600">{pendingCount}</p>
            <p className="text-xs text-orange-600">Pendentes</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{releasedCount}</p>
            <p className="text-xs text-green-600">Liberados</p>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-4">
          <CardContent className="pt-3 pb-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1">
                <button
                  onClick={() => setFilterMode("month")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterMode === "month" ? "bg-[#860063] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  Mensal
                </button>
                <button
                  onClick={() => setFilterMode("period")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filterMode === "period" ? "bg-[#860063] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                >
                  Período
                </button>
              </div>

              {filterMode === "month" ? (
                <div className="flex items-center gap-2">
                  <Label className="text-sm">Mês:</Label>
                  <Input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="w-40 h-8 text-sm" />
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <Label className="text-sm">De:</Label>
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-36 h-8 text-sm" />
                  <Label className="text-sm">Até:</Label>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-36 h-8 text-sm" />
                </div>
              )}

              <div className="flex gap-1">
                {[["all","Todos"],["pending","Pendentes"],["released","Liberados"]].map(([v,l]) => (
                  <button key={v} onClick={() => setFilterQuality(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterQuality === v ? "bg-[#860063] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >{l}</button>
                ))}
              </div>

              <Input
                placeholder="Buscar cliente, produto, SO..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-56 h-8 text-sm ml-auto"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="text-xs border-collapse w-full" style={{ minWidth: 1000 }}>
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {["Date","Material No","Sales Order No","Customer","Short Text","Qty (ton)","Delivery","Status","Liberação Qualidade","Observação"].map(h => (
                      <th key={h} className="px-2 py-2 border-b-2 border-gray-200 font-semibold text-gray-700 text-left whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr><td colSpan={10} className="text-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-[#860063] mx-auto" /></td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-10 text-gray-400">Nenhum registro encontrado</td></tr>
                  ) : (
                    filtered.map((r, i) => (
                      <tr key={r.id} className={`border-b border-gray-100 hover:bg-[#860063]/5 transition-colors ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}`}>
                        <td className="px-2 py-2 whitespace-nowrap">{r.date ? r.date.split("-").reverse().join("/") : "-"}</td>
                        <td className="px-2 py-2 font-mono whitespace-nowrap">{r.material_no || "-"}</td>
                        <td className="px-2 py-2 whitespace-nowrap">{r.sales_order_no || "-"}</td>
                        <td className="px-2 py-2 max-w-[160px] truncate" title={r.customer}>{r.customer || "-"}</td>
                        <td className="px-2 py-2 max-w-[200px] truncate" title={r.short_text}>{r.short_text || "-"}</td>
                        <td className="px-2 py-2 text-right tabular-nums whitespace-nowrap">
                          {r.quantity != null ? Number(r.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 3 }) : "-"}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">{r.delivery || "-"}</td>
                        <td className="px-2 py-2">
                          <Badge className={`${STATUS_COLORS[r.status || "agendado"]} border text-[10px]`}>
                            {STATUS_LABELS[r.status || "agendado"]}
                          </Badge>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          {r.quality_released ? (
                            <div className="flex items-center gap-1.5">
                              <span className="flex items-center gap-1 text-green-700 font-semibold text-[10px] bg-green-100 border border-green-300 px-1.5 py-0.5 rounded">
                                <ShieldCheck className="w-3 h-3" /> Liberado
                              </span>
                              <button onClick={() => handleRevoke(r)} className="text-[10px] text-red-400 hover:text-red-600 underline">remover</button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="flex items-center gap-1 text-orange-600 text-[10px] bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded">
                                <ShieldX className="w-3 h-3" /> Pendente
                              </span>
                              <Button
                                size="sm"
                                onClick={() => handleRelease(r)}
                                disabled={updateMutation.isPending}
                                className="h-5 text-[10px] px-2 bg-green-600 hover:bg-green-700 text-white"
                              >
                                Liberar
                              </Button>
                            </div>
                          )}
                        </td>
                        <td className="px-2 py-2 max-w-[160px]">
                          {r.quality_released ? (
                            <span className="text-gray-500 italic text-[10px]">{r.quality_release_notes || "-"}</span>
                          ) : (
                            <Input
                              value={releaseNotes[r.id] || ""}
                              onChange={e => setReleaseNotes(prev => ({ ...prev, [r.id]: e.target.value }))}
                              placeholder="Observação..."
                              className="h-6 text-[10px] px-1.5"
                            />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </MALayout>
  );
}