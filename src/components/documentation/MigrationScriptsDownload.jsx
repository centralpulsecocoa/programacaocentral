import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCode, Download, Server, FileText, Package } from "lucide-react";
import { toast } from "sonner";
import {
  ENV_FILE,
  APICLIENT_FILE,
  BASE44CLIENT_FILE,
  SERVER_FILE,
  PAGE_EXAMPLE,
  BACKEND_PACKAGE_JSON,
  BACKEND_ENV_FILE,
} from "@/lib/centralPulseMigrationScripts";

function downloadText(filename, content, mime = "text/plain;charset=utf-8") {
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
    toast.success(`${filename} baixado!`);
  } catch (error) {
    console.error(error);
    toast.error(`Erro ao baixar ${filename}`);
  }
}

const SCRIPTS = [
  {
    icon: FileText,
    color: "from-emerald-600 to-teal-600",
    title: ".env",
    desc: "Variável VITE_LOCAL_API_URL apontando para localhost:3000",
    filename: ".env",
    content: ENV_FILE,
    mime: "text/plain;charset=utf-8",
  },
  {
    icon: FileCode,
    color: "from-blue-600 to-blue-700",
    title: "api/apiClient.js",
    desc: "Novo cliente HTTP fetch com as 25 entidades mapeadas",
    filename: "apiClient.js",
    content: APICLIENT_FILE,
    mime: "text/javascript;charset=utf-8",
  },
  {
    icon: FileCode,
    color: "from-purple-600 to-purple-700",
    title: "api/base44Client.js",
    desc: "Reexporta o novo cliente — páginas antigas seguem funcionando",
    filename: "base44Client.js",
    content: BASE44CLIENT_FILE,
    mime: "text/javascript;charset=utf-8",
  },
  {
    icon: Package,
    color: "from-rose-600 to-pink-600",
    title: "package.json (backend)",
    desc: "Dependências do backend: express, cors, pg (rode npm install)",
    filename: "package-backend.json",
    content: BACKEND_PACKAGE_JSON,
    mime: "application/json;charset=utf-8",
  },
  {
    icon: FileText,
    color: "from-amber-600 to-yellow-600",
    title: ".env (backend)",
    desc: "String de conexão DATABASE_URL para o PostgreSQL local",
    filename: "backend.env",
    content: BACKEND_ENV_FILE,
    mime: "text/plain;charset=utf-8",
  },
  {
    icon: Server,
    color: "from-orange-600 to-amber-600",
    title: "server.js",
    desc: "API Express de exemplo (Node + pg) com endpoint /api/schedulings",
    filename: "server.js",
    content: SERVER_FILE,
    mime: "text/javascript;charset=utf-8",
  },
  {
    icon: FileText,
    color: "from-gray-700 to-gray-800",
    title: "Exemplo de página alterada",
    desc: "Como fica o Calendar.jsx (antes vs depois) + dica de compatibilidade",
    filename: "exemplo_pagina_alterada.txt",
    content: PAGE_EXAMPLE,
    mime: "text/plain;charset=utf-8",
  },
];

export default function MigrationScriptsDownload() {
  const downloadAll = () => {
    SCRIPTS.forEach((s, i) => {
      setTimeout(() => downloadText(s.filename, s.content, s.mime), i * 400);
    });
  };

  return (
    <Card className="shadow-xl border-2 border-indigo-500/30 mt-6">
      <CardHeader className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileCode className="w-5 h-5 text-indigo-600" />
          Scripts das Páginas já Alterados (Localhost)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <p className="text-sm text-gray-600 mb-4">
          Templates prontos dos arquivos modificados para a migração. Cada botão baixa um arquivo
          específico já configurado para apontar para o PostgreSQL local.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {SCRIPTS.map((s) => (
            <div key={s.title} className="border border-gray-200 rounded-lg p-3 bg-gray-50/50">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="w-4 h-4 text-indigo-600" />
                <code className="text-xs font-mono font-bold text-gray-800">{s.title}</code>
              </div>
              <p className="text-xs text-gray-600 mb-2">{s.desc}</p>
              <Button
                onClick={() => downloadText(s.filename, s.content, s.mime)}
                size="sm"
                className={`w-full bg-gradient-to-r ${s.color} hover:opacity-90 text-white`}
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                Baixar {s.title}
              </Button>
            </div>
          ))}
        </div>

        <Button
          onClick={downloadAll}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-3"
          size="lg"
        >
          <Download className="w-5 h-5 mr-2" />
          Baixar Todos os Arquivos
        </Button>
      </CardContent>
    </Card>
  );
}