import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileCode, KeyRound, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
  LOGIN_AUTH_CONTEXT,
  LOGIN_ACCESS,
  LOGIN_SERVER_AUTH,
  LOGIN_README,
} from "@/lib/loginFiles";

function downloadText(filename, content, mime) {
  const blob = new Blob([content], { type: mime + ";charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const FILES = [
  {
    key: "authContext",
    filename: "AuthContext.jsx",
    content: LOGIN_AUTH_CONTEXT,
    icon: FileCode,
    color: "text-purple-600",
    bg: "bg-purple-600",
    desc: "Context React (versão local, sem @base44/sdk). Provider que expõe user, isAuthenticated, logout e navigateToLogin usando a API local.",
  },
  {
    key: "access",
    filename: "Access.jsx",
    content: LOGIN_ACCESS,
    icon: KeyRound,
    color: "text-[#860063]",
    bg: "bg-[#860063]",
    desc: "Tela de login com email + senha, validação @ofi.com e identidade visual OFI. Chama base44.auth.login(email, password).",
  },
  {
    key: "serverAuth",
    filename: "server-auth.js",
    content: LOGIN_SERVER_AUTH,
    icon: FileCode,
    color: "text-emerald-600",
    bg: "bg-emerald-600",
    desc: "Snippet Express para colar no server.js: middleware requireAuth, /api/auth/login, /api/auth/me, /api/users/* e auto-seed de admin@ofi.com.",
  },
  {
    key: "readme",
    filename: "LEIA-ME-LOGIN.txt",
    content: LOGIN_README,
    icon: FileText,
    color: "text-blue-600",
    bg: "bg-blue-600",
    desc: "Instruções completas de instalação passo a passo (banco, backend, frontend) e primeiro login.",
  },
];

export default function LoginFilesDownload() {
  const [downloaded, setDownloaded] = useState({});

  const handleDownload = (file) => {
    const mime = file.filename.endsWith(".js")
      ? "text/javascript"
      : file.filename.endsWith(".jsx")
      ? "text/jsx"
      : "text/plain";
    downloadText(file.filename, file.content, mime);
    setDownloaded((d) => ({ ...d, [file.key]: true }));
    toast.success(`${file.filename} baixado!`);
  };

  const handleDownloadAll = () => {
    FILES.forEach((f, i) => {
      setTimeout(() => {
        const mime = f.filename.endsWith(".js") ? "text/javascript" : f.filename.endsWith(".jsx") ? "text/jsx" : "text/plain";
        downloadText(f.filename, f.content, mime);
      }, i * 250);
    });
    setDownloaded(Object.fromEntries(FILES.map((f) => [f.key, true])));
    toast.success("Todos os arquivos de login baixados!");
  };

  return (
    <Card className="shadow-xl border-2 border-[#860063]/30 mt-6">
      <CardHeader className="bg-gradient-to-r from-[#860063]/10 to-[#F88D2A]/10">
        <CardTitle className="flex items-center gap-2 text-lg">
          <KeyRound className="w-5 h-5 text-[#860063]" />
          Autenticação Local — Arquivos de Login (Email + Senha)
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <p className="text-sm text-gray-600 mb-4">
          Pacote completo para substituir o login por código de email do Base44 por um sistema
          local com <strong>email + senha</strong>, <strong>JWT</strong> e <strong>bcrypt</strong>.
          O banco já inclui a coluna <code className="px-1.5 py-0.5 bg-gray-100 rounded text-[#860063] font-mono text-xs">password_hash</code> na tabela
          <code className="px-1.5 py-0.5 bg-gray-100 rounded text-[#860063] font-mono text-xs ml-1">sistema.users</code>.
        </p>

        {/* Resumo do fluxo */}
        <div className="bg-gray-900 rounded-lg p-4 mb-5 overflow-x-auto">
          <code className="text-xs text-cyan-400 font-mono block text-center mb-1">
            Tela Access.jsx → POST /api/auth/login → bcrypt.compare → JWT (7 dias)
          </code>
          <code className="text-xs text-green-400 font-mono block text-center">
            localStorage.cp_token → header Authorization → /api/auth/me → {`{ id, email, role, profile }`}
          </code>
        </div>

        {/* Credenciais padrão */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-900 mb-1">Primeiro acesso (auto-criado no startup)</p>
            <code className="text-xs text-amber-800 font-mono bg-amber-100 px-2 py-1 rounded block">
              admin@ofi.com  /  admin123
            </code>
            <p className="text-xs text-amber-700 mt-2">
              Altere a senha após o primeiro login pela tela de Gestão de Usuários.
            </p>
          </div>
        </div>

        {/* Lista de arquivos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
          {FILES.map((file) => {
            const Icon = file.icon;
            const done = downloaded[file.key];
            return (
              <div
                key={file.key}
                className={`border-2 rounded-lg p-3 flex flex-col gap-2 ${done ? "border-green-300 bg-green-50/40" : "border-gray-200 bg-gray-50/50"}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${file.bg}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <code className="text-sm font-mono font-semibold text-gray-800">{file.filename}</code>
                  {done && <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />}
                </div>
                <p className="text-xs text-gray-600 flex-1">{file.desc}</p>
                <Button
                  onClick={() => handleDownload(file)}
                  size="sm"
                  variant="outline"
                  className="w-full hover:bg-[#860063]/10 hover:border-[#860063] hover:text-[#860063]"
                >
                  <Download className="w-3.5 h-3.5 mr-1.5" />
                  Baixar {file.filename}
                </Button>
              </div>
            );
          })}
        </div>

        {/* Botão baixar tudo */}
        <Button
          onClick={handleDownloadAll}
          className="w-full bg-gradient-to-r from-[#860063] to-[#F88D2A] hover:from-[#6b004f] hover:to-[#d97824] text-white font-semibold py-3"
          size="lg"
        >
          <Download className="w-5 h-5 mr-2" />
          Baixar Todos os Arquivos de Login
        </Button>

        {/* Nota de integração */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 leading-relaxed">
            <strong className="text-gray-700">Importante:</strong> estes arquivos já estão embutidos no
            bundle ZIP de migração completa (seção acima). Use os downloads individuais quando precisar
            apenas atualizar a camada de auth em um backend já migrado. O script SQL
            <code className="px-1 py-0.5 bg-gray-100 rounded text-emerald-700 font-mono mx-1">central_pulse_localhost.sql</code>
            (seção acima) já cria a tabela <code className="text-xs">sistema.users</code> com a coluna
            <code className="px-1 py-0.5 bg-gray-100 rounded text-[#860063] font-mono mx-1">password_hash</code>.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}