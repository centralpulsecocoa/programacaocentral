// Central Pulse — Scripts das Páginas já ALTERADOS para migração Localhost
// Contém os templates dos arquivos modificados prontos para download

// ===== 1. ARQUIVO .env =====
export const ENV_FILE = `# ============================================================
# CENTRAL PULSE — Variáveis de Ambiente (MIGRAÇÃO LOCALHOST)
# ============================================================
# Cole este conteúdo na raiz do projeto (mesma pasta do package.json)
# Reinicie o servidor (npm run dev) após salvar
# ============================================================

# URL da API local (Express + PostgreSQL)
VITE_LOCAL_API_URL=http://localhost:3000/api

# (Opcional) Manter o Base44 SDK durante a transição:
# VITE_USE_BASE44=false
`;

// ===== 2. api/apiClient.js (NOVO cliente HTTP para localhost) =====
export const APICLIENT_FILE = `// ============================================================
// api/apiClient.js — Cliente HTTP para API local (localhost)
// ============================================================
// Mantém a MESMA interface do SDK Base44 (base44.entities.X.*,
// base44.auth.*, base44.functions, base44.integrations.Core.*),
// mas fala direto com a API Express + PostgreSQL local.
// >>> NENHUMA PÁGINA PRECISA SER ALTERADA. <<<
// ============================================================

const API_URL = import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:3000/api';

function getToken() {
  return localStorage.getItem('cp_token') || '';
}
function setToken(t) {
  if (t) localStorage.setItem('cp_token', t);
  else localStorage.removeItem('cp_token');
}

async function request(path, options = {}) {
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

// Slugs kebab-case — DEVEM bater com as rotas geradas no server.js
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

function makeEntity(name) {
  const resource = '/' + (ENTITY_SLUGS[name] || name.toLowerCase() + 's');
  return {
    list: async (sort, limit) => {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', limit);
      const qs = params.toString();
      return request(resource + (qs ? '?' + qs : ''));
    },
    filter: async (query, sort, limit) =>
      request(resource + '/filter', { method: 'POST', body: { query, sort, limit } }),
    get: async (id) => request(resource + '/' + id),
    create: async (data) => request(resource, { method: 'POST', body: data }),
    update: async (id, data) => request(resource + '/' + id, { method: 'PUT', body: data }),
    delete: async (id) => request(resource + '/' + id, { method: 'DELETE' }),
    bulkCreate: async (items) => request(resource + '/bulk', { method: 'POST', body: items }),
    bulkUpdate: async (items) => request(resource + '/bulk', { method: 'PUT', body: items }),
    updateMany: async (query, op) =>
      request(resource + '/updatemany', { method: 'POST', body: { query, op } }),
    deleteMany: async (query) =>
      request(resource + '/deletemany', { method: 'POST', body: { query } }),
    subscribe: () => { return () => {}; },
    schema: async () => request(resource + '/schema'),
  };
}

const _entities = {};
Object.keys(ENTITY_SLUGS).forEach((n) => { _entities[n] = makeEntity(n); });

export const api = {
  entities: _entities,
  auth: {
    me: async () => request('/auth/me'),
    updateMe: async (data) => request('/auth/me', { method: 'PUT', body: data }),
    isAuthenticated: async () => {
      if (!getToken()) return false;
      try { await request('/auth/me'); return true; } catch { return false; }
    },
    login: async (email, password) => {
      const data = await request('/auth/login', { method: 'POST', body: { email, password } });
      setToken(data.token);
      return data.user;
    },
    logout: async (redirectUrl) => {
      setToken(null);
      request('/auth/logout', { method: 'POST' }).catch(() => {});
      if (redirectUrl) window.location.href = redirectUrl;
      else window.location.href = '/access';
    },
    redirectToLogin: (next) => {
      const dest = next ? '/access?next=' + encodeURIComponent(next) : '/access';
      window.location.href = dest;
    },
  },
  functions: {
    invoke: async (name, payload) => request('/functions/' + name, { method: 'POST', body: payload }),
  },
  integrations: {
    Core: new Proxy({}, {
      get: (_, endpoint) => async (data) => request('/integrations/' + String(endpoint), { method: 'POST', body: data }),
    }),
  },
  users: {
    inviteUser: async (email, role) => request('/users/invite', { method: 'POST', body: { email, role } }),
  },
  analytics: {
    track: async (event) => request('/analytics/track', { method: 'POST', body: event }).catch(() => {}),
  },
};

export default api;
`;

// ===== 3. api/base44Client.js (REESCREVE para apontar para localhost) =====
export const BASE44CLIENT_FILE = `// ============================================================
// api/base44Client.js — PONTE de compatibilidade (localhost)
// ============================================================
// Durante a migração, este arquivo REEXPORTA o novo cliente local
// para que as páginas antigas continuem funcionando sem alterar
// todos os imports de uma vez. Use 'api' em código novo.
// ============================================================

export { api as base44 } from "./apiClient";
export { default } from "./apiClient";
`;

