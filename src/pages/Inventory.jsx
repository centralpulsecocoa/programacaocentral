import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, RefreshCw, Link, FileSpreadsheet, Trash2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const ALLOWED_EMAIL = "jose.j.santos@ofi.com";

const COLUMNS = [
  { key: "material", label: "Material" },
  { key: "lote", label: "Lote" },
  { key: "texto_breve_material", label: "Texto breve material" },
  { key: "deposito", label: "Depósito" },
  { key: "centro", label: "Centro" },
  { key: "unidade_medida", label: "Unid.medida básica" },
  { key: "utilizacao_livre", label: "Utilização livre" },
  { key: "em_controle_qualidade", label: "Em contr.qualidade" },
  { key: "estoque_transito", label: "Estoque em trânsito" },
  { key: "em_transfer_centro", label: "Em transfer.(centro)" },
  { key: "devolucoes", label: "Devoluções" },
  { key: "bloqueado", label: "Bloqueado" },
  { key: "estoque_nao_disponivel", label: "Estq.não disponível" },
];

// Mapeamento de cabeçalhos Excel → campos da entidade
const HEADER_MAP = {
  "material": "material",
  "lote": "lote",
  "texto breve material": "texto_breve_material",
  "depósito": "deposito",
  "deposito": "deposito",
  "centro": "centro",
  "unid.medida básica": "unidade_medida",
  "unid. medida básica": "unidade_medida",
  "unidade medida básica": "unidade_medida",
  "utilização livre": "utilizacao_livre",
  "utilizacao livre": "utilizacao_livre",
  "em contr.qualidade": "em_controle_qualidade",
  "em controle qualidade": "em_controle_qualidade",
  "estoque em trânsito": "estoque_transito",
  "estoque em transito": "estoque_transito",
  "em transfer.(centro)": "em_transfer_centro",
  "em transfer. (centro)": "em_transfer_centro",
  "devoluções": "devolucoes",
  "devolucoes": "devolucoes",
  "bloqueado": "bloqueado",
  "estq.não disponível": "estoque_nao_disponivel",
  "estq. não disponível": "estoque_nao_disponivel",
  "estoque não disponível": "estoque_nao_disponivel",
};

function parseNumber(val) {
  if (val === null || val === undefined || val === "") return null;
  const str = String(val).replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(str);
  return isNaN(n) ? null : n;
}

export default function Inventory() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [oneDriveUrl, setOneDriveUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [importStats, setImportStats] = useState(null);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      setLoadingUser(false);
    }).catch(() => setLoadingUser(false));
  }, []);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["mb52"],
    queryFn: () => base44.entities.MB52.list("-data_importacao", 5000),
    enabled: user?.email === ALLOWED_EMAIL,
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      const all = await base44.entities.MB52.list();
      await Promise.all(all.map(r => base44.entities.MB52.delete(r.id)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["mb52"]);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setImportStats(null);

    try {
      // Upload do arquivo
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      // Extrair dados com schema definido
      const schema = {
        type: "object",
        properties: {
          rows: {
            type: "array",
            items: {
              type: "object",
              properties: {
                material: { type: "string" },
                lote: { type: "string" },
                texto_breve_material: { type: "string" },
                deposito: { type: "string" },
                centro: { type: "string" },
                unidade_medida: { type: "string" },
                utilizacao_livre: { type: "number" },
                em_controle_qualidade: { type: "number" },
                estoque_transito: { type: "number" },
                em_transfer_centro: { type: "number" },
                devolucoes: { type: "number" },
                bloqueado: { type: "number" },
                estoque_nao_disponivel: { type: "number" },
              }
            }
          }
        }
      };

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: schema
      });

      if (result.status !== "success" || !result.output?.rows?.length) {
        toast.error("Não foi possível extrair dados do arquivo.");
        return;
      }

      const rows = result.output.rows;
      const now = new Date().toISOString();

      // Limpar registros anteriores
      await clearMutation.mutateAsync();

      // Importar em lotes de 50
      const batchSize = 50;
      let imported = 0;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize).map(row => ({
          ...row,
          fonte: "upload_excel",
          data_importacao: now,
        }));
        await base44.entities.MB52.bulkCreate(batch);
        imported += batch.length;
      }

      setImportStats({ total: rows.length, imported });
      queryClient.invalidateQueries(["mb52"]);
      toast.success(`✅ ${imported} registros importados com sucesso!`);
    } catch (err) {
      toast.error("Erro ao importar: " + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-[#860063]" />
      </div>
    );
  }

  if (user?.email !== ALLOWED_EMAIL) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Acesso Restrito</h2>
            <p className="text-sm text-gray-500">Esta página é de acesso exclusivo.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory — MB52</h1>
        <p className="text-sm text-gray-500 mt-1">Gestão de estoque importado do SAP/OneDrive</p>
      </div>

      {/* Configuração de Fonte */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Upload Excel */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              Upload de Arquivo Excel
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500">
              Faça upload do arquivo MB52 exportado do SAP (Excel ou CSV).
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full bg-green-600 hover:bg-green-700"
              size="sm"
            >
              {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Selecionar Arquivo
                </>
              )}
            </Button>
            {importStats && (
              <p className="text-xs text-green-600 font-medium text-center">
                ✅ {importStats.imported} registros importados
              </p>
            )}
          </CardContent>
        </Card>

        {/* OneDrive / SharePoint URL */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Link className="w-4 h-4 text-blue-600" />
              Link OneDrive / SharePoint
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-500">
              Cole o link direto do arquivo no OneDrive ou SharePoint. Requer autorização OAuth para funcionar.
            </p>
            <div className="space-y-2">
              <Input
                placeholder="https://olam.sharepoint.com/..."
                value={oneDriveUrl}
                onChange={e => setOneDriveUrl(e.target.value)}
                className="text-xs"
              />
              <Button
                disabled
                variant="outline"
                className="w-full"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Sincronizar (pendente autorização)
              </Button>
            </div>
            {oneDriveUrl && (
              <p className="text-xs text-blue-600 break-all">
                🔗 Link salvo: {oneDriveUrl.substring(0, 60)}...
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs">
            {records.length} registros
          </Badge>
          {records[0]?.data_importacao && (
            <span className="text-xs text-gray-400">
              Última importação: {new Date(records[0].data_importacao).toLocaleString("pt-BR")}
            </span>
          )}
        </div>
        {records.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Limpar todos os registros?")) clearMutation.mutate();
            }}
            className="text-red-500 hover:text-red-600 hover:border-red-300 text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Limpar dados
          </Button>
        )}
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b sticky top-0">
            <tr>
              {COLUMNS.map(col => (
                <th key={col.key} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={COLUMNS.length} className="text-center py-8 text-gray-400">
                  Carregando...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="text-center py-12 text-gray-400">
                  <FileSpreadsheet className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Nenhum dado importado ainda.</p>
                  <p className="text-xs mt-1">Faça upload de um arquivo Excel para começar.</p>
                </td>
              </tr>
            ) : (
              records.map((row, idx) => (
                <tr key={row.id} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                  {COLUMNS.map(col => (
                    <td key={col.key} className="px-3 py-1.5 text-gray-700 whitespace-nowrap border-b border-gray-100">
                      {row[col.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}