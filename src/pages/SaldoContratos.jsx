import React, { useState } from "react";
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
import { Upload, FileSpreadsheet, Search, Download } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function SaldoContratosPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showPasteDialog, setShowPasteDialog] = useState(false);
  const [pastedData, setPastedData] = useState("");
  const [isPasting, setIsPasting] = useState(false);

  // Buscar dados do banco
  const { data: contractData = [], isLoading } = useQuery({
    queryKey: ['contractBalance'],
    queryFn: () => base44.entities.ContractBalance.list('-created_date'),
  });

  const handlePasteData = async () => {
    if (!pastedData.trim()) {
      toast.error('❌ Cole os dados do SAP ME2L');
      return;
    }

    setIsPasting(true);

    try {
      // Processar linhas coladas
      const lines = pastedData.split('\n').filter(line => line.trim());
      
      let saved = 0;

      // Limpar dados antigos
      const oldRecords = await base44.entities.ContractBalance.list();
      for (const record of oldRecords) {
        await base44.entities.ContractBalance.delete(record.id);
      }

      for (const line of lines) {
        // Separar por tabulação ou espaços múltiplos
        const parts = line.split(/\t+|\s{2,}/).map(p => p.trim());
        
        if (parts.length < 2) continue;

        // Fornecedor, Quantidade, Centro (opcional), Material (opcional)
        const fornecedor = parts[0];
        const quantidade = parseFloat(parts[1].replace(/[^\d.,]/g, '').replace(',', '.'));
        const centro = parts[2] || '';
        const material = parts[3] || '';

        if (!fornecedor || isNaN(quantidade) || quantidade <= 0) continue;

        await base44.entities.ContractBalance.create({
          fornecedor,
          centro_fornecedor: centro,
          material,
          quantidade
        });
        saved++;
      }

      queryClient.invalidateQueries({ queryKey: ['contractBalance'] });
      setShowPasteDialog(false);
      setPastedData("");

      toast.success(`✅ Importação concluída! ${saved} contratos salvos`);

    } catch (error) {
      console.error('❌ Erro:', error);
      toast.error(`❌ Erro: ${error.message}`);
    } finally {
      setIsPasting(false);
    }
  };

  // Filtrar dados por busca
  const filteredData = contractData.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.fornecedor?.toLowerCase().includes(searchLower) ||
      item.centro_fornecedor?.toLowerCase().includes(searchLower)
    );
  });

  // Calcular total
  const totalQuantidade = filteredData.reduce((sum, item) => sum + (item.quantidade || 0), 0);

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
                <FileSpreadsheet className="w-8 h-8 text-[#860063]" />
                Saldo de Contratos
              </h1>
              <p className="text-gray-600 mt-1">
                Gerencie quantidades a fornecer por fornecedor
              </p>
            </div>
            <Button
              onClick={() => setShowPasteDialog(true)}
              className="bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824]"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Colar Dados ME2L
            </Button>
          </div>
        </motion.div>

        {/* Busca e Estatísticas */}
        {contractData.length > 0 && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="md:col-span-2 space-y-2">
                  <Label>Buscar Fornecedor ou Centro</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Digite para buscar..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="bg-gradient-to-r from-[#860063]/10 to-[#F88D2A]/10 rounded-lg p-4 flex flex-col justify-center">
                  <p className="text-xs text-gray-600 mb-1">Total a Fornecer</p>
                  <p className="text-2xl font-bold text-[#860063]">
                    {totalQuantidade.toLocaleString('pt-BR')} T
                  </p>
                  <p className="text-xs text-gray-500">{filteredData.length} fornecedores</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabela de Dados */}
        {isLoading ? (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[#860063] mx-auto mb-4"></div>
                <p className="text-gray-600">Carregando dados...</p>
              </div>
            </CardContent>
          </Card>
        ) : contractData.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                <span>Saldos por Fornecedor ({filteredData.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fornecedor
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Centro
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Material
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        A Fornecer (T)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className="font-semibold text-gray-900">{item.fornecedor}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                            {item.centro_fornecedor}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                            {item.material}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-lg font-bold text-[#860063]">
                            {item.quantidade.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredData.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Nenhum registro encontrado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-16">
              <div className="text-center">
                <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nenhum dado carregado
                </h3>
                <p className="text-gray-600 mb-6">
                  Importe um arquivo Excel para visualizar o saldo de contratos
                </p>
                <Button
                  onClick={() => setShowPasteDialog(true)}
                  className="bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824]"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Colar Dados ME2L
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paste Data Dialog */}
        <Dialog open={showPasteDialog} onOpenChange={setShowPasteDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#860063]" />
                Colar Dados SAP ME2L
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>📋 Como usar:</strong>
                </p>
                <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                  <li>Abra o relatório ME2L no SAP</li>
                  <li>Selecione: <strong>Fornecedor, A fornecer (Quantidade), Centro, Material</strong></li>
                  <li>Copie os dados (Ctrl+C)</li>
                  <li>Cole no campo abaixo (Ctrl+V)</li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label>Cole os dados do ME2L aqui:</Label>
                <textarea
                  className="w-full h-64 p-3 border rounded-md font-mono text-xs"
                  placeholder="FORNECEDOR 1    150.5    2080    100000035334&#10;FORNECEDOR 2    230.8    2080    100000035333&#10;..."
                  value={pastedData}
                  onChange={(e) => setPastedData(e.target.value)}
                />
                {pastedData && (
                  <p className="text-xs text-green-600">
                    ✓ {pastedData.split('\n').filter(l => l.trim()).length} linhas detectadas
                  </p>
                )}
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs text-orange-800">
                  <strong>⚠️ Formato esperado:</strong> Fornecedor, Quantidade, Centro e Material separados por tabulação ou espaços.
                </p>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPasteDialog(false);
                    setPastedData("");
                  }}
                  disabled={isPasting}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handlePasteData}
                  disabled={!pastedData.trim() || isPasting}
                  className="bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824]"
                >
                  {isPasting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Importar Contratos
                    </>
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