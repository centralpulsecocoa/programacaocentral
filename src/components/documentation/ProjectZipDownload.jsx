import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderArchive, Download } from "lucide-react";
import { toast } from "sonner";
import { buildProjectZip, PROJECT_FILE_COUNT } from "@/lib/projectBundle";

const TREE = [
  "central-pulse/",
  "├── index.html            (sem favicon/título Base44)",
  "├── package.json          (sem @base44/sdk e vite-plugin)",
  "├── vite.config.js       (sem plugin Base44)",
  "├── .env                  (VITE_LOCAL_API_URL)",
  "├── database/            (2 scripts SQL — porta 5433)",
  "│   ├── central_pulse_localhost.sql",
  "│   └── central_pulse_postgresql.sql",
  "├── backend/             (API Express completa)",
  "│   ├── server.js        (25 entidades, CRUD)",
  "│   ├── package.json",
  "│   ├── .env",
  "│   └── README.md",
  "├── public/",
  "│   └── favicon.svg",
  "└── src/",
  "    ├── main.jsx",
  "    ├── App.jsx",
  "    ├── index.css",
  "    ├── api/",
  "    │   ├── base44Client.js  ← REESCRITO (API local)",
  "    │   ├── entities.js",
  "    │   └── integrations.js",
  "    ├── lib/  (app-params, query-client, utils, iframe-messaging)",
  "    ├── hooks/ (use-mobile)",
  "    ├── utils/ (index.ts)",
  "    ├── pages/   (README — copiar do original, sem alterar)",
  "    └── components/ (README — copiar do original, sem alterar)",
].join("\n");

export default function ProjectZipDownload() {
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    try {
      setBusy(true);
      const blob = await buildProjectZip();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "central-pulse.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Projeto completo (ZIP) baixado com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar o ZIP do projeto");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="shadow-xl border-2 border-indigo-500/40 mt-6">
      <CardHeader className="bg-gradient-to-r from-indigo-500/15 to-violet-500/15">
        <CardTitle className="flex items-center gap-2 text-lg">
          <FolderArchive className="w-5 h-5 text-indigo-600" />
          Projeto Completo em ZIP — Estrutura Idêntica ao Download do Painel
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <p className="text-sm text-gray-600 mb-4">
          Arquivo <code className="px-1.5 py-0.5 bg-gray-100 rounded text-indigo-700 font-mono text-xs">central-pulse.zip</code> com{" "}
          <strong>{PROJECT_FILE_COUNT} arquivos</strong> na mesma estrutura de pastas do download padrão do projeto,
          já migrado para servidor externo. As páginas <strong>não referenciam o servidor Base44</strong> —
          o <code className="px-1.5 py-0.5 bg-gray-100 rounded text-indigo-700 font-mono text-xs">base44Client.js</code> foi
          reescrito para apontar para a API Express local mantendo a mesma interface.
        </p>

        <div className="bg-gray-900 rounded-lg p-4 mb-6 overflow-x-auto">
          <pre className="text-xs text-green-400 font-mono whitespace-pre">{TREE}</pre>
        </div>

        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-6">
          <p className="text-xs text-indigo-800">
            <strong>🔑 Sem alterar páginas:</strong> as páginas continuam usando{" "}
            <code className="bg-indigo-100 px-1 rounded font-mono">base44.entities.X.list()</code>.
            A mágica acontece no <code className="bg-indigo-100 px-1 rounded font-mono">base44Client.js</code> reescrito,
            que faz <code className="bg-indigo-100 px-1 rounded font-mono">fetch()</code> para a API local. Copie apenas as
            pastas <code className="bg-indigo-100 px-1 rounded font-mono">src/pages</code> e{" "}
            <code className="bg-indigo-100 px-1 rounded font-mono">src/components</code> do projeto original — elas já funcionam como estão.
          </p>
        </div>

        <Button
          onClick={handleDownload}
          disabled={busy}
          className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold py-3"
          size="lg"
        >
          {busy ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
              Gerando ZIP...
            </>
          ) : (
            <>
              <Download className="w-5 h-5 mr-2" />
              Baixar Projeto Completo — central-pulse.zip ({PROJECT_FILE_COUNT} arquivos)
            </>
          )}
        </Button>

        <p className="text-xs text-gray-500 mt-3 text-center">
          Um único arquivo ZIP com toda a estrutura de pastas, pronto para <code className="font-mono">npm install</code> e <code className="font-mono">npm run dev</code>.
        </p>
      </CardContent>
    </Card>
  );
}