// ===== 4. server.js (API Express de exemplo) =====
export const SERVER_FILE = `// ============================================================
// server.js — API Express para PostgreSQL local (CENTRAL PULSE)
// ============================================================
// Rode: node server.js  (porta 3000)
// Dependências: npm install express cors pg
// ============================================================
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com PostgreSQL local (use o script central_pulse_localhost.sql)
const pool = new Pool({
  user: "central_pulse_user",
  password: "central_pulse_pass",
  host: "localhost",
  port: 5433,
  database: "central_pulse",
});

// ====== Exemplo: /api/schedulings ======
app.get("/api/schedulings", async (req, res) => {
  const { sort, limit } = req.query;
  const order = sort ? \`ORDER BY \${sort.replace("-", " ")}\` : "";
  const lim = limit ? \`LIMIT \${parseInt(limit)}\` : "";
  const result = await pool.query(\`SELECT * FROM logistica.schedulings \${order} \${lim}\`);
  res.json(result.rows);
});

app.get("/api/schedulings/:id", async (req, res) => {
  const result = await pool.query("SELECT * FROM logistica.schedulings WHERE id = $1", [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: "Não encontrado" });
  res.json(result.rows[0]);
});

app.post("/api/schedulings", async (req, res) => {
  const { date, start_time, supplier, quantity_bags, warehouse, line } = req.body;
  const result = await pool.query(
    \`INSERT INTO logistica.schedulings (date, start_time, supplier, quantity_bags, warehouse, line)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *\`,
    [date, start_time, supplier, quantity_bags, warehouse, line]
  );
  res.status(201).json(result.rows[0]);
});

app.put("/api/schedulings/:id", async (req, res) => {
  const fields = Object.keys(req.body);
  const values = Object.values(req.body);
  const sets = fields.map((f, i) => \`\${f} = $\${i + 1}\`).join(", ");
  const result = await pool.query(
    \`UPDATE logistica.schedulings SET \${sets} WHERE id = $\${fields.length + 1} RETURNING *\`,
    [...values, req.params.id]
  );
  res.json(result.rows[0]);
});

app.delete("/api/schedulings/:id", async (req, res) => {
  await pool.query("DELETE FROM logistica.schedulings WHERE id = $1", [req.params.id]);
  res.status(204).send();
});

// ====== Repita o padrão acima para as demais 24 entidades ======

app.listen(3000, () => console.log("API Central Pulse rodando em http://localhost:3000"));
`;

// ===== 5. package.json do backend (API Express) =====
export const BACKEND_PACKAGE_JSON = `{
  "name": "central-pulse-api",
  "version": "1.0.0",
  "description": "API local do Central Pulse (Express + PostgreSQL)",
  "main": "server.js",
  "type": "commonjs",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "express": "^4.19.2",
    "pg": "^8.12.0"
  },
  "devDependencies": {
    "nodemon": "^3.1.4"
  }
}
`;

// ===== 6. .env do backend (string de conexão PostgreSQL) =====
export const BACKEND_ENV_FILE = `# ============================================================
# CENTRAL PULSE API — .env do backend (Express)
# ============================================================
# Cole na pasta da API (junto com o server.js)
# ============================================================

# Conexão com PostgreSQL local
DATABASE_URL=postgresql://central_pulse_user:central_pulse_pass@localhost:5433/central_pulse

# Configurações separadas (alternativa à DATABASE_URL)
PGUSER=central_pulse_user
PGPASSWORD=central_pulse_pass
PGHOST=localhost
PGPORT=5433
PGDATABASE=central_pulse

# Porta da API (deve bater com VITE_LOCAL_API_URL do front)
PORT=3000
`;

// ===== 7. Exemplo de página alterada (Calendar.jsx — trecho) =====
export const PAGE_EXAMPLE = `// ============================================================
// EXEMPLO — src/pages/Calendar.jsx (ANTES vs DEPOIS)
// ============================================================

// ❌ ANTES (Base44 SDK):
// import { base44 } from "@/api/base44Client";
// const data = await base44.entities.Scheduling.list("-date", 20);

// ✅ DEPOIS (API local):
// import { api } from "@/api/apiClient";
// const data = await api.entities.Scheduling.list("-date", 20);

// ============================================================
// Durante a migração, o base44Client.js já reexporta 'api',
// então o código antigo (base44.entities.Scheduling.list())
// CONTINUA FUNCIONANDO sem precisar editar cada página.
// ============================================================

// Use a página DocumentationExport.jsx como referência das
// 25 entidades e seus recursos na API local.
`;