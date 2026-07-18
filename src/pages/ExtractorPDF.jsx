import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2, Download, Trash2, CheckCircle2, CloudUpload } from "lucide-react";
import { toast } from "sonner";

export default function ExtractorPDF() {
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [rows, setRows] = useState([]);
  const [rawText, setRawText] = useState("");
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowed.includes(f.type)) {
      toast.error("Formato não suportado. Use PDF, PNG, JPG ou WEBP.");
      return;
    }
    setFile(f);
    setRows([]);
    setRawText("");
  };

  const toBase64 = (f) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(f);
  });

  const handleExtract = async () => {
    if (!file) return;
    setExtracting(true);
    setRawText("");
    setRows([]);
    try {
      const file_base64 = await toBase64(file);
      const response = await base44.functions.invoke("extractDocumentData", {
        file_base64,
        file_type: file.type,
        file_name: file.name,
      });

      const { rawText: text, registros } = response.data;
      setRawText(text || "");

      if (!registros || registros.length === 0) {
        toast.warning("Nenhum registro encontrado no documento.");
      } else {
        setRows(registros);
        toast.success(`✅ ${registros.length} registro(s) extraído(s)!`);
      }
    } catch (err) {
      toast.error("Erro ao processar o arquivo: " + (err?.message || "tente novamente"));
    } finally {
      setExtracting(false);
    }
  };

  const handleExportCSV = () => {
    const header = ["Data", "Nome", "Quantidade (KG)", "CPF"];
    const csvRows = [header, ...rows.map(r => [r.data, r.nome, r.quantidade_kg, r.cpf])];
    const csv = csvRows.map(r => r.map(c => `"${c ?? ""}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dados_extraidos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    setFile(null);
    setRows([]);
    setRawText("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-[#860063]" />
            Extrator de Dados — PDF / Imagem
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Anexe um PDF ou imagem e extraia automaticamente: Data, Nome, Quantidade (KG) e CPF.
          </p>
        </div>

        {/* Upload Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Selecionar Arquivo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                file
                  ? "border-green-400 bg-green-50"
                  : "border-gray-300 hover:border-[#860063] hover:bg-[#860063]/5"
              }`}
              onClick={() => fileInputRef.current?.click()}
            >
              {file ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-green-700">Arquivo selecionado!</p>
                  <p className="text-xs text-green-600 mt-1">{file.name}</p>
                </>
              ) : (
                <>
                  <CloudUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Clique para selecionar ou arraste o arquivo</p>
                  <p className="text-xs text-gray-400 mt-1">PDF, PNG, JPG, WEBP</p>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {/* File info row */}
            {file && (
              <div className="flex items-center gap-2 rounded-lg px-3 py-2 border bg-green-50 border-green-200">
                <FileText className="w-4 h-4 shrink-0 text-green-600" />
                <span className="text-sm text-gray-700 flex-1 truncate">{file.name}</span>
                <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</span>
                <button onClick={handleClear} className="text-gray-400 hover:text-red-500 ml-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Extract button */}
            <Button
              onClick={handleExtract}
              disabled={!file || extracting}
              className="w-full bg-gradient-to-r from-[#860063] to-[#6b004f] hover:from-[#6b004f] hover:to-[#860063] disabled:opacity-40"
            >
              {extracting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando documento...</>
              ) : (
                <><FileText className="w-4 h-4 mr-2" /> Extrair Dados</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Raw text read from document */}
        {rawText && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-500" />
                Texto Lido do Documento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-4 whitespace-pre-wrap max-h-64 overflow-y-auto font-mono leading-relaxed">
                {rawText}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Results Table */}
        {rows.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{rows.length} Registro(s) Encontrado(s)</CardTitle>
                <Button onClick={handleExportCSV} variant="outline" size="sm" className="border-[#860063]/40 text-[#860063] hover:bg-[#860063]/5">
                  <Download className="w-4 h-4 mr-1.5" /> Exportar CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2.5 border-b-2 border-gray-200 font-semibold text-gray-700 whitespace-nowrap">#</th>
                      <th className="text-left px-4 py-2.5 border-b-2 border-gray-200 font-semibold text-gray-700 whitespace-nowrap">Data</th>
                      <th className="text-left px-4 py-2.5 border-b-2 border-gray-200 font-semibold text-gray-700">Nome</th>
                      <th className="text-left px-4 py-2.5 border-b-2 border-gray-200 font-semibold text-gray-700 whitespace-nowrap">Quantidade (KG)</th>
                      <th className="text-left px-4 py-2.5 border-b-2 border-gray-200 font-semibold text-gray-700 whitespace-nowrap">CPF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} className={`border-b border-gray-100 ${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"} hover:bg-[#860063]/5 transition-colors`}>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap font-mono text-xs">{row.data || <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-2.5 text-gray-800 font-medium">{row.nome || <span className="text-gray-300">—</span>}</td>
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">
                          {row.quantidade_kg ? (
                            <span className="font-semibold text-[#860063]">{parseFloat(row.quantidade_kg).toLocaleString("pt-BR")} kg</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-700 font-mono text-xs whitespace-nowrap">{row.cpf || <span className="text-gray-300">—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                    <tr>
                      <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">Total</td>
                      <td className="px-4 py-2.5 font-bold text-[#860063]">
                        {rows.reduce((s, r) => s + (parseFloat(r.quantidade_kg) || 0), 0).toLocaleString("pt-BR")} kg
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}