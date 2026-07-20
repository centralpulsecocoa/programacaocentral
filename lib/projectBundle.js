// Gera um ZIP com a ESTRUTURA COMPLETA do projeto Central Pulse,
// já migrado para servidor externo (sem referências ao servidor Base44).
// As páginas continuam usando `base44.entities.X` — o base44Client foi reescrito
// para apontar para a API local, então NENHUMA página precisa ser alterada.

import JSZip from "jszip";
import { CENTRAL_PULSE_SQL_LOCAL } from "@/lib/centralPulseSQLLocal";
import { CENTRAL_PULSE_SQL } from "@/lib/centralPulseSQL";
import { FULL_SERVER_JS } from "@/lib/centralPulseFullMigration";

// ─────────────────────────────────────────────────────────────
// ARQUIVOS RAIZ (configuração do projeto — sem Base44)
// ─────────────────────────────────────────────────────────────

const ROOT_PACKAGE_JSON = `{
  "name": "central-pulse",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@hello-pangea/dnd": "^17.0.0",
    "@hookform/resolvers": "^4.1.2",
    "@radix-ui/react-accordion": "^1.2.3",
    "@radix-ui/react-alert-dialog": "^1.1.6",
    "@radix-ui/react-aspect-ratio": "^1.1.2",
    "@radix-ui/react-avatar": "^1.1.3",
    "@radix-ui/react-checkbox": "^1.1.4",
    "@radix-ui/react-collapsible": "^1.1.3",
    "@radix-ui/react-context-menu": "^2.2.6",
    "@radix-ui/react-dialog": "^1.1.6",
    "@radix-ui/react-dropdown-menu": "^2.1.6",
    "@radix-ui/react-hover-card": "^1.1.6",
    "@radix-ui/react-label": "^2.1.2",
    "@radix-ui/react-menubar": "^1.1.6",
    "@radix-ui/react-navigation-menu": "^1.2.5",
    "@radix-ui/react-popover": "^1.1.6",
    "@radix-ui/react-progress": "^1.1.2",
    "@radix-ui/react-radio-group": "^1.2.3",
    "@radix-ui/react-scroll-area": "^1.2.3",
    "@radix-ui/react-select": "^2.1.6",
    "@radix-ui/react-separator": "^1.1.2",
    "@radix-ui/react-slider": "^1.2.3",
    "@radix-ui/react-slot": "^1.1.2",
    "@radix-ui/react-switch": "^1.1.3",
    "@radix-ui/react-tabs": "^1.1.3",
    "@radix-ui/react-toast": "^1.2.2",
    "@radix-ui/react-toggle": "^1.1.2",
    "@radix-ui/react-toggle-group": "^1.1.2",
    "@radix-ui/react-tooltip": "^1.1.8",
    "@tanstack/react-query": "^5.84.1",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "cmdk": "^1.0.0",
    "date-fns": "^3.6.0",
    "embla-carousel-react": "^8.5.2",
    "framer-motion": "^11.16.4",
    "html2canvas": "^1.4.1",
    "input-otp": "^1.4.2",
    "jspdf": "^2.5.2",
    "jszip": "^3.10.1",
    "lodash": "^4.17.21",
    "lucide-react": "^0.475.0",
    "moment": "^2.30.1",
    "next-themes": "^0.4.4",
    "react": "^18.2.0",
    "react-day-picker": "^8.10.1",
    "react-dom": "^18.2.0",
    "react-hook-form": "^7.54.2",
    "react-leaflet": "^4.2.1",
    "react-markdown": "^9.0.1",
    "react-quill": "^2.0.0",
    "react-resizable-panels": "^2.1.7",
    "react-router-dom": "^7.2.0",
    "recharts": "^2.15.4",
    "sonner": "^2.0.1",
    "tailwind-merge": "^3.0.2",
    "tailwindcss-animate": "^1.0.7",
    "three": "^0.171.0",
    "vaul": "^1.1.2",
    "zod": "^3.24.2"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.5.3",
    "tailwindcss": "^3.4.17",
    "vite": "^6.1.0"
  }
}
`;

