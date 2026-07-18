import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderArchive, Download, FileCode, Loader2 } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";

// Captura todos os arquivos do projeto como strings raw via Vite
const srcModules = import.meta.glob("/src/**/*", { query: "?raw", import: "default", eager: true });
const base44Modules = import.meta.glob("/base44/**/*", { query: "?raw", import: "default", eager: true });
const rootModules = import.meta.glob(["/index.html", "/package.json", "/package-lock.json", "/vite.config.js", "/tailwind.config.js", "/postcss.config.js", "/jsconfig.json", "/components.json", "/eslint.config.js", "/README.md", "/.gitignore"], { query: "?raw", import: "default", eager: true });

const FILE_TREE = [
  "central-pulse-full/",
  "├── index.html",
  "├── package.json",
  "├── package-lock.json",
  "├── vite.config.js",
  "├── tailwind.config.js",
  "├── postcss.config.js",
  "├── jsconfig.json",
  "├── components.json",
  "├── eslint.config.js",
  "├── README.md",
  "├── .gitignore",
  "├── base44/          (entities, functions, config)",
  "│   ├── config.jsonc",
  "│   ├── entities/    (25 schemas JSON)",
  "│   └── functions/   (19 backend functions TS)",
  "└── src/",
  "    ├── main.jsx",
  "    ├── App.jsx",
  "    ├── index.css",
  "    ├── App.css",
  "    ├── pages.config.js",
  "    ├── api/         (base44Client, entities, integrations)",
  "    ├── lib/         (utils, auth, query-client, etc)",
  "    ├── hooks/",
  "    ├── utils/",
  "    ├── pages/       (todas as páginas JSX)",
  "    └── components/  (todos os componentes)",
].join("\n");

export default function DownloadProject() {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const fileCount = useMemo(() => {
    return Object.keys(srcModules).length + Object.keys(base44Modules).length + Object.keys(rootModules).length;
  }, []);

  const handleDownload = async () => {
    try {
      setBusy(true);
      setProgress(0);
      const zip = new JSZip();
      const root = zip.folder("central-pulse-full");
      let added = 0;
      const total = fileCount;

      const addModule = (globObj, stripPrefix) => {
        for (const [path, content] of Object.entries(globObj)) {
          const rel = stripPrefix ? path.replace(stripPrefix, "") : path.replace(/^\//, "");
          root.file(rel, content);
          added++;
        }
      };

      addModule(rootModules, "");
      addModule(srcModules, "");
      addModule(base44Modules, "");
      setProgress(Math.round((added / total) * 80));

      const blob = await zip.generateAsync(
        { type: "blob", compression: "DEFLATE" },
        (meta) => setProgress(80 + Math.round(meta.percent * 0.2))
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "central-pulse-full.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setProgress(100);
      toast.success(`ZIP gerado: ${fileCount} arquivos!`);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar o ZIP: " + error.message);
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-xl border-2 border-[#860063]/30">
          <CardHeader className="bg-gradient-to-r from-[#860063]/10 to-[#F88D2A]/10">
            <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
              <FolderArchive className="w-6 h-6 text-[#860063]" />
              Download do Projeto Completo — ZIP
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Gera um arquivo <code className="px-1.5 py-0.5 bg-gray-100 rounded text-[#860063] font-mono text-xs">central-pulse-full.zip</code> com{" "}
              <strong>{fileCount} arquivos</strong> do projeto — todo o código-fonte real (src/, base44/, e arquivos raiz),
              exatamente como estão no ambiente de desenvolvimento.
            </p>

            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-xs text-green-400 font-mono whitespace-pre">{FILE_TREE}</pre>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                <strong>⚠️ Observação:</strong> Este ZIP contém apenas arquivos de código-fonte (texto).
                Arquivos binários (imagens, fontes) e diretórios <code className="font-mono">node_modules</code>,
                <code className="font-mono"> .vite</code>, <code className="font-mono"> .git</code> não são incluídos.
                Após extrair, rode <code className="font-mono">npm install</code> para restaurar dependências.
              </p>
            </div>

            {busy && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Gerando ZIP... {progress}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#860063] to-[#F88D2A] h-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            <Button
              onClick={handleDownload}
              disabled={busy}
              className="w-full bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824] text-white font-semibold py-3"
              size="lg"
            >
              {busy ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Gerando ZIP... {progress}%
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Baixar Projeto Completo — central-pulse-full.zip ({fileCount} arquivos)
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <FileCode className="w-3 h-3" />
              <span>Código-fonte real do projeto, pronto para deploy</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}