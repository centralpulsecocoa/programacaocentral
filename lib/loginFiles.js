// Central Pulse — Arquivos de Autenticação Local (login email + senha)
// Exportados como strings para download individual na página de Documentação.
// Conteúdo idêntico ao incluído no bundle de migração (projectBundle.js).

// ─────────────────────────────────────────────────────────────
// 1. src/lib/AuthContext.jsx (versão local — sem @base44/sdk)
// ─────────────────────────────────────────────────────────────
export const LOGIN_AUTH_CONTEXT = `import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => { checkAppState(); }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      const token = localStorage.getItem('cp_token');
      if (token) {
        await checkUserAuth();
      } else {
        setIsAuthenticated(false);
        setIsLoadingAuth(false);
      }
      setIsLoadingPublicSettings(false);
    } catch (error) {
      console.error('Auth state check failed:', error);
      setAuthError({ type: 'auth_required', message: 'Authentication required' });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
    } catch (error) {
      console.error('User auth check failed:', error);
      localStorage.removeItem('cp_token');
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthError({ type: 'auth_required', message: 'Authentication required' });
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    base44.auth.logout(shouldRedirect ? window.location.href : undefined);
  };

  const navigateToLogin = () => {
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings,
      authError, appPublicSettings: null, logout, navigateToLogin, checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
`;

