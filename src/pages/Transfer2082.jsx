import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Clock, Package, Plus, Minus, Calendar, Play, Square, CheckCircle, FileText, Edit, Trash2, User, Scale } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import StatsCard from "../components/dashboard/StatsCard";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const statusColors = {
  aguardando: "bg-yellow-100 text-yellow-800 border-yellow-200",
  em_descarga: "bg-orange-100 text-orange-800 border-orange-200",
  concluido: "bg-green-100 text-green-800 border-green-200"
};

const statusLabels = {
  aguardando: "Aguardando",
  em_descarga: "Em Progresso",
  concluido: "Concluído"
};

const ORIGIN_OPTIONS = [
  "BAHIA",
  "PARÁ",
  "GHANA",
  "MARFIM",
  "ESPIRITO SANTO",
  "RONDÔNIA",
  "TOCANTINS"
];

export default function Transfer2082Page() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const TODAY = new Date();
  const todayStr = format(TODAY, 'yyyy-MM-dd');
  
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [transferCount, setTransferCount] = useState(1);
  const [formData, setFormData] = useState({
    pallet_type: "1MT",
    batch: "",
    origin: "",
    quantity_per_truck: ""
  });

  // Estados para diálogos
  const [showNFDialog, setShowNFDialog] = useState(false);
  const [selectedTransferForNF, setSelectedTransferForNF] = useState(null);
  const [nfNumber, setNfNumber] = useState("");
  const [nfAction, setNfAction] = useState("");

  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Novo: Dialog para editar apenas a NF
  const [showEditNFDialog, setShowEditNFDialog] = useState(false);
  const [editingNFTransfer, setEditingNFTransfer] = useState(null);
  const [editNFNumber, setEditNFNumber] = useState("");

  // Novo: Dialog para controle de balança
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [weightTransfer, setWeightTransfer] = useState(null);
  const [weightData, setWeightData] = useState({
    wb_number: "",
    invoice_number: "",
    gross_weight: "",
    tare_weight: ""
  });

  const { data: allTransfers = [], isLoading } = useQuery({
    queryKey: ['transfers', selectedDate],
    queryFn: () => base44.entities.Transfer2082.filter({ date: selectedDate }),
  });

  // Agrupar por transfer_group_id
  const transferGroups = React.useMemo(() => {
    const groups = {};
    allTransfers.forEach(t => {
      if (!groups[t.transfer_group_id]) {
        groups[t.transfer_group_id] = {
          carga: null,
          descarga: null,
          groupId: t.transfer_group_id
        };
      }
      if (t.phase === 'carga') {
        groups[t.transfer_group_id].carga = t;
      } else if (t.phase === 'descarga') {
        groups[t.transfer_group_id].descarga = t;
      }
    });
    return Object.values(groups);
  }, [allTransfers]);

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

  const createMutation = useMutation({
    mutationFn: (data) => base44.functions.invoke('updateEntityRecord', { entity: 'Transfer2082', data, action: 'create' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.functions.invoke('updateEntityRecord', { entity: 'Transfer2082', id, data, action: 'update' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      toast.success('✅ Transferência atualizada!', {
        description: 'As informações foram salvas.',
        duration: 3000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao atualizar', {
        description: error.message,
        duration: 3000,
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Transfer2082.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      toast.success('✅ Transferência excluída!', {
        duration: 3000,
      });
    },
    onError: (error) => {
      toast.error('❌ Erro ao excluir', {
        description: error.message,
        duration: 3000,
      });
    }
  });

  const getNextTransferLoadNumber = async () => {
    const BASE = 50100;
    // Fetch all transfers to find max load_number
    const allT = await base44.entities.Transfer2082.list();
    const existing = allT
      .map(t => parseInt(t.load_number))
      .filter(n => !isNaN(n) && n >= BASE);
    const max = existing.length > 0 ? Math.max(...existing) : BASE - 1;
    return max + 1;
  };

  const handleAddTransfers = async () => {
    if (!formData.batch || !formData.origin || !formData.quantity_per_truck) {
      toast.error('❌ Preencha todos os campos', {
        duration: 3000,
      });
      return;
    }

    try {
      // Para cada transferência, criar 2 registros: carga na central e descarga na fábrica
      let nextLoadNum = await getNextTransferLoadNumber();
      for (let i = 0; i < transferCount; i++) {
        const groupId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const loadNumber = String(nextLoadNum++); 
        
        const baseData = {
          date: selectedDate,
          transfer_group_id: groupId,
          pallet_type: formData.pallet_type,
          batch: formData.batch,
          origin: formData.origin,
          quantity_per_truck: Number(formData.quantity_per_truck),
          status: "aguardando",
          load_number: loadNumber,
          created_by_name: user?.full_name || user?.email || '',
        };

        // Criar registro de CARGA na CENTRAL
        await createMutation.mutateAsync({ ...baseData, phase: "carga", location: "central" });

        // Criar registro de DESCARGA na FÁBRICA
        await createMutation.mutateAsync({ ...baseData, phase: "descarga", location: "fabrica" });
      }

      toast.success('✅ Transferências criadas com sucesso!', {
        description: `${transferCount} transferência(s) adicionada(s)`,
        duration: 4000,
      });
      setFormData({
        pallet_type: "1MT",
        batch: "",
        origin: "",
        quantity_per_truck: ""
      });
      setTransferCount(1);
    } catch (error) {
      toast.error('❌ Erro ao adicionar transferências', {
        description: error.message,
        duration: 3000,
      });
      console.error(error);
    }
  };

  const openNFDialog = (transfer, action) => {
    setSelectedTransferForNF(transfer);
    setNfAction(action);
    setNfNumber(transfer.invoice_number || "");
    setShowNFDialog(true);
  };

  const handleNFSubmit = () => {
    // NF obrigatória apenas para finalizar, não para iniciar carga na central
    const isStartCarga = nfAction === "start" && selectedTransferForNF?.location === "central";
    
    if (!nfNumber.trim() && !isStartCarga) {
      toast.error('❌ Informe o número da NF', {
        duration: 3000,
      });
      return;
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const updateData = {};
    
    if (nfNumber.trim()) {
      updateData.invoice_number = nfNumber;
    }

    if (nfAction === "start") {
      updateData.status = "em_descarga";
      updateData.start_time = currentTime;
      if (user) {
        updateData.registered_by = user.full_name || user.email;
      }
    } else if (nfAction === "end") {
      updateData.status = "concluido";
      updateData.end_time = currentTime;
      if (user) {
        updateData.registered_by_end = user.full_name || user.email;
      }
    }

    updateMutation.mutate({
      id: selectedTransferForNF.id,
      data: updateData
    });

    const actionText = nfAction === "start" ? 'iniciada' : 'finalizada';
    const nfMessage = nfNumber.trim() ? `NF ${nfNumber} registrada às ${currentTime}` : `Registrado às ${currentTime}`;
    toast.success(`✅ Operação ${actionText}!`, {
      description: nfMessage,
      duration: 4000,
    });
    setShowNFDialog(false);
    setNfNumber("");
    setSelectedTransferForNF(null);
  };

  // Novo: Abrir dialog para editar NF
  const openEditNFDialog = (transfer) => {
    setEditingNFTransfer(transfer);
    setEditNFNumber(transfer.invoice_number || "");
    setShowEditNFDialog(true);
  };

  // Novo: Salvar edição de NF
  const handleEditNFSubmit = () => {
    if (!editNFNumber.trim()) {
      toast.error('❌ Informe o número da NF', {
        duration: 3000,
      });
      return;
    }

    updateMutation.mutate({
      id: editingNFTransfer.id,
      data: { invoice_number: editNFNumber }
    });

    toast.success('✅ Número da NF atualizado!', {
      description: `Novo número: ${editNFNumber}`,
      duration: 3000,
    });
    setShowEditNFDialog(false);
    setEditingNFTransfer(null);
    setEditNFNumber("");
  };

  // Novo: Abrir dialog de controle de balança
  const openWeightDialog = (transfer) => {
    setWeightTransfer(transfer);
    setWeightData({
      wb_number: transfer.wb_number || "",
      invoice_number: transfer.invoice_number || "",
      gross_weight: transfer.gross_weight || "",
      tare_weight: transfer.tare_weight || ""
    });
    setShowWeightDialog(true);
  };

  // Novo: Salvar dados de balança
  const handleWeightSubmit = () => {
    const grossWeight = parseFloat(weightData.gross_weight) || 0;
    const tareWeight = parseFloat(weightData.tare_weight) || 0;
    const netWeight = grossWeight - tareWeight;

    updateMutation.mutate({
      id: weightTransfer.id,
      data: {
        wb_number: weightData.wb_number,
        invoice_number: weightData.invoice_number,
        gross_weight: grossWeight,
        tare_weight: tareWeight,
        net_weight: netWeight
      }
    });

    toast.success('✅ Dados de balança salvos!', {
      description: `Peso Líquido: ${netWeight.toLocaleString('pt-BR')} kg`,
      duration: 3000,
    });
    setShowWeightDialog(false);
    setWeightTransfer(null);
    setWeightData({ wb_number: "", invoice_number: "", gross_weight: "", tare_weight: "" });
  };

  const openEditDialog = (transfer) => {
    setEditingTransfer(transfer);
    setEditFormData({
      pallet_type: transfer.pallet_type,
      batch: transfer.batch,
      origin: transfer.origin,
      quantity_per_truck: transfer.quantity_per_truck,
      notes: transfer.notes || ""
    });
    setShowEditDialog(true);
  };

  const handleEditSubmit = () => {
    if (!editFormData.batch || !editFormData.origin || !editFormData.quantity_per_truck) {
      toast.error('❌ Preencha todos os campos obrigatórios', {
        duration: 3000,
      });
      return;
    }

    updateMutation.mutate({
      id: editingTransfer.id,
      data: editFormData
    });

    toast.success('✅ Transferência atualizada!', {
      description: 'As alterações foram salvas.',
      duration: 3000,
    });
    setShowEditDialog(false);
    setEditingTransfer(null);
  };

  const handleDeleteGroup = (groupId) => {
    if (confirm('Deseja realmente excluir esta transferência (carga e descarga)?')) {
      const groupTransfers = allTransfers.filter(t => t.transfer_group_id === groupId);
      groupTransfers.forEach(t => {
        deleteMutation.mutate(t.id);
      });
      // The toast.success for deletion is handled by deleteMutation's onSuccess
    }
  };

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return "-";
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // Stats calculations
  const completedGroups = transferGroups.filter(g => 
    g.carga?.status === 'concluido' && g.descarga?.status === 'concluido'
  );
  const activeGroups = transferGroups.filter(g => 
    g.carga?.status === 'em_descarga' || g.descarga?.status === 'em_descarga'
  );
  const totalQuantity = allTransfers.reduce((sum, t) => sum + (t.quantity_per_truck || 0), 0) / 2; // Dividir por 2 pois conta 2x
  
  const avgTime = () => {
    const completed = allTransfers.filter(t => t.start_time && t.end_time);
    if (completed.length === 0) return "00:00";
    
    let totalMinutes = 0;
    completed.forEach(t => {
      const [startH, startM] = t.start_time.split(':').map(Number);
      const [endH, endM] = t.end_time.split(':').map(Number);
      totalMinutes += (endH * 60 + endM) - (startH * 60 + startM);
    });
    
    const avg = Math.round(totalMinutes / completed.length);
    const hours = Math.floor(avg / 60);
    const mins = avg % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const completionRate = transferGroups.length > 0 
    ? Math.round((completedGroups.length / transferGroups.length) * 100) 
    : 0;

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  // Verificar se é perfil de somente leitura
  const isReadOnly = user?.profile === 'controladoria' || user?.profile === 'producao' || user?.profile === 'originacao';
  const canAddTransfers = (user?.role === 'admin' || user?.profile === 'supervisor') && !isReadOnly;
  const canOperate = (user?.role === 'admin' || user?.profile === 'operador' || user?.profile === 'supervisor') && !isReadOnly;
  const canUseScale = user?.profile === 'op_balanca' || user?.profile === 'controladoria';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 mb-4">
            <div>
              <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 flex items-center gap-3">
                <Truck className="w-6 h-6 md:w-8 md:h-8 text-[#860063]" />
                Transferência 2082
              </h1>
              <p className="text-sm md:text-base text-gray-600">Gestão de transferências do dia</p>
            </div>
            
            <div className="flex items-center gap-2 backdrop-blur-xl bg-white/90 p-2 rounded-xl border-2 border-[#860063]/30 shadow-lg">
              <Calendar className="w-5 h-5 text-[#860063]" />
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-64 border-0 focus:border-0 focus:ring-0 bg-transparent font-semibold"
              />
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 mb-4"
        >
          <motion.div variants={item}>
            <StatsCard
              title="Conclusão"
              value={`${completionRate}%`}
              icon={CheckCircle}
              color="purple"
              subtitle={`${completedGroups.length}/${transferGroups.length} concluídas`}
            />
          </motion.div>
          <motion.div variants={item}>
            <StatsCard
              title="Em Andamento"
              value={activeGroups.length}
              icon={Truck}
              color="orange"
              subtitle="transferências ativas"
            />
          </motion.div>
          <motion.div variants={item}>
            <StatsCard
              title="Quantidade Total"
              value={totalQuantity}
              icon={Package}
              color="blue"
              subtitle="unidades"
            />
          </motion.div>
          <motion.div variants={item}>
            <StatsCard
              title="Tempo Médio"
              value={avgTime()}
              icon={Clock}
              color="green"
              subtitle="por operação"
            />
          </motion.div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Form Section - Apenas para Supervisor/Admin E NÃO Controladoria */}
          {canAddTransfers && (
            <div className="lg:col-span-1">
              <Card className="shadow-xl border-2 border-[#860063]/30">
                <CardHeader className="border-b bg-gradient-to-r from-[#860063]/10 to-[#F88D2A]/10 p-4">
                  <CardTitle className="text-lg font-bold text-gray-900">
                    Nova Transferência
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Quantidade de Transferências</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setTransferCount(Math.max(1, transferCount - 1))}
                        className="h-10 w-10"
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <div className="flex-1 text-center">
                        <span className="text-2xl font-bold text-[#860063]">{transferCount}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setTransferCount(transferCount + 1)}
                        className="h-10 w-10"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Pallet *</Label>
                    <RadioGroup
                      value={formData.pallet_type}
                      onValueChange={(value) => setFormData({ ...formData, pallet_type: value })}
                      className="flex gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1MT" id="1mt" />
                        <Label htmlFor="1mt" className="cursor-pointer font-normal">1 MT</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="1.5MT" id="1.5mt" />
                        <Label htmlFor="1.5mt" className="cursor-pointer font-normal">1,5 MT</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="batch">Lote *</Label>
                    <Input
                      id="batch"
                      value={formData.batch}
                      onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                      placeholder="Ex: BA8225L75K"
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="origin">Origem *</Label>
                    <Select
                      value={formData.origin}
                      onValueChange={(value) => setFormData({ ...formData, origin: value })}
                    >
                      <SelectTrigger className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]">
                        <SelectValue placeholder="Selecione a origem" />
                      </SelectTrigger>
                      <SelectContent>
                        {ORIGIN_OPTIONS.map((origin) => (
                          <SelectItem key={origin} value={origin}>
                            {origin}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantidade por Carreta (BAGS) *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      value={formData.quantity_per_truck}
                      onChange={(e) => setFormData({ ...formData, quantity_per_truck: e.target.value })}
                      placeholder="Ex: 50"
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                    />
                  </div>

                  <Button
                    onClick={handleAddTransfers}
                    className="w-full bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063]"
                    disabled={createMutation.isPending}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {createMutation.isPending ? 'Adicionando...' : 'Adicionar Transferências'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Transfers List */}
          <div className={canAddTransfers ? "lg:col-span-2" : "lg:col-span-3"}>
            <Card className="shadow-xl border-2 border-purple-400/30">
              <CardHeader className="border-b bg-gradient-to-r from-[#860063]/10 to-[#F88D2A]/10 p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-bold text-gray-900">
                    Transferências - {(() => {
                      try {
                        const [year, month, day] = selectedDate.split('-');
                        return `${day}/${month}/${year}`;
                      } catch {
                        return selectedDate;
                      }
                    })()}
                  </CardTitle>
                  <Badge variant="outline" className="text-sm">
                    {transferGroups.length} transferências
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-[#860063] mx-auto"></div>
                  </div>
                ) : transferGroups.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-[#860063]/20 to-[#F88D2A]/20 rounded-full flex items-center justify-center">
                      <Truck className="w-10 h-10 text-[#860063]" />
                    </div>
                    <p className="text-gray-600 mb-2">Nenhuma transferência para esta data</p>
                    {canAddTransfers && (
                      <p className="text-sm text-gray-500">Adicione transferências usando o formulário ao lado</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <AnimatePresence>
                      {transferGroups.map((group, index) => (
                        <motion.div
                          key={group.groupId}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.05 }}
                          className="border-2 border-gray-200/60 bg-white/90 rounded-xl p-4 hover:shadow-lg transition-all"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="font-bold text-gray-900">
                                  Pallet {group.carga?.pallet_type || group.descarga?.pallet_type}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {group.carga?.batch || group.descarga?.batch}
                                </Badge>
                                {(group.carga?.load_number || group.descarga?.load_number) && (
                                  <Badge className="bg-[#860063] text-white text-xs">
                                    #{group.carga?.load_number || group.descarga?.load_number}
                                  </Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
                                <div>
                                  <span className="font-medium">Origem:</span> {group.carga?.origin || group.descarga?.origin}
                                </div>
                                <div>
                                  <span className="font-medium">Quantidade:</span> {group.carga?.quantity_per_truck || group.descarga?.quantity_per_truck} bags
                                </div>
                              </div>
                              {(group.carga?.created_by_name || group.descarga?.created_by_name) && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <User className="w-3 h-3" />
                                  <span>Criado por: {group.carga?.created_by_name || group.descarga?.created_by_name}</span>
                                </div>
                              )}
                            </div>

                            {/* Botões para Supervisor - Ocultos para Controladoria */}
                            {canAddTransfers && (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => openEditDialog(group.carga || group.descarga)}
                                  className="h-8 w-8 hover:bg-blue-50 hover:border-blue-300"
                                >
                                  <Edit className="w-4 h-4 text-blue-600" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => handleDeleteGroup(group.groupId)}
                                  className="h-8 w-8 hover:bg-red-50 hover:border-red-300"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </Button>
                              </div>
                            )}
                          </div>

                          {/* Fases: Carga e Descarga */}
                          <div className="space-y-2">
                            {/* CARGA - Central */}
                            {group.carga && (
                              <div className={`p-3 rounded-lg border-2 ${
                                group.carga.status === 'em_descarga' 
                                  ? 'border-orange-300 bg-orange-50' 
                                  : group.carga.status === 'concluido'
                                  ? 'border-green-300 bg-green-50'
                                  : 'border-gray-200 bg-gray-50'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <Badge className="bg-[#860063] text-white">CARGA - Central</Badge>
                                      <Badge className={`${statusColors[group.carga.status]} border`}>
                                        {statusLabels[group.carga.status]}
                                      </Badge>
                                      {group.carga.invoice_number && (
                                        <div className="flex items-center gap-1">
                                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">
                                            <FileText className="w-3 h-3 mr-1" />
                                            NF: {group.carga.invoice_number}
                                          </Badge>
                                          {/* Botão de editar NF - apenas supervisor/admin e não controladoria */}
                                          {canAddTransfers && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => openEditNFDialog(group.carga)}
                                              className="h-6 w-6 hover:bg-blue-100"
                                              title="Editar número da NF"
                                            >
                                              <Edit className="w-3 h-3 text-blue-600" />
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {/* Mostrar quem registrou */}
                                    {group.carga.registered_by && (
                                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                        <User className="w-3 h-3" />
                                        <span>Registrado por: {group.carga.registered_by}</span>
                                      </div>
                                    )}
                                    {group.carga.start_time && (
                                      <div className="text-xs text-gray-600 mt-1">
                                        Início: {group.carga.start_time}
                                        {group.carga.end_time && ` | Fim: ${group.carga.end_time} | Duração: ${calculateDuration(group.carga.start_time, group.carga.end_time)}`}
                                        {group.carga.registered_by_end && ` | Finalizado por: ${group.carga.registered_by_end}`}
                                      </div>
                                    )}
                                    {/* Dados de Balança - Carga */}
                                    {(group.carga.wb_number || group.carga.gross_weight) && (
                                      <div className="flex flex-wrap gap-2 mt-1.5">
                                        {group.carga.wb_number && (
                                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-xs">
                                            <Scale className="w-3 h-3 mr-1" />
                                            WB: {group.carga.wb_number}
                                          </Badge>
                                        )}
                                        {group.carga.gross_weight && (
                                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 text-xs">
                                            Bruto: {group.carga.gross_weight?.toLocaleString('pt-BR')} kg
                                          </Badge>
                                        )}
                                        {group.carga.tare_weight && (
                                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 text-xs">
                                            Tara: {group.carga.tare_weight?.toLocaleString('pt-BR')} kg
                                          </Badge>
                                        )}
                                        {group.carga.net_weight && (
                                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs font-semibold">
                                            Líquido: {group.carga.net_weight?.toLocaleString('pt-BR')} kg
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Botões Operador - Carga - Ocultos para Controladoria */}
                                  {canOperate && (
                                    <div className="flex gap-2">
                                      {group.carga.status === "aguardando" && (
                                        <Button
                                          onClick={() => openNFDialog(group.carga, "start")}
                                          size="sm"
                                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                                        >
                                          <Play className="w-3 h-3 mr-1" />
                                          Iniciar
                                        </Button>
                                      )}
                                      {group.carga.status === "em_descarga" && (
                                        <Button
                                          onClick={() => openNFDialog(group.carga, "end")}
                                          size="sm"
                                          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                                        >
                                          <Square className="w-3 h-3 mr-1" />
                                          Finalizar
                                        </Button>
                                      )}
                                      {/* Botão Balança - sempre visível para operador */}
                                      <Button
                                        onClick={() => openWeightDialog(group.carga)}
                                        size="sm"
                                        variant="outline"
                                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                                      >
                                        <Scale className="w-3 h-3 mr-1" />
                                        Balança
                                      </Button>
                                    </div>
                                  )}
                                  {/* Botão Balança - visível para Op Balança (fora do canOperate) */}
                                  {!canOperate && canUseScale && (
                                    <Button
                                      onClick={() => openWeightDialog(group.carga)}
                                      size="sm"
                                      variant="outline"
                                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                                    >
                                      <Scale className="w-3 h-3 mr-1" />
                                      Balança
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* DESCARGA - Fábrica */}
                            {group.descarga && (
                              <div className={`p-3 rounded-lg border-2 ${
                                group.descarga.status === 'em_descarga' 
                                  ? 'border-orange-300 bg-orange-50' 
                                  : group.descarga.status === 'concluido'
                                  ? 'border-green-300 bg-green-50'
                                  : 'border-gray-200 bg-gray-50'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                      <Badge className="bg-[#F88D2A] text-white">DESCARGA - Fábrica</Badge>
                                      <Badge className={`${statusColors[group.descarga.status]} border`}>
                                        {statusLabels[group.descarga.status]}
                                      </Badge>
                                      {group.descarga.invoice_number && (
                                        <div className="flex items-center gap-1">
                                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs">
                                            <FileText className="w-3 h-3 mr-1" />
                                            NF: {group.descarga.invoice_number}
                                          </Badge>
                                          {/* Botão de editar NF - apenas supervisor/admin e não controladoria */}
                                          {canAddTransfers && (
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={() => openEditNFDialog(group.descarga)}
                                              className="h-6 w-6 hover:bg-blue-100"
                                              title="Editar número da NF"
                                            >
                                              <Edit className="w-3 h-3 text-blue-600" />
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {/* Mostrar quem registrou */}
                                    {group.descarga.registered_by && (
                                      <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                                        <User className="w-3 h-3" />
                                        <span>Registrado por: {group.descarga.registered_by}</span>
                                      </div>
                                    )}
                                    {group.descarga.start_time && (
                                      <div className="text-xs text-gray-600 mt-1">
                                        Início: {group.descarga.start_time}
                                        {group.descarga.end_time && ` | Fim: ${group.descarga.end_time} | Duração: ${calculateDuration(group.descarga.start_time, group.descarga.end_time)}`}
                                        {group.descarga.registered_by_end && ` | Finalizado por: ${group.descarga.registered_by_end}`}
                                      </div>
                                    )}
                                    {/* Dados de Balança - Descarga */}
                                    {(group.descarga.wb_number || group.descarga.gross_weight) && (
                                      <div className="flex flex-wrap gap-2 mt-1.5">
                                        {group.descarga.wb_number && (
                                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-xs">
                                            <Scale className="w-3 h-3 mr-1" />
                                            WB: {group.descarga.wb_number}
                                          </Badge>
                                        )}
                                        {group.descarga.gross_weight && (
                                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 text-xs">
                                            Bruto: {group.descarga.gross_weight?.toLocaleString('pt-BR')} kg
                                          </Badge>
                                        )}
                                        {group.descarga.tare_weight && (
                                          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300 text-xs">
                                            Tara: {group.descarga.tare_weight?.toLocaleString('pt-BR')} kg
                                          </Badge>
                                        )}
                                        {group.descarga.net_weight && (
                                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs font-semibold">
                                            Líquido: {group.descarga.net_weight?.toLocaleString('pt-BR')} kg
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Botões Operador - Descarga - Ocultos para Controladoria */}
                                  {canOperate && (
                                    <div className="flex gap-2">
                                      {/* Só permite iniciar descarga se a carga estiver concluída */}
                                      {group.descarga.status === "aguardando" && group.carga?.status === "concluido" && (
                                        <Button
                                          onClick={() => openNFDialog(group.descarga, "start")}
                                          size="sm"
                                          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                                        >
                                          <Play className="w-3 h-3 mr-1" />
                                          Iniciar
                                        </Button>
                                      )}
                                      {/* Mostrar mensagem se a carga ainda não foi concluída */}
                                      {group.descarga.status === "aguardando" && group.carga?.status !== "concluido" && (
                                        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg">
                                          <Clock className="w-3 h-3" />
                                          Aguardando conclusão da carga
                                        </div>
                                      )}
                                      {group.descarga.status === "em_descarga" && (
                                        <Button
                                          onClick={() => openNFDialog(group.descarga, "end")}
                                          size="sm"
                                          className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
                                        >
                                          <Square className="w-3 h-3 mr-1" />
                                          Finalizar
                                        </Button>
                                      )}
                                      {/* Botão Balança - sempre visível para operador */}
                                      <Button
                                        onClick={() => openWeightDialog(group.descarga)}
                                        size="sm"
                                        variant="outline"
                                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                                      >
                                        <Scale className="w-3 h-3 mr-1" />
                                        Balança
                                      </Button>
                                    </div>
                                  )}
                                  {/* Botão Balança - visível para Op Balança (fora do canOperate) */}
                                  {!canOperate && canUseScale && (
                                    <Button
                                      onClick={() => openWeightDialog(group.descarga)}
                                      size="sm"
                                      variant="outline"
                                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                                    >
                                      <Scale className="w-3 h-3 mr-1" />
                                      Balança
                                    </Button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialog para informar NF */}
      <Dialog open={showNFDialog} onOpenChange={setShowNFDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#860063]" />
              {nfAction === "start" ? "Iniciar" : "Finalizar"} - {selectedTransferForNF?.phase === 'carga' ? 'CARGA' : 'DESCARGA'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="nf-number">
                Número da Nota Fiscal {nfAction === "start" && selectedTransferForNF?.location === "central" ? "(opcional)" : "*"}
              </Label>
              <Input
                id="nf-number"
                value={nfNumber}
                onChange={(e) => setNfNumber(e.target.value)}
                placeholder="Ex: 12345"
                className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                autoFocus
              />
              {nfAction === "start" && selectedTransferForNF?.location === "central" && (
                <p className="text-xs text-blue-600">
                  💡 Para iniciar carga na Central, a NF é opcional
                </p>
              )}
            </div>

            {selectedTransferForNF && (
              <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                <p><strong>Fase:</strong> {selectedTransferForNF.phase === 'carga' ? 'CARGA - Central' : 'DESCARGA - Fábrica'}</p>
                <p><strong>Lote:</strong> {selectedTransferForNF.batch}</p>
                <p><strong>Origem:</strong> {selectedTransferForNF.origin}</p>
                <p><strong>Quantidade:</strong> {selectedTransferForNF.quantity_per_truck} bags</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowNFDialog(false);
                  setNfNumber("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleNFSubmit}
                disabled={(nfAction !== "start" || selectedTransferForNF?.location !== "central") && !nfNumber.trim() || updateMutation.isPending}
                className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f]"
              >
                {updateMutation.isPending ? 'Salvando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog para Editar - Supervisor */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="w-5 h-5 text-[#860063]" />
              Editar Transferência
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Tipo de Pallet *</Label>
              <RadioGroup
                value={editFormData.pallet_type}
                onValueChange={(value) => setEditFormData({ ...editFormData, pallet_type: value })}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1MT" id="edit-1mt" />
                  <Label htmlFor="edit-1mt" className="cursor-pointer font-normal">1 MT</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1.5MT" id="edit-1.5mt" />
                  <Label htmlFor="edit-1.5mt" className="cursor-pointer font-normal">1,5 MT</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-batch">Lote *</Label>
              <Input
                id="edit-batch"
                value={editFormData.batch}
                onChange={(e) => setEditFormData({ ...editFormData, batch: e.target.value })}
                placeholder="Ex: BA8225L75K"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-origin">Origem *</Label>
              <Select
                value={editFormData.origin}
                onValueChange={(value) => setEditFormData({ ...editFormData, origin: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a origem" />
                </SelectTrigger>
                <SelectContent>
                  {ORIGIN_OPTIONS.map((origin) => (
                    <SelectItem key={origin} value={origin}>
                      {origin}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantidade (BAGS) *</Label>
              <Input
                id="edit-quantity"
                type="number"
                value={editFormData.quantity_per_truck}
                onChange={(e) => setEditFormData({ ...editFormData, quantity_per_truck: e.target.value })}
                placeholder="Ex: 50"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditDialog(false);
                  setEditingTransfer(null);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEditSubmit}
                disabled={updateMutation.isPending}
                className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f]"
              >
                {updateMutation.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* NOVO: Dialog para Editar Apenas a NF - Supervisor */}
      <Dialog open={showEditNFDialog} onOpenChange={setShowEditNFDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#860063]" />
              Editar Número da NF
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {editingNFTransfer && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1 text-sm mb-2">
                <p><strong>Fase:</strong> {editingNFTransfer.phase === 'carga' ? 'CARGA - Central' : 'DESCARGA - Fábrica'}</p>
                <p><strong>Lote:</strong> {editingNFTransfer.batch}</p>
                <p><strong>Status:</strong> {statusLabels[editingNFTransfer.status]}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-nf-number">Novo Número da Nota Fiscal *</Label>
              <Input
                id="edit-nf-number"
                value={editNFNumber}
                onChange={(e) => setEditNFNumber(e.target.value)}
                placeholder="Ex: 12345"
                className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                autoFocus
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEditNFDialog(false);
                  setEditingNFTransfer(null);
                  setEditNFNumber("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleEditNFSubmit}
                disabled={!editNFNumber.trim() || updateMutation.isPending}
                className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f]"
              >
                {updateMutation.isPending ? 'Salvando...' : 'Salvar NF'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* NOVO: Dialog para Controle de Balança */}
      <Dialog open={showWeightDialog} onOpenChange={setShowWeightDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-purple-600" />
              Controle de Balança - {weightTransfer?.phase === 'carga' ? 'CARGA' : 'DESCARGA'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {weightTransfer && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-1 text-sm mb-2">
                <p><strong>Fase:</strong> {weightTransfer.phase === 'carga' ? 'CARGA - Central' : 'DESCARGA - Fábrica'}</p>
                <p><strong>Lote:</strong> {weightTransfer.batch}</p>
                <p><strong>Origem:</strong> {weightTransfer.origin}</p>
                <p><strong>Quantidade:</strong> {weightTransfer.quantity_per_truck} bags</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight-wb">Número WB</Label>
                <Input
                  id="weight-wb"
                  value={weightData.wb_number}
                  onChange={(e) => setWeightData({ ...weightData, wb_number: e.target.value })}
                  placeholder="Ex: WB12345"
                  className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight-nf">Número NF</Label>
                <Input
                  id="weight-nf"
                  value={weightData.invoice_number}
                  onChange={(e) => setWeightData({ ...weightData, invoice_number: e.target.value })}
                  placeholder="Ex: 12345"
                  className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight-gross">Peso Bruto (kg)</Label>
                <Input
                  id="weight-gross"
                  type="number"
                  value={weightData.gross_weight}
                  onChange={(e) => setWeightData({ ...weightData, gross_weight: e.target.value })}
                  placeholder="Ex: 25000"
                  className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight-tare">Peso Tara (kg)</Label>
                <Input
                  id="weight-tare"
                  type="number"
                  value={weightData.tare_weight}
                  onChange={(e) => setWeightData({ ...weightData, tare_weight: e.target.value })}
                  placeholder="Ex: 8000"
                  className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Peso Líquido Calculado */}
            {(weightData.gross_weight && weightData.tare_weight) && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                <p className="text-xs text-green-600 mb-1">Peso Líquido (calculado)</p>
                <p className="text-2xl font-bold text-green-700">
                  {((parseFloat(weightData.gross_weight) || 0) - (parseFloat(weightData.tare_weight) || 0)).toLocaleString('pt-BR')} kg
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowWeightDialog(false);
                  setWeightTransfer(null);
                  setWeightData({ wb_number: "", invoice_number: "", gross_weight: "", tare_weight: "" });
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleWeightSubmit}
                disabled={updateMutation.isPending}
                className="flex-1 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
              >
                {updateMutation.isPending ? 'Salvando...' : 'Salvar Balança'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}