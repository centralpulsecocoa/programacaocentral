import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Download, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { CENTRAL_PULSE_SQL } from "@/lib/centralPulseSQL";
import { CENTRAL_PULSE_SQL_LOCAL } from "@/lib/centralPulseSQLLocal";
import { FULL_MIGRATION_DOC, FULL_SERVER_JS } from "@/lib/centralPulseFullMigration";
import {
  ENV_FILE,
  APICLIENT_FILE,
  BASE44CLIENT_FILE,
  SERVER_FILE,
  BACKEND_PACKAGE_JSON,
  BACKEND_ENV_FILE,
  PAGE_EXAMPLE,
} from "@/lib/centralPulseMigrationScripts";

// Lista de TODOS os arquivos do bundle completo de migração
const ALL_FILES = [
  {
    group: "Banco de Dados (PostgreSQL)",
    files: [
      { filename: "central_pulse_localhost.sql", content: CENTRAL_PULSE_SQL_LOCAL, mime: "application/sql;charset=utf-8", desc: "Script que cria o banco, usuário, schemas e tabelas (porta 5433)" },
      { filename: "central_pulse_postgresql.sql", content: CENTRAL_PULSE_SQL, mime: "application/sql;charset=utf-8", desc: "Script SQL completo (somente estrutura, sem criar usuário)" },
    ],
  },
  {
    group: "Backend (API Express + PostgreSQL)",
    files: [
      { filename: "server-completo.js", content: FULL_SERVER_JS, mime: "text/javascript;charset=utf-8", desc: "API Express com TODOS os endpoints CRUD das 25 entidades" },
      { filename: "package-backend.json", content: BACKEND_PACKAGE_JSON, mime: "application/json;charset=utf-8", desc: "Dependências: express, cors, pg, dotenv (npm install)" },
      { filename: "backend.env", content: BACKEND_ENV_FILE, mime: "text/plain;charset=utf-8", desc: "String de conexão DATABASE_URL para PostgreSQL (porta 5433)" },
      { filename: "server-exemplo.js", content: SERVER_FILE, mime: "text/javascript;charset=utf-8", desc: "server.js simplificado (exemplo de referência)" },
    ],
  },
  {
    group: "Frontend (React → API local)",
    files: [
      { filename: ".env", content: ENV_FILE, mime: "text/plain;charset=utf-8", desc: "VITE_LOCAL_API_URL apontando para localhost:3000/api" },
      { filename: "apiClient.js", content: APICLIENT_FILE, mime: "text/javascript;charset=utf-8", desc: "Cliente HTTP fetch com as 25 entidades mapeadas" },
      { filename: "base44Client.js", content: BASE44CLIENT_FILE, mime: "text/javascript;charset=utf-8", desc: "Ponte de compatibilidade (reexporta api como base44)" },
    ],
  },
  {
    group: "Documentação & Guias",
    files: [
      { filename: "central_pulse_migracao_completa.txt", content: FULL_MIGRATION_DOC, mime: "text/plain;charset=utf-8", desc: "Todas as páginas + entidades mapeadas + checklist" },
      { filename: "exemplo_pagina_alterada.txt", content: PAGE_EXAMPLE, mime: "text/plain;charset=utf-8", desc: "Exemplo antes vs depois (Calendar.jsx)" },
    ],
  },
];

const TOTAL_FILES = ALL_FILES.reduce((sum, g) => sum + g.files.length, 0);

function downloadOne(filename, content, mime) {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("Erro ao baixar", filename, error);
  }
}

export default function FullMigrationBundleDownload() {
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);

  const downloadAll = async () => {
    setDownloading(true);
    setProgress(0);
    toast.info(`Iniciando download de ${TOTAL_FILES} arquivos...`);

    const allFiles = ALL_FILES.flatMap((g) => g.files);
    let count = 0;

    for (const file of allFiles) {
      downloadOne(file.filename, file.content, file.mime);
      count++;
      setProgress(count);
      // Pequeno intervalo para o navegador não bloquear múltiplos downloads
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setDownloading(false);
    toast.success(`${TOTAL_FILES} arquivos baixados com sucesso!`);
  };

  return (
    <Card className="shadow-xl border-2 border-emerald-500/40 mt-6">
      <CardHeader className="bg-gradient-to-r from-emerald-500/15 to-green-500/15">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="w-5 h-5 text-emerald-600" />
          Bundle Completo de Migração — Baixar Tudo
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <p className="text-sm text-gray-600 mb-4">
          Baixe <strong>todos os {TOTAL_FILES} arquivos</strong> necessários para migrar o Central Pulse
          do Base44 SDK para o PostgreSQL local — banco, backend, frontend e documentação, tudo pronto e já alterado para a porta 5433.
        </p>

        {/* Lista organizada por grupo */}
        <div className="space-y-4 mb-6">
          {ALL_FILES.map((group) => (
            <div key={group.group} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5" />
                {group.group}
              </p>
              <ul className="space-y-1.5">
                {group.files.map((file) => (
                  <li key={file.filename} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <code className="font-mono font-bold text-gray-800">{file.filename}</code>
                      <p className="text-gray-500 mt-0.5">{file.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Progresso */}
        {downloading && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Baixando arquivos...</span>
              <span className="font-bold">{progress} / {TOTAL_FILES}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-green-500 transition-all duration-300"
                style={{ width: `${(progress / TOTAL_FILES) * 100}%` }}
              />
            </div>
          </div>
        )}

        <Button
          onClick={downloadAll}
          disabled={downloading}
          className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-semibold py-3"
          size="lg"
        >
          {downloading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              Baixando {progress}/{TOTAL_FILES}...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Baixar Tudo — {TOTAL_FILES} Arquivos de Migração
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 mt-3 text-center">
          Os arquivos serão baixados um a um. Permita múltiplos downloads no navegador quando solicitado.
        </p>
      </CardContent>
    </Card>
  );
}