// ─────────────────────────────────────────────────────────────
// 2. src/pages/Access.jsx (login com email + senha)
// ─────────────────────────────────────────────────────────────
export const LOGIN_ACCESS = `import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, AlertCircle, CheckCircle2, Mail, Lock, ArrowRight, KeyRound } from "lucide-react";
import { toast } from "sonner";

const OFI_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6905526da166967415597099/3c8ad4e27_ofi_logo_RGB2.jpg";
const ADMIN_WHITELIST = ['jjancem@gmail.com', 'dep.central@olam.onmicrosoft.com'];

export default function Access() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isValidDomain, setIsValidDomain] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => { checkAuth(); }, []);

  const checkAuth = async () => {
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (isAuth) {
        const u = await base44.auth.me();
        if (u && (u.email.split('@')[1]?.toLowerCase() === 'ofi.com' || ADMIN_WHITELIST.includes(u.email.toLowerCase()))) {
          navigate(createPageUrl("Dashboard"));
        } else {
          await base44.auth.logout();
        }
      }
    } catch { /* ignore */ }
    finally { setIsCheckingAuth(false); }
  };

  const validateDomain = (val) => {
    const v = val.trim().toLowerCase();
    setEmail(v);
    if (!v) { setIsValidDomain(null); return; }
    const re = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    if (!re.test(v)) { setIsValidDomain(false); return; }
    const domain = v.split('@')[1];
    setIsValidDomain(domain === 'ofi.com' || ADMIN_WHITELIST.includes(v));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || isValidDomain === false || !password) {
      toast.error('Preencha email @ofi.com e senha', { duration: 3000 });
      return;
    }
    setIsLoading(true);
    try {
      await base44.auth.login(email, password);
      toast.success('Login realizado com sucesso!', { duration: 2000 });
      navigate(createPageUrl("Dashboard"));
    } catch (error) {
      toast.error(error.message || 'Credenciais inválidas', { duration: 3000 });
      setIsLoading(false);
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#860063] via-[#a31875] to-[#F88D2A] flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#860063] via-[#a31875] to-[#F88D2A] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.5, opacity: 0.08 }}
          transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
          className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-white" />
        <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1.2, opacity: 0.1 }}
          transition={{ duration: 4, delay: 0.5, repeat: Infinity, repeatType: "reverse" }}
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#F88D2A]" />
      </div>

      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }} className="w-full max-w-md relative z-10">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }} className="text-center mb-8">
          <motion.div whileHover={{ scale: 1.05 }}
            className="inline-block bg-white rounded-3xl p-6 shadow-2xl mb-6 border-4 border-white/20">
            <img src={OFI_LOGO_URL} alt="OFI Logo" className="w-28 h-28 object-contain"
              onError={(e) => { e.target.src = "https://www.ofi.com/favicon.ico"; }} />
          </motion.div>
          <h1 className="text-5xl font-bold text-white mb-3 drop-shadow-lg">OFI</h1>
          <p className="text-xl text-white/95 font-medium tracking-wide">Central Pulse</p>
        </motion.div>

        <Card className="shadow-2xl border-none backdrop-blur-xl bg-white/98 overflow-hidden">
          <CardHeader className="border-b bg-gradient-to-r from-[#860063]/8 via-[#a31875]/6 to-[#F88D2A]/8 pb-4">
            <CardTitle className="text-center flex items-center justify-center gap-2.5 text-xl">
              <div className="p-2 bg-gradient-to-br from-[#860063] to-[#F88D2A] rounded-lg">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-[#860063] to-[#F88D2A] bg-clip-text text-transparent font-bold">
                Acesso ao Sistema
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 md:p-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Lock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-blue-900 mb-1">Acesso Corporativo</p>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Use seu email @ofi.com e senha. Primeiro acesso: admin@ofi.com / admin123
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Corporativo *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input id="email" type="email" placeholder="seu.nome@ofi.com" value={email}
                    onChange={(e) => validateDomain(e.target.value)}
                    className={"pl-11 h-12 text-base border-2 " + (
                      isValidDomain === true ? 'border-green-500 bg-green-50/30'
                      : isValidDomain === false ? 'border-red-500 bg-red-50/30'
                      : 'border-gray-300 focus:border-[#860063]')}
                    disabled={isLoading} autoFocus />
                </div>
                {isValidDomain === true && (
                  <div className="flex items-center gap-2 text-green-700 text-sm font-medium bg-green-50 p-3 rounded-lg border border-green-200">
                    <CheckCircle2 className="w-5 h-5" /> Email corporativo válido
                  </div>
                )}
                {isValidDomain === false && (
                  <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-red-800 mb-1">Domínio não autorizado</p>
                        <p className="text-xs text-red-700">Apenas emails @ofi.com podem acessar o sistema.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Senha *</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input id="password" type="password" placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-11 h-12 text-base border-2 border-gray-300 focus:border-[#860063]"
                    disabled={isLoading} />
                </div>
              </div>

              <Button type="submit" disabled={!email || isValidDomain === false || !password || isLoading}
                className="w-full bg-gradient-to-r from-[#860063] via-[#a31875] to-[#F88D2A] text-white h-12 text-base font-bold shadow-lg hover:shadow-xl transition-all">
                {isLoading ? (
                  <><div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white mr-2" /> Entrando...</>
                ) : (
                  <>Entrar no Sistema <ArrowRight className="w-5 h-5 ml-2" /></>
                )}
              </Button>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs text-gray-600 text-center">
                  Esqueceu a senha? Contate o departamento de TI da OFI.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          className="text-center mt-6">
          <div className="bg-white/15 backdrop-blur-md rounded-xl p-4 border border-white/20 shadow-lg">
            <p className="text-sm text-white font-medium flex items-center justify-center gap-2">
              <Shield className="w-5 h-5" />
              <span>Sistema protegido • Acesso restrito a colaboradores OFI</span>
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};
`;