const ROOT_VITE_CONFIG = `import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
});
`;

const ROOT_ENV = `# URL da API local (backend Express + PostgreSQL)
VITE_LOCAL_API_URL=http://localhost:3000/api
`;

const ROOT_GITIGNORE = `node_modules
dist
.env
*.local
`;

const ROOT_INDEX_HTML = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Central Pulse — Sistema de Descargas</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;

const ROOT_POSTCSS = `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;

// ─────────────────────────────────────────────────────────────
// src/api/ — REESCRITO para API local (sem servidor Base44)
// ─────────────────────────────────────────────────────────────

const API_BASE44_CLIENT = `// ═══════════════════════════════════════════════════════════════
// base44Client.js — VERSÃO MIGRADA (servidor local)
// ═══════════════════════════════════════════════════════════════
// Este arquivo MANTÉM a mesma interface do SDK Base44:
//   base44.entities.X.list() / filter() / get() / create() / update() / delete()
//   base44.auth.me() / updateMe() / isAuthenticated() / logout()
//   base44.functions.invoke()
//   base44.integrations.Core.*
//   base44.users.inviteUser()
//   base44.analytics.track()
//
// Mas internamente faz chamadas fetch() para a API Express local.
// >>> NENHUMA PÁGINA PRECISA SER ALTERADA. <<<
// ═══════════════════════════════════════════════════════════════

const API_URL = import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('cp_token') || '';
}
function setToken(t) {
  if (t) localStorage.setItem('cp_token', t);
  else localStorage.removeItem('cp_token');
}

async function http(path, options = {}) {
  const opts = {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  };
  const token = getToken();
  if (token && !opts.headers.Authorization) {
    opts.headers.Authorization = 'Bearer ' + token;
  }
  if (options.body !== undefined) opts.body = JSON.stringify(options.body);
  const res = await fetch(API_URL + path, opts);
  if (res.status === 401 && !path.startsWith('/auth/login')) {
    setToken(null);
  }
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    const e = new Error(errBody.error || res.statusText);
    e.status = res.status;
    e.body = errBody;
    throw e;
  }
  if (res.status === 204) return null;
  return res.json();
}

const ENTITY_SLUGS = {
  Scheduling: 'schedulings', Transfer2082: 'transfers-2082', TransferDeposit: 'transfer-deposits',
  MoegaAnterior: 'moega-anterior', Quality: 'qualities', PileQuality: 'pile-qualities',
  BlendHistory: 'blend-history', Produtor: 'produtores', FazendaAtribuicao: 'fazenda-atribuicoes',
  FazendaChecklist: 'fazenda-checklists', TecnicoSustentabilidade: 'tecnicos',
  SustentabilidadeConfig: 'sustentabilidade-configs', Meeiro: 'meeiros', Supplier: 'suppliers',
  ContractBalance: 'contract-balances', MALote: 'ma-lotes', MABalanca: 'ma-balanca',
  MAExpedicao: 'ma-expedicoes', IndiretosCost: 'indiretos-costs', Project: 'projects',
  Sugestao: 'sugestoes', MB52: 'mb52', AppConfig: 'app-configs', TransactionLog: 'transaction-logs',
  User: 'users',
};
function buildEntity(name) {
  const resource = '/' + (ENTITY_SLUGS[name] || name.toLowerCase() + 's');
  return {
    list: async (sort, limit) => http(resource + '?sort=' + encodeURIComponent(sort || '') + '&limit=' + (limit || 100)),
    filter: async (query, sort, limit) =>
      http(resource + '/filter', { method: 'POST', body: { query, sort, limit } }),
    get: async (id) => http(resource + '/' + id),
    create: async (data) => http(resource, { method: 'POST', body: data }),
    update: async (id, data) => http(resource + '/' + id, { method: 'PUT', body: data }),
    delete: async (id) => http(resource + '/' + id, { method: 'DELETE' }),
    bulkCreate: async (items) => http(resource + '/bulk', { method: 'POST', body: items }),
    bulkUpdate: async (items) => http(resource + '/bulk', { method: 'PUT', body: items }),
    updateMany: async (query, op) =>
      http(resource + '/updatemany', { method: 'POST', body: { query, op } }),
    deleteMany: async (query) =>
      http(resource + '/deletemany', { method: 'POST', body: { query } }),
    subscribe: (cb) => { return () => {}; },
    schema: async () => http(resource + '/schema'),
  };
}

