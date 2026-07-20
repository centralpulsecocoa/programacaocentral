import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Clock, Calendar, Filter, Save, Package, Truck, ClipboardPaste, X, AlertCircle, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ReleaseManagementPage() {
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();
  
  const TODAY = new Date();
  const [startDate, setStartDate] = useState(format(startOfMonth(TODAY), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(endOfMonth(TODAY), 'yyyy-MM-dd'));
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadNumberFilter, setLoadNumberFilter] = useState("");
  const [wbNumberFilter, setWbNumberFilter] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ batch: "", gr: "" });
  const [adminEditingId, setAdminEditingId] = useState(null);
  const [adminEditData, setAdminEditData] = useState({ batch: "", gr: "" });
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [bulkPreview, setBulkPreview] = useState([]);
  const [bulkApplying, setBulkApplying] = useState(false);

  const [activeTab, setActiveTab] = useState("schedulings");

  const { data: schedulings = [], isLoading } = useQuery({
    queryKey: ['schedulings'],
    queryFn: () => base44.entities.Scheduling.list('-date'),
    initialData: [],
  });

  const { data: transfers2082 = [], isLoading: isLoadingTransfers } = useQuery({
    queryKey: ['transfers2082'],
    queryFn: () => base44.entities.Transfer2082.list('-date'),
    enabled: activeTab === 'transfers',
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Error loading user:", error);
    }
  };

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.functions.invoke('updateEntityRecord', { entity: 'Scheduling', id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedulings'] });
      setEditingId(null);
      toast.success('✅ Liberação atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('❌ Erro ao atualizar: ' + error.message);
    }
  });

  const updateTransferMutation = useMutation({
    mutationFn: ({ id, data }) => base44.functions.invoke('updateEntityRecord', { entity: 'Transfer2082', id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers2082'] });
      setEditingId(null);
      toast.success('✅ Liberação atualizada com sucesso!');
    },
    onError: (error) => {
      toast.error('❌ Erro ao atualizar: ' + error.message);
    }
  });

  const handleEdit = (schedule) => {
    setEditingId(schedule.id);
    setEditData({
      batch: schedule.batch || "",
      gr: schedule.gr || ""
    });
  };

  const handleRequestRelease = (scheduleId) => {
    if (!editData.batch || !editData.gr) {
      toast.error('❌ Preencha Lote e GR para solicitar liberação');
      return;
    }

    updateMutation.mutate({
      id: scheduleId,
      data: {
        batch: editData.batch,
        gr: editData.gr,
        release_status: "aguardando_liberacao",
        release_requested_by: user?.email,
        release_requested_date: new Date().toISOString()
      }
    });
  };

  const handleRelease = (scheduleId) => {
    updateMutation.mutate({
      id: scheduleId,
      data: {
        release_status: "liberado",
        released_by: user?.email,
        released_date: new Date().toISOString()
      }
    });
  };

  // Funções para transferências 2082
  const handleRequestReleaseTransfer = (transferId) => {
    if (!editData.gr) {
      toast.error('❌ Preencha o GR para solicitar liberação');
      return;
    }

    updateTransferMutation.mutate({
      id: transferId,
      data: {
        batch: editData.batch,
        gr: editData.gr,
        release_status: "aguardando_liberacao",
        release_requested_by: user?.email,
        release_requested_date: new Date().toISOString()
      }
    });
  };

  const handleReleaseTransfer = (transferId) => {
    updateTransferMutation.mutate({
      id: transferId,
      data: {
        release_status: "liberado",
        released_by: user?.email,
        released_date: new Date().toISOString()
      }
    });
  };

  const handleEditTransfer = (transfer) => {
    setEditingId(transfer.id);
    setEditData({
      batch: transfer.batch || "",
      gr: transfer.gr || ""
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({ batch: "", gr: "" });
  };

  const handleAdminEdit = (item) => {
    setAdminEditingId(item.id);
    setAdminEditData({ batch: item.batch || "", gr: item.gr || "" });
  };

  const handleAdminSave = (id, type = "scheduling") => {
    if (type === "scheduling") {
      updateMutation.mutate({ id, data: { batch: adminEditData.batch, gr: adminEditData.gr } });
    } else {
      updateTransferMutation.mutate({ id, data: { batch: adminEditData.batch, gr: adminEditData.gr } });
    }
    setAdminEditingId(null);
    setAdminEditData({ batch: "", gr: "" });
  };

  const handleAdminCancel = () => {
    setAdminEditingId(null);
    setAdminEditData({ batch: "", gr: "" });
  };

  // Filtrar cargas recebidas (concluídas)
  const filteredSchedulings = schedulings.filter(s => {
    if (s.status !== 'concluido') return false;
    if (s.date < startDate || s.date > endDate) return false;
    
    if (statusFilter === "liberado" && s.release_status !== "liberado") return false;
    if (statusFilter === "pendente" && (s.release_status === "liberado")) return false;
    if (statusFilter === "aguardando" && s.release_status !== "aguardando_liberacao") return false;
    
    // Filtro por Nº Carga
    if (loadNumberFilter && (!s.load_number || !s.load_number.toLowerCase().includes(loadNumberFilter.toLowerCase()))) return false;
    
    // Filtro por WB
    if (wbNumberFilter && (!s.wb_number || !s.wb_number.toLowerCase().includes(wbNumberFilter.toLowerCase()))) return false;
    
    return true;
  });

  // Filtrar transferências 2082 (apenas descargas na fábrica concluídas)
  const filteredTransfers = transfers2082.filter(t => {
    if (t.phase !== 'descarga' || t.location !== 'fabrica') return false;
    if (t.status !== 'concluido') return false;
    if (t.date < startDate || t.date > endDate) return false;
    
    if (statusFilter === "liberado" && t.release_status !== "liberado") return false;
    if (statusFilter === "pendente" && (t.release_status === "liberado")) return false;
    if (statusFilter === "aguardando" && t.release_status !== "aguardando_liberacao") return false;
    
    // Filtro por Lote (batch)
    if (loadNumberFilter && (!t.batch || !t.batch.toLowerCase().includes(loadNumberFilter.toLowerCase()))) return false;
    
    // Filtro por WB
    if (wbNumberFilter && (!t.wb_number || !t.wb_number.toLowerCase().includes(wbNumberFilter.toLowerCase()))) return false;
    
    return true;
  });

  const pendingCount = filteredSchedulings.filter(s => !s.release_status || s.release_status === "pendente").length;
  const awaitingCount = filteredSchedulings.filter(s => s.release_status === "aguardando_liberacao").length;
  const releasedCount = filteredSchedulings.filter(s => s.release_status === "liberado").length;

  // Contadores para transferências
  const pendingTransfersCount = filteredTransfers.filter(t => !t.release_status || t.release_status === "pendente").length;
  const awaitingTransfersCount = filteredTransfers.filter(t => t.release_status === "aguardando_liberacao").length;
  const releasedTransfersCount = filteredTransfers.filter(t => t.release_status === "liberado").length;

  const isReadOnly = user?.profile === 'controladoria' || user?.profile === 'producao' || user?.profile === 'originacao';
  const canRequest = user?.role === 'admin' || user?.profile === 'admin' || user?.profile === 'supervisor' || user?.profile === 'operador' || user?.profile === 'gerente_originacao';
  const canRelease = user?.role === 'admin' || user?.profile === 'analista_qualidade' || user?.profile === 'qualidade' || user?.profile === 'classificador';

  // Parse pasted text: each line should have WB, Nº Carga, GR, Lote (tab or space separated)
  const parsePasteText = (text) => {
    const lines = text.trim().split('\n').filter(l => l.trim());
    const results = [];
    const seenIds = new Set();

    for (const line of lines) {
      // Split by tab or multiple spaces
      const parts = line.trim().split(/\t|\s{2,}/).map(p => p.trim()).filter(Boolean);
      if (parts.length < 4) continue;
      // Positional: col0=WB, col1=Nº Carga, col2=GR, col3=Lote
      const [wb, load_number, gr, batch] = parts;

      // Find matching scheduling by WB + Nº Carga (both must match)
      const match = schedulings.find(s =>
        s.status === 'concluido' &&
        s.wb_number && s.wb_number.toString().trim() === wb.toString().trim() &&
        s.load_number && s.load_number.toString().trim() === load_number.toString().trim()
      );

      // Deduplicate: skip if this scheduling record was already matched on a previous line
      if (match && seenIds.has(match.id)) continue;
      if (match) seenIds.add(match.id);

      results.push({ wb, load_number, gr, batch, match, line });
    }
    return results;
  };

  const handlePasteTextChange = (text) => {
    setPasteText(text);
    if (text.trim()) {
      setBulkPreview(parsePasteText(text));
    } else {
      setBulkPreview([]);
    }
  };

  const handleApplyBulk = async () => {
    const toApply = bulkPreview.filter(r => r.match);
    if (toApply.length === 0) {
      toast.error('Nenhuma carga encontrada para atualizar');
      return;
    }
    setBulkApplying(true);
    let updated = 0;
    for (const row of toApply) {
      await base44.functions.invoke('updateEntityRecord', { entity: 'Scheduling', id: row.match.id, data: {
        gr: row.gr,
        batch: row.batch,
        release_status: "aguardando_liberacao",
        release_requested_by: user?.email,
        release_requested_date: new Date().toISOString()
      }});
      updated++;
    }
    queryClient.invalidateQueries({ queryKey: ['schedulings'] });
    setBulkApplying(false);
    setShowBulkPaste(false);
    setPasteText("");
    setBulkPreview([]);
    toast.success(`✅ ${updated} carga(s) atualizada(s) com GR e Lote!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Package className="w-6 h-6 md:w-8 md:h-8 text-[#860063]" />
                Liberação de Cargas
              </h1>
              <p className="text-sm md:text-base text-gray-600">Gerenciar lotes e GR das cargas recebidas</p>
            </div>
            {canRequest && (
              <Button
                onClick={() => setShowBulkPaste(true)}
                className="bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824] self-start md:self-auto"
              >
                <ClipboardPaste className="w-4 h-4 mr-2" />
                Colar GR / Lote em lote
              </Button>
            )}
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="shadow-lg border-2 border-purple-400/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Total</p>
                  <p className="text-3xl font-black text-gray-900">{filteredSchedulings.length}</p>
                </div>
                <Package className="w-8 h-8 text-[#860063]" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-gray-400/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Pendentes</p>
                  <p className="text-3xl font-black text-gray-600">{pendingCount}</p>
                </div>
                <Clock className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-orange-400/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Aguardando</p>
                  <p className="text-3xl font-black text-orange-600">{awaitingCount}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-green-400/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Liberadas</p>
                  <p className="text-3xl font-black text-green-600">{releasedCount}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-lg border-2 border-blue-400/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-semibold">Taxa</p>
                  <p className="text-3xl font-black text-blue-600">
                    {filteredSchedulings.length > 0 ? Math.round((releasedCount / filteredSchedulings.length) * 100) : 0}%
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="shadow-md border-none mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-[#860063]" />
                <span className="font-semibold text-gray-900">Filtros:</span>
              </div>

              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40"
                />
                <span className="text-gray-500 text-sm">até</span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40"
                />
              </div>

              <Select value={statusFilter || "all"} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aguardando">Aguardando Liberação</SelectItem>
                  <SelectItem value="liberado">Liberado</SelectItem>
                </SelectContent>
              </Select>

              <Input
                type="text"
                placeholder="Filtrar por Nº Carga"
                value={loadNumberFilter}
                onChange={(e) => setLoadNumberFilter(e.target.value)}
                className="w-40"
              />

              <Input
                type="text"
                placeholder="Filtrar por WB"
                value={wbNumberFilter}
                onChange={(e) => setWbNumberFilter(e.target.value)}
                className="w-40"
              />

              <Badge variant="outline" className="ml-auto">
                {filteredSchedulings.length} {filteredSchedulings.length === 1 ? 'carga' : 'cargas'}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for Schedulings and Transfers */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="schedulings" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Agendamentos ({filteredSchedulings.length})
            </TabsTrigger>
            <TabsTrigger value="transfers" className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Transferências 2082 ({filteredTransfers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedulings">
            {/* List */}
            <Card className="shadow-xl border-none">
              <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5">
                <CardTitle className="text-lg md:text-xl font-bold">Cargas Recebidas</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#860063] mx-auto"></div>
                  </div>
                ) : filteredSchedulings.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhuma carga recebida no período selecionado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {filteredSchedulings.map((schedule, index) => (
                        <motion.div
                          key={schedule.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-4 rounded-lg border-2 border-gray-200 hover:border-[#860063]/30 transition-all bg-white"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {user?.profile === 'classificador' || user?.profile === 'analista_qualidade' ? (
                                  <h3 className="font-bold text-gray-500">Fornecedor Oculto</h3>
                                ) : (
                                  <h3 className="font-bold text-gray-900">{schedule.supplier}</h3>
                                )}
                                <Badge className={
                                  schedule.release_status === "liberado" ? "bg-green-100 text-green-800 border-green-200" :
                                  schedule.release_status === "aguardando_liberacao" ? "bg-orange-100 text-orange-800 border-orange-200" :
                                  "bg-gray-100 text-gray-800 border-gray-200"
                                }>
                                  {schedule.release_status === "liberado" ? "Liberado" :
                                   schedule.release_status === "aguardando_liberacao" ? "Aguardando Liberação" :
                                   "Pendente"}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-500 text-xs">Data</p>
                                  <p className="font-semibold">{schedule.date.split('-').reverse().join('/')}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs">WB</p>
                                  <p className="font-semibold text-[#860063]">{schedule.wb_number || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs">Nº Carga</p>
                                  <p className="font-semibold text-[#F88D2A]">{schedule.load_number || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs">Sacos</p>
                                  <p className="font-semibold">{schedule.actual_bags?.toLocaleString('pt-BR') || schedule.quantity_bags?.toLocaleString('pt-BR')}</p>
                                </div>
                              </div>

                              {editingId === schedule.id ? (
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                  <div>
                                    <Label htmlFor={`batch-${schedule.id}`} className="text-xs">Lote *</Label>
                                    <Input
                                      id={`batch-${schedule.id}`}
                                      value={editData.batch}
                                      onChange={(e) => setEditData({ ...editData, batch: e.target.value })}
                                      placeholder="Ex: LOT2024001"
                                      className="h-9"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`gr-${schedule.id}`} className="text-xs">GR *</Label>
                                    <Input
                                      id={`gr-${schedule.id}`}
                                      value={editData.gr}
                                      onChange={(e) => setEditData({ ...editData, gr: e.target.value })}
                                      placeholder="Ex: GR123456"
                                      className="h-9"
                                    />
                                  </div>
                                </div>
                              ) : adminEditingId === schedule.id ? (
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Lote</Label>
                                    <Input
                                      value={adminEditData.batch}
                                      onChange={(e) => setAdminEditData({ ...adminEditData, batch: e.target.value })}
                                      placeholder="Ex: LOT2024001"
                                      className="h-9"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">GR</Label>
                                    <Input
                                      value={adminEditData.gr}
                                      onChange={(e) => setAdminEditData({ ...adminEditData, gr: e.target.value })}
                                      placeholder="Ex: GR123456"
                                      className="h-9"
                                    />
                                  </div>
                                </div>
                              ) : (
                                schedule.batch && schedule.gr && (
                                  <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t">
                                    <div>
                                      <p className="text-gray-500 text-xs">Lote</p>
                                      <p className="font-semibold text-purple-700">{schedule.batch}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 text-xs">GR</p>
                                      <p className="font-semibold text-purple-700">{schedule.gr}</p>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>

                            <div className="flex flex-col gap-2 items-end">
                              {adminEditingId === schedule.id ? (
                                <>
                                  <Button
                                    onClick={() => handleAdminSave(schedule.id, "scheduling")}
                                    disabled={updateMutation.isPending}
                                    className="bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824]"
                                  >
                                    <Save className="w-4 h-4 mr-2" />
                                    Salvar
                                  </Button>
                                  <Button onClick={handleAdminCancel} variant="outline" size="sm">
                                    Cancelar
                                  </Button>
                                </>
                              ) : (
                                <div className="flex gap-2">
                                  {editingId === schedule.id && canRequest ? (
                                    <>
                                      <Button
                                        onClick={() => handleRequestRelease(schedule.id)}
                                        disabled={updateMutation.isPending}
                                        className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
                                      >
                                        <Save className="w-4 h-4 mr-2" />
                                        Pedir Liberação
                                      </Button>
                                      <Button onClick={handleCancel} variant="outline" disabled={updateMutation.isPending}>
                                        Cancelar
                                      </Button>
                                    </>
                                  ) : canRelease && schedule.release_status === "aguardando_liberacao" ? (
                                    <Button
                                      onClick={() => handleRelease(schedule.id)}
                                      disabled={updateMutation.isPending}
                                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Liberar Carga
                                    </Button>
                                  ) : canRequest && !isReadOnly && schedule.release_status !== "aguardando_liberacao" && (
                                    <Button
                                      onClick={() => handleEdit(schedule)}
                                      variant="outline"
                                      className="hover:bg-[#860063]/10"
                                    >
                                      {schedule.release_status === "liberado" ? "Editar" : "Pedir Liberação"}
                                    </Button>
                                  )}
                                  {user?.role === "admin" && !adminEditingId && (
                                    <>
                                      <Button
                                        onClick={() => handleAdminEdit(schedule)}
                                        variant="outline"
                                        size="icon"
                                        className="hover:bg-purple-50 hover:border-purple-400 text-purple-600"
                                        title="Editar WB / Lote / GR (Admin)"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        onClick={async () => {
                                          if (confirm('Tem certeza que deseja excluir este agendamento?')) {
                                            await base44.entities.Scheduling.delete(schedule.id);
                                            queryClient.invalidateQueries({ queryKey: ['schedulings'] });
                                            toast.success('✅ Agendamento excluído com sucesso!');
                                          }
                                        }}
                                        variant="outline"
                                        size="icon"
                                        className="hover:bg-red-50 hover:border-red-400 text-red-600"
                                        title="Excluir (Admin)"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
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
          </TabsContent>

          <TabsContent value="transfers">
            {/* List Transfers 2082 */}
            <Card className="shadow-xl border-none">
              <CardHeader className="border-b bg-gradient-to-r from-[#F88D2A]/5 to-[#860063]/5">
                <CardTitle className="text-lg md:text-xl font-bold flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#F88D2A]" />
                  Transferências 2082 - Descarga Fábrica
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {isLoadingTransfers ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#860063] mx-auto"></div>
                  </div>
                ) : filteredTransfers.length === 0 ? (
                  <div className="text-center py-12">
                    <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600">Nenhuma transferência concluída no período selecionado</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {filteredTransfers.map((transfer, index) => (
                        <motion.div
                          key={transfer.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="p-4 rounded-lg border-2 border-gray-200 hover:border-[#F88D2A]/30 transition-all bg-white"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="font-bold text-gray-900">Lote: {transfer.batch}</h3>
                                <Badge className="bg-[#F88D2A]/20 text-[#F88D2A] border-[#F88D2A]/30">
                                  2082
                                </Badge>
                                <Badge className={
                                  transfer.release_status === "liberado" ? "bg-green-100 text-green-800 border-green-200" :
                                  transfer.release_status === "aguardando_liberacao" ? "bg-orange-100 text-orange-800 border-orange-200" :
                                  "bg-gray-100 text-gray-800 border-gray-200"
                                }>
                                  {transfer.release_status === "liberado" ? "Liberado" :
                                   transfer.release_status === "aguardando_liberacao" ? "Aguardando Liberação" :
                                   "Pendente"}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                  <p className="text-gray-500 text-xs">Data</p>
                                  <p className="font-semibold">{transfer.date.split('-').reverse().join('/')}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs">WB</p>
                                  <p className="font-semibold text-[#860063]">{transfer.wb_number || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs">NF</p>
                                  <p className="font-semibold text-[#F88D2A]">{transfer.invoice_number || "-"}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 text-xs">Quantidade</p>
                                  <p className="font-semibold">{transfer.quantity_per_truck} bags</p>
                                </div>
                              </div>

                              {editingId === transfer.id ? (
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                  <div>
                                    <Label htmlFor={`batch-${transfer.id}`} className="text-xs">Lote Fábrica</Label>
                                    <Input
                                      id={`batch-${transfer.id}`}
                                      value={editData.batch}
                                      onChange={(e) => setEditData({ ...editData, batch: e.target.value })}
                                      placeholder="Ex: LOTE-FAB-001"
                                      className="h-9"
                                    />
                                  </div>
                                  <div>
                                    <Label htmlFor={`gr-${transfer.id}`} className="text-xs">GR *</Label>
                                    <Input
                                      id={`gr-${transfer.id}`}
                                      value={editData.gr}
                                      onChange={(e) => setEditData({ ...editData, gr: e.target.value })}
                                      placeholder="Ex: GR123456"
                                      className="h-9"
                                    />
                                  </div>
                                </div>
                              ) : adminEditingId === transfer.id ? (
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Lote Fábrica</Label>
                                    <Input
                                      value={adminEditData.batch}
                                      onChange={(e) => setAdminEditData({ ...adminEditData, batch: e.target.value })}
                                      placeholder="Ex: LOTE-FAB-001"
                                      className="h-9"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">GR</Label>
                                    <Input
                                      value={adminEditData.gr}
                                      onChange={(e) => setAdminEditData({ ...adminEditData, gr: e.target.value })}
                                      placeholder="Ex: GR123456"
                                      className="h-9"
                                    />
                                  </div>
                                </div>
                              ) : (
                                (transfer.gr || transfer.batch) && (
                                  <div className="mt-3 grid grid-cols-2 gap-3 pt-3 border-t">
                                    <div>
                                      <p className="text-gray-500 text-xs">Lote Fábrica</p>
                                      <p className="font-semibold text-purple-700">{transfer.batch || "-"}</p>
                                    </div>
                                    <div>
                                      <p className="text-gray-500 text-xs">GR</p>
                                      <p className="font-semibold text-purple-700">{transfer.gr || "-"}</p>
                                    </div>
                                  </div>
                                )
                              )}
                            </div>

                            <div className="flex flex-col gap-2 items-end">
                              {adminEditingId === transfer.id ? (
                                <>
                                  <Button
                                    onClick={() => handleAdminSave(transfer.id, "transfer")}
                                    disabled={updateTransferMutation.isPending}
                                    className="bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824]"
                                  >
                                    <Save className="w-4 h-4 mr-2" />
                                    Salvar
                                  </Button>
                                  <Button onClick={handleAdminCancel} variant="outline" size="sm">
                                    Cancelar
                                  </Button>
                                </>
                              ) : (
                                <div className="flex gap-2">
                                  {editingId === transfer.id && canRequest ? (
                                    <>
                                      <Button
                                        onClick={() => handleRequestReleaseTransfer(transfer.id)}
                                        disabled={updateTransferMutation.isPending}
                                        className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800"
                                      >
                                        <Save className="w-4 h-4 mr-2" />
                                        Pedir Liberação
                                      </Button>
                                      <Button onClick={handleCancel} variant="outline" disabled={updateTransferMutation.isPending}>
                                        Cancelar
                                      </Button>
                                    </>
                                  ) : canRelease && transfer.release_status === "aguardando_liberacao" ? (
                                    <Button
                                      onClick={() => handleReleaseTransfer(transfer.id)}
                                      disabled={updateTransferMutation.isPending}
                                      className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      Liberar Carga
                                    </Button>
                                  ) : canRequest && !isReadOnly && transfer.release_status !== "aguardando_liberacao" && (
                                    <Button
                                      onClick={() => handleEditTransfer(transfer)}
                                      variant="outline"
                                      className="hover:bg-[#F88D2A]/10"
                                    >
                                      {transfer.release_status === "liberado" ? "Editar" : "Pedir Liberação"}
                                    </Button>
                                  )}
                                  {user?.role === "admin" && !adminEditingId && (
                                    <>
                                      <Button
                                        onClick={() => handleAdminEdit(transfer)}
                                        variant="outline"
                                        size="icon"
                                        className="hover:bg-purple-50 hover:border-purple-400 text-purple-600"
                                        title="Editar Lote / GR (Admin)"
                                      >
                                        <Pencil className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        onClick={async () => {
                                          if (confirm('Tem certeza que deseja excluir esta transferência?')) {
                                            await base44.entities.Transfer2082.delete(transfer.id);
                                            queryClient.invalidateQueries({ queryKey: ['transfers2082'] });
                                            toast.success('✅ Transferência excluída com sucesso!');
                                          }
                                        }}
                                        variant="outline"
                                        size="icon"
                                        className="hover:bg-red-50 hover:border-red-400 text-red-600"
                                        title="Excluir (Admin)"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Bulk Paste Dialog */}
      <Dialog open={showBulkPaste} onOpenChange={setShowBulkPaste}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardPaste className="w-5 h-5 text-[#860063]" />
              Colar GR e Lote em lote
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Formato esperado (colunas separadas por TAB):</strong><br />
                <code className="bg-blue-100 px-1 rounded">WB &nbsp;&nbsp; Nº Carga &nbsp;&nbsp; GR &nbsp;&nbsp; Lote</code><br />
                Cole diretamente do Excel/SAP. Cada linha = uma carga.<br />
                <span className="text-orange-700 font-semibold">⚡ Ao aplicar, o Lote e GR serão atribuídos e a carga será automaticamente enviada para liberação.</span>
              </p>
            </div>

            <Textarea
              placeholder={"Cole os dados aqui...\nEx:\n12345678\t5022255961\t5022123456\tLOTE-001\n87654321\t5022255142\t5022654321\tLOTE-002"}
              value={pasteText}
              onChange={e => handlePasteTextChange(e.target.value)}
              className="font-mono text-xs h-40"
            />

            {bulkPreview.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500">WB</th>
                      <th className="px-3 py-2 text-left text-gray-500">Nº Carga</th>
                      <th className="px-3 py-2 text-left text-gray-500">GR</th>
                      <th className="px-3 py-2 text-left text-gray-500">Lote</th>
                      <th className="px-3 py-2 text-left text-gray-500">Carga encontrada</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {bulkPreview.map((row, i) => (
                      <tr key={i} className={row.match ? "bg-green-50" : "bg-red-50"}>
                        <td className="px-3 py-2 font-mono">{row.wb}</td>
                        <td className="px-3 py-2 font-mono">{row.load_number}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-purple-700">{row.gr}</td>
                        <td className="px-3 py-2 font-mono font-semibold text-purple-700">{row.batch}</td>
                        <td className="px-3 py-2">
                          {row.match ? (
                            <span className="text-green-700 font-semibold flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              {user?.profile === 'classificador' || user?.profile === 'analista_qualidade' ? 'Fornecedor Oculto' : row.match.supplier}
                            </span>
                          ) : (
                            <span className="text-red-600 flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" /> Não encontrada
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-3 py-2 bg-gray-50 border-t text-xs text-gray-600">
                  {bulkPreview.filter(r => r.match).length} de {bulkPreview.length} carga(s) encontrada(s)
                </div>
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowBulkPaste(false); setPasteText(""); setBulkPreview([]); }}>
                <X className="w-4 h-4 mr-1" /> Cancelar
              </Button>
              <Button
                onClick={handleApplyBulk}
                disabled={bulkApplying || bulkPreview.filter(r => r.match).length === 0}
                className="bg-gradient-to-r from-[#860063] to-[#F88D2A]"
              >
                {bulkApplying ? (
                  <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" /> Aplicando...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Atribuir GR/Lote e Pedir Liberação ({bulkPreview.filter(r => r.match).length})</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}