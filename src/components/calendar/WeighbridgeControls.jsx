import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Scale, Save, Clock, FileText, Weight } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

export default function WeighbridgeControls({ schedule, onUpdate }) {
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [grossWeight, setGrossWeight] = useState("");
  const [tareWeight, setTareWeight] = useState("");
  const [netWeight, setNetWeight] = useState(0);
  const [originWeight, setOriginWeight] = useState("");

  // Atualizar estados quando o schedule mudar (apenas dados salvos, sem sugestões)
  useEffect(() => {
    setVehiclePlate(schedule.vehicle_plate || "");
    setDriverName(schedule.driver_name || "");
    setDriverPhone(schedule.driver_phone || "");
    setInvoiceNumber(schedule.invoice_number || "");
    setGrossWeight(schedule.gross_weight || "");
    setTareWeight(schedule.tare_weight || "");
    setNetWeight(schedule.net_weight || 0);
    setOriginWeight(schedule.origin_weight || "");
  }, [schedule.id]);

  // Calcular peso líquido automaticamente quando peso bruto ou tara mudam
  useEffect(() => {
    if (grossWeight && tareWeight) {
      const calculated = parseFloat(grossWeight) - parseFloat(tareWeight);
      setNetWeight(calculated > 0 ? calculated : 0);
    } else if (!schedule.net_weight) {
      setNetWeight(0);
    }
  }, [grossWeight, tareWeight, schedule.net_weight]);

  // Verifica se é transferência do Pará (Altamira ou Medicilândia)
  const isParaTransfer = () => {
    const supplier = schedule.supplier?.toLowerCase() || "";
    return schedule.contract === "TRANSFERÊNCIA" && 
           (supplier.includes("altamira") || supplier.includes("medicilândia") || supplier.includes("medicilandia"));
  };

  // Calcula diferença percentual entre peso origem e peso líquido
  const calculateWeightDifference = () => {
    if (!originWeight || !netWeight) return null;
    const diff = netWeight - parseFloat(originWeight);
    const percentDiff = (diff / parseFloat(originWeight)) * 100;
    return {
      absolute: diff,
      percent: percentDiff
    };
  };

  const handleRegisterArrival = async () => {
    if (!vehiclePlate || !driverName) {
      toast.error('❌ Campos obrigatórios vazios', {
        description: 'Placa e nome do motorista são obrigatórios.',
        duration: 3000,
      });
      return;
    }

    const now = new Date();
    const arrivalTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    try {
      const updateData = {
        ...preservedFields(),
        status: 'aguardando',
        arrival_time: arrivalTime,
        vehicle_plate: vehiclePlate.trim(),
        driver_name: driverName.trim(),
        driver_phone: driverPhone.trim(),
        gross_weight: grossWeight ? Number(grossWeight) : null,
        tare_weight: tareWeight ? Number(tareWeight) : null,
        net_weight: netWeight || null,
        invoice_number: invoiceNumber.trim(),
        origin_weight: originWeight ? Number(originWeight) : null,
      };

      // Calcular líquido sem sacaria (0,67kg para Ferraz/Porto, 0,15kg para demais)
      if (netWeight > 0 && schedule.actual_bags) {
        const bagWeight = schedule.warehouse === 'ferraz' ? 0.67 : 0.15;
        updateData.net_weight_without_bags = netWeight - (schedule.actual_bags * bagWeight);
      }

      await onUpdate(updateData);

      toast.success('✅ Chegada registrada!', {
        description: `Veículo ${vehiclePlate} chegou às ${arrivalTime}`,
        duration: 4000,
      });
    } catch (error) {
      console.error('Erro ao registrar chegada:', error);
      toast.error('❌ Erro ao registrar chegada', {
        description: 'Tente novamente ou contate o suporte.',
        duration: 4000,
      });
    }
  };

  // Verificar se as pesagens foram finalizadas (ambos pesos salvos)
  const isWeighingFinalized = schedule.gross_weight && schedule.tare_weight;

  const preservedFields = () => ({
    supplier: schedule.supplier,
    release_status: schedule.release_status,
    release_requested_by: schedule.release_requested_by,
    release_requested_date: schedule.release_requested_date,
    released_by: schedule.released_by,
    released_date: schedule.released_date,
    batch: schedule.batch,
    gr: schedule.gr,
    // Preservar dados de veículo/motorista já salvos
    vehicle_plate: schedule.vehicle_plate,
    driver_name: schedule.driver_name,
    driver_phone: schedule.driver_phone,
    invoice_number: schedule.invoice_number,
    arrival_time: schedule.arrival_time,
    // Preservar pesos já salvos
    gross_weight: schedule.gross_weight,
    tare_weight: schedule.tare_weight,
    net_weight: schedule.net_weight,
    net_weight_without_bags: schedule.net_weight_without_bags,
    origin_weight: schedule.origin_weight,
  });

  const handleSaveGrossWeight = async () => {
    if (!grossWeight) {
      toast.error('❌ Peso bruto obrigatório', {
        description: 'Informe o peso bruto antes de salvar.',
        duration: 3000,
      });
      return;
    }

    try {
      await onUpdate({
        ...preservedFields(),
        vehicle_plate: vehiclePlate || schedule.vehicle_plate,
        driver_name: driverName || schedule.driver_name,
        driver_phone: driverPhone || schedule.driver_phone,
        invoice_number: invoiceNumber || schedule.invoice_number,
        origin_weight: originWeight ? Number(originWeight) : schedule.origin_weight,
        gross_weight: Number(grossWeight),
      });
      toast.success('✅ Peso bruto salvo!', {
        description: 'Peso bruto registrado. Você pode salvar a tara posteriormente.',
        duration: 3000,
      });
    } catch (error) {
      toast.error('❌ Erro ao salvar peso bruto');
    }
  };

  const handleSaveTareWeight = async () => {
    if (!tareWeight) {
      toast.error('❌ Peso tara obrigatório', {
        description: 'Informe o peso tara antes de salvar.',
        duration: 3000,
      });
      return;
    }

    try {
      const updateData = {
        ...preservedFields(),
        vehicle_plate: vehiclePlate || schedule.vehicle_plate,
        driver_name: driverName || schedule.driver_name,
        driver_phone: driverPhone || schedule.driver_phone,
        invoice_number: invoiceNumber || schedule.invoice_number,
        origin_weight: originWeight ? Number(originWeight) : schedule.origin_weight,
        gross_weight: grossWeight ? Number(grossWeight) : schedule.gross_weight,
        tare_weight: Number(tareWeight),
        net_weight: netWeight || null,
      };

      if (netWeight > 0 && schedule.actual_bags) {
        const bagWeight = schedule.warehouse === 'ferraz' ? 0.67 : 0.15;
        updateData.net_weight_without_bags = netWeight - (schedule.actual_bags * bagWeight);
      }

      await onUpdate(updateData);
      toast.success('✅ Peso tara salvo!', {
        description: netWeight > 0 ? `Peso líquido: ${netWeight.toLocaleString('pt-BR')} kg` : 'Peso tara registrado.',
        duration: 4000,
      });
    } catch (error) {
      toast.error('❌ Erro ao salvar peso tara');
    }
  };

  const handleSaveData = async () => {
    try {
      const updateData = {
        ...preservedFields(),
        vehicle_plate: vehiclePlate,
        driver_name: driverName,
        driver_phone: driverPhone,
        gross_weight: grossWeight ? Number(grossWeight) : null,
        tare_weight: tareWeight ? Number(tareWeight) : null,
        net_weight: netWeight || null,
        invoice_number: invoiceNumber,
        origin_weight: originWeight ? Number(originWeight) : null,
      };

      if (netWeight > 0 && schedule.actual_bags) {
        const bagWeight = schedule.warehouse === 'ferraz' ? 0.67 : 0.15;
        updateData.net_weight_without_bags = netWeight - (schedule.actual_bags * bagWeight);
      }

      await onUpdate(updateData);
      toast.success('✅ Dados salvos!', {
        description: 'As informações da balança foram atualizadas.',
        duration: 3000,
      });
    } catch (error) {
      toast.error('❌ Erro ao salvar dados da balança');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6"
    >
      <Card className="shadow-xl border-none border-t-4 border-t-yellow-500">
        <CardHeader className="border-b bg-gradient-to-r from-yellow-500/5 to-orange-500/5">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Scale className="w-5 h-5 text-yellow-600" />
            Controles da Balança
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {schedule.status === "agendado" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="vehicle_plate">Placa do Veículo *</Label>
                <Input
                  id="vehicle_plate"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value ? e.target.value.toUpperCase() : "")}
                  placeholder="Ex: ABC-1234"
                  maxLength={8}
                  className="border-gray-300 focus:border-yellow-600 focus:ring-yellow-600 uppercase"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="driver_name">Nome do Motorista *</Label>
                <Input
                  id="driver_name"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  placeholder="Nome completo"
                  className="border-gray-300 focus:border-yellow-600 focus:ring-yellow-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="driver_phone">Telefone do Motorista</Label>
                <Input
                  id="driver_phone"
                  type="tel"
                  value={driverPhone}
                  onChange={(e) => setDriverPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="border-gray-300 focus:border-yellow-600 focus:ring-yellow-600"
                />
              </div>

              <div className="border-t pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Weight className="w-5 h-5 text-yellow-600" />
                  <h3 className="font-semibold text-gray-900">Dados de Pesagem</h3>
                </div>

                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="invoice_number">Nota Fiscal</Label>
                    <Input
                      id="invoice_number"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      placeholder="Número da NF"
                      className="border-gray-300 focus:border-yellow-600 focus:ring-yellow-600"
                    />
                  </div>

                  {isParaTransfer() && (
                    <div className="space-y-2">
                      <Label htmlFor="origin_weight">Peso Origem (kg)</Label>
                      <Input
                        id="origin_weight"
                        type="number"
                        value={originWeight}
                        onChange={(e) => setOriginWeight(e.target.value)}
                        placeholder="Peso informado na origem"
                        className="border-gray-300 focus:border-purple-600 focus:ring-purple-600"
                      />
                      <p className="text-xs text-gray-500 italic">
                        📦 Transferência do Pará - Opcional
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="gross_weight">Peso Bruto (kg)</Label>
                      <Input
                        id="gross_weight"
                        type="number"
                        value={grossWeight}
                        onChange={(e) => setGrossWeight(e.target.value)}
                        placeholder="Ex: 35000"
                        className="border-gray-300 focus:border-yellow-600 focus:ring-yellow-600"
                        disabled={isWeighingFinalized}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tare_weight">Peso Tara (kg)</Label>
                      <Input
                        id="tare_weight"
                        type="number"
                        value={tareWeight}
                        onChange={(e) => setTareWeight(e.target.value)}
                        placeholder="Ex: 15000"
                        className="border-gray-300 focus:border-yellow-600 focus:ring-yellow-600"
                        disabled={isWeighingFinalized}
                      />
                    </div>
                  </div>

                  {netWeight > 0 && (
                    <>
                      <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-green-700">Peso Líquido:</span>
                          <span className="text-2xl font-bold text-green-700">
                            {netWeight.toLocaleString('pt-BR')} kg
                          </span>
                        </div>
                        <p className="text-xs text-green-600 mt-1">
                          = {(netWeight / 1000).toFixed(2)} toneladas
                        </p>
                      </div>
                      
                      {isParaTransfer() && originWeight && calculateWeightDifference() && (
                        <div className={`border-2 rounded-lg p-3 ${
                          calculateWeightDifference().percent >= 0 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-orange-50 border-orange-200'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-semibold ${
                              calculateWeightDifference().percent >= 0 ? 'text-blue-700' : 'text-orange-700'
                            }`}>
                              Diferença vs. Origem:
                            </span>
                            <span className={`text-xl font-bold ${
                              calculateWeightDifference().percent >= 0 ? 'text-blue-700' : 'text-orange-700'
                            }`}>
                              {calculateWeightDifference().percent >= 0 ? '+' : ''}{calculateWeightDifference().percent.toFixed(2)}%
                            </span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <p className={calculateWeightDifference().percent >= 0 ? 'text-blue-600' : 'text-orange-600'}>
                              Peso Origem: {parseFloat(originWeight).toLocaleString('pt-BR')} kg
                            </p>
                            <p className={calculateWeightDifference().percent >= 0 ? 'text-blue-600' : 'text-orange-600'}>
                              Diferença: {calculateWeightDifference().absolute >= 0 ? '+' : ''}{calculateWeightDifference().absolute.toLocaleString('pt-BR')} kg
                            </p>
                          </div>
                        </div>
                      )}
                      
                      {schedule.actual_bags && (
                       <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                         <div className="flex items-center justify-between">
                           <span className="text-sm font-semibold text-blue-700">Líq. sem Sacaria:</span>
                           <span className="text-2xl font-bold text-blue-700">
                             {(netWeight - (schedule.actual_bags * (schedule.warehouse === 'ferraz' ? 0.67 : 0.15))).toLocaleString('pt-BR', {maximumFractionDigits: 2})} kg
                           </span>
                         </div>
                         <p className="text-xs text-blue-600 mt-1">
                           = {((netWeight - (schedule.actual_bags * (schedule.warehouse === 'ferraz' ? 0.67 : 0.15))) / 1000).toFixed(2)} toneladas
                         </p>
                         <p className="text-xs text-blue-500 mt-1 italic">
                           Desconto: {schedule.actual_bags} sacos × {schedule.warehouse === 'ferraz' ? '0,67kg' : '0,15kg'} = {(schedule.actual_bags * (schedule.warehouse === 'ferraz' ? 0.67 : 0.15)).toFixed(2)} kg
                         </p>
                       </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {isWeighingFinalized ? (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-green-700" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-green-700">✓ Pesagem Finalizada</p>
                    <p className="text-sm text-green-600">Os pesos bruto e tara foram salvos. Formulário bloqueado para evitar alterações.</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={handleSaveGrossWeight}
                      variant="outline"
                      className="hover:bg-blue-50 border-blue-300"
                      disabled={!grossWeight}
                    >
                      <Weight className="w-4 h-4 mr-2" />
                      Salvar P. Bruto
                    </Button>
                    
                    <Button
                      onClick={handleSaveTareWeight}
                      variant="outline"
                      className="hover:bg-green-50 border-green-300"
                      disabled={!tareWeight}
                    >
                      <Weight className="w-4 h-4 mr-2" />
                      Salvar P. Tara
                    </Button>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={handleSaveData}
                      variant="outline"
                      className="flex-1 hover:bg-yellow-50"
                      disabled={!vehiclePlate && !driverName && !invoiceNumber && !grossWeight && !tareWeight}
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Tudo
                    </Button>
                    <Button
                      onClick={handleRegisterArrival}
                      className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white"
                      disabled={!vehiclePlate || !driverName}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Registrar Chegada
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {schedule.status !== "agendado" && (
            <>
              <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  schedule.status === "concluido" ? "bg-green-100" : 
                  schedule.status === "em_descarga" ? "bg-orange-100" : "bg-yellow-100"
                }`}>
                  <Clock className={`w-4 h-4 ${
                    schedule.status === "concluido" ? "text-green-600" : 
                    schedule.status === "em_descarga" ? "text-orange-600" : "text-yellow-600"
                  }`} />
                </div>
                <p className={`font-semibold text-sm ${
                  schedule.status === "concluido" ? "text-green-600" : 
                  schedule.status === "em_descarga" ? "text-orange-600" : "text-yellow-600"
                }`}>
                  {schedule.status === "concluido" ? "Descarga Concluída" : 
                   schedule.status === "em_descarga" ? "Em Descarga" : "Aguardando Descarga"}
                </p>
              </div>

              {/* Campos sempre editáveis para op_balanca */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Nota Fiscal</Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Número da NF"
                    className="border-gray-300 focus:border-yellow-600"
                  />
                </div>

                {isParaTransfer() && (
                  <div className="space-y-2">
                    <Label>Peso Origem (kg)</Label>
                    <Input
                      type="number"
                      value={originWeight}
                      onChange={(e) => setOriginWeight(e.target.value)}
                      placeholder="Peso informado na origem"
                      className="border-gray-300 focus:border-purple-600"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Peso Bruto (kg)</Label>
                    <Input
                      type="number"
                      value={grossWeight}
                      onChange={(e) => setGrossWeight(e.target.value)}
                      placeholder="Ex: 35000"
                      className="border-gray-300 focus:border-yellow-600"
                      disabled={isWeighingFinalized}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Peso Tara (kg)</Label>
                    <Input
                      type="number"
                      value={tareWeight}
                      onChange={(e) => setTareWeight(e.target.value)}
                      placeholder="Ex: 15000"
                      className="border-gray-300 focus:border-yellow-600"
                      disabled={isWeighingFinalized}
                    />
                  </div>
                </div>

                {netWeight > 0 && (
                  <>
                    <div className="bg-green-50 border-2 border-green-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-green-700">Peso Líquido:</span>
                        <span className="text-2xl font-bold text-green-700">
                          {netWeight.toLocaleString('pt-BR')} kg
                        </span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">= {(netWeight / 1000).toFixed(2)} toneladas</p>
                    </div>
                    {isParaTransfer() && originWeight && calculateWeightDifference() && (
                      <div className={`border-2 rounded-lg p-3 ${calculateWeightDifference().percent >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-semibold ${calculateWeightDifference().percent >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>Diferença vs. Origem:</span>
                          <span className={`text-xl font-bold ${calculateWeightDifference().percent >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                            {calculateWeightDifference().percent >= 0 ? '+' : ''}{calculateWeightDifference().percent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    )}
                    {schedule.actual_bags && (
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-blue-700">Líq. sem Sacaria:</span>
                          <span className="text-2xl font-bold text-blue-700">
                            {(netWeight - (schedule.actual_bags * (schedule.warehouse === 'ferraz' ? 0.67 : 0.15))).toLocaleString('pt-BR', {maximumFractionDigits: 2})} kg
                          </span>
                        </div>
                        <p className="text-xs text-blue-500 italic mt-1">
                          Desconto: {schedule.actual_bags} sacos × {schedule.warehouse === 'ferraz' ? '0,67kg' : '0,15kg'}
                        </p>
                      </div>
                    )}
                  </>
                )}

                {isWeighingFinalized ? (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6 text-green-700" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-green-700">✓ Pesagem Finalizada</p>
                      <p className="text-sm text-green-600">Os pesos bruto e tara foram salvos. Formulário bloqueado para evitar alterações.</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={handleSaveGrossWeight} variant="outline" className="hover:bg-blue-50 border-blue-300" disabled={!grossWeight}>
                        <Weight className="w-4 h-4 mr-2" />Salvar P. Bruto
                      </Button>
                      <Button onClick={handleSaveTareWeight} variant="outline" className="hover:bg-green-50 border-green-300" disabled={!tareWeight}>
                        <Weight className="w-4 h-4 mr-2" />Salvar P. Tara
                      </Button>
                    </div>
                    <Button
                      onClick={handleSaveData}
                      className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white"
                      disabled={!grossWeight && !tareWeight && !invoiceNumber}
                    >
                      <Save className="w-4 h-4 mr-2" />Salvar Pesagem Completa
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}