const ENTITY_NAMES = [
  'Scheduling', 'Transfer2082', 'Quality', 'PileQuality', 'MoegaAnterior',
  'TransferDeposit', 'Supplier', 'ContractBalance', 'IndiretosCost', 'Project',
  'Sugestao', 'Produtor', 'FazendaAtribuicao', 'FazendaChecklist', 'Meeiro',
  'TecnicoSustentabilidade', 'SustentabilidadeConfig', 'AppConfig', 'MB52',
  'MALote', 'MABalanca', 'MAExpedicao', 'BlendHistory', 'TransactionLog', 'User',
];

const entities = {};
ENTITY_NAMES.forEach((n) => { entities[n] = buildEntity(n); });

export const base44 = {
  entities,
  auth: {
    me: async () => http('/auth/me'),
    updateMe: async (data) => http('/auth/me', { method: 'PUT', body: data }),
    isAuthenticated: async () => {
      if (!getToken()) return false;
      try { await http('/auth/me'); return true; } catch { return false; }
    },
    login: async (email, password) => {
      const data = await http('/auth/login', { method: 'POST', body: { email, password } });
      setToken(data.token);
      return data.user;
    },
    logout: async (redirectUrl) => {
      setToken(null);
      http('/auth/logout', { method: 'POST' }).catch(() => {});
      if (redirectUrl) window.location.href = redirectUrl;
      else window.location.href = '/access';
    },
    redirectToLogin: (next) => {
      const dest = next ? '/access?next=' + encodeURIComponent(next) : '/access';
      window.location.href = dest;
    },
  },
  functions: {
    invoke: async (name, payload) => http('/functions/' + name, { method: 'POST', body: payload }),
  },
  integrations: {
    Core: new Proxy({}, {
      get: (_, endpoint) => async (data) => http('/integrations/' + String(endpoint), { method: 'POST', body: data }),
    }),
  },
  users: {
    inviteUser: async (email, role) => http('/users/invite', { method: 'POST', body: { email, role } }),
  },
  agents: {
    createConversation: async () => http('/agents/conversations', { method: 'POST', body: {} }),
    listConversations: async () => http('/agents/conversations'),
    getConversation: async (id) => http('/agents/conversations/' + id),
    addMessage: async (conv, msg) => http('/agents/conversations/' + (conv.id || conv) + '/messages', { method: 'POST', body: msg }),
    subscribeToConversation: () => () => {},
    getWhatsAppConnectURL: () => '#',
    getTelegramConnectURL: () => '#',
  },
  analytics: {
    track: async (event) => http('/analytics/track', { method: 'POST', body: event }).catch(() => {}),
  },
};
`;

const API_ENTITIES = `import { base44 } from './base44Client';
export const Query = base44.entities.Query;
export const User = base44.auth;
`;

const API_INTEGRATIONS = `import { base44 } from './base44Client';
export const Core = base44.integrations.Core;
export const InvokeLLM = base44.integrations.Core.InvokeLLM;
export const SendEmail = base44.integrations.Core.SendEmail;
export const UploadFile = base44.integrations.Core.UploadFile;
export const GenerateImage = base44.integrations.Core.GenerateImage;
export const ExtractDataFromUploadedFile = base44.integrations.Core.ExtractDataFromUploadedFile;
`;

// ─────────────────────────────────────────────────────────────
// src/lib/ — utils (sem referência a servidor Base44)
// ─────────────────────────────────────────────────────────────

const LIB_APP_PARAMS = `// Versão migrada — sem servidor Base44.
// Mantém export appParams para compatibilidade, mas sem server_url.
export const appParams = {
  appId: null,
  serverUrl: null,
  token: null,
  functionsVersion: null,
};
`;

const LIB_QUERY_CLIENT = `import { QueryClient } from '@tanstack/react-query';
export const queryClientInstance = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, staleTime: 60000, gcTime: 300000, retry: 2, retryDelay: 500 },
  },
});`;

const LIB_UTILS = `import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs) { return twMerge(clsx(inputs)); }
export const isIframe = window.self !== window.top;
`;

const LIB_IFRAME_MSG = `import { isIframe } from "./utils.js";
export function setupIframeMessaging() { /* no-op em produção local */ }
`;

// AuthContext local — NÃO importa @base44/sdk (que não existe no projeto migrado).
// Mesma interface do original: { user, isAuthenticated, isLoadingAuth, isLoadingPublicSettings,
// authError, logout, navigateToLogin, checkAppState }.
const LIB_AUTH_CONTEXT = `import React, { createContext, useState, useContext, useEffect } from 'react';
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

