import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Play, Square, Save, Package, Weight, Plus, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function OperatorControls({ schedule, onUpdate, userProfile, allSchedulings = [] }) {
  const [wbNumber, setWbNumber] = useState(schedule.wb_number || "");
  const [loadNumber, setLoadNumber] = useState(schedule.load_number || "");
  const [actualBags, setActualBags] = useState(schedule.actual_bags || "");
  const [balancinha, setBalancinha] = useState(schedule.balancinha || "");
  const [enableBalancinha, setEnableBalancinha] = useState(!!schedule.balancinha);
  const [notes, setNotes] = useState(schedule.notes || "");
  
  // Resíduos Recebidos
  const [amostragem, setAmostragem] = useState(schedule.amostragem || "");
  const [duplo, setDuplo] = useState(schedule.duplo || "");
  const [nibs, setNibs] = useState(schedule.nibs || "");
  const [po, setPo] = useState(schedule.po || "");

  // Resíduos Devolvidos (informativos)
  const [amostragemDevolvida, setAmostragemDevolvida] = useState(schedule.amostragem_devolvida || "");
  const [duploDevolvido, setDuploDevolvido] = useState(schedule.duplo_devolvido || "");
  const [nibsDevolvido, setNibsDevolvido] = useState(schedule.nibs_devolvido || "");
  const [poDevolvido, setPoDevolvido] = useState(schedule.po_devolvido || "");

  // Controle de lotes
  const [batch, setBatch] = useState("");
  const [batchQuantity, setBatchQuantity] = useState("");
  const [batches, setBatches] = useState([]);

  // Estado para popup de WB duplicada
  const [showDuplicateWBDialog, setShowDuplicateWBDialog] = useState(false);
  const [duplicateWBInfo, setDuplicateWBInfo] = useState(null);

  // Atualizar campos quando o agendamento mudar (id ou status)
  React.useEffect(() => {
    setWbNumber(schedule.wb_number || "");
    setLoadNumber(schedule.load_number || "");
    setActualBags(schedule.actual_bags || "");
    setBalancinha(schedule.balancinha || "");
    setEnableBalancinha(!!schedule.balancinha);
    setNotes(schedule.notes || "");
    setAmostragem(schedule.amostragem || "");
    setDuplo(schedule.duplo || "");
    setNibs(schedule.nibs || "");
    setPo(schedule.po || "");
    setAmostragemDevolvida(schedule.amostragem_devolvida || "");
    setDuploDevolvido(schedule.duplo_devolvido || "");
    setNibsDevolvido(schedule.nibs_devolvido || "");
    setPoDevolvido(schedule.po_devolvido || "");
    setBatches(schedule.batches ? (() => { try { return JSON.parse(schedule.batches); } catch { return []; } })() : []);
  }, [schedule.id, schedule.status]);

  const preservedFields = () => ({
    supplier: schedule.supplier,
    release_status: schedule.release_status,
    release_requested_by: schedule.release_requested_by,
    release_requested_date: schedule.release_requested_date,
    released_by: schedule.released_by,
    released_date: schedule.released_date,
    batch: schedule.batch,
    batches: schedule.batches,
    gr: schedule.gr,
    // Preservar campos operacionais já salvos
    wb_number: schedule.wb_number,
    load_number: schedule.load_number,
    actual_bags: schedule.actual_bags,
    notes: schedule.notes,
    amostragem: schedule.amostragem,
    duplo: schedule.duplo,
    nibs: schedule.nibs,
    po: schedule.po,
    amostragem_devolvida: schedule.amostragem_devolvida,
    duplo_devolvido: schedule.duplo_devolvido,
    nibs_devolvido: schedule.nibs_devolvido,
    po_devolvido: schedule.po_devolvido,
    balancinha: schedule.balancinha,
    start_time_actual: schedule.start_time_actual,
    end_time_actual: schedule.end_time_actual,
  });

  const handleStartDischarge = async () => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    await onUpdate({
      ...preservedFields(),
      status: 'em_descarga',
      start_time_actual: currentTime,
    });

    toast.success('✅ Descarga iniciada!', {
      description: `Início registrado às ${currentTime}`,
      duration: 3000,
    });
  };

  const handleEndDischarge = async () => {
    if (!wbNumber || !loadNumber || !actualBags) {
      toast.error('❌ Preencha todos os campos obrigatórios', {
        description: 'WB, Nº Carga e Sacos Reais são obrigatórios.',
        duration: 3000,
      });
      return;
    }

    // Validar duplicidade de WB APENAS SE A WB FOR DIFERENTE DA ATUAL
    if (wbNumber !== schedule.wb_number) {
      const duplicateWB = allSchedulings.find(s => 
        s.id !== schedule.id && 
        s.wb_number && 
        s.wb_number.toLowerCase() === wbNumber.toLowerCase()
      );
      if (duplicateWB) {
        setDuplicateWBInfo({
          wb: wbNumber,
          supplier: duplicateWB.supplier,
          date: duplicateWB.date.split('-').reverse().join('/'),
          loadNumber: duplicateWB.load_number
        });
        setShowDuplicateWBDialog(true);
        return;
      }
    }

    // Validar duplicidade de Nº Carga APENAS SE FOR DIFERENTE DO ATUAL
    // EXCEÇÃO: Ferraz/Porto pode ter até 4 WBs com mesmo número de carga
    if (loadNumber !== schedule.load_number) {
      const isPortoException = schedule.warehouse === 'ferraz' || 
                               schedule.supplier?.toUpperCase().includes('PORTO');
      
      if (!isPortoException) {
        const duplicateLoad = allSchedulings.find(s => 
          s.id !== schedule.id && 
          s.load_number && 
          s.load_number.toLowerCase() === loadNumber.toLowerCase()
        );
        if (duplicateLoad) {
          toast.error('❌ Nº Carga já utilizado em outro agendamento', {
            description: `Fornecedor: ${duplicateLoad.supplier} - Data: ${duplicateLoad.date.split('-').reverse().join('/')}`,
            duration: 5000,
          });
          return;
        }
      } else {
        // Porto/Ferraz: permitir até 4 WBs com mesmo número de carga (não contar o próprio registro)
        const sameCargaCount = allSchedulings.filter(s => 
          s.id !== schedule.id &&
          s.load_number && 
          s.load_number.toLowerCase() === loadNumber.toLowerCase()
        ).length;
        
        if (sameCargaCount >= 4) {
          toast.error('❌ Limite de 4 WBs para este número de carga atingido', {
            description: `Porto: máximo 4 WBs por carga`,
            duration: 5000,
          });
          return;
        }
      }
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const updateData = {
      ...preservedFields(),
      status: "concluido",
      end_time_actual: currentTime,
      wb_number: wbNumber,
      load_number: loadNumber,
      actual_bags: Number(actualBags),
      notes: notes,
    };

    await onUpdate(updateData);

    toast.success('✅ Descarga finalizada com sucesso!', {
      description: `Conclusão registrada às ${currentTime}`,
      duration: 4000,
    });
  };

  const handleAddBatch = () => {
    if (!batch || !batchQuantity) {
      toast.error('❌ Preencha lote e quantidade', {
        duration: 3000,
      });
      return;
    }

    setBatches([...batches, { lote: batch, quantidade: Number(batchQuantity) }]);
    setBatch("");
    setBatchQuantity("");
    
    toast.success('✅ Lote adicionado!', {
      description: `Lote ${batch}: ${batchQuantity} sacos`,
      duration: 2000,
    });
  };

  const handleRemoveBatch = (index) => {
    setBatches(batches.filter((_, i) => i !== index));
  };

  const handleSaveData = async (skipWbValidation = false) => {
    // Para supervisor/admin, WB e Nº Carga não são obrigatórios ao salvar parcialmente
    const isSupervisorOrAdmin = userProfile === 'supervisor' || userProfile === 'admin';
    if (!skipWbValidation && !isSupervisorOrAdmin && (!wbNumber || !loadNumber)) {
      toast.error('❌ Preencha WB e Nº de Carga para salvar', {
        duration: 3000,
      });
      return;
    }

    const updateData = { ...preservedFields() };
    let hasUserData = false;

    // Validar duplicidade de WB se preenchido e diferente do atual
    if (wbNumber && wbNumber !== schedule.wb_number) {
      const duplicateWB = allSchedulings.find(s => 
        s.id !== schedule.id && 
        s.wb_number && 
        s.wb_number.toLowerCase() === wbNumber.toLowerCase()
      );
      if (duplicateWB) {
        setDuplicateWBInfo({
          wb: wbNumber,
          supplier: duplicateWB.supplier,
          date: duplicateWB.date.split('-').reverse().join('/'),
          loadNumber: duplicateWB.load_number
        });
        setShowDuplicateWBDialog(true);
        return;
      }
    }
    updateData.wb_number = wbNumber;
    hasUserData = true;

    // Validar duplicidade de Nº Carga se preenchido e diferente do atual
    // EXCEÇÃO: Porto/Ferraz pode ter até 4 WBs com mesmo número de carga
    if (loadNumber && loadNumber !== schedule.load_number) {
      const isPortoException = schedule.warehouse === 'ferraz' || 
                               schedule.supplier?.toUpperCase().includes('PORTO');
      
      if (!isPortoException) {
        const duplicateLoad = allSchedulings.find(s => 
          s.id !== schedule.id && 
          s.load_number && 
          s.load_number.toLowerCase() === loadNumber.toLowerCase()
        );
        if (duplicateLoad) {
          toast.error('❌ Nº Carga já utilizado em outro agendamento', {
            description: `Fornecedor: ${duplicateLoad.supplier} - Data: ${duplicateLoad.date.split('-').reverse().join('/')}`,
            duration: 5000,
          });
          return;
        }
      } else {
        const sameCargaCount = allSchedulings.filter(s => 
          s.id !== schedule.id &&
          s.load_number && 
          s.load_number.toLowerCase() === loadNumber.toLowerCase()
        ).length;
        
        if (sameCargaCount >= 4) {
          toast.error('❌ Limite de 4 WBs para este número de carga atingido', {
            description: `Porto: máximo 4 WBs por carga`,
            duration: 5000,
          });
          return;
        }
      }
    }
    updateData.load_number = loadNumber;

    if (actualBags) {
      updateData.actual_bags = Number(actualBags);
      hasUserData = true;
    }
    if (notes) {
      updateData.notes = notes;
      hasUserData = true;
    }
    if (amostragem) {
      updateData.amostragem = amostragem;
      hasUserData = true;
    }
    if (duplo) {
      updateData.duplo = duplo;
      hasUserData = true;
    }
    if (nibs) {
      updateData.nibs = nibs;
      hasUserData = true;
    }
    if (po) {
      updateData.po = po;
      hasUserData = true;
    }
    if (amostragemDevolvida) {
      updateData.amostragem_devolvida = amostragemDevolvida;
      hasUserData = true;
    }
    if (duploDevolvido) {
      updateData.duplo_devolvido = duploDevolvido;
      hasUserData = true;
    }
    if (nibsDevolvido) {
      updateData.nibs_devolvido = nibsDevolvido;
      hasUserData = true;
    }
    if (poDevolvido) {
      updateData.po_devolvido = poDevolvido;
      hasUserData = true;
    }
    if (batches.length > 0) {
      updateData.batches = JSON.stringify(batches);
      hasUserData = true;
    }
    if (enableBalancinha && balancinha) {
      updateData.balancinha = balancinha;
      hasUserData = true;
    }

    await onUpdate(updateData);

    toast.success('✅ Dados salvos!', {
      description: 'As informações foram atualizadas.',
      duration: 3000,
    });
  };

  const handleSaveBatches = async () => {
    await onUpdate({
      ...preservedFields(),
      batches: JSON.stringify(batches),
    });
    toast.success('✅ Lotes salvos!', { duration: 2500 });
  };

  const handleSaveBalancinha = async () => {
    if (!balancinha) {
      toast.error('❌ Informe o peso da balancinha', {
        duration: 3000,
      });
      return;
    }
    await onUpdate({ 
      ...preservedFields(),
      balancinha: balancinha,
    });

    toast.success('✅ Balancinha registrada!', {
      description: `Peso: ${balancinha}`,
      duration: 3000,
    });
  };

  return (
    <>
    <Dialog open={showDuplicateWBDialog} onOpenChange={setShowDuplicateWBDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-6 h-6" />
            WB Duplicada
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-semibold mb-3 text-center">
              ⚠️ A WB informada já está cadastrada em outro agendamento
            </p>
            
            <div className="bg-white border border-red-300 rounded-lg p-3 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">WB:</span>
                <span className="text-sm font-bold text-red-700">{duplicateWBInfo?.wb}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Fornecedor:</span>
                <span className="text-sm font-semibold text-gray-800">{duplicateWBInfo?.supplier}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Data:</span>
                <span className="text-sm font-semibold text-gray-800">{duplicateWBInfo?.date}</span>
              </div>
              {duplicateWBInfo?.loadNumber && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Nº Carga:</span>
                  <span className="text-sm font-semibold text-gray-800">{duplicateWBInfo?.loadNumber}</span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>💡 Verifique o número da WB</strong><br />
              Confirme se o número digitado está correto. Caso a WB seja a mesma, verifique o agendamento existente.
            </p>
          </div>

          <Button
            onClick={() => {
              setShowDuplicateWBDialog(false);
              setDuplicateWBInfo(null);
            }}
            className="w-full bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063]"
          >
            Entendi, vou verificar
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-4"
    >
      <Card className="shadow-xl border-none border-t-4 border-t-[#F88D2A]">
        <CardHeader className="border-b bg-gradient-to-r from-[#860063]/5 to-[#F88D2A]/5 py-2.5">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Package className="w-4 h-4 text-[#860063]" />
            Controles do Operador
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 space-y-3">
          {(schedule.status === "agendado" || schedule.status === "aguardando") && (
            <>
              <Button
                onClick={handleStartDischarge}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white h-9"
              >
                <Play className="w-4 h-4 mr-2" />
                Iniciar Descarga
              </Button>

              {/* Supervisor/Admin podem preencher WB e Nº Carga antecipadamente */}
              {(userProfile === "supervisor" || userProfile === "admin") && (
                <div className="border-t pt-3 space-y-2">
                  <p className="text-xs text-gray-500 font-medium">Pré-preencher dados da carga</p>
                  <div className="space-y-1">
                    <Label htmlFor="wb-pre" className="text-sm">Número da WB</Label>
                    <Input
                      id="wb-pre"
                      value={wbNumber}
                      onChange={(e) => setWbNumber(e.target.value)}
                      placeholder="Ex: WB-2024-001"
                      className="border-gray-300 focus:border-[#860063] h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="load-pre" className="text-sm">Nº de Carga</Label>
                    <Input
                      id="load-pre"
                      value={loadNumber}
                      onChange={(e) => setLoadNumber(e.target.value)}
                      placeholder="Número da carga"
                      className="border-gray-300 focus:border-[#860063] h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="bags-pre" className="text-sm">Qtd. Sacos</Label>
                    <Input
                      id="bags-pre"
                      type="number"
                      value={actualBags}
                      onChange={(e) => setActualBags(e.target.value)}
                      placeholder="Sacos recebidos"
                      className="border-gray-300 focus:border-[#860063] h-9"
                    />
                  </div>
                  <Button
                    onClick={() => handleSaveData(true)}
                    variant="outline"
                    className="w-full hover:bg-[#860063]/10 h-9"
                    disabled={!wbNumber && !loadNumber && !actualBags}
                  >
                    <Save className="w-3.5 h-3.5 mr-2" />
                    Salvar Dados
                  </Button>
                </div>
              )}
            </>
          )}

          {schedule.status === "em_descarga" && (
            <>
              <div className="space-y-1">
                <Label htmlFor="wb" className="text-sm">Número da WB *</Label>
                <Input
                  id="wb"
                  value={wbNumber}
                  onChange={(e) => setWbNumber(e.target.value)}
                  placeholder="Ex: WB-2024-001"
                  className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="load_number" className="text-sm">Nº de Carga *</Label>
                <Input
                  id="load_number"
                  type="text"
                  value={loadNumber}
                  onChange={(e) => setLoadNumber(e.target.value)}
                  placeholder="Número da carga"
                  className="h-9 border-gray-300 focus:border-[#860063] focus:ring-[#860063]"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="actual_bags" className="text-sm">Sacos Recebidos <span className="text-orange-500 text-xs font-normal">(obrigatório para finalizar)</span></Label>
                <Input
                  id="actual_bags"
                  type="number"
                  min="1"
                  value={actualBags}
                  onChange={(e) => setActualBags(e.target.value)}
                  placeholder="Quantidade física recebida"
                  className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9"
                />
                <p className="text-xs text-gray-500">
                  Programado: {schedule.quantity_bags?.toLocaleString('pt-BR')} sacos
                </p>
              </div>


              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSaveData}
                  variant="outline"
                  className="flex-1 hover:bg-[#860063]/10 h-9"
                  disabled={!wbNumber || !loadNumber}
                >
                  <Save className="w-3.5 h-3.5 mr-2" />
                  Salvar
                </Button>
                <Button
                  onClick={handleEndDischarge}
                  disabled={!wbNumber || !loadNumber || !actualBags}
                  className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white h-9 disabled:opacity-50"
                >
                  <Square className="w-3.5 h-3.5 mr-2" />
                  Finalizar
                </Button>
              </div>
            </>
          )}

          {schedule.status === "concluido" && (
            <div className="py-3">
              <div className="text-center mb-3">
                <div className="w-12 h-12 mx-auto mb-2 bg-green-100 rounded-full flex items-center justify-center">
                  <Square className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-green-600 font-semibold text-sm">Descarga Concluída</p>
              </div>

              {/* Supervisor e Admin podem editar campos principais após conclusão */}
              {(userProfile === "supervisor" || userProfile === "admin") ? (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="wb-edit" className="text-sm">Número da WB</Label>
                    <Input
                      id="wb-edit"
                      value={wbNumber}
                      onChange={(e) => setWbNumber(e.target.value)}
                      placeholder="Ex: WB-2024-001"
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="load-edit" className="text-sm">Nº de Carga</Label>
                    <Input
                      id="load-edit"
                      type="text"
                      value={loadNumber}
                      onChange={(e) => setLoadNumber(e.target.value)}
                      placeholder="Número da carga"
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="bags-edit" className="text-sm">Sacos Recebidos</Label>
                    <Input
                      id="bags-edit"
                      type="number"
                      min="1"
                      value={actualBags}
                      onChange={(e) => setActualBags(e.target.value)}
                      placeholder="Quantidade física recebida"
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9"
                    />
                    <p className="text-xs text-gray-500">
                      Programado: {schedule.quantity_bags?.toLocaleString('pt-BR')} sacos
                    </p>
                  </div>

                  <Button
                    onClick={handleSaveData}
                    className="w-full bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063] text-white h-9"
                  >
                    <Save className="w-3.5 h-3.5 mr-2" />
                    Salvar Alterações
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="wb-op-edit" className="text-sm">Número da WB</Label>
                    <Input
                      id="wb-op-edit"
                      value={wbNumber}
                      onChange={(e) => setWbNumber(e.target.value)}
                      placeholder="Ex: WB-2024-001"
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="load-op-edit" className="text-sm">Nº de Carga</Label>
                    <Input
                      id="load-op-edit"
                      type="text"
                      value={loadNumber}
                      onChange={(e) => setLoadNumber(e.target.value)}
                      placeholder="Número da carga"
                      className="border-gray-300 focus:border-[#860063] focus:ring-[#860063] h-9"
                    />
                  </div>

                  <Button
                    onClick={handleSaveData}
                    className="w-full bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063] text-white h-9"
                  >
                    <Save className="w-3.5 h-3.5 mr-2" />
                    Salvar WB / Nº Carga
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Controle de Lotes - Sempre visível */}
          {schedule.status !== "cancelado" && (
            <div className="border-t pt-3 space-y-2">
              <div className="bg-orange-500 rounded-lg p-3 space-y-2">
                <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                  <Package className="w-4 h-4 text-white" />
                  Controle de Lotes
                </h3>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="batch" className="text-xs text-orange-100">Lote</Label>
                    <Input
                      id="batch"
                      type="text"
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      placeholder="Ex: LOT2024001"
                      className="h-9 text-sm bg-white border-white"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="batch_quantity" className="text-xs text-orange-100">Qtd. Recebida</Label>
                    <Input
                      id="batch_quantity"
                      type="number"
                      min="1"
                      value={batchQuantity}
                      onChange={(e) => setBatchQuantity(e.target.value)}
                      placeholder="Sacos"
                      className="h-9 text-sm bg-white border-white"
                    />
                  </div>
                </div>

                {batches.length > 0 && (
                  <div className="space-y-1">
                    {batches.map((b, index) => (
                      <div key={index} className="flex items-center justify-between bg-orange-100 px-2 py-1.5 rounded border border-orange-200">
                        <span className="text-xs font-semibold text-orange-900">
                          {b.lote}: {b.quantidade.toLocaleString('pt-BR')} sacos
                        </span>
                        <Button
                          onClick={() => handleRemoveBatch(index)}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-red-200 text-orange-900"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleAddBatch}
                    variant="outline"
                    className="flex-1 bg-white hover:bg-orange-50 border-white h-9 text-xs text-orange-700"
                    disabled={!batch || !batchQuantity}
                  >
                    <Plus className="w-3.5 h-3.5 mr-2" />
                    Adicionar Lote
                  </Button>
                  <Button
                    onClick={handleSaveBatches}
                    className="flex-1 bg-white hover:bg-orange-50 border-white h-9 text-xs text-orange-700"
                    variant="outline"
                  >
                    <Save className="w-3.5 h-3.5 mr-2" />
                    Salvar Lotes
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Resíduos - Editável por Supervisor e Admin mesmo após concluído */}
          {(schedule.status === "em_descarga" || schedule.status === "concluido") && (
            <div className="border-t pt-3 space-y-2">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-600" />
                Resíduos Recebidos
              </h3>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="amostragem" className="text-xs">Amostragem</Label>
                  <Input
                    id="amostragem"
                    type="text"
                    value={amostragem}
                    onChange={(e) => setAmostragem(e.target.value)}
                    placeholder="Ex: 500g"
                    className="h-9 text-sm"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="duplo" className="text-xs">Duplo</Label>
                  <Input
                    id="duplo"
                    type="text"
                    value={duplo}
                    onChange={(e) => setDuplo(e.target.value)}
                    placeholder="Ex: 2kg"
                    className="h-9 text-sm"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="nibs" className="text-xs">Nibs</Label>
                  <Input
                    id="nibs"
                    type="text"
                    value={nibs}
                    onChange={(e) => setNibs(e.target.value)}
                    placeholder="Ex: 1.5kg"
                    className="h-9 text-sm"
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="po" className="text-xs">Pó</Label>
                  <Input
                    id="po"
                    type="text"
                    value={po}
                    onChange={(e) => setPo(e.target.value)}
                    placeholder="Ex: 800g"
                    className="h-9 text-sm"
                  />
                </div>
              </div>

              {/* Resíduos Devolvidos - apenas informativos */}
              <div className="mt-3 pt-3 border-t border-dashed border-gray-200">
                <h4 className="font-semibold text-gray-700 text-xs flex items-center gap-1.5 mb-2">
                  <Package className="w-3.5 h-3.5 text-orange-400" />
                  Resíduos Devolvidos <span className="text-gray-400 font-normal">(informativo)</span>
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="amostragem_devolvida" className="text-xs">Amostragem</Label>
                    <Input
                      id="amostragem_devolvida"
                      type="text"
                      value={amostragemDevolvida}
                      onChange={(e) => setAmostragemDevolvida(e.target.value)}
                      placeholder="Ex: 500g"
                      className="h-9 text-sm border-orange-200 focus:border-orange-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="duplo_devolvido" className="text-xs">Duplo</Label>
                    <Input
                      id="duplo_devolvido"
                      type="text"
                      value={duploDevolvido}
                      onChange={(e) => setDuploDevolvido(e.target.value)}
                      placeholder="Ex: 2kg"
                      className="h-9 text-sm border-orange-200 focus:border-orange-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="nibs_devolvido" className="text-xs">Nibs</Label>
                    <Input
                      id="nibs_devolvido"
                      type="text"
                      value={nibsDevolvido}
                      onChange={(e) => setNibsDevolvido(e.target.value)}
                      placeholder="Ex: 1.5kg"
                      className="h-9 text-sm border-orange-200 focus:border-orange-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="po_devolvido" className="text-xs">Pó</Label>
                    <Input
                      id="po_devolvido"
                      type="text"
                      value={poDevolvido}
                      onChange={(e) => setPoDevolvido(e.target.value)}
                      placeholder="Ex: 800g"
                      className="h-9 text-sm border-orange-200 focus:border-orange-400"
                    />
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSaveData}
                variant="outline"
                className="w-full hover:bg-purple-50 h-9 text-xs"
              >
                <Save className="w-3.5 h-3.5 mr-2" />
                Salvar Resíduos
              </Button>
            </div>
          )}

          {/* Balancinha - Disponível em todos os status */}
          {(schedule.status === "em_descarga" || schedule.status === "concluido") && (
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 mb-2">
                <Weight className="w-4 h-4 text-blue-600" />
                <h3 className="font-semibold text-gray-900 text-sm">Balancinha</h3>
              </div>

              <div className="space-y-2">
                <div className={`flex items-center space-x-2 p-1.5 rounded-lg transition-colors ${
                  enableBalancinha ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50 border border-gray-200'
                }`}>
                  <Checkbox
                    id="enable-balancinha"
                    checked={enableBalancinha}
                    onCheckedChange={setEnableBalancinha}
                    className={enableBalancinha ? 'data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600' : ''}
                  />
                  <Label
                    htmlFor="enable-balancinha"
                    className={`text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-1.5 ${
                      enableBalancinha ? 'text-green-700' : 'text-gray-700'
                    }`}
                  >
                    {enableBalancinha && (
                      <span className="text-green-600 text-base">✓</span>
                    )}
                    Habilitar campo Balancinha
                  </Label>
                </div>

                {enableBalancinha && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5"
                  >
                    <Label htmlFor="balancinha" className="text-sm">Peso (kg)</Label>
                    <Input
                      id="balancinha"
                      type="text"
                      value={balancinha}
                      onChange={(e) => setBalancinha(e.target.value)}
                      placeholder="Ex: 1250"
                      className="border-gray-300 focus:border-blue-600 focus:ring-blue-600 h-9"
                    />
                    <Button
                      onClick={handleSaveBalancinha}
                      variant="outline"
                      className="w-full hover:bg-blue-50 h-9"
                      disabled={!balancinha}
                    >
                      <Save className="w-3.5 h-3.5 mr-2" />
                      Salvar Balancinha
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
    </>
  );
}