// ─────────────────────────────────────────────────────────────
// 3. Snippet de Auth para colar no server.js (Express)
//    Inclui: middleware requireAuth, login, me, updateMe, logout,
//    CRUD de users e auto-seed do admin@ofi.com.
// ─────────────────────────────────────────────────────────────
export const LOGIN_SERVER_AUTH = `// ============================================================
// AUTH — cole este bloco no server.js ANTES dos endpoints de entidades
// ============================================================
// Dependências: npm install bcryptjs jsonwebtoken
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "central-pulse-secret-change-me";

// ====== Auth Middleware (valida JWT do header Authorization) ======
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token não fornecido" });
  }
  try {
    const token = header.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

// ====== Auth: Login (email + senha) → retorna JWT ======
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email e senha obrigatórios" });
  const result = await pool.query("SELECT * FROM sistema.users WHERE email = $1", [email.toLowerCase().trim()]);
  if (result.rows.length === 0) return res.status(401).json({ error: "Credenciais inválidas" });
  const user = result.rows[0];
  if (!user.password_hash) return res.status(401).json({ error: "Usuário sem senha definida. Contate o admin." });
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });
  await pool.query("UPDATE sistema.users SET last_login = NOW() WHERE id = $1", [user.id]);
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, profile: user.profile },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
  res.json({
    token,
    user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, profile: user.profile },
  });
});

// ====== Auth: Me (retorna usuário logado — valida token) ======
app.get("/api/auth/me", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT id, full_name, email, role, profile, last_login FROM sistema.users WHERE id = $1",
    [req.user.id]
  );
  if (result.rows.length === 0) return res.status(401).json({ error: "Usuário não encontrado" });
  res.json(result.rows[0]);
});

// ====== Auth: UpdateMe (alterar perfil / nome — próprio usuário) ======
app.put("/api/auth/me", requireAuth, async (req, res) => {
  const { profile, full_name } = req.body;
  const fields = [];
  const values = [];
  let idx = 1;
  if (profile !== undefined) { fields.push(\`profile = $\${idx++}\`); values.push(profile); }
  if (full_name !== undefined) { fields.push(\`full_name = $\${idx++}\`); values.push(full_name); }
  if (fields.length === 0) {
    const r = await pool.query("SELECT id, full_name, email, role, profile FROM sistema.users WHERE id = $1", [req.user.id]);
    return res.json(r.rows[0]);
  }
  values.push(req.user.id);
  const result = await pool.query(
    \`UPDATE sistema.users SET \${fields.join(", ")} WHERE id = $\${idx} RETURNING id, full_name, email, role, profile\`,
    values
  );
  res.json(result.rows[0]);
});

// ====== Auth: Logout (no-op — cliente descarta token) ======
app.post("/api/auth/logout", (req, res) => res.json({ ok: true }));

// ====== Users: Listar (admin only) ======
app.get("/api/users", requireAuth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Apenas admins podem listar usuários" });
  const result = await pool.query("SELECT id, full_name, email, role, profile, last_login, created_at FROM sistema.users ORDER BY created_at DESC");
  res.json(result.rows);
});

// ====== Users: Invite (admin cria usuário com senha temporária) ======
app.post("/api/users/invite", requireAuth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Apenas admins podem convidar usuários" });
  const { email, role, profile, full_name, password } = req.body;
  if (!email) return res.status(400).json({ error: "Email obrigatório" });
  const existing = await pool.query("SELECT id FROM sistema.users WHERE email = $1", [email.toLowerCase().trim()]);
  if (existing.rows.length > 0) return res.status(409).json({ error: "Email já cadastrado" });
  const tempPass = password || "ofi123456";
  const hash = await bcrypt.hash(tempPass, 10);
  const result = await pool.query(
    "INSERT INTO sistema.users (full_name, email, role, profile, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING id, full_name, email, role, profile",
    [full_name || "", email.toLowerCase().trim(), role || "user", profile || "user", hash]
  );
  res.status(201).json({ ...result.rows[0], temp_password: tempPass });
});

// ====== Users: Atualizar (admin only) ======
app.put("/api/users/:id", requireAuth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Apenas admins podem editar usuários" });
  const { full_name, role, profile, password } = req.body;
  const fields = [];
  const values = [];
  let idx = 1;
  if (full_name !== undefined) { fields.push(\`full_name = $\${idx++}\`); values.push(full_name); }
  if (role !== undefined) { fields.push(\`role = $\${idx++}\`); values.push(role); }
  if (profile !== undefined) { fields.push(\`profile = $\${idx++}\`); values.push(profile); }
  if (password) { const h = await bcrypt.hash(password, 10); fields.push(\`password_hash = $\${idx++}\`); values.push(h); }
  if (fields.length === 0) return res.json({ id: req.params.id });
  values.push(req.params.id);
  const result = await pool.query(
    \`UPDATE sistema.users SET \${fields.join(", ")} WHERE id = $\${idx} RETURNING id, full_name, email, role, profile\`,
    values
  );
  res.json(result.rows[0]);
});

// ====== Users: Deletar (admin only) ======
app.delete("/api/users/:id", requireAuth, async (req, res) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Apenas admins podem remover usuários" });
  if (req.params.id === req.user.id) return res.status(400).json({ error: "Não pode remover a si mesmo" });
  await pool.query("DELETE FROM sistema.users WHERE id = $1", [req.params.id]);
  res.status(204).send();
});

// ====== Auto-seed: cria admin@ofi.com no primeiro startup ======
(async () => {
  try {
    const count = await pool.query("SELECT COUNT(*) AS n FROM sistema.users");
    if (parseInt(count.rows[0].n) === 0) {
      const hash = await bcrypt.hash("admin123", 10);
      await pool.query(
        "INSERT INTO sistema.users (full_name, email, role, profile, password_hash) VALUES ($1, $2, $3, $4, $5)",
        ["Administrador Local", "admin@ofi.com", "admin", "admin", hash]
      );
      console.log("✅ Usuário admin criado automaticamente: admin@ofi.com / admin123");
      console.log("   ⚠️ Altere a senha após o primeiro login (Gestão de Usuários).");
    }
  } catch (e) {
    console.error("Erro ao criar admin seed:", e.message);
  }
})();
`;