const UTILS_INDEX = `export function createPageUrl(pageName) {
  return '/' + pageName.toLowerCase().replace(/ /g, '-');
}
`;

// ─────────────────────────────────────────────────────────────
// Backend local (Express + PostgreSQL)
// ─────────────────────────────────────────────────────────────

const BACKEND_PACKAGE = `{
  "name": "central-pulse-backend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "node --watch server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.0",
    "jsonwebtoken": "^9.0.2",
    "pg": "^8.13.0"
  }
}
`;

const BACKEND_ENV = `# Conexão PostgreSQL local (porta 5433)
DATABASE_URL=postgresql://central_pulse_user:central_pulse_pass@localhost:5433/central_pulse
PORT=3000
`;

const BACKEND_README = `# Central Pulse — Backend Local

## Pré-requisitos
1. PostgreSQL rodando na porta 5433 (veja central_pulse_localhost.sql)
2. Node.js 18+

## Instalação
\`\`\`bash
cd backend
npm install
cp .env.example .env   # ajuste a senha se necessário
npm start
\`\`\`

A API sobe em http://localhost:3000/api

## Endpoints
- GET    /api/health
- CRUD   /api/<entity>s   (25 entidades)
- POST   /api/auth/me
- POST   /api/functions/:name
- POST   /api/integrations/:endpoint
`;

const MIGRATION_README = `# Central Pulse — Migração para Servidor Externo

Este ZIP contém o projeto COMPLETO já migrado do Base44 para um servidor
PostgreSQL local. Nenhuma página foi alterada — a mágica acontece no
\`src/api/base44Client.js\`, que foi reescrito para apontar para a API
Express local mantendo a MESMA interface (\`base44.entities.X.list()\`, etc.).

## Estrutura
\`\`\`
central-pulse/
├── index.html              # sem favicon/título do Base44
├── package.json            # sem @base44/sdk e @base44/vite-plugin
├── vite.config.js         # sem plugin do Base44
├── .env                    # VITE_LOCAL_API_URL
├── postcss.config.js
├── .gitignore
├── README.md  (este arquivo)
├── database/
│   ├── central_pulse_localhost.sql   # cria banco + usuário (porta 5433)
│   └── central_pulse_postgresql.sql  # somente estrutura
├── backend/
│   ├── server.js           # API Express com TODAS as 25 entidades
│   ├── package.json
│   ├── .env                # DATABASE_URL
│   └── README.md
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx
    ├── App.jsx             # (copiar do projeto original — sem alterações)
    ├── index.css
    ├── api/
    │   ├── base44Client.js # ← REESCRITO: aponta para API local
    │   ├── entities.js
    │   └── integrations.js
    ├── lib/
    │   ├── app-params.js   # ← sem server_url
    │   ├── query-client.js
    │   ├── utils.js
    │   └── iframe-messaging.js
    ├── hooks/
    │   └── use-mobile.jsx
    ├── utils/
    │   └── index.ts
    ├── components/          # (copiar do projeto original — sem alterações)
    │   └── ui/
    └── pages/               # (copiar do projeto original — sem alterações)
\`\`\`

## Passo a passo
1. **Banco:** execute \`database/central_pulse_localhost.sql\` no PostgreSQL.
2. **Backend:** \`cd backend && npm install && npm start\`
3. **Frontend:** copie do projeto original para este ZIP (sem alterações):
   - \`src/App.jsx\` e \`src/App.css\` (crie App.css vazio se não existir)
   - \`src/pages.config.js\`
   - a pasta \`src/pages/\` inteira — **EXCETO \`src/pages/Access.jsx\`** (use a versão deste ZIP, com login email+senha)
   - a pasta \`src/components/\` inteira (incluindo \`ui/\`)
   - \`src/lib/VisualEditAgent.jsx\`, \`src/lib/NavigationTracker.jsx\`,
     \`src/lib/PageNotFound.jsx\`
   - \`src/lib/profileConstants.js\`, \`src/lib/supplierNatureza.js\`,
     \`src/lib/centralPulseSQL.js\`, \`src/lib/centralPulseSQLLocal.js\`,
     \`src/lib/centralPulseFullMigration.js\`,
     \`src/lib/centralPulseMigrationScripts.js\`,
     \`src/lib/central_pulse_postgresql.sql\`
   ⚠️ NÃO sobrescreva estes com a versão original (versão deste ZIP é a correta):
     - \`src/api/base44Client.js\` → aponta para API local + gerencia JWT
     - \`src/lib/app-params.js\` → sem server_url do Base44
     - \`src/lib/AuthContext.jsx\` → versão local sem \`@base44/sdk\`
     - \`src/pages/Access.jsx\` → login com email+senha (não código por email)
4. \`npm install\` na raiz e \`npm run dev\`.

## Auth Local (login)
- O \`server.js\` auto-cria **admin@ofi.com / admin123** no primeiro startup.
- Login: email + senha → JWT (7 dias) em \`localStorage.cp_token\`.
- Perfis e roles (\`user.profile\`, \`user.role\`) funcionam idêntico ao produção:
  \`/api/auth/me\` retorna \`{ id, full_name, email, role, profile }\` e o
  \`Layout.jsx\` usa esses campos para montar o menu e checar \`isAdmin()\`.
- Criar usuários: tela de Gestão de Usuários (admin) ou \`POST /api/users/invite\`.

> As páginas NÃO referenciam o servidor Base44 — tudo passa pela API local.
`;

const PUBLIC_FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#860063"/><text x="16" y="22" font-size="18" font-family="Arial" font-weight="bold" fill="white" text-anchor="middle">CP</text></svg>`;

const MAIN_JSX = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/App.jsx';
import '@/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
`;

// index.css — tokens COMPLETOS (inclui chart + sidebar para shadcn ui/sidebar)
const INDEX_CSS = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 0 0% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 0 0% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 0 0% 3.9%;
    --primary: 0 0% 9%;
    --primary-foreground: 0 0% 98%;
    --secondary: 0 0% 96.1%;
    --secondary-foreground: 0 0% 9%;
    --muted: 0 0% 96.1%;
    --muted-foreground: 0 0% 45.1%;
    --accent: 0 0% 96.1%;
    --accent-foreground: 0 0% 9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 0 0% 89.8%;
    --input: 0 0% 89.8%;
    --ring: 0 0% 3.9%;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
    --radius: 0.5rem;
    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }
}

@layer base { * { @apply border-border outline-ring/50; } body { @apply bg-background text-foreground; } }

.base44-badge { display: none !important; }
`;

const TAILWIND_CONFIG = `/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      borderRadius: { lg: 'var(--radius)', md: 'calc(var(--radius) - 2px)', sm: 'calc(var(--radius) - 4px)' },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        muted: { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: { '1': 'hsl(var(--chart-1))', '2': 'hsl(var(--chart-2))', '3': 'hsl(var(--chart-3))', '4': 'hsl(var(--chart-4))', '5': 'hsl(var(--chart-5))' },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
`;

const HOOKS_USE_MOBILE = `import * as React from "react";
const MOBILE_BREAKPOINT = 768;
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(undefined);
  React.useEffect(() => {
    const mql = window.matchMedia(\`(max-width: \${MOBILE_BREAKPOINT - 1}px)\`);
    const onChange = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);
  return !!isMobile;
}
`;

// Páginas/components placeholder — README explicando que vêm do projeto original
const SRC_PAGES_README = `# Páginas (src/pages)

As páginas do projeto original NÃO precisam de alteração.
Elas continuam importando \`base44\` de \`@/api/base44Client\`, que agora
aponta para a API local. Copie todos os arquivos .jsx desta pasta do
projeto original para cá, mantendo a mesma estrutura.

Exemplo de uso (continua igual):
\`\`\`jsx
import { base44 } from "@/api/base44Client";
const items = await base44.entities.Scheduling.list();
\`\`\`
`;

const SRC_COMPONENTS_README = `# Componentes (src/components)

Copie todos os componentes (incluindo a pasta ui/ do shadcn) do projeto
original para cá. Eles não referenciam o servidor Base44 diretamente —
apenas usam a interface \`base44\` quando necessário, que já aponta para o local.
`;

const SRC_APP_PLACEHOLDER = `// App.jsx — copiar do projeto original.
// NÃO há referência ao servidor Base44; o roteamento e providers continuam iguais.
// Apenas certifique-se de que src/api/base44Client.js é a versão migrada deste ZIP.
export default function App() {
  return <div>Central Pulse — copie o App.jsx original aqui.</div>;
}
`;

// Access.jsx LOCAL — login com email + senha (NÃO usa código por email do Base44).
// Mesma identidade visual do original, valida @ofi.com, chama base44.auth.login().
const PAGES_ACCESS = `import React, { useState, useEffect } from "react";
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
// Montagem do ZIP
// ─────────────────────────────────────────────────────────────

const FILES = {
  // Raiz
  "README.md": MIGRATION_README,
  "package.json": ROOT_PACKAGE_JSON,
  "vite.config.js": ROOT_VITE_CONFIG,
  ".env": ROOT_ENV,
  ".gitignore": ROOT_GITIGNORE,
  "index.html": ROOT_INDEX_HTML,
  "postcss.config.js": ROOT_POSTCSS,
  "tailwind.config.js": TAILWIND_CONFIG,
  // Database
  "database/central_pulse_localhost.sql": CENTRAL_PULSE_SQL_LOCAL,
  "database/central_pulse_postgresql.sql": CENTRAL_PULSE_SQL,
  // Backend
  "backend/server.js": FULL_SERVER_JS,
  "backend/package.json": BACKEND_PACKAGE,
  "backend/.env": BACKEND_ENV,
  "backend/README.md": BACKEND_README,
  // public
  "public/favicon.svg": PUBLIC_FAVICON,
  // src
  "src/main.jsx": MAIN_JSX,
  "src/App.jsx": SRC_APP_PLACEHOLDER,
  "src/index.css": INDEX_CSS,
  "src/api/base44Client.js": API_BASE44_CLIENT,
  "src/api/entities.js": API_ENTITIES,
  "src/api/integrations.js": API_INTEGRATIONS,
  "src/lib/app-params.js": LIB_APP_PARAMS,
  "src/lib/query-client.js": LIB_QUERY_CLIENT,
  "src/lib/utils.js": LIB_UTILS,
  "src/lib/iframe-messaging.js": LIB_IFRAME_MSG,
  "src/lib/AuthContext.jsx": LIB_AUTH_CONTEXT,
  "src/hooks/use-mobile.jsx": HOOKS_USE_MOBILE,
  "src/utils/index.ts": UTILS_INDEX,
  "src/pages/README.md": SRC_PAGES_README,
  "src/pages/Access.jsx": PAGES_ACCESS,
  "src/components/README.md": SRC_COMPONENTS_README,
};

export async function buildProjectZip() {
  const zip = new JSZip();
  const root = zip.folder("central-pulse");
  Object.entries(FILES).forEach(([path, content]) => {
    root.file(path, content);
  });
  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
}

export const PROJECT_FILE_COUNT = Object.keys(FILES).length;