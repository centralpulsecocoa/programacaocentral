import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Edit, Trash2, Calendar, Clock, Package, MapPin, User, Phone, FileText, Truck, Timer, Save, XCircle, ClipboardList } from "lucide-react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { showOFISuccessToast } from "../shared/OFISuccessToast";

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

export default function ScheduleDetails({ schedule, onClose, userProfile, onDelete, onUpdate, isReadOnly = false }) {
  // Determinar se pode editar - agora também verifica isReadOnly
  // Comprador não pode editar agendamentos, apenas criar novos
  const canEdit = (userProfile === 'admin' || userProfile === 'supervisor' || userProfile === 'gerente_originacao') && !isReadOnly;
  
  // Determinar se pode editar dados de balança após conclusão
  // Controladoria pode editar pesos de balança em qualquer momento
  const canEditWeighbridgeAfterCompletion = (userProfile === 'controladoria') 
    ? true 
    : (schedule.status === 'concluido') 
      ? (userProfile === 'admin')
      : true;
  const [isEditing, setIsEditing] = useState(false);
  const [showQualityDialog, setShowQualityDialog] = useState(false);

  // Buscar dados de qualidade para este agendamento
  const { data: qualityData } = useQuery({
    queryKey: ['quality', schedule.load_number],
    queryFn: async () => {
      if (!schedule.load_number) return null;
      const results = await base44.entities.Quality.filter({ sample: schedule.load_number });
      return results.length > 0 ? results[0] : null;
    },
    enabled: !!schedule.load_number,
  });
  const [editData, setEditData] = useState({
    date: schedule.date,
    start_time: schedule.start_time,
    start_time_actual: schedule.start_time_actual || "",
    arrival_time: schedule.arrival_time || "",
    call_time: schedule.call_time || "",
    end_time_predicted: schedule.end_time_predicted,
    end_time_actual: schedule.end_time_actual || "",
    status: schedule.status,
    quantity_bags: schedule.quantity_bags,
    warehouse: schedule.warehouse,
    line: schedule.line,
    wb_number: schedule.wb_number || "",
    load_number: schedule.load_number || "",
    tracking_code: schedule.tracking_code || "",
    vehicle_plate: schedule.vehicle_plate || "",
    driver_name: schedule.driver_name || "",
    driver_phone: schedule.driver_phone || "",
    invoice_number: schedule.invoice_number || "",
    gross_weight: schedule.gross_weight || "",
    tare_weight: schedule.tare_weight || "",
    net_weight: schedule.net_weight || "",
    balancinha: schedule.balancinha || "",
    notes: schedule.notes || "",
    contract: schedule.contract || "",
    eudr_cvn: schedule.eudr_cvn || "EUDR",
    apanha_status: schedule.apanha_status || "NA",
    actual_bags: schedule.actual_bags || "",
    amostragem: schedule.amostragem || "",
    duplo: schedule.duplo || "",
    nibs: schedule.nibs || "",
    po: schedule.po || "",
    amostragem_devolvida: schedule.amostragem_devolvida || "",
    duplo_devolvido: schedule.duplo_devolvido || "",
    nibs_devolvido: schedule.nibs_devolvido || "",
    po_devolvido: schedule.po_devolvido || ""
  });

  // Atualizar editData sempre que schedule mudar (dados do servidor)
  React.useEffect(() => {
    setEditData({
      date: schedule.date,
      start_time: schedule.start_time,
      start_time_actual: schedule.start_time_actual || "",
      arrival_time: schedule.arrival_time || "",
      call_time: schedule.call_time || "",
      end_time_predicted: schedule.end_time_predicted,
      end_time_actual: schedule.end_time_actual || "",
      status: schedule.status,
      quantity_bags: schedule.quantity_bags,
      warehouse: schedule.warehouse,
      line: schedule.line,
      wb_number: schedule.wb_number || "",
      load_number: schedule.load_number || "",
      tracking_code: schedule.tracking_code || "",
      vehicle_plate: schedule.vehicle_plate || "",
      driver_name: schedule.driver_name || "",
      driver_phone: schedule.driver_phone || "",
      invoice_number: schedule.invoice_number || "",
      gross_weight: schedule.gross_weight || "",
      tare_weight: schedule.tare_weight || "",
      net_weight: schedule.net_weight || "",
      balancinha: schedule.balancinha || "",
      notes: schedule.notes || "",
      contract: schedule.contract || "",
      eudr_cvn: schedule.eudr_cvn || "EUDR",
      apanha_status: schedule.apanha_status || "NA",
      actual_bags: schedule.actual_bags || "",
      amostragem: schedule.amostragem || "",
      duplo: schedule.duplo || "",
      nibs: schedule.nibs || "",
      po: schedule.po || "",
      amostragem_devolvida: schedule.amostragem_devolvida || "",
      duplo_devolvido: schedule.duplo_devolvido || "",
      nibs_devolvido: schedule.nibs_devolvido || "",
      po_devolvido: schedule.po_devolvido || ""
    });
  }, [schedule]);

  const calculateDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return null;
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const totalMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  const calculatePredictedEndTime = (startTime, quantityBags) => {
    if (!startTime || !quantityBags) return "";
    
    const qty = Number(quantityBags);
    const totalMinutes = qty <= 100 ? 60 : Math.ceil((qty * 90) / 230);
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + totalMinutes;
    
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    
    return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
  };

  const handleSave = () => {
    // Recalcular toneladas
    const tons = (editData.quantity_bags * 60) / 1000;
    
    const updatePayload = {
      ...editData,
      quantity_bags: Number(editData.quantity_bags),
      quantity_tons: tons,
      gross_weight: editData.gross_weight !== "" ? Number(editData.gross_weight) : null,
      tare_weight: editData.tare_weight !== "" ? Number(editData.tare_weight) : null,
      net_weight: editData.net_weight !== "" ? Number(editData.net_weight) : null,
      balancinha: editData.balancinha !== "" ? Number(editData.balancinha) : null,
      actual_bags: editData.actual_bags !== "" ? Number(editData.actual_bags) : null,
      // Preservar SEMPRE campos de liberação e outros campos não editáveis
      supplier: schedule.supplier,
      release_status: schedule.release_status,
      release_requested_by: schedule.release_requested_by,
      release_requested_date: schedule.release_requested_date,
      released_by: schedule.released_by,
      released_date: schedule.released_date,
      batch: schedule.batch,
      gr: schedule.gr,
      net_weight_without_bags: schedule.net_weight_without_bags,
      origin_weight: schedule.origin_weight,
    };

    if (onUpdate) {
      onUpdate(updatePayload);
      
      // Mostrar toast OFI para supervisores e admins
      if (userProfile === 'supervisor' || userProfile === 'admin') {
        showOFISuccessToast(
          '✅ Dados salvos no servidor!',
          'As alterações foram gravadas com sucesso'
        );
      } else {
        toast.success('✅ Agendamento atualizado!', {
          description: 'As alterações foram salvas com sucesso.',
          duration: 3000,
        });
      }
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setEditData({
      date: schedule.date,
      start_time: schedule.start_time,
      start_time_actual: schedule.start_time_actual || "",
      arrival_time: schedule.arrival_time || "",
      call_time: schedule.call_time || "",
      end_time_predicted: schedule.end_time_predicted,
      end_time_actual: schedule.end_time_actual || "",
      status: schedule.status,
      quantity_bags: schedule.quantity_bags,
      warehouse: schedule.warehouse,
      line: schedule.line,
      wb_number: schedule.wb_number || "",
      load_number: schedule.load_number || "",
      tracking_code: schedule.tracking_code || "",
      vehicle_plate: schedule.vehicle_plate || "",
      driver_name: schedule.driver_name || "",
      driver_phone: schedule.driver_phone || "",
      invoice_number: schedule.invoice_number || "",
      gross_weight: schedule.gross_weight || "",
      tare_weight: schedule.tare_weight || "",
      net_weight: schedule.net_weight || "",
      balancinha: schedule.balancinha || "",
      notes: schedule.notes || "",
      contract: schedule.contract || "",
      eudr_cvn: schedule.eudr_cvn || "EUDR",
      apanha_status: schedule.apanha_status || "NA",
      actual_bags: schedule.actual_bags || "",
      amostragem: schedule.amostragem || "",
      duplo: schedule.duplo || "",
      nibs: schedule.nibs || "",
      po: schedule.po || "",
      amostragem_devolvida: schedule.amostragem_devolvida || "",
      duplo_devolvido: schedule.duplo_devolvido || "",
      nibs_devolvido: schedule.nibs_devolvido || "",
      po_devolvido: schedule.po_devolvido || ""
    });
    setIsEditing(false);
  };

  const actualDuration = calculateDuration(schedule.start_time, schedule.end_time_actual);
  const predictedDuration = calculateDuration(schedule.start_time, schedule.end_time_predicted);

  return (
    <>
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
    >
      <Card className="shadow-2xl border-2 border-[#860063]/30">
        <CardHeader className="border-b bg-gradient-to-r from-[#860063]/10 to-[#F88D2A]/10 py-3 px-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold">
              {isEditing ? 'Editando Agendamento' : 'Detalhes do Agendamento'}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {!isEditing ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  {userProfile === 'classificador' ? (
                    <span className="inline-block bg-gray-300 text-gray-300 rounded select-none px-2 text-lg">████████████</span>
                  ) : schedule.supplier}
                </h3>
                <Badge className={`${statusColors[schedule.status]} border`}>
                  {statusLabels[schedule.status]}
                </Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[#860063] mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Data</p>
                    <p className="font-semibold text-gray-900">
                      {format(new Date(schedule.date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#F88D2A] mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Horário Agendado</p>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900">{schedule.start_time}</p>
                      <span className="text-gray-400">→</span>
                      <p className="font-semibold text-gray-900">{schedule.end_time_predicted}</p>
                    </div>
                    {schedule.start_time_actual && (
                      <p className="text-sm text-green-600 mt-1">
                        Início real: {schedule.start_time_actual}
                      </p>
                    )}
                    {schedule.end_time_actual && (
                      <p className="text-sm text-green-600 mt-1">
                        Fim real: {schedule.end_time_actual}
                      </p>
                    )}
                  </div>
                </div>

                {schedule.arrival_time && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Horário de Chegada</p>
                      <p className="font-semibold text-yellow-600">{schedule.arrival_time}</p>
                    </div>
                  </div>
                )}

                {schedule.call_time && (
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Horário de Chamada</p>
                      <p className="font-semibold text-green-600">{schedule.call_time}</p>
                    </div>
                  </div>
                )}

                {(actualDuration || predictedDuration) && (
                  <div className="flex items-start gap-3">
                    <Timer className="w-5 h-5 text-indigo-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Duração</p>
                      {actualDuration && (
                        <p className="font-semibold text-green-600">
                          Real: {actualDuration}
                        </p>
                      )}
                      {predictedDuration && !actualDuration && (
                        <p className="font-semibold text-gray-900">
                          Prevista: {predictedDuration}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Quantidade</p>
                    <p className="font-semibold text-gray-900">
                      {schedule.quantity_bags?.toLocaleString('pt-BR')} sacos
                    </p>
                    <p className="text-sm text-gray-600">
                      {schedule.quantity_tons?.toFixed(2)} toneladas
                    </p>
                    {schedule.actual_bags && (
                      <p className="text-sm text-green-600 mt-1">
                        Descarregado: {schedule.actual_bags?.toLocaleString('pt-BR')} sacos
                      </p>
                    )}
                  </div>
                </div>

                {schedule.vehicle_plate && (
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-gray-600 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Placa do Veículo</p>
                      <p className="font-semibold text-gray-900">{schedule.vehicle_plate}</p>
                    </div>
                  </div>
                )}

                {schedule.driver_name && (
                  <div className="flex items-start gap-3">
                    <User className="w-5 h-5 text-indigo-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Motorista</p>
                      <p className="font-semibold text-gray-900">{schedule.driver_name}</p>
                      {schedule.driver_phone && (
                        <p className="text-sm text-gray-600 mt-0.5">
                          <Phone className="w-3 h-3 inline mr-1" />
                          {schedule.driver_phone}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {schedule.invoice_number && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Nota Fiscal</p>
                      <p className="font-semibold text-gray-900">{schedule.invoice_number}</p>
                    </div>
                  </div>
                )}

                {schedule.net_weight && (
                  <div className="flex items-start gap-3">
                    <Package className="w-5 h-5 text-green-500 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-gray-500">Pesagem</p>
                      <div className="bg-green-50 border border-green-200 rounded-lg p-2 mt-1">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-gray-600">Bruto</p>
                            <p className="font-semibold text-gray-900">
                              {schedule.gross_weight?.toLocaleString('pt-BR')} kg
                            </p>
                          </div>
                          <div>
                            <p className="text-gray-600">Tara</p>
                            <p className="font-semibold text-gray-900">
                              {schedule.tare_weight?.toLocaleString('pt-BR')} kg
                            </p>
                          </div>
                          <div>
                            <p className="text-green-700 font-semibold">Líquido</p>
                            <p className="font-bold text-green-700">
                              {schedule.net_weight?.toLocaleString('pt-BR')} kg
                            </p>
                          </div>
                        </div>
                        <p className="text-xs text-green-600 mt-1 text-center">
                          = {(schedule.net_weight / 1000).toFixed(2)} toneladas
                        </p>
                        {/* Peso Líquido sem Sacaria */}
                        {(schedule.actual_bags || schedule.quantity_bags) && (
                          <div className="mt-2 pt-2 border-t border-green-200">
                            <p className="text-gray-600 text-xs">Líq. sem Sacaria</p>
                            <p className="font-bold text-red-600 text-sm">
                              {(() => {
                                const bags = schedule.actual_bags || schedule.quantity_bags;
                                const pesoSacaria = bags * 0.15;
                                const liquSemSacaria = schedule.net_weight - pesoSacaria;
                                return `${liquSemSacaria.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
                              })()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Local</p>
                    <p className="font-semibold text-gray-900 capitalize">
                      {schedule.warehouse} - Linha {schedule.line}
                    </p>
                  </div>
                </div>

                {schedule.contract && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-teal-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Contrato</p>
                      <p className="font-semibold text-gray-900">{schedule.contract}</p>
                    </div>
                  </div>
                )}

                {schedule.eudr_cvn && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Certificação</p>
                      <p className="font-semibold text-gray-900">{schedule.eudr_cvn}</p>
                    </div>
                  </div>
                )}

                {schedule.wb_number && (
                  <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-indigo-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">WB</p>
                      <p className="font-semibold text-gray-900">{schedule.wb_number}</p>
                    </div>
                  </div>
                )}

                {schedule.load_number && (
                  <div className="flex items-start gap-3">
                    <Truck className="w-5 h-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Nº de Carga</p>
                      <p className="font-semibold text-gray-900">{schedule.load_number}</p>
                    </div>
                  </div>
                )}

                {schedule.balancinha && (
                  <div className="flex items-start gap-3">
                    <Package className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Balancinha</p>
                      <p className="font-semibold text-gray-900">{schedule.balancinha} kg</p>
                    </div>
                  </div>
                )}

                {/* OPERADOR: Mostrar Frete ao invés de Código de Rastreio */}
                {userProfile === "operador" ? (
                  schedule.apanha_status && (
                    <div className="flex items-start gap-3">
                      <Truck className="w-5 h-5 text-purple-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Frete</p>
                        <p className="font-semibold text-gray-900">{schedule.apanha_status}</p>
                      </div>
                    </div>
                  )
                ) : (
                  schedule.tracking_code && (
                    <div className="flex items-start gap-3">
                      <FileText className="w-5 h-5 text-pink-500 mt-0.5" />
                      <div>
                        <p className="text-sm text-gray-500">Código de Rastreio</p>
                        <p className="font-semibold text-gray-900">{schedule.tracking_code}</p>
                      </div>
                    </div>
                  )
                )}

                {schedule.notes && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500 mb-1">Observações</p>
                    <p className="text-gray-900">{schedule.notes}</p>
                  </div>
                )}

                {(() => {
                  const agendadoPor = schedule.created_by_name ||
                    (schedule.created_by && !schedule.created_by.includes('no-reply') && !schedule.created_by.includes('service+')
                      ? schedule.created_by : null);
                  return agendadoPor ? (
                    <div className="flex items-start gap-3 bg-green-50 p-3 rounded-lg border border-green-200">
                      <User className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="text-sm text-green-700 font-semibold">Agendado por</p>
                        <p className="text-sm font-bold text-green-900">{agendadoPor}</p>
                      </div>
                    </div>
                  ) : null;
                })()}

                {/* Botão Ver Laudo */}
                <div className="pt-2">
                  <Button
                    variant={qualityData ? "default" : "outline"}
                    onClick={() => qualityData && setShowQualityDialog(true)}
                    disabled={!qualityData}
                    className={qualityData 
                      ? "w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white" 
                      : "w-full text-gray-400 border-gray-300"
                    }
                  >
                    <ClipboardList className="w-4 h-4 mr-2" />
                    {qualityData ? "Ver Laudo" : "Sem Laudo"}
                  </Button>
                </div>
              </div>

              {/* Action Buttons - Ocultos para Controladoria */}
              {!isReadOnly && (
                <div className="flex gap-2 pt-2 border-t">
                  {canEdit && (
                    <>
                      <Button
                        onClick={() => setIsEditing(true)}
                        variant="outline"
                        className="flex-1"
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                      <Button
                        onClick={() => {
                          if (confirm('Tem certeza que deseja excluir este agendamento?')) {
                            onDelete();
                          }
                        }}
                        variant="outline"
                        className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </Button>
                    </>
                  )}

                </div>
              )}
            </>
          ) : (
            <>
              {/* Edit Form */}
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-date">Data *</Label>
                    <Input
                      id="edit-date"
                      type="date"
                      value={editData.date}
                      onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-status">Status *</Label>
                    <Select
                      value={editData.status}
                      onValueChange={(value) => setEditData({ ...editData, status: value })}
                    >
                      <SelectTrigger className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="agendado">Agendado</SelectItem>
                        <SelectItem value="aguardando">Aguardando</SelectItem>
                        <SelectItem value="em_descarga">Em Descarga</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-start-time">Início Agendado *</Label>
                    <Input
                      id="edit-start-time"
                      type="time"
                      value={editData.start_time}
                      onChange={(e) => {
                        const newStartTime = e.target.value;
                        const newEndTime = calculatePredictedEndTime(newStartTime, editData.quantity_bags);
                        setEditData({ 
                          ...editData, 
                          start_time: newStartTime,
                          end_time_predicted: newEndTime
                        });
                      }}
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-arrival-time">Chegada</Label>
                    <Input
                      id="edit-arrival-time"
                      type="time"
                      value={editData.arrival_time}
                      onChange={(e) => setEditData({ ...editData, arrival_time: e.target.value })}
                      className="border-gray-300 focus:border-yellow-600 focus:ring-yellow-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-call-time">Chamada</Label>
                    <Input
                      id="edit-call-time"
                      type="time"
                      value={editData.call_time}
                      onChange={(e) => setEditData({ ...editData, call_time: e.target.value })}
                      className="border-gray-300 focus:border-green-600 focus:ring-green-600"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-start-actual">Início Real</Label>
                    <Input
                      id="edit-start-actual"
                      type="time"
                      value={editData.start_time_actual}
                      onChange={(e) => setEditData({ ...editData, start_time_actual: e.target.value })}
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-end-actual">Fim Real</Label>
                  <Input
                    id="edit-end-actual"
                    type="time"
                    value={editData.end_time_actual}
                    onChange={(e) => setEditData({ ...editData, end_time_actual: e.target.value })}
                    className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-quantity">Quantidade (sacos) *</Label>
                    <Input
                      id="edit-quantity"
                      type="number"
                      value={editData.quantity_bags}
                      onChange={(e) => {
                        const newQuantity = e.target.value;
                        const newEndTime = calculatePredictedEndTime(editData.start_time, newQuantity);
                        setEditData({ 
                          ...editData, 
                          quantity_bags: newQuantity,
                          end_time_predicted: newEndTime
                        });
                      }}
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                    />
                    {editData.quantity_bags && (
                      <p className="text-sm text-gray-600">
                        = {((editData.quantity_bags * 60) / 1000).toFixed(2)} toneladas
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-warehouse">Armazém *</Label>
                    <Select
                      value={editData.warehouse}
                      onValueChange={(value) => {
                        setEditData({ 
                          ...editData, 
                          warehouse: value,
                          line: (value === 'fabrica' || value === 'barra') ? '01' : editData.line
                        });
                      }}
                    >
                      <SelectTrigger className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="central">Central</SelectItem>
                        <SelectItem value="fabrica">Fábrica</SelectItem>
                        <SelectItem value="barra">Barra</SelectItem>
                        <SelectItem value="ferraz">Ferraz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-vehicle-plate">Placa do Veículo</Label>
                    <Input
                      id="edit-vehicle-plate"
                      type="text"
                      value={editData.vehicle_plate}
                      onChange={(e) => setEditData({ ...editData, vehicle_plate: e.target.value ? e.target.value.toUpperCase() : "" })}
                      placeholder="ABC-1234"
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] uppercase"
                      disabled={!canEditWeighbridgeAfterCompletion}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-driver-name">Nome do Motorista</Label>
                    <Input
                      id="edit-driver-name"
                      type="text"
                      value={editData.driver_name}
                      onChange={(e) => setEditData({ ...editData, driver_name: e.target.value })}
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                      disabled={!canEditWeighbridgeAfterCompletion}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-driver-phone">Telefone Motorista</Label>
                    <Input
                      id="edit-driver-phone"
                      type="tel"
                      value={editData.driver_phone}
                      onChange={(e) => setEditData({ ...editData, driver_phone: e.target.value })}
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                      disabled={!canEditWeighbridgeAfterCompletion}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-invoice">Nota Fiscal</Label>
                  <Input
                    id="edit-invoice"
                    type="text"
                    value={editData.invoice_number}
                    onChange={(e) => setEditData({ ...editData, invoice_number: e.target.value })}
                    placeholder="Número da NF"
                    className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                    disabled={!canEditWeighbridgeAfterCompletion}
                  />
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-gross-weight">Peso Bruto (kg)</Label>
                    <Input
                      id="edit-gross-weight"
                      type="number"
                      value={editData.gross_weight}
                      onChange={(e) => {
                        const gross = e.target.value;
                        const net = gross && editData.tare_weight 
                          ? parseFloat(gross) - parseFloat(editData.tare_weight) 
                          : "";
                        setEditData({ ...editData, gross_weight: gross, net_weight: net });
                      }}
                      placeholder="Ex: 35000"
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                      disabled={!canEditWeighbridgeAfterCompletion}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-tare-weight">Peso Tara (kg)</Label>
                    <Input
                      id="edit-tare-weight"
                      type="number"
                      value={editData.tare_weight}
                      onChange={(e) => {
                        const tare = e.target.value;
                        const net = editData.gross_weight && tare 
                          ? parseFloat(editData.gross_weight) - parseFloat(tare) 
                          : "";
                        setEditData({ ...editData, tare_weight: tare, net_weight: net });
                      }}
                      placeholder="Ex: 15000"
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                      disabled={!canEditWeighbridgeAfterCompletion}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-net-weight">Peso Líquido (kg)</Label>
                    <Input
                      id="edit-net-weight"
                      type="number"
                      value={editData.net_weight}
                      disabled
                      className="border-gray-300 bg-gray-50"
                    />
                    {editData.net_weight && (
                      <p className="text-xs text-green-600">
                        = {(editData.net_weight / 1000).toFixed(2)} toneladas
                      </p>
                    )}
                  </div>
                </div>

                {!canEditWeighbridgeAfterCompletion && schedule.status === 'concluido' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-xs text-amber-800">
                      <strong>🔒 Acesso Restrito:</strong> Dados de balança em cargas concluídas só podem ser editados por Administrador ou Controladoria.
                    </p>
                  </div>
                )}

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-line">Linha *</Label>
                    <Select
                      value={editData.line}
                      onValueChange={(value) => setEditData({ ...editData, line: value })}
                    >
                      <SelectTrigger className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="01">Linha 01</SelectItem>
                        <SelectItem value="02">Linha 02</SelectItem>
                        <SelectItem value="03">Linha 03</SelectItem>
                        <SelectItem value="04">Linha 04</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-wb">WB</Label>
                    <Input
                      id="edit-wb"
                      type="text"
                      value={editData.wb_number}
                      onChange={(e) => setEditData({ ...editData, wb_number: e.target.value })}
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                    />
                    {(userProfile === 'supervisor' || userProfile === 'admin') && (
                      <p className="text-xs text-green-600">✓ Você pode alterar a WB a qualquer momento</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-load">Nº Carga</Label>
                    <Input
                      id="edit-load"
                      type="text"
                      value={editData.load_number}
                      onChange={(e) => setEditData({ ...editData, load_number: e.target.value })}
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-contract">Tipo de Contrato</Label>
                    <Select
                      value={editData.contract || ""}
                      onValueChange={(value) => setEditData({ ...editData, contract: value })}
                    >
                      <SelectTrigger className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RFP">RFP</SelectItem>
                        <SelectItem value="PTBF">PTBF</SelectItem>
                        <SelectItem value="DIF">DIF</SelectItem>
                        <SelectItem value="TRANSFERÊNCIA">TRANSFERÊNCIA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-eudr-cvn">Certificação</Label>
                    <Select
                      value={editData.eudr_cvn}
                      onValueChange={(value) => setEditData({ ...editData, eudr_cvn: value })}
                    >
                      <SelectTrigger className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EUDR">EUDR</SelectItem>
                        <SelectItem value="CVN">CVN</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-apanha">Frete</Label>
                    <Select
                      value={editData.apanha_status}
                      onValueChange={(value) => setEditData({ ...editData, apanha_status: value })}
                    >
                      <SelectTrigger className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Apanha">Apanha</SelectItem>
                        <SelectItem value="NA">NA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Campos do Operador - Editáveis por Supervisor/Admin */}
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Package className="w-4 h-4 text-[#F88D2A]" />
                    Dados do Operador
                  </h4>
                  
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-actual-bags">Sacos Recebidos</Label>
                      <Input
                        id="edit-actual-bags"
                        type="number"
                        value={editData.actual_bags || ""}
                        onChange={(e) => setEditData({ ...editData, actual_bags: e.target.value })}
                        placeholder="Quantidade real descarregada"
                        className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-balancinha">Balancinha (kg)</Label>
                      <Input
                        id="edit-balancinha"
                        type="number"
                        value={editData.balancinha}
                        onChange={(e) => setEditData({ ...editData, balancinha: e.target.value })}
                        placeholder="Ex: 1250"
                        className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                      />
                    </div>
                  </div>

                  <p className="text-xs font-medium text-purple-700 mb-1">Resíduos Recebidos</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-amostragem" className="text-xs">Amostragem</Label>
                      <Input
                        id="edit-amostragem"
                        type="text"
                        value={editData.amostragem || ""}
                        onChange={(e) => setEditData({ ...editData, amostragem: e.target.value })}
                        placeholder="Ex: 500g"
                        className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-duplo" className="text-xs">Duplo</Label>
                      <Input
                        id="edit-duplo"
                        type="text"
                        value={editData.duplo || ""}
                        onChange={(e) => setEditData({ ...editData, duplo: e.target.value })}
                        placeholder="Ex: 2kg"
                        className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-nibs" className="text-xs">Nibs</Label>
                      <Input
                        id="edit-nibs"
                        type="text"
                        value={editData.nibs || ""}
                        onChange={(e) => setEditData({ ...editData, nibs: e.target.value })}
                        placeholder="Ex: 1.5kg"
                        className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-po" className="text-xs">Pó</Label>
                      <Input
                        id="edit-po"
                        type="text"
                        value={editData.po || ""}
                        onChange={(e) => setEditData({ ...editData, po: e.target.value })}
                        placeholder="Ex: 800g"
                        className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9"
                      />
                    </div>
                  </div>

                  <p className="text-xs font-medium text-orange-600 mt-3 mb-1">Resíduos Devolvidos <span className="font-normal text-gray-400">(informativo)</span></p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="edit-amostragem-dev" className="text-xs">Amostragem</Label>
                      <Input
                        id="edit-amostragem-dev"
                        type="text"
                        value={editData.amostragem_devolvida || ""}
                        onChange={(e) => setEditData({ ...editData, amostragem_devolvida: e.target.value })}
                        placeholder="Ex: 500g"
                        className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-duplo-dev" className="text-xs">Duplo</Label>
                      <Input
                        id="edit-duplo-dev"
                        type="text"
                        value={editData.duplo_devolvido || ""}
                        onChange={(e) => setEditData({ ...editData, duplo_devolvido: e.target.value })}
                        placeholder="Ex: 2kg"
                        className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-nibs-dev" className="text-xs">Nibs</Label>
                      <Input
                        id="edit-nibs-dev"
                        type="text"
                        value={editData.nibs_devolvido || ""}
                        onChange={(e) => setEditData({ ...editData, nibs_devolvido: e.target.value })}
                        placeholder="Ex: 1.5kg"
                        className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 h-9"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-po-dev" className="text-xs">Pó</Label>
                      <Input
                        id="edit-po-dev"
                        type="text"
                        value={editData.po_devolvido || ""}
                        onChange={(e) => setEditData({ ...editData, po_devolvido: e.target.value })}
                        placeholder="Ex: 800g"
                        className="border-orange-200 focus:border-orange-400 focus:ring-orange-400 h-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-tracking">Código de Rastreio</Label>
                  <Input
                    id="edit-tracking"
                    type="text"
                    value={editData.tracking_code}
                    onChange={(e) => setEditData({ ...editData, tracking_code: e.target.value })}
                    className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-notes">Observações</Label>
                  <Textarea
                    id="edit-notes"
                    value={editData.notes}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    rows={3}
                    className="border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                  />
                </div>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleCancelEdit}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063] text-white"
                    onClick={handleSave}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>

    {/* Dialog de Qualidade/Laudo */}
    <Dialog open={showQualityDialog} onOpenChange={setShowQualityDialog}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto p-4">
        <DialogHeader className="pb-2">
          <DialogTitle className="flex items-center gap-1.5 text-[#860063] text-sm">
            <ClipboardList className="w-4 h-4" />
            Laudo de Qualidade
          </DialogTitle>
        </DialogHeader>
        {qualityData && (
          <div className="space-y-2">
            {/* Cabeçalho com Carga e WB */}
            <div className="bg-gradient-to-r from-[#860063]/10 to-[#F88D2A]/10 rounded-md p-2.5 border border-[#860063]/20">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] text-gray-500">Nº Carga</p>
                  <p className="text-sm font-bold text-[#860063]">{schedule.load_number || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500">WB</p>
                  <p className="text-sm font-bold text-[#F88D2A]">{schedule.wb_number || '-'}</p>
                </div>
              </div>
            </div>

            {/* Dados do Laudo */}
            <div className="grid grid-cols-4 gap-1.5">
              <div className="bg-gray-50 rounded p-1.5">
                <p className="text-[9px] text-gray-500">Data Recebimento</p>
                <p className="text-[11px] font-semibold">{schedule.date ? format(new Date(schedule.date + 'T12:00:00'), "dd/MM/yy") : (qualityData.date ? format(new Date(qualityData.date + 'T12:00:00'), "dd/MM/yy") : '-')}</p>
              </div>
              <div className="bg-gray-50 rounded p-1.5">
                <p className="text-[9px] text-gray-500">Origem</p>
                <p className="text-[11px] font-semibold truncate">{qualityData.origin || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded p-1.5">
                <p className="text-[9px] text-gray-500">Liberado</p>
                <p className="text-[11px] font-semibold truncate">{qualityData.released_by || '-'}</p>
              </div>
              <div className="bg-gray-50 rounded p-1.5">
                <p className="text-[9px] text-gray-500">Hora</p>
                <p className="text-[11px] font-semibold">{qualityData.release_time || '-'}</p>
              </div>
            </div>

            {/* Métricas de Qualidade */}
            <div className="border-t border-[#860063]/20 pt-2">
              <p className="text-[10px] font-semibold text-[#860063] mb-1.5 uppercase tracking-wide">Métricas</p>
              <div className="grid grid-cols-4 gap-1">
                <div className={`rounded p-1.5 text-center ${qualityData.moisture_percent > 12.1 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <p className="text-[9px] text-gray-600">Umidade</p>
                  <p className={`text-xs font-bold ${qualityData.moisture_percent > 12.1 ? 'text-red-600' : 'text-green-600'}`}>
                    {qualityData.moisture_percent?.toFixed(1) || '-'}%
                  </p>
                </div>
                <div className={`rounded p-1.5 text-center ${qualityData.mouldy_percent > 25 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <p className="text-[9px] text-gray-600">Mofo</p>
                  <p className={`text-xs font-bold ${qualityData.mouldy_percent > 25 ? 'text-red-600' : 'text-green-600'}`}>
                    {qualityData.mouldy_percent || '-'}%
                  </p>
                </div>
                <div className="bg-gray-50 rounded p-1.5 text-center border border-gray-200">
                  <p className="text-[9px] text-gray-600">FFA</p>
                  <p className="text-xs font-bold text-gray-700">{qualityData.ffa?.toFixed(2) || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded p-1.5 text-center border border-gray-200">
                  <p className="text-[9px] text-gray-600">Bean</p>
                  <p className="text-xs font-bold text-gray-700">{qualityData.bean_count || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded p-1.5 text-center border border-gray-200">
                  <p className="text-[9px] text-gray-600">Slaty</p>
                  <p className="text-xs font-bold text-gray-700">{qualityData.slaty_percent || '-'}%</p>
                </div>
                <div className="bg-gray-50 rounded p-1.5 text-center border border-gray-200">
                  <p className="text-[9px] text-gray-600">Violet</p>
                  <p className="text-xs font-bold text-gray-700">{qualityData.violet_percent || '-'}%</p>
                </div>
                <div className="bg-gray-50 rounded p-1.5 text-center border border-gray-200">
                  <p className="text-[9px] text-gray-600">Germ.</p>
                  <p className="text-xs font-bold text-gray-700">{qualityData.germinated_percent || '-'}%</p>
                </div>
                <div className="bg-gray-50 rounded p-1.5 text-center border border-gray-200">
                  <p className="text-[9px] text-gray-600">Flat</p>
                  <p className="text-xs font-bold text-gray-700">{qualityData.flat_percent || '-'}%</p>
                </div>
                <div className="bg-gray-50 rounded p-1.5 text-center border border-gray-200">
                  <p className="text-[9px] text-gray-600">Shell</p>
                  <p className="text-xs font-bold text-gray-700">{qualityData.shell_percent?.toFixed(1) || '-'}%</p>
                </div>
                <div className={`rounded p-1.5 text-center ${parseFloat(qualityData.fumaca) > 6 ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <p className="text-[9px] text-gray-600">Fumaça</p>
                  <p className={`text-xs font-bold ${parseFloat(qualityData.fumaca) > 6 ? 'text-red-600' : 'text-gray-700'}`}>{qualityData.fumaca || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded p-1.5 text-center border border-gray-200">
                  <p className="text-[9px] text-gray-600">Ext.Mofo</p>
                  <p className="text-xs font-bold text-gray-700">{qualityData.external_mould_percent || '-'}%</p>
                </div>
                <div className="bg-gray-50 rounded p-1.5 text-center border border-gray-200">
                  <p className="text-[9px] text-gray-600">Inseto</p>
                  <p className="text-xs font-bold text-gray-700">{qualityData.insect_damaged_percent || '-'}%</p>
                </div>
              </div>
            </div>

            {/* Tipo, Resíduo e Duplo */}
            <div className="grid grid-cols-3 gap-1.5">
              {qualityData.type && (
                <div className="bg-[#860063]/5 rounded p-1.5 border border-[#860063]/20">
                  <p className="text-[9px] text-gray-600">Tipo</p>
                  <p className="text-[10px] font-semibold text-[#860063]">{qualityData.type}</p>
                </div>
              )}
              <div className="bg-purple-50 rounded p-1.5 border border-purple-200">
                <p className="text-[9px] text-gray-600">Resíduo</p>
                <p className="text-[10px] font-bold text-purple-700">
                  {(() => {
                    // Primeiro verificar se tem valor salvo no registro de qualidade
                    if (qualityData.residuo !== null && qualityData.residuo !== undefined && qualityData.residuo !== "") {
                      return `${qualityData.residuo}%`;
                    }
                    // Calcular: (pó + nibs) / amostragem * 100 / 60
                    if (schedule.amostragem && schedule.nibs != null && schedule.po != null) {
                      const amostragem = parseFloat(schedule.amostragem);
                      const nibs = parseFloat(schedule.nibs);
                      const po = parseFloat(schedule.po);
                      if (!isNaN(amostragem) && amostragem !== 0) {
                        return `${((nibs + po) / amostragem * 100 / 60).toFixed(2)}%`;
                      }
                    }
                    return '-';
                  })()}
                </p>
              </div>
              <div className="bg-orange-50 rounded p-1.5 border border-orange-200">
                <p className="text-[9px] text-gray-600">Duplo</p>
                <p className="text-[10px] font-bold text-orange-700">
                  {(() => {
                    // Primeiro verificar se tem valor salvo no registro de qualidade
                    if (qualityData.duplo !== null && qualityData.duplo !== undefined && qualityData.duplo !== "") {
                      return `${qualityData.duplo}%`;
                    }
                    // Calcular: duplo / amostragem * 100 / 60
                    if (schedule.amostragem && schedule.duplo != null) {
                      const amostragem = parseFloat(schedule.amostragem);
                      const duplo = parseFloat(schedule.duplo);
                      if (!isNaN(amostragem) && amostragem !== 0) {
                        return `${(duplo / amostragem * 100 / 60).toFixed(2)}%`;
                      }
                    }
                    return '-';
                  })()}
                </p>
              </div>
            </div>

            {/* Observações e Justificativa */}
            {(qualityData.observations || qualityData.justification) && (
              <div className="space-y-1">
                {qualityData.observations && (
                  <div className="bg-[#F88D2A]/10 border border-[#F88D2A]/30 rounded p-2">
                    <p className="text-[9px] text-gray-600">Obs:</p>
                    <p className="text-[10px] text-gray-800">{qualityData.observations}</p>
                  </div>
                )}
                {qualityData.justification && (
                  <div className="bg-blue-50 border border-blue-200 rounded p-2">
                    <p className="text-[9px] text-gray-600">Justificativa:</p>
                    <p className="text-[10px] text-gray-800">{qualityData.justification}</p>
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={() => setShowQualityDialog(false)}
              size="sm"
              className="w-full bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824] h-8 text-xs"
            >
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  </>
  );
}