// ─────────────────────────────────────────────────────────────
// 4. Instruções de instalação do login local
// ─────────────────────────────────────────────────────────────
export const LOGIN_README = `CENTRAL PULSE — Autenticação Local (Login Email + Senha)
======================================================
Data: ${new Date().toLocaleDateString("pt-BR")}

ESTE PACOTE CONTÉM
------------------
1. src/lib/AuthContext.jsx   — Context React (versão local, sem @base44/sdk)
2. src/pages/Access.jsx      — Tela de login (email + senha, valida @ofi.com)
3. server-auth.js            — Snippet Express com /api/auth/*, /api/users/* e seed admin
4. central_pulse_localhost.sql — Script do banco (já com coluna password_hash)

COMO FUNCIONA
------------
- Login: email + senha → backend valida com bcrypt → retorna JWT (7 dias)
- JWT guardado em localStorage.cp_token e enviado no header Authorization
- /api/auth/me valida o token e devolve { id, full_name, email, role, profile }
- Perfis (user.profile) e roles (user.role) funcionam idêntico ao produção
- O Layout.jsx usa esses campos para montar o menu e checar isAdmin()
- No primeiro startup, o server.js cria automaticamente:
    admin@ofi.com  /  admin123

INSTALAÇÃO — PASSO A PASSO
-------------------------
1. BANCO (uma vez):
     psql -U postgres -f central_pulse_localhost.sql
   A tabela sistema.users já nasce com a coluna password_hash.

2. BACKEND:
     cd backend
     npm install express cors pg dotenv bcryptjs jsonwebtoken
   Cole o conteúdo de server-auth.js no início do server.js
   (antes dos endpoints de entidades). Garanta que 'app' e 'pool' existam.
   Defina no .env do backend:
     DATABASE_URL=postgresql://central_pulse_user:central_pulse_pass@localhost:5433/central_pulse
     JWT_SECRET=sua-chave-secreta-aqui

3. FRONTEND:
   - Substitua src/lib/AuthContext.jsx pela versão deste pacote
   - Substitua src/pages/Access.jsx pela versão deste pacote
   - Confirme que src/api/base44Client.js é a versão migrada (com /auth/login,
     /auth/me e gerência do cp_token em localStorage)
   - npm install && npm run dev

4. PRIMEIRO LOGIN:
     Email: admin@ofi.com
     Senha: admin123
   Altere a senha e crie demais usuários em Gestão de Usuários (admin).

CRIAR NOVOS USUÁRIOS
-------------------
- Pela UI (Gestão de Usuários, perfil admin), ou
- POST /api/users/invite  { email, role, profile, full_name, password? }
  Retorna senha temporária se password não for informado (padrão: ofi123456)

SEGURANÇA
--------
- Senhas sempre armazenadas como hash bcrypt (nunca em texto puro)
- JWT com expiração de 7 dias — chave em JWT_SECRET (troque em produção)
- Endpoints de entidades exigem header Authorization: Bearer <token>
- Apenas admin pode listar/criar/editar/remover usuários
- Validação de domínio @ofi.com na tela de login (whitelist administrativa)
`;