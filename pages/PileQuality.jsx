import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Edit, 
  TrendingUp, 
  TrendingDown,
  Package,
  ArrowUpDown,
  Upload,
  FileSpreadsheet,
  Eye,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import AIBlendDialog from "@/components/pileQuality/AIBlendDialog";

export default function PileQualityPage() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterOrigin, setFilterOrigin] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortField, setSortField] = useState("last_test_date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pastedData, setPastedData] = useState("");
  const [isPasting, setIsPasting] = useState(false);
  const [showZeroBalance, setShowZeroBalance] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedPileDetails, setSelectedPileDetails] = useState(null);
  const [addMonthForm, setAddMonthForm] = useState(null); // { month, moisture, ffa }
  const [savingMonth, setSavingMonth] = useState(false);
  const [showBlendDialog, setShowBlendDialog] = useState(false);
  const [showAIBlendDialog, setShowAIBlendDialog] = useState(false);
  const [blendOrigins, setBlendOrigins] = useState([{ origin: "", percentage: "" }]);
  const [targetFFA, setTargetFFA] = useState("1.75");
  const [totalQuantityMT, setTotalQuantityMT] = useState("");
  const [blendSuggestion, setBlendSuggestion] = useState(null);
  const [blendValidation, setBlendValidation] = useState([]);
  const [isSavingBlend, setIsSavingBlend] = useState(false);
  const [showBlendHistory, setShowBlendHistory] = useState(false);
  
  const [formData, setFormData] = useState({
    month: new Date().toISOString().slice(0, 7),
    pile_lot: "",
    origin: "",
    formation_date: "",
    formation_moisture: "",
    formation_ffa: "",
    last_test_date: "",
    last_moisture: "",
    last_ffa: "",
    quantity_tons: "",
    current_balance: "",
    status: "ativa",
    notes: ""
  });

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const isAdmin = user?.role === 'admin';

  // Fetch data
  const { data: records = [], isLoading } = useQuery({
    queryKey: ['pileQuality'],
    queryFn: () => base44.entities.PileQuality.list('-last_test_date'),
  });

  // Fetch blend history
  const { data: blendHistory = [] } = useQuery({
    queryKey: ['blendHistory'],
    queryFn: () => base44.entities.BlendHistory.list('-created_date'),
  });

  // Origens disponíveis com estoque
  const availableOrigins = useMemo(() => {
    const activePiles = records.filter(r => 
      r.status === 'ativa' && 
      r.current_balance > 0 && 
      r.formation_ffa !== null && 
      r.formation_ffa !== undefined
    );
    const originsSet = new Set(activePiles.map(p => p.origin));
    return Array.from(originsSet).sort();
  }, [records]);

  // Validação em tempo real do blend
  React.useEffect(() => {
    if (!totalQuantityMT || parseFloat(totalQuantityMT) <= 0) {
      setBlendValidation([]);
      return;
    }

    const totalQty = parseFloat(totalQuantityMT);
    const activePiles = records.filter(r => 
      r.status === 'ativa' && 
      r.current_balance > 0 && 
      r.formation_ffa !== null && 
      r.formation_ffa !== undefined
    );

    const validations = blendOrigins
      .filter(o => o.origin && o.percentage)
      .map(originConfig => {
        const percentage = parseFloat(originConfig.percentage) / 100;
        const required = totalQty * percentage;
        const originPiles = activePiles.filter(p => p.origin === originConfig.origin);
        const available = originPiles.reduce((sum, p) => sum + p.current_balance, 0);
        const hasEnough = available >= required;
        return {
          origin: originConfig.origin,
          percentage: originConfig.percentage,
          required: required.toFixed(2),
          available: available.toFixed(2),
          hasEnough
        };
      });

    setBlendValidation(validations);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalQuantityMT, blendOrigins, records.length]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PileQuality.create(data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pileQuality'] });
      setShowDialog(false);
      toast.success(`✅ Pilha ${variables.pile_lot} salva com sucesso!`);
      resetForm();
    },
    onError: (error) => {
      console.error('Erro ao criar:', error);
      toast.error('❌ Erro ao criar registro');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PileQuality.update(id, data),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pileQuality'] });
      setShowDialog(false);
      toast.success(`✅ Pilha ${variables.data.pile_lot} atualizada com sucesso!`);
      resetForm();
    },
    onError: (error) => {
      console.error('Erro ao atualizar:', error);
      toast.error('❌ Erro ao atualizar registro');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PileQuality.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pileQuality'] });
      toast.success('✅ Registro excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir:', error);
      toast.error('❌ Erro ao excluir registro');
    },
  });

  const resetForm = () => {
    setFormData({
      month: new Date().toISOString().slice(0, 7),
      pile_lot: "",
      origin: "",
      formation_date: "",
      formation_moisture: "",
      formation_ffa: "",
      last_test_date: "",
      last_moisture: "",
      last_ffa: "",
      quantity_tons: "",
      current_balance: "",
      status: "ativa",
      notes: ""
    });
    setEditingRecord(null);
  };

  const handlePasteData = async () => {
    if (!pastedData.trim()) {
      toast.error('❌ Cole os dados do MB52');
      return;
    }

    setIsPasting(true);

    try {
      const mapping = {
        "100000035052": "MARFIM",
        "100000035333": "PARÁ",
        "100000035334": "BAHIA",
        "100000035335": "OUTROS ESTADOS",
        "100000102022": "PARÁ EURO",
        "100000102023": "BAHIA EURO"
      };

      const lines = pastedData.split('\n').filter(line => line.trim());
      
      let updated = 0;
      let created = 0;
      let skipped = 0;
      const month = new Date().toISOString().slice(0, 7);

      for (const line of lines) {
        const parts = line.split(/\t+|\s{2,}/).map(p => p.trim());
        
        if (parts.length < 3) { skipped++; continue; }

        const mat = parts[0];
        const lot = parts[1];
        const bal = parseFloat(parts[2].replace(/[^\d.,]/g, '').replace(',', '.'));
        const ffa = parts[3] ? parseFloat(parts[3].replace(/[^\d.,]/g, '').replace(',', '.')) : null;
        const moisture = parts[4] ? parseFloat(parts[4].replace(/[^\d.,]/g, '').replace(',', '.')) : null;

        if (!mat || !lot || isNaN(bal)) { skipped++; continue; }

        const origin = mapping[mat];
        if (!origin) { skipped++; continue; }

        const existing = records.find(r => 
          r.pile_lot?.toLowerCase() === lot.toLowerCase() && r.origin === origin
        );

        const updateData = { current_balance: bal };
        if (ffa !== null && !isNaN(ffa)) {
          updateData.last_ffa = ffa;
          updateData.last_test_date = new Date().toISOString().split('T')[0];
        }
        if (moisture !== null && !isNaN(moisture)) {
          updateData.last_moisture = moisture;
          updateData.last_test_date = new Date().toISOString().split('T')[0];
        }

        if (existing) {
          await base44.entities.PileQuality.update(existing.id, updateData);
          updated++;
        } else {
          await base44.entities.PileQuality.create({
            month, pile_lot: lot, origin,
            formation_moisture: moisture || 0,
            formation_ffa: ffa || 0,
            current_balance: bal,
            status: "ativa",
            notes: "Importado via MB52"
          });
          created++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['pileQuality'] });
      setShowPasteDialog(false);
      setPastedData("");
      toast.success(`✅ Concluído! ${updated} atualizados, ${created} criados${skipped > 0 ? `, ${skipped} ignorados` : ''}`);

    } catch (error) {
      console.error('❌ Erro:', error);
      toast.error(`❌ Erro: ${error.message}`);
    } finally {
      setIsPasting(false);
    }
  };

  const handleUploadExcel = async () => {
    if (!uploadFile) {
      toast.error('❌ Selecione um arquivo Excel');
      return;
    }

    setIsUploading(true);

    try {
      const mapping = {
        "100000035052": "MARFIM",
        "100000035333": "PARÁ",
        "100000035334": "BAHIA",
        "100000035335": "OUTROS ESTADOS",
        "100000102022": "PARÁ EURO",
        "100000102023": "BAHIA EURO"
      };

      toast.info('📤 Enviando arquivo...');
      const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadFile });

      toast.info('🔍 Extraindo dados...');
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            rows: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  material: { type: "string" },
                  lote: { type: "string" },
                  saldo: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (result.status === "error") {
        throw new Error(result.details || 'Erro ao extrair dados do arquivo');
      }

      const rows = result.output?.rows || [];
      
      if (rows.length === 0) {
        throw new Error('Nenhum dado encontrado no arquivo. Verifique se o formato está correto.');
      }

      toast.info(`💾 Processando ${rows.length} linhas...`);

      let updated = 0;
      let created = 0;
      let skipped = 0;
      const month = new Date().toISOString().slice(0, 7);

      for (const row of rows) {
        const mat = (row.material || row.Material || row.codigo || '').toString().trim();
        const lot = (row.lote || row.Lote || row.batch || '').toString().trim();
        const bal = parseFloat(row.saldo || row.quantidade || row['Utilização livre'] || row.balance || 0);

        if (!mat || !lot) { skipped++; continue; }

        const origin = mapping[mat];
        if (!origin) { skipped++; continue; }

        const existing = records.find(r => 
          r.pile_lot?.toLowerCase() === lot.toLowerCase() && r.origin === origin
        );

        if (existing) {
          await base44.entities.PileQuality.update(existing.id, { current_balance: bal });
          updated++;
        } else {
          await base44.entities.PileQuality.create({
            month, pile_lot: lot, origin,
            formation_moisture: 0,
            formation_ffa: 0,
            current_balance: bal,
            status: "ativa",
            notes: "Importado via MB52"
          });
          created++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['pileQuality'] });
      setShowUploadDialog(false);
      setUploadFile(null);
      toast.success(`✅ Concluído! ${updated} atualizados, ${created} criados${skipped > 0 ? `, ${skipped} ignorados` : ''}`);

    } catch (error) {
      console.error('❌ Erro completo:', error);
      toast.error(`❌ Erro: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.pile_lot || !formData.origin || !formData.formation_moisture || !formData.formation_ffa) {
      toast.error('❌ Preencha todos os campos obrigatórios', {
        description: 'Mês, Pilha/Lote, Origem, Umidade e FFA de Formação são obrigatórios'
      });
      return;
    }

    const duplicate = records.find(r => 
      r.pile_lot?.toLowerCase() === formData.pile_lot?.toLowerCase() && 
      r.origin === formData.origin &&
      r.month === formData.month &&
      (!editingRecord || r.id !== editingRecord.id)
    );

    if (duplicate) {
      toast.error('❌ Pilha duplicada', {
        description: `Já existe um registro de ${formData.pile_lot} (${formData.origin}) para ${formData.month}`
      });
      return;
    }
    
    const dataToSave = { ...formData };
    
    if (formData.formation_moisture) dataToSave.formation_moisture = parseFloat(formData.formation_moisture);
    if (formData.formation_ffa) dataToSave.formation_ffa = parseFloat(formData.formation_ffa);
    if (formData.last_moisture) dataToSave.last_moisture = parseFloat(formData.last_moisture);
    if (formData.last_ffa) dataToSave.last_ffa = parseFloat(formData.last_ffa);
    if (formData.quantity_tons) dataToSave.quantity_tons = parseFloat(formData.quantity_tons);
    if (formData.current_balance) dataToSave.current_balance = parseFloat(formData.current_balance);
    
    if (formData.formation_moisture && formData.last_moisture) {
      dataToSave.moisture_variation = parseFloat(formData.last_moisture) - parseFloat(formData.formation_moisture);
    }
    
    if (formData.formation_ffa && formData.last_ffa) {
      dataToSave.ffa_variation = parseFloat(formData.last_ffa) - parseFloat(formData.formation_ffa);
    }

    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: dataToSave });
    } else {
      createMutation.mutate(dataToSave);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      month: record.month || new Date().toISOString().slice(0, 7),
      pile_lot: record.pile_lot || "",
      origin: record.origin || "",
      formation_date: record.formation_date || "",
      formation_moisture: record.formation_moisture || "",
      formation_ffa: record.formation_ffa || "",
      last_test_date: record.last_test_date || "",
      last_moisture: record.last_moisture || "",
      last_ffa: record.last_ffa || "",
      quantity_tons: record.quantity_tons || "",
      current_balance: record.current_balance || "",
      status: record.status || "ativa",
      notes: record.notes || ""
    });
    setShowDialog(true);
  };

  const handleViewDetails = (record) => {
    const pileHistory = records.filter(r => 
      r.pile_lot?.toLowerCase() === record.pile_lot?.toLowerCase() &&
      r.origin === record.origin
    ).sort((a, b) => b.month?.localeCompare(a.month) || 0);
    
    setSelectedPileDetails({
      pile_lot: record.pile_lot,
      origin: record.origin,
      history: pileHistory,
      baseRecord: record
    });
    setAddMonthForm(null);
    setShowDetailsDialog(true);
  };

  const handleSaveMonth = async () => {
    if (!addMonthForm?.month) return toast.error("Informe o mês");
    setSavingMonth(true);
    const { pile_lot, origin, baseRecord } = selectedPileDetails;
    // Verificar se já existe registro para este mês/lote/origem
    const existing = records.find(r =>
      r.pile_lot?.toLowerCase() === pile_lot?.toLowerCase() &&
      r.origin === origin &&
      r.month === addMonthForm.month
    );
    const moisture = addMonthForm.moisture !== "" ? parseFloat(addMonthForm.moisture) : null;
    const ffa = addMonthForm.ffa !== "" ? parseFloat(addMonthForm.ffa) : null;
    const formMoisture = parseFloat(baseRecord?.formation_moisture || 0);
    const formFFA = parseFloat(baseRecord?.formation_ffa || 0);
    // Calcular o último dia do mês informado para last_test_date
    const [yr, mo] = addMonthForm.month.split("-").map(Number);
    const lastDay = new Date(yr, mo, 0).getDate();
    const lastTestDate = `${addMonthForm.month}-${String(lastDay).padStart(2, "0")}`;

    const payload = {
      month: addMonthForm.month,
      last_test_date: lastTestDate,
      last_moisture: moisture,
      last_ffa: ffa,
      moisture_variation: moisture !== null ? moisture - formMoisture : null,
      ffa_variation: ffa !== null ? ffa - formFFA : null,
    };
    if (existing) {
      await base44.entities.PileQuality.update(existing.id, payload);
      toast.success("Registro mensal atualizado!");
    } else {
      await base44.entities.PileQuality.create({
        pile_lot,
        origin,
        formation_moisture: baseRecord?.formation_moisture || 0,
        formation_ffa: baseRecord?.formation_ffa || 0,
        formation_date: baseRecord?.formation_date || "",
        quantity_tons: baseRecord?.quantity_tons || 0,
        current_balance: baseRecord?.current_balance || 0,
        status: baseRecord?.status || "ativa",
        ...payload,
      });
      toast.success("Registro mensal adicionado!");
    }
    await queryClient.invalidateQueries({ queryKey: ['pileQuality'] });
    // Recarregar histórico
    const updated = queryClient.getQueryData(['pileQuality']) || records;
    const pileHistory = updated.filter(r =>
      r.pile_lot?.toLowerCase() === pile_lot?.toLowerCase() && r.origin === origin
    ).sort((a, b) => b.month?.localeCompare(a.month) || 0);
    setSelectedPileDetails(d => ({ ...d, history: pileHistory }));
    setAddMonthForm(null);
    setSavingMonth(false);
  };

  const calculateBlend = () => {
    const totalPercentage = blendOrigins.reduce((sum, item) => sum + (parseFloat(item.percentage) || 0), 0);
    
    if (Math.abs(totalPercentage - 100) > 0.01) {
      toast.error('❌ A soma das porcentagens deve ser 100%');
      return;
    }

    const target = parseFloat(targetFFA);
    if (!target || target <= 0) {
      toast.error('❌ Informe o FFA desejável');
      return;
    }

    const totalQty = parseFloat(totalQuantityMT);
    if (!totalQty || totalQty <= 0) {
      toast.error('❌ Informe a quantidade total em MT');
      return;
    }

    const activePiles = records.filter(r => 
      r.status === 'ativa' && 
      r.current_balance > 0 && 
      r.formation_ffa !== null && 
      r.formation_ffa !== undefined
    ).map(r => ({
      ...r,
      effective_ffa: (r.last_ffa !== null && r.last_ffa !== undefined && r.last_ffa !== "" && Number(r.last_ffa) > 0) ? Number(r.last_ffa) : Number(r.formation_ffa),
      effective_moisture: (r.last_moisture !== null && r.last_moisture !== undefined && r.last_moisture !== "" && Number(r.last_moisture) > 0) ? Number(r.last_moisture) : Number(r.formation_moisture)
    }));

    const suggestions = [];
    let totalCalculatedFFA = 0;

    // Determinar a origem principal (maior % no blend)
    const mainOriginConfig = blendOrigins.reduce((best, o) =>
      (parseFloat(o.percentage) || 0) > (parseFloat(best.percentage) || 0) ? o : best
    , blendOrigins[0]);
    const mainOriginName = mainOriginConfig?.origin;
    const mainOriginPercentage = parseFloat(mainOriginConfig?.percentage) || 0;

    // PASSAGEM 1: estimar FFA total assumindo lote de FFA mais ALTO para cada origem secundária
    // Isso nos diz se o blend ficaria abaixo ou acima do target com os lotes de maior FFA
    let estimatedFFA = 0;
    for (const cfg of blendOrigins) {
      if (!cfg.origin || !cfg.percentage) continue;
      const pct = parseFloat(cfg.percentage) / 100;
      const piles = activePiles.filter(p => p.origin === cfg.origin);
      if (piles.length === 0) continue;
      const highestFFA = Math.max(...piles.map(p => p.effective_ffa));
      estimatedFFA += highestFFA * pct;
    }
    // Se FFA estimado com lotes altos ainda fica abaixo do target → usar lotes mais altos nas secundárias
    // Se fica acima → usar lotes mais baixos nas secundárias para não extrapolar
    const preferHighFFAInSecondary = estimatedFFA <= target;

    for (const originConfig of blendOrigins) {
      if (!originConfig.origin || !originConfig.percentage) continue;

      const percentage = parseFloat(originConfig.percentage) / 100;
      const originQuantity = totalQty * percentage;
      
      const originPilesAll = activePiles.filter(p => p.origin === originConfig.origin);
      
      if (originPilesAll.length === 0) {
        toast.error(`❌ Nenhum lote ativo encontrado para ${originConfig.origin}`);
        return;
      }

      const totalAvailableOrigin = originPilesAll.reduce((sum, p) => sum + p.current_balance, 0);
      
      if (totalAvailableOrigin < originQuantity) {
        const availablePercentage = (totalAvailableOrigin / totalQty * 100).toFixed(2);
        const currentPercentage = parseFloat(originConfig.percentage);
        
        toast.error(
          `❌ ${originConfig.origin}: Insuficiente`,
          {
            description: `Necessário: ${originQuantity.toFixed(2)}T (${currentPercentage}%) | Disponível: ${totalAvailableOrigin.toFixed(2)}T (${availablePercentage}%)`,
            duration: 8000
          }
        );
        
        const adjustedSuggestions = [];
        let totalAvailableAllOrigins = 0;
        
        for (const cfg of blendOrigins) {
          const allPiles = activePiles.filter(p => p.origin === cfg.origin);
          const available = allPiles.reduce((sum, p) => sum + p.current_balance, 0);
          adjustedSuggestions.push({ origin: cfg.origin, available });
          totalAvailableAllOrigins += available;
        }
        
        const newBlend = adjustedSuggestions.map(s => ({
          origin: s.origin,
          suggestedPercent: ((s.available / totalAvailableAllOrigins) * 100).toFixed(1)
        }));
        
        toast.info('💡 Sugestão de blend ajustado:', {
          description: newBlend.map(b => `${b.origin}: ${b.suggestedPercent}%`).join(' | '),
          duration: 10000
        });
        
        return;
      }

      let bestCombination = null;

      const thisPercentage = parseFloat(originConfig.percentage);
      const isMainOrigin = thisPercentage >= mainOriginPercentage && originConfig.origin === mainOriginName;

      if (isMainOrigin && thisPercentage > 50) {
        // Origem principal com >50%: usar 2 lotes (FFA mais alto + FFA mais baixo)
        const sortedDesc = [...originPilesAll].sort((a, b) => b.effective_ffa - a.effective_ffa);
        const sortedAsc = [...originPilesAll].sort((a, b) => a.effective_ffa - b.effective_ffa);

        // Lote alto: prioriza lote com maior FFA do último blend se for desta origem
        let highPile = sortedDesc[0];
        if (lastHighestFFAPile) {
          const priorityPile = originPilesAll.find(p => p.pile_lot === lastHighestFFAPile);
          if (priorityPile) highPile = priorityPile;
        }

        const lowPile = sortedAsc.find(p => p.pile_lot !== highPile.pile_lot);
        bestCombination = lowPile ? [highPile, lowPile] : [highPile];
      } else {
        // Origem secundária: 1 lote apenas
        // Se blend estimado fica abaixo do target → priorizar lote com FFA MAIS ALTO (oportunidade de eliminar FFA alto do estoque)
        // Se blend estimado fica acima → usar lote com FFA MAIS BAIXO para não extrapolar
        const sortedDesc = [...originPilesAll].sort((a, b) => b.effective_ffa - a.effective_ffa);
        const sortedAsc = [...originPilesAll].sort((a, b) => a.effective_ffa - b.effective_ffa);

        const bestPile = preferHighFFAInSecondary ? sortedDesc[0] : sortedAsc[0];
        bestCombination = [bestPile];
      }

      const originPiles = bestCombination;
      const pilesWithQty = [];
      let originFFA = 0;

      if (originPiles.length === 1) {
        const pile = originPiles[0];
        const qty = Math.min(originQuantity, pile.current_balance);
        pilesWithQty.push({
          pile_lot: pile.pile_lot,
          ffa: pile.effective_ffa,
          moisture: pile.effective_moisture,
          balance: pile.current_balance,
          quantity: qty,
          percentage_used: (qty / originQuantity * 100).toFixed(1)
        });
        originFFA = pile.effective_ffa * qty;
      } else if (originPiles.length === 2) {
        const pile1 = originPiles[0];
        const pile2 = originPiles[1];
        
        let percentagePile1 = 0.5;
        if (pile1.effective_ffa !== pile2.effective_ffa) {
          percentagePile1 = (target - pile2.effective_ffa) / (pile1.effective_ffa - pile2.effective_ffa);
          percentagePile1 = Math.max(0.1, Math.min(0.9, percentagePile1));
        }
        
        let qty1 = originQuantity * percentagePile1;
        let qty2 = originQuantity * (1 - percentagePile1);
        
        if (qty1 > pile1.current_balance) { qty1 = pile1.current_balance; qty2 = originQuantity - qty1; }
        if (qty2 > pile2.current_balance) { qty2 = pile2.current_balance; qty1 = originQuantity - qty2; }
        
        pilesWithQty.push({
          pile_lot: pile1.pile_lot, ffa: pile1.effective_ffa,
          moisture: pile1.effective_moisture,
          balance: pile1.current_balance, quantity: qty1,
          percentage_used: (qty1 / originQuantity * 100).toFixed(1)
        });
        pilesWithQty.push({
          pile_lot: pile2.pile_lot, ffa: pile2.effective_ffa,
          moisture: pile2.effective_moisture,
          balance: pile2.current_balance, quantity: qty2,
          percentage_used: (qty2 / originQuantity * 100).toFixed(1)
        });
        
        originFFA = (pile1.effective_ffa * qty1) + (pile2.effective_ffa * qty2);
      }

      const avgOriginFFA = originFFA / originQuantity;
      totalCalculatedFFA += avgOriginFFA * percentage;

      suggestions.push({
        origin: originConfig.origin,
        percentage: originConfig.percentage,
        totalQuantity: originQuantity,
        piles: pilesWithQty
      });
    }

    setBlendSuggestion({
      suggestions,
      calculatedFFA: totalCalculatedFFA.toFixed(2),
      targetFFA: target,
      totalQuantity: totalQty
    });
  };

  // Get the pile with highest FFA from last blend history
  const lastHighestFFAPile = blendHistory.length > 0 ? blendHistory[0]?.highest_ffa_pile : null;
  const lastHighestFFAValue = blendHistory.length > 0 ? blendHistory[0]?.highest_ffa_value : null;

  const handleSkipPile = (suggestionIdx, pileIdx) => {
    const suggestion = blendSuggestion.suggestions[suggestionIdx];
    const skippedPileLot = suggestion.piles[pileIdx].pile_lot;
    const usedPileLots = suggestion.piles.map(p => p.pile_lot);

    const activePilesLocal = records.filter(r =>
      r.status === 'ativa' && r.current_balance > 0 &&
      r.formation_ffa !== null && r.formation_ffa !== undefined
    ).map(r => ({
      ...r,
      effective_ffa: (r.last_ffa !== null && r.last_ffa !== undefined && r.last_ffa !== "" && Number(r.last_ffa) > 0) ? Number(r.last_ffa) : Number(r.formation_ffa),
      effective_moisture: (r.last_moisture !== null && r.last_moisture !== undefined && r.last_moisture !== "" && Number(r.last_moisture) > 0) ? Number(r.last_moisture) : Number(r.formation_moisture)
    }));

    const availablePiles = activePilesLocal.filter(p =>
      p.origin === suggestion.origin &&
      p.pile_lot !== skippedPileLot &&
      !usedPileLots.includes(p.pile_lot)
    );

    if (availablePiles.length === 0) {
      toast.error('Nenhum outro lote disponível para esta origem');
      return;
    }

    const isMainOrigin = parseFloat(suggestion.percentage) > 50;
    let nextPile;
    if (isMainOrigin) {
      const sortedDesc = [...availablePiles].sort((a, b) => b.effective_ffa - a.effective_ffa);
      const sortedAsc = [...availablePiles].sort((a, b) => a.effective_ffa - b.effective_ffa);
      nextPile = pileIdx === 0 ? sortedDesc[0] : sortedAsc[0];
    } else {
      const preferHigh = parseFloat(blendSuggestion.calculatedFFA) <= blendSuggestion.targetFFA;
      const sorted = [...availablePiles].sort((a, b) =>
        preferHigh ? b.effective_ffa - a.effective_ffa : a.effective_ffa - b.effective_ffa
      );
      nextPile = sorted[0];
    }

    const newPile = {
      pile_lot: nextPile.pile_lot,
      ffa: nextPile.effective_ffa,
      moisture: nextPile.effective_moisture,
      balance: nextPile.current_balance,
      quantity: suggestion.piles[pileIdx].quantity,
      percentage_used: suggestion.piles[pileIdx].percentage_used,
    };

    const newSuggestions = blendSuggestion.suggestions.map((s, idx) => {
      if (idx !== suggestionIdx) return s;
      return { ...s, piles: s.piles.map((p, pi) => pi === pileIdx ? newPile : p) };
    });

    let newTotalFFA = 0;
    newSuggestions.forEach(s => {
      const originFFA = s.piles.reduce((sum, p) => sum + p.ffa * p.quantity, 0);
      const originQty = s.piles.reduce((sum, p) => sum + p.quantity, 0);
      newTotalFFA += (originFFA / originQty) * (parseFloat(s.percentage) / 100);
    });

    setBlendSuggestion({ ...blendSuggestion, suggestions: newSuggestions, calculatedFFA: newTotalFFA.toFixed(2) });
    toast.success(`✅ Lote substituído por ${nextPile.pile_lot}`);
  };

  const handleUseBlend = async () => {
    if (!blendSuggestion) return;
    setIsSavingBlend(true);

    // Find highest FFA pile across all suggestions
    let highestFFAPile = null;
    let highestFFAValue = -Infinity;
    let highestFFAOrigin = null;

    blendSuggestion.suggestions.forEach(s => {
      s.piles.forEach(p => {
        if (p.ffa > highestFFAValue) {
          highestFFAValue = p.ffa;
          highestFFAPile = p.pile_lot;
          highestFFAOrigin = s.origin;
        }
      });
    });

    await base44.entities.BlendHistory.create({
      date: new Date().toISOString().split('T')[0],
      total_quantity_mt: blendSuggestion.totalQuantity,
      target_ffa: blendSuggestion.targetFFA,
      calculated_ffa: parseFloat(blendSuggestion.calculatedFFA),
      blend_data: blendSuggestion,
      highest_ffa_pile: highestFFAPile,
      highest_ffa_value: highestFFAValue,
      highest_ffa_origin: highestFFAOrigin,
    });

    queryClient.invalidateQueries({ queryKey: ['blendHistory'] });
    setIsSavingBlend(false);
    toast.success('✅ Blend registrado no histórico!', {
      description: `Lote com maior FFA: ${highestFFAPile} (${highestFFAValue}) - será priorizado na próxima sugestão.`
    });
  };

  // Filtered and sorted records
  const filteredRecords = useMemo(() => {
    let filtered = records.filter(record => {
      const matchesSearch = record.pile_lot?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMonth = !filterMonth || record.month === filterMonth;
      const matchesOrigin = filterOrigin === "all" || record.origin === filterOrigin;
      const matchesStatus = filterStatus === "all" || record.status === filterStatus;
      const balanceFilter = showZeroBalance
        ? ((record.current_balance ?? 0) === 0 || record.status === 'finalizada')
        : true;
      return matchesSearch && matchesMonth && matchesOrigin && matchesStatus && balanceFilter;
    });

    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string') aVal = aVal?.toLowerCase() || '';
      if (typeof bVal === 'string') bVal = bVal?.toLowerCase() || '';
      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      else return aVal < bVal ? 1 : -1;
    });

    return filtered;
  }, [records, searchTerm, filterMonth, filterOrigin, filterStatus, showZeroBalance, sortField, sortOrder]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[#860063]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-8 h-8 text-[#860063]" />
                Qualidade por Pilha
              </h1>
              <p className="text-gray-600 mt-1">
                Monitoramento mensal de qualidade dos lotes
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => setShowPasteDialog(true)}
                variant="outline"
                className="border-[#860063] text-[#860063] hover:bg-[#860063]/10"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Colar Dados MB52
              </Button>
              {isAdmin && (
                <Button
                  onClick={() => {
                    setBlendOrigins([{ origin: "", percentage: "" }]);
                    setTargetFFA("1.75");
                    setTotalQuantityMT("");
                    setBlendSuggestion(null);
                    setShowBlendDialog(true);
                  }}
                  variant="outline"
                  className="border-purple-500 text-purple-600 hover:bg-purple-50"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Blend Inteligente
                </Button>
              )}
              <Button
                onClick={() => {
                  resetForm();
                  setShowDialog(true);
                }}
                className="bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Registro
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="showZero"
                  checked={showZeroBalance}
                  onChange={(e) => setShowZeroBalance(e.target.checked)}
                  className="w-4 h-4 text-[#860063] border-gray-300 rounded focus:ring-[#860063]"
                />
                <Label htmlFor="showZero" className="cursor-pointer">
                  Exibir lotes com saldo zerado
                </Label>
              </div>
              <span className="text-sm text-gray-600">
                Mostrando {filteredRecords.length} lote{filteredRecords.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Buscar Pilha/Lote</Label>
                <Input
                  placeholder="Nome da pilha..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Mês</Label>
                <Input
                  type="month"
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Origem</Label>
                <Select value={filterOrigin} onValueChange={setFilterOrigin}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="BAHIA">BAHIA</SelectItem>
                    <SelectItem value="PARÁ">PARÁ</SelectItem>
                    <SelectItem value="GHANA">GHANA</SelectItem>
                    <SelectItem value="MARFIM">MARFIM</SelectItem>
                    <SelectItem value="ESPIRITO SANTO">ESPIRITO SANTO</SelectItem>
                    <SelectItem value="RONDÔNIA">RONDÔNIA</SelectItem>
                    <SelectItem value="TOCANTINS">TOCANTINS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="ativa">Ativa</SelectItem>
                    <SelectItem value="finalizada">Finalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Records Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Registros ({filteredRecords.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('pile_lot')}>
                      <div className="flex items-center gap-1">Pilha/Lote <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('origin')}>
                      <div className="flex items-center gap-1">Origem <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Formação</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Teste</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Variação</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('current_balance')}>
                      <div className="flex items-center gap-1">Saldo (T) <ArrowUpDown className="w-3 h-3" /></div>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-gray-900">{record.pile_lot}</p>
                          <p className="text-xs text-gray-500">{record.month}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">{record.origin}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p>Umid: {record.formation_moisture}%</p>
                          <p>FFA: {record.formation_ffa}</p>
                          {record.formation_date && (
                            <p className="text-xs text-gray-500">{new Date(record.formation_date).toLocaleDateString('pt-BR')}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {record.last_test_date ? (
                          <div className="text-sm">
                            <p>Umid: {record.last_moisture}%</p>
                            <p>FFA: {record.last_ffa}</p>
                            <p className="text-xs text-gray-500">{new Date(record.last_test_date).toLocaleDateString('pt-BR')}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Sem teste</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {record.moisture_variation !== null && record.moisture_variation !== undefined && (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1">
                              {record.moisture_variation > 0 ? <TrendingUp className="w-4 h-4 text-red-500" /> : record.moisture_variation < 0 ? <TrendingDown className="w-4 h-4 text-green-500" /> : null}
                              <span className={`text-sm font-semibold ${record.moisture_variation > 0 ? 'text-red-600' : record.moisture_variation < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                Umid: {record.moisture_variation > 0 ? '+' : ''}{record.moisture_variation?.toFixed(2)}%
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              {record.ffa_variation > 0 ? <TrendingUp className="w-4 h-4 text-red-500" /> : record.ffa_variation < 0 ? <TrendingDown className="w-4 h-4 text-green-500" /> : null}
                              <span className={`text-sm font-semibold ${record.ffa_variation > 0 ? 'text-red-600' : record.ffa_variation < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                FFA: {record.ffa_variation > 0 ? '+' : ''}{record.ffa_variation?.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className={`text-sm font-bold ${record.current_balance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {record.current_balance?.toFixed(2) || '0.00'}
                        </div>
                        {record.quantity_tons && (
                          <p className="text-xs text-gray-500">Inicial: {record.quantity_tons?.toFixed(2)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-medium rounded ${record.status === 'ativa' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {record.status === 'ativa' ? 'Ativa' : 'Finalizada'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(record)} className="text-blue-600 hover:text-blue-700">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleViewDetails(record)} className="text-[#860063] hover:text-[#6b004f]">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredRecords.length === 0 && (
                <div className="text-center py-8 text-gray-500">Nenhum registro encontrado</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dialog Form */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRecord ? 'Editar Registro' : 'Novo Registro'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mês *</Label>
                  <Input type="month" value={formData.month} onChange={(e) => setFormData({ ...formData, month: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Pilha/Lote *</Label>
                  <Input value={formData.pile_lot} onChange={(e) => setFormData({ ...formData, pile_lot: e.target.value })} placeholder="Nome da pilha" />
                </div>
                <div className="space-y-2">
                  <Label>Origem *</Label>
                  <Select value={formData.origin} onValueChange={(value) => setFormData({ ...formData, origin: value })}>
                    <SelectTrigger><SelectValue placeholder="Selecione a origem" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BAHIA">BAHIA</SelectItem>
                      <SelectItem value="PARÁ">PARÁ</SelectItem>
                      <SelectItem value="GHANA">GHANA</SelectItem>
                      <SelectItem value="MARFIM">MARFIM</SelectItem>
                      <SelectItem value="ESPIRITO SANTO">ESPIRITO SANTO</SelectItem>
                      <SelectItem value="RONDÔNIA">RONDÔNIA</SelectItem>
                      <SelectItem value="TOCANTINS">TOCANTINS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data de Formação</Label>
                  <Input type="date" value={formData.formation_date} onChange={(e) => setFormData({ ...formData, formation_date: e.target.value })} />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 text-[#860063]">Dados de Formação</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Umidade Formação (%) *</Label>
                    <Input type="number" step="0.01" value={formData.formation_moisture} onChange={(e) => setFormData({ ...formData, formation_moisture: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>FFA Formação *</Label>
                    <Input type="number" step="0.01" value={formData.formation_ffa} onChange={(e) => setFormData({ ...formData, formation_ffa: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 text-[#F88D2A]">Último Teste</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data do Teste</Label>
                    <Input type="date" value={formData.last_test_date} onChange={(e) => setFormData({ ...formData, last_test_date: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade Inicial (Ton)</Label>
                    <Input type="number" step="0.01" value={formData.quantity_tons} onChange={(e) => setFormData({ ...formData, quantity_tons: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Saldo Atual (Ton)</Label>
                    <Input type="number" step="0.01" value={formData.current_balance} onChange={(e) => setFormData({ ...formData, current_balance: e.target.value })} placeholder="Estoque disponível" />
                  </div>
                  <div className="space-y-2">
                    <Label>Umidade Atual (%)</Label>
                    <Input type="number" step="0.01" value={formData.last_moisture} onChange={(e) => setFormData({ ...formData, last_moisture: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>FFA Atual</Label>
                    <Input type="number" step="0.01" value={formData.last_ffa} onChange={(e) => setFormData({ ...formData, last_ffa: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativa">Ativa</SelectItem>
                      <SelectItem value="finalizada">Finalizada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Observações</Label>
                <Input value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Observações adicionais..." />
              </div>

              <div className="flex justify-between items-center pt-4">
                <div>
                  {editingRecord && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja excluir a pilha ${formData.pile_lot}?`)) {
                          deleteMutation.mutate(editingRecord.id);
                          setShowDialog(false);
                          resetForm();
                        }
                      }}
                    >
                      Excluir Pilha
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>Cancelar</Button>
                  <Button type="submit" className="bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824]">
                    {editingRecord ? 'Atualizar' : 'Criar'}
                  </Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={(v) => { setShowDetailsDialog(v); if (!v) setAddMonthForm(null); }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-[#860063]" />
                Histórico Mensal — {selectedPileDetails?.pile_lot} ({selectedPileDetails?.origin})
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {/* Tabela compacta horizontal */}
              {(() => {
                const history = selectedPileDetails?.history || [];
                const sortedAsc = [...history].sort((a, b) => a.month?.localeCompare(b.month));
                const formRecord = selectedPileDetails?.baseRecord || sortedAsc[0];
                // Meses únicos que têm last_moisture ou last_ffa registrados
                const monthCols = sortedAsc.filter(r => (r.last_moisture != null && r.last_moisture !== "") || (r.last_ffa != null && r.last_ffa !== ""));
                return (
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="border-collapse" style={{ fontSize: '11px' }}>
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-3 py-1.5 text-left text-[10px] font-bold text-gray-500 uppercase whitespace-nowrap border-r border-gray-200 sticky left-0 bg-gray-50 z-10 min-w-[90px]">
                            Métrica
                          </th>
                          {/* Coluna Formação (referência fixa) */}
                          <th className="px-3 py-1.5 text-center text-[10px] font-bold text-[#860063] whitespace-nowrap border-r border-gray-200 bg-[#860063]/5 min-w-[70px]">
                            Formação
                          </th>
                          {/* Uma coluna por mês com dado */}
                          {monthCols.map((record, i) => {
                            const mesLabel = new Date(record.month + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('. de', '').replace('.', '');
                            const isLatest = i === monthCols.length - 1;
                            return (
                              <th key={record.id} className={`px-3 py-1.5 text-center text-[10px] font-bold whitespace-nowrap border-r border-gray-200 min-w-[65px] ${isLatest ? 'bg-blue-50 text-blue-700' : 'text-gray-600'}`}>
                                {mesLabel}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Linha: Umidade */}
                        <tr className="border-b border-gray-100">
                          <td className="px-3 py-1.5 font-semibold text-gray-600 whitespace-nowrap border-r border-gray-200 sticky left-0 bg-white z-10 text-[10px]">
                            💧 Umidade %
                          </td>
                          <td className="px-3 py-1.5 text-center border-r border-gray-200 bg-[#860063]/5">
                            <span className="font-black text-[#860063] text-xs">{formRecord?.formation_moisture ?? '—'}</span>
                          </td>
                          {monthCols.map((record, i) => {
                            const val = record.last_moisture;
                            const hasVal = val != null && val !== "";
                            const diff = hasVal && formRecord ? parseFloat(val) - parseFloat(formRecord.formation_moisture) : null;
                            const isLatest = i === monthCols.length - 1;
                            return (
                              <td key={record.id} className={`px-3 py-1.5 text-center border-r border-gray-200 ${isLatest ? 'bg-blue-50/40' : ''}`}>
                                {hasVal ? (
                                  <div className="flex flex-col items-center">
                                    <span className="font-bold text-gray-800 text-xs">{val}</span>
                                    {diff !== null && (
                                      <span className={`text-[9px] font-semibold ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                        {diff > 0 ? '▲' : diff < 0 ? '▼' : ''}{diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                      </span>
                                    )}
                                  </div>
                                ) : <span className="text-gray-300">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                        {/* Linha: FFA */}
                        <tr>
                          <td className="px-3 py-1.5 font-semibold text-gray-600 whitespace-nowrap border-r border-gray-200 sticky left-0 bg-white z-10 text-[10px]">
                            🧪 FFA
                          </td>
                          <td className="px-3 py-1.5 text-center border-r border-gray-200 bg-[#860063]/5">
                            <span className="font-black text-[#860063] text-xs">{formRecord?.formation_ffa ?? '—'}</span>
                          </td>
                          {monthCols.map((record, i) => {
                            const val = record.last_ffa;
                            const hasVal = val != null && val !== "";
                            const diff = hasVal && formRecord ? parseFloat(val) - parseFloat(formRecord.formation_ffa) : null;
                            const isLatest = i === monthCols.length - 1;
                            return (
                              <td key={record.id} className={`px-3 py-1.5 text-center border-r border-gray-200 ${isLatest ? 'bg-blue-50/40' : ''}`}>
                                {hasVal ? (
                                  <div className="flex flex-col items-center">
                                    <span className="font-bold text-gray-800 text-xs">{val}</span>
                                    {diff !== null && (
                                      <span className={`text-[9px] font-semibold ${diff > 0 ? 'text-red-500' : diff < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                        {diff > 0 ? '▲' : diff < 0 ? '▼' : ''}{diff > 0 ? '+' : ''}{diff.toFixed(3)}
                                      </span>
                                    )}
                                  </div>
                                ) : <span className="text-gray-300">—</span>}
                              </td>
                            );
                          })}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
              })()}

              {/* Formulário para adicionar novo mês */}
              {addMonthForm ? (
                <div className="border border-[#860063]/30 rounded-lg p-3 bg-[#860063]/5 space-y-3">
                  <p className="text-xs font-bold text-[#860063]">+ Incluir resultado mensal</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Mês *</Label>
                      <Input
                        type="month"
                        className="h-8 text-xs"
                        value={addMonthForm.month}
                        onChange={e => setAddMonthForm(f => ({ ...f, month: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Umidade (%)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        className="h-8 text-xs"
                        placeholder="Ex: 8.5"
                        value={addMonthForm.moisture}
                        onChange={e => setAddMonthForm(f => ({ ...f, moisture: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">FFA</Label>
                      <Input
                        type="number"
                        step="0.001"
                        className="h-8 text-xs"
                        placeholder="Ex: 1.72"
                        value={addMonthForm.ffa}
                        onChange={e => setAddMonthForm(f => ({ ...f, ffa: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAddMonthForm(null)} disabled={savingMonth}>Cancelar</Button>
                    <Button size="sm" className="h-7 text-xs bg-[#860063] hover:bg-[#6b004f] text-white" onClick={handleSaveMonth} disabled={savingMonth}>
                      {savingMonth ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-[#860063] text-[#860063] hover:bg-[#860063]/10 h-8 text-xs"
                  onClick={() => setAddMonthForm({ month: new Date().toISOString().slice(0, 7), moisture: "", ffa: "" })}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Incluir resultado mensal
                </Button>
              )}

              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => { setShowDetailsDialog(false); setAddMonthForm(null); }}>Fechar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Blend Calculator Dialog */}
        <Dialog open={showBlendDialog} onOpenChange={setShowBlendDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-sm flex items-center gap-1.5">
                <Package className="w-4 h-4 text-[#F88D2A]" />
                Calculadora de Blend
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Quantidade Total (MT)</Label>
                  <Input type="number" step="0.01" className="h-8 text-sm" value={totalQuantityMT} onChange={(e) => setTotalQuantityMT(e.target.value)} placeholder="Ex: 100" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">FFA Desejável</Label>
                  <Input type="number" step="0.01" className="h-8 text-sm" value={targetFFA} onChange={(e) => setTargetFFA(e.target.value)} placeholder="1.75" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Composição</Label>
                  <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => setBlendOrigins([...blendOrigins, { origin: "", percentage: "" }])}>
                    <Plus className="w-3 h-3 mr-1" />Add
                  </Button>
                </div>

                {blendOrigins.map((item, index) => {
                  const validation = blendValidation.find(v => v.origin === item.origin);
                  return (
                    <div key={index} className="flex gap-1.5 items-start">
                      <div style={{width: '35%'}} className="space-y-1">
                        {index === 0 && <Label className="text-[10px]">Origem</Label>}
                        <Select value={item.origin} onValueChange={(value) => { const updated = [...blendOrigins]; updated[index].origin = value; setBlendOrigins(updated); }}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            {availableOrigins.length > 0 ? (
                              availableOrigins.map(origin => (
                                <SelectItem key={origin} value={origin}>
                                  {origin === "BAHIA" ? "BA" : origin === "PARÁ" ? "PA" : origin === "GHANA" ? "GH" : origin === "MARFIM" ? "CI" : origin === "ESPIRITO SANTO" ? "ES" : origin === "RONDÔNIA" ? "RO" : origin === "TOCANTINS" ? "TO" : origin}
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="__none__" disabled>Nenhuma</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="w-16 space-y-1">
                        {index === 0 && <Label className="text-[10px]">%</Label>}
                        <Input type="number" step="0.01" className="h-7 text-xs" value={item.percentage} onChange={(e) => { const updated = [...blendOrigins]; updated[index].percentage = e.target.value; setBlendOrigins(updated); }} placeholder="0" />
                      </div>
                      
                      <div className="flex-1 space-y-1">
                        {index === 0 && <Label className="text-[10px]">Disponibilidade</Label>}
                        {validation ? (
                          <div className={`h-7 flex items-center justify-between px-2 rounded border text-[10px] font-semibold ${validation.hasEnough ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'}`}>
                            <span>{validation.hasEnough ? '✓' : '✗'} {validation.required}T</span>
                            <span>/ {validation.available}T</span>
                          </div>
                        ) : (
                          <div className="h-7 flex items-center px-2 rounded border border-gray-200 bg-gray-50 text-[10px] text-gray-400">-</div>
                        )}
                      </div>
                      
                      {blendOrigins.length > 1 && (
                        <div className="space-y-1">
                          {index === 0 && <div className="h-3" />}
                          <Button size="icon" className="h-7 w-7" variant="destructive" onClick={() => setBlendOrigins(blendOrigins.filter((_, i) => i !== index))}>×</Button>
                        </div>
                      )}
                    </div>
                  );
                })}

                <div className="bg-blue-50 border border-blue-200 rounded px-2 py-1">
                  <p className="text-[10px] text-blue-800">
                    <strong>Total:</strong> {blendOrigins.reduce((sum, item) => sum + (parseFloat(item.percentage) || 0), 0).toFixed(1)}% 
                    {Math.abs(blendOrigins.reduce((sum, item) => sum + (parseFloat(item.percentage) || 0), 0) - 100) > 0.01 && (
                      <span className="text-red-600 ml-1">⚠️ Deve=100%</span>
                    )}
                  </p>
                </div>
              </div>

              <Button onClick={calculateBlend} className="w-full h-8 text-xs bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824]">
                🧮 Calcular
              </Button>

              {blendSuggestion && lastHighestFFAPile && (
                <div className="bg-amber-50 border border-amber-400 rounded p-2 text-[10px] text-amber-800">
                  🎯 <strong>Prioridade:</strong> O lote <strong>{lastHighestFFAPile}</strong> (FFA {lastHighestFFAValue}) teve o maior FFA no último blend e será destacado nas sugestões.
                </div>
              )}

              {blendSuggestion && (
                <div className="space-y-2 border-t pt-2">
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-300 rounded p-2">
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <p className="text-[10px] text-gray-600">FFA Calc</p>
                        <p className="text-lg font-bold text-green-600">{blendSuggestion.calculatedFFA}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600">FFA Alvo</p>
                        <p className="text-lg font-bold text-gray-700">{blendSuggestion.targetFFA}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-600">Dif</p>
                        <p className={`text-lg font-bold ${Math.abs(blendSuggestion.calculatedFFA - blendSuggestion.targetFFA) <= 0.2 ? 'text-green-600' : 'text-orange-600'}`}>
                          {Math.abs(blendSuggestion.calculatedFFA - blendSuggestion.targetFFA).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {blendSuggestion.suggestions.map((suggestion, idx) => {
                    const avgFFA = suggestion.piles.reduce((sum, p) => sum + p.ffa * p.quantity, 0) / suggestion.totalQuantity;
                    const ffaContribution = avgFFA * (parseFloat(suggestion.percentage) / 100);
                    const isHigh = avgFFA > blendSuggestion.targetFFA;

                    return (
                      <div key={idx} className={`bg-white border rounded p-2 ${isHigh ? 'border-amber-400' : 'border-[#860063]/20'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-[#860063] text-xs">{suggestion.origin} ({suggestion.percentage}%)</span>
                            {isHigh && <span className="text-[10px] text-amber-700 font-bold">⚠️ FFA alto</span>}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-gray-500">contribuição: <strong className={isHigh ? 'text-amber-700' : 'text-gray-700'}>{ffaContribution.toFixed(3)}</strong></span>
                            <span className="px-2 py-0.5 bg-[#860063] text-white rounded text-xs font-bold">{suggestion.totalQuantity.toFixed(2)}T</span>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {suggestion.piles.map((pile, pileIdx) => {
                            const isPriorityPile = pile.pile_lot === lastHighestFFAPile;
                            return (
                              <div key={pileIdx} className={`rounded p-1.5 border ${isPriorityPile ? 'bg-amber-50 border-amber-400' : 'bg-gray-50 border-gray-200'}`}>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-1">
                                    <span className="font-semibold text-gray-900 text-xs">{pile.pile_lot}</span>
                                    {isPriorityPile && <span className="text-[9px] text-amber-700 font-bold bg-amber-100 px-1 rounded">🎯 PRIORITÁRIO</span>}
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-sm font-bold text-[#F88D2A]">{pile.quantity.toFixed(2)}T</span>
                                    <button
                                      onClick={() => handleSkipPile(idx, pileIdx)}
                                      className="text-[9px] text-gray-500 hover:text-red-600 hover:bg-red-50 border border-gray-300 hover:border-red-300 rounded px-1 py-0.5 transition-colors"
                                      title="Substituir este lote pelo próximo disponível"
                                    >↻ trocar</button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-4 gap-1 text-[10px]">
                                  <div><p className="text-gray-500">FFA</p><p className={`font-semibold ${pile.ffa > blendSuggestion.targetFFA ? 'text-amber-700' : 'text-[#860063]'}`}>{pile.ffa}</p></div>
                                  <div><p className="text-gray-500">Umid</p><p className="font-semibold">{pile.moisture}%</p></div>
                                  <div><p className="text-gray-500">Saldo</p><p className="font-semibold text-gray-600">{pile.balance.toFixed(2)}T</p></div>
                                  <div><p className="text-gray-500">Após</p><p className="font-semibold text-green-600">{(pile.balance - pile.quantity).toFixed(2)}T</p></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {blendSuggestion && (
                <Button
                  onClick={handleUseBlend}
                  disabled={isSavingBlend}
                  className="w-full h-8 text-xs bg-green-600 hover:bg-green-700 text-white"
                >
                  {isSavingBlend ? (
                    <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2" />Registrando...</>
                  ) : (
                    <>✅ Usar este Blend — Registrar no Histórico</>
                  )}
                </Button>
              )}

              <Button variant="outline" className="w-full h-7 text-xs" onClick={() => { setShowBlendHistory(true); }}>
                📋 Ver Histórico de Blends ({blendHistory.length})
              </Button>

              <Button variant="outline" className="w-full h-7 text-xs" onClick={() => { setShowBlendDialog(false); setBlendSuggestion(null); }}>Fechar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Paste Data Dialog */}
        <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#860063]" />
                Colar Dados MB52 - Atualização de Saldos
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 mb-2"><strong>📋 Como usar:</strong></p>
                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Abra o relatório MB52 no SAP</li>
                  <li>Selecione: <strong>Material, Lote, Utilização livre</strong> (+ FFA e Umidade se disponível)</li>
                  <li>Copie os dados (Ctrl+C)</li>
                  <li>Cole no campo abaixo (Ctrl+V)</li>
                </ol>
                <div className="mt-2 pt-2 border-t border-blue-300">
                  <p className="text-xs text-blue-700 font-semibold mb-1">Mapeamento de Materiais:</p>
                  <div className="grid grid-cols-2 gap-x-3 text-xs text-blue-600">
                    <span>100000035052 → MARFIM</span>
                    <span>100000035333 → PARÁ</span>
                    <span>100000035334 → BAHIA</span>
                    <span>100000035335 → OUTROS ESTADOS</span>
                    <span>100000102022 → PARÁ EURO</span>
                    <span>100000102023 → BAHIA EURO</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Cole os dados do MB52 aqui:</Label>
                <textarea
                  className="w-full h-64 p-3 border rounded-md font-mono text-xs"
                  placeholder="100000035052    LOTE001    150.5&#10;100000035333    LOTE002    230.8&#10;..."
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                />
                {pastedData && (
                  <p className="text-xs text-green-600">✓ {pastedData.split('\n').filter(l => l.trim()).length} linhas detectadas</p>
                )}
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs text-orange-800"><strong>⚠️ Formato esperado:</strong> Material, Lote e Saldo separados por tabulação ou espaços.</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowPasteDialog(false); setPastedData(""); }} disabled={isPasting}>Cancelar</Button>
                <Button onClick={handlePasteData} disabled={!pastedData.trim() || isPasting} className="bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824]">
                  {isPasting ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Processando...</>
                  ) : (
                    <><FileSpreadsheet className="w-4 h-4 mr-2" />Atualizar Saldos</>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Blend History Dialog */}
        <Dialog open={showBlendHistory} onOpenChange={setShowBlendHistory}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#F88D2A]" />
                Histórico de Blends Utilizados
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {blendHistory.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Nenhum blend registrado ainda.</p>
              ) : (
                blendHistory.map((bh, idx) => (
                  <div key={bh.id} className={`border rounded-lg p-3 ${idx === 0 ? 'border-[#860063]/40 bg-[#860063]/5' : 'border-gray-200 bg-white'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {idx === 0 && <span className="text-[10px] font-bold text-[#860063] bg-[#860063]/10 px-1.5 py-0.5 rounded">Mais recente</span>}
                        <span className="text-xs font-semibold text-gray-700">
                          {new Date(bh.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className="bg-gray-100 px-2 py-0.5 rounded font-semibold">{bh.total_quantity_mt}T</span>
                        <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded font-bold">FFA {bh.calculated_ffa}</span>
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Alvo {bh.target_ffa}</span>
                      </div>
                    </div>
                    {bh.highest_ffa_pile && (
                      <div className="bg-amber-50 border border-amber-300 rounded p-2 text-[10px] text-amber-800">
                        🎯 <strong>Maior FFA:</strong> {bh.highest_ffa_pile} ({bh.highest_ffa_origin}) — FFA {bh.highest_ffa_value}
                        {idx === 0 && <span className="ml-2 font-bold text-amber-700">← Será priorizado nas próximas sugestões</span>}
                      </div>
                    )}
                    {bh.blend_data?.suggestions && (
                      <div className="mt-2 space-y-1">
                        {bh.blend_data.suggestions.map((s, si) => (
                          <div key={si} className="text-[10px] text-gray-600">
                            <strong>{s.origin} ({s.percentage}%)</strong>: {s.piles.map(p => `${p.pile_lot} ${p.quantity.toFixed(1)}T`).join(' + ')}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
              <Button variant="outline" className="w-full" onClick={() => setShowBlendHistory(false)}>Fechar</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* AI Blend Dialog */}
        <AIBlendDialog
          open={showAIBlendDialog}
          onClose={() => setShowAIBlendDialog(false)}
          records={records}
        />

        {/* Upload Excel Dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#860063]" />
                Atualizar Saldos - Upload Excel
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Selecione o arquivo Excel</Label>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setUploadFile(file);
                  }}
                />
                {uploadFile && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    ✓ {uploadFile.name} ({(uploadFile.size / 1024).toFixed(2)} KB)
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowUploadDialog(false); setUploadFile(null); }} disabled={isUploading}>Cancelar</Button>
                <Button onClick={handleUploadExcel} disabled={!uploadFile || isUploading} className="bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824]">
                  {isUploading ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Processando...</>
                  ) : (
                    <><Upload className="w-4 h-4 mr-2" />Atualizar Saldos</>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}