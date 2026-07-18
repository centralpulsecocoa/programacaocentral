// Central Pulse — Script COMPLETO de Migração (Todas as Páginas + Entidades → Localhost)
// Gera um documento consolidado para download com todas as alterações necessárias

// ===== Lista das 25 ENTIDADES → endpoints da API local =====
export const ENTITIES_MAPPING = [
  { entity: "Scheduling", slug: "schedulings", table: "logistica.schedulings", endpoint: "/api/schedulings" },
  { entity: "Transfer2082", slug: "transfers-2082", table: "logistica.transfers_2082", endpoint: "/api/transfers-2082" },
  { entity: "TransferDeposit", slug: "transfer-deposits", table: "logistica.transfer_deposits", endpoint: "/api/transfer-deposits" },
  { entity: "MoegaAnterior", slug: "moega-anterior", table: "logistica.moega_anterior", endpoint: "/api/moega-anterior" },
  { entity: "Quality", slug: "qualities", table: "qualidade.qualities", endpoint: "/api/qualities" },
  { entity: "PileQuality", slug: "pile-qualities", table: "qualidade.pile_qualities", endpoint: "/api/pile-qualities" },
  { entity: "BlendHistory", slug: "blend-history", table: "qualidade.blend_history", endpoint: "/api/blend-history" },
  { entity: "Produtor", slug: "produtores", table: "sustentabilidade.produtores", endpoint: "/api/produtores" },
  { entity: "FazendaAtribuicao", slug: "fazenda-atribuicoes", table: "sustentabilidade.fazenda_atribuicoes", endpoint: "/api/fazenda-atribuicoes" },
  { entity: "FazendaChecklist", slug: "fazenda-checklists", table: "sustentabilidade.fazenda_checklists", endpoint: "/api/fazenda-checklists" },
  { entity: "TecnicoSustentabilidade", slug: "tecnicos", table: "sustentabilidade.tecnicos", endpoint: "/api/tecnicos" },
  { entity: "SustentabilidadeConfig", slug: "sustentabilidade-configs", table: "sustentabilidade.configs", endpoint: "/api/sustentabilidade-configs" },
  { entity: "Meeiro", slug: "meeiros", table: "sustentabilidade.meeiros", endpoint: "/api/meeiros" },
  { entity: "Supplier", slug: "suppliers", table: "cadastro.suppliers", endpoint: "/api/suppliers" },
  { entity: "ContractBalance", slug: "contract-balances", table: "cadastro.contract_balances", endpoint: "/api/contract-balances" },
  { entity: "MALote", slug: "ma-lotes", table: "cadastro.ma_lotes", endpoint: "/api/ma-lotes" },
  { entity: "MABalanca", slug: "ma-balanca", table: "cadastro.ma_balanca", endpoint: "/api/ma-balanca" },
  { entity: "MAExpedicao", slug: "ma-expedicoes", table: "cadastro.ma_expedicoes", endpoint: "/api/ma-expedicoes" },
  { entity: "IndiretosCost", slug: "indiretos-costs", table: "financeiro.indiretos_costs", endpoint: "/api/indiretos-costs" },
  { entity: "Project", slug: "projects", table: "financeiro.projects", endpoint: "/api/projects" },
  { entity: "Sugestao", slug: "sugestoes", table: "financeiro.sugestoes", endpoint: "/api/sugestoes" },
  { entity: "MB52", slug: "mb52", table: "sistema.mb52", endpoint: "/api/mb52" },
  { entity: "AppConfig", slug: "app-configs", table: "sistema.app_configs", endpoint: "/api/app-configs" },
  { entity: "TransactionLog", slug: "transaction-logs", table: "sistema.transaction_logs", endpoint: "/api/transaction-logs" },
  { entity: "User", slug: "users", table: "sistema.users", endpoint: "/api/users" },
];

// ===== Lista de TODAS as PÁGINAS do app que usam base44.entities =====
export const PAGES_USING_BASE44 = [
  { file: "src/pages/Dashboard.jsx", entities: ["Scheduling", "Supplier", "AppConfig"] },
  { file: "src/pages/Visao.jsx", entities: ["Scheduling", "Quality"] },
  { file: "src/pages/Monitor.jsx", entities: ["Scheduling", "AppConfig"] },
  { file: "src/pages/NewScheduling.jsx", entities: ["Scheduling", "Supplier", "AppConfig"] },
  { file: "src/pages/Calendar.jsx", entities: ["Scheduling", "Supplier", "AppConfig", "Quality"] },
  { file: "src/pages/ControleIndiretos.jsx", entities: ["IndiretosCost"] },
  { file: "src/pages/Transfer2082.jsx", entities: ["Transfer2082"] },
  { file: "src/pages/Quality.jsx", entities: ["Quality", "Scheduling"] },
  { file: "src/pages/MoegaAnterior.jsx", entities: ["MoegaAnterior"] },
  { file: "src/pages/TransferDeposits.jsx", entities: ["TransferDeposit"] },
  { file: "src/pages/PileQuality.jsx", entities: ["PileQuality", "BlendHistory"] },
  { file: "src/pages/SugestoesAdmin.jsx", entities: ["Sugestao"] },
  { file: "src/pages/DocumentationExport.jsx", entities: [] },
  { file: "src/pages/GestaoFazendas2.jsx", entities: ["Produtor", "FazendaAtribuicao"] },
  { file: "src/pages/ChecklistFazendas2.jsx", entities: ["FazendaChecklist", "Produtor"] },
  { file: "src/pages/ManualTecnico.jsx", entities: [] },
  { file: "src/pages/Meeiros.jsx", entities: ["Meeiro", "Produtor"] },
  { file: "src/pages/DashboardSustentabilidade.jsx", entities: ["Produtor", "FazendaAtribuicao", "FazendaChecklist"] },
  { file: "src/pages/DashboardTecnico.jsx", entities: ["FazendaAtribuicao", "FazendaChecklist", "Produtor"] },
  { file: "src/pages/ConfigGerais.jsx", entities: ["TecnicoSustentabilidade", "Produtor", "FazendaAtribuicao"] },
  { file: "src/pages/ConfigSustentabilidade.jsx", entities: ["SustentabilidadeConfig"] },
  { file: "src/pages/SustentabilidadeDados.jsx", entities: ["Produtor", "FazendaAtribuicao"] },
  { file: "src/pages/Tecnicos.jsx", entities: ["TecnicoSustentabilidade"] },
  { file: "src/pages/SaldoContratos.jsx", entities: ["ContractBalance", "Scheduling"] },
  { file: "src/pages/Projects.jsx", entities: ["Project"] },
  { file: "src/pages/Approvals.jsx", entities: ["Quality", "Scheduling", "Transfer2082"] },
  { file: "src/pages/History.jsx", entities: ["TransactionLog"] },
  { file: "src/pages/Reports.jsx", entities: ["Scheduling", "Quality", "Supplier", "PileQuality"] },
  { file: "src/pages/AllData.jsx", entities: ["Scheduling", "Quality", "Supplier", "IndiretosCost", "Project", "Sugestao"] },
  { file: "src/pages/AllTransfers2082.jsx", entities: ["Transfer2082"] },
  { file: "src/pages/Suppliers.jsx", entities: ["Supplier"] },
  { file: "src/pages/EmailSchedule.jsx", entities: ["Scheduling", "Supplier"] },
  { file: "src/pages/ReleaseManagement.jsx", entities: ["Scheduling", "Transfer2082"] },
  { file: "src/pages/Settings.jsx", entities: ["AppConfig"] },
  { file: "src/pages/UserManagement.jsx", entities: ["User"] },
  { file: "src/pages/Notifications.jsx", entities: ["AppConfig"] },
  { file: "src/pages/Transactions.jsx", entities: ["TransactionLog"] },
  { file: "src/pages/Workflow.jsx", entities: ["TransactionLog", "Scheduling"] },
  { file: "src/pages/Insights.jsx", entities: ["Scheduling", "Quality", "PileQuality"] },
  { file: "src/pages/MateriaAcabada.jsx", entities: ["MALote", "MABalanca", "MAExpedicao"] },
  { file: "src/pages/MateriaAcabadaUsuarios.jsx", entities: ["User"] },
  { file: "src/pages/MateriaAcabadaBalanca.jsx", entities: ["MABalanca"] },
  { file: "src/pages/MateriaAcabadaExpedicao.jsx", entities: ["MAExpedicao", "MALote"] },
  { file: "src/pages/MateriaAcabadaCalendarioExpedicao.jsx", entities: ["MAExpedicao"] },
  { file: "src/pages/MateriaAcabadaLiberacaoEmbarques.jsx", entities: ["MAExpedicao", "MALote"] },
  { file: "src/pages/MateriaAcabadaLotes.jsx", entities: ["MALote"] },
  { file: "src/pages/ExtractorPDF.jsx", entities: [] },
  { file: "src/pages/Sugestoes.jsx", entities: ["Sugestao"] },
  { file: "src/pages/SugestoesQR.jsx", entities: ["Sugestao"] },
  { file: "src/pages/InfograficoProjetos.jsx", entities: ["Project"] },
  { file: "src/pages/Produtores.jsx", entities: ["Produtor"] },
  { file: "src/pages/GestaoFazendas.jsx", entities: ["Produtor", "FazendaAtribuicao"] },
  { file: "src/pages/ChecklistFazendas.jsx", entities: ["FazendaChecklist", "Produtor", "FazendaAtribuicao"] },
  { file: "src/pages/ChecklistConfiguracao.jsx", entities: ["SustentabilidadeConfig"] },
  { file: "src/Layout.jsx", entities: ["Scheduling", "Supplier", "User"] },
];

// ===== Gera o server.js COMPLETO com TODOS os endpoints =====
function generateFullServerJS() {
  // Rotas no mesmo slug que o apiClient do front gera: '/' + name.toLowerCase() + 's'
  // (User tem handlers admin explícitos — excluído aqui)
  const entities = ENTITIES_MAPPING.filter((e) => e.entity !== "User");

  const endpoints = entities.map((e) => {
    const route = "/" + e.slug;
    const [schema, table] = e.table.split(".");
    return `
// ====== ${e.entity} → ${e.table} (rota ${route}) ======
app.get("${route}", requireAuth, async (req, res) => {
  try {
    const order = sanitizeSort(req.query.sort);
    const lim = req.query.limit ? parseInt(req.query.limit) : 100;
    const result = await pool.query(
      \`SELECT *, created_at AS created_date, updated_at AS updated_date FROM ${e.table} \${order} LIMIT $\${1}\`,
      [lim]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("${route}/filter", requireAuth, async (req, res) => {
  try {
    const { query, sort, limit } = req.body || {};
    const { conditions, values } = buildWhere(normalizeKeys(query || {}));
    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
    const order = sanitizeSort(sort);
    const lim = limit ? parseInt(limit) : 1000;
    const result = await pool.query(
      \`SELECT *, created_at AS created_date, updated_at AS updated_date FROM ${e.table} \${where} \${order} LIMIT $\${values.length + 1}\`,
      [...values, lim]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("${route}/schema", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT column_name AS name, data_type AS type, is_nullable, column_default AS default FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 ORDER BY ordinal_position",
      ["${schema}", "${table}"]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get("${route}/:id", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT *, created_at AS created_date, updated_at AS updated_date FROM ${e.table} WHERE id = $1",
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Não encontrado" });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("${route}", requireAuth, async (req, res) => {
  try {
    const cols = await getColumns("${e.table}");
    const body = pickColumns(stripReserved(req.body), cols);
    const fields = Object.keys(body);
    if (fields.length === 0) return res.status(400).json({ error: "Nenhum campo válido" });
    const values = Object.values(body);
    const colList = fields.map((f) => '"' + f + '"').join(", ");
    const placeholders = fields.map((_, i) => "$" + (i + 1)).join(", ");
    const result = await pool.query(
      \`INSERT INTO ${e.table} (\${colList}) VALUES (\${placeholders}) RETURNING *, created_at AS created_date, updated_at AS updated_date\`,
      values
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("${route}/:id", requireAuth, async (req, res) => {
  try {
    const cols = await getColumns("${e.table}");
    const body = pickColumns(stripReserved(req.body), cols);
    const fields = Object.keys(body);
    if (fields.length === 0) return res.json({ id: req.params.id });
    const values = Object.values(body);
    const sets = fields.map((f, i) => '"' + f + '" = $' + (i + 1)).join(", ");
    const result = await pool.query(
      \`UPDATE ${e.table} SET \${sets} WHERE id = $\${fields.length + 1} RETURNING *, created_at AS created_date, updated_at AS updated_date\`,
      [...values, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Não encontrado" });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete("${route}/:id", requireAuth, async (req, res) => {
  try {
    await pool.query("DELETE FROM ${e.table} WHERE id = $1", [req.params.id]);
    res.status(204).send();
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("${route}/bulk", requireAuth, async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body.items;
    if (!Array.isArray(items)) return res.status(400).json({ error: "Envie um array de itens" });
    const cols = await getColumns("${e.table}");
    const results = [];
    for (const item of items) {
      const body = pickColumns(stripReserved(item), cols);
      const fields = Object.keys(body);
      if (fields.length === 0) continue;
      const values = Object.values(body);
      const colList = fields.map((f) => '"' + f + '"').join(", ");
      const placeholders = fields.map((_, i) => "$" + (i + 1)).join(", ");
      const r = await pool.query(
        \`INSERT INTO ${e.table} (\${colList}) VALUES (\${placeholders}) RETURNING *, created_at AS created_date, updated_at AS updated_date\`,
        values
      );
      results.push(r.rows[0]);
    }
    res.status(201).json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put("${route}/bulk", requireAuth, async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : req.body.items;
    if (!Array.isArray(items)) return res.status(400).json({ error: "Envie um array de itens" });
    const cols = await getColumns("${e.table}");
    const results = [];
    for (const item of items) {
      if (!item.id) continue;
      const body = pickColumns(stripReserved(item), cols);
      delete body.id;
      const fields = Object.keys(body);
      if (fields.length === 0) continue;
      const values = Object.values(body);
      const sets = fields.map((f, i) => '"' + f + '" = $' + (i + 1)).join(", ");
      const r = await pool.query(
        \`UPDATE ${e.table} SET \${sets} WHERE id = $\${fields.length + 1} RETURNING *, created_at AS created_date, updated_at AS updated_date\`,
        [...values, item.id]
      );
      if (r.rows[0]) results.push(r.rows[0]);
    }
    res.json(results);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("${route}/updatemany", requireAuth, async (req, res) => {
  try {
    const { query, op } = req.body || {};
    const { conditions, values } = buildWhere(normalizeKeys(query || {}));
    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
    const setClauses = [];
    const setValues = [];
    let idx = values.length + 1;
    for (const [f, v] of Object.entries((op && op.$set) || {})) {
      setClauses.push('"' + f + '" = $' + idx++);
      setValues.push(v);
    }
    if (setClauses.length === 0) return res.json({ updated: 0 });
    const result = await pool.query(
      \`UPDATE ${e.table} SET \${setClauses.join(", ")} \${where} RETURNING id\`,
      [...values, ...setValues]
    );
    res.json({ updated: result.rowCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post("${route}/deletemany", requireAuth, async (req, res) => {
  try {
    const { query } = req.body || {};
    const { conditions, values } = buildWhere(normalizeKeys(query || {}));
    const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
    const result = await pool.query(\`DELETE FROM ${e.table} \${where} RETURNING id\`, values);
    res.json({ deleted: result.rowCount });
  } catch (err) { res.status(500).json({ error: err.message }); }
});`;
  }).join("\n");

  return `// ============================================================
// server.js — API Express COMPLETA (Central Pulse → PostgreSQL local)
// ============================================================
// Rode: node server.js  (porta 3000)
// Dependências: npm install express cors pg dotenv bcryptjs jsonwebtoken
// ============================================================
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com PostgreSQL local (script central_pulse_localhost.sql)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    "postgresql://central_pulse_user:central_pulse_pass@localhost:5433/central_pulse",
});

const JWT_SECRET = process.env.JWT_SECRET || "central-pulse-secret-change-me";

// ====== Helpers compartilhados (entidades) ======
const COLUMN_CACHE = {};
async function getColumns(table) {
  if (COLUMN_CACHE[table]) return COLUMN_CACHE[table];
  const [schema, name] = table.split(".");
  const r = await pool.query(
    "SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2",
    [schema, name]
  );
  COLUMN_CACHE[table] = r.rows.map((x) => x.column_name);
  return COLUMN_CACHE[table];
}
function stripReserved(obj) {
  const o = { ...(obj || {}) };
  delete o.id; delete o.created_date; delete o.updated_date;
  delete o.created_at; delete o.updated_at; delete o.created_by_id;
  return o;
}
function pickColumns(obj, cols) {
  const out = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (cols.includes(k)) out[k] = v;
  }
  return out;
}
function mapSortField(f) {
  if (f === "created_date") return "created_at";
  if (f === "updated_date") return "updated_at";
  return f;
}
function sanitizeSort(sort) {
  if (!sort) return "";
  let dir = "ASC";
  let field = String(sort);
  if (field.startsWith("-")) { dir = "DESC"; field = field.slice(1); }
  field = mapSortField(field);
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(field)) return "";
  return 'ORDER BY "' + field + '" ' + dir;
}
function normalizeKeys(q) {
  const out = {};
  for (const [k, v] of Object.entries(q || {})) {
    const nk = k === "created_date" ? "created_at" : k === "updated_date" ? "updated_at" : k;
    out[nk] = v;
  }
  return out;
}
function buildWhere(query, startIdx) {
  const conditions = [];
  const values = [];
  let idx = startIdx || 1;
  for (const [key, val] of Object.entries(query || {})) {
    if (key === "$or") {
      const parts = (val || []).map((sub) => {
        const b = buildWhere(normalizeKeys(sub), idx);
        idx = b.idx;
        values.push(...b.values);
        return "(" + (b.conditions.join(" AND ") || "TRUE") + ")";
      });
      conditions.push("(" + parts.join(" OR ") + ")");
    } else if (val && typeof val === "object" && !Array.isArray(val) && !(val instanceof Date)) {
      for (const [op, operand] of Object.entries(val)) {
        const sqlOp = ({ $gte: ">=", $lte: "<=", $gt: ">", $lt: "<", $ne: "<>" })[op] || "=";
        conditions.push('"' + key + '" ' + sqlOp + " $" + idx++);
        values.push(operand);
      }
    } else if (Array.isArray(val)) {
      conditions.push('"' + key + '" = ANY($" + idx++ + ")");
      values.push(val);
    } else {
      conditions.push('"' + key + '" = $" + idx++);
      values.push(val);
    }
  }
  return { conditions, values, idx };
}

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
${endpoints}

// ====== Functions: invocação genérica (reimplemente conforme necessário) ======
app.post("/api/functions/:name", requireAuth, async (req, res) => {
  const name = req.params.name;
  // TODO: reimplemente as backend functions do Base44 aqui (switch por nome).
  // Exemplos: sendDailyScheduleEmail, createSchedulingRecord, approveQualityRecord, etc.
  res.status(501).json({
    error: "Função '" + name + "' ainda não implementada no servidor local.",
    hint: "Adicione um case para esta função no handler POST /api/functions/:name do server.js",
  });
});

// ====== Integrations Core: stubs (substitua por integrações reais) ======
app.post("/api/integrations/:endpoint", requireAuth, async (req, res) => {
  const endpoint = req.params.endpoint;
  res.status(501).json({
    error: "Integração '" + endpoint + "' ainda não implementada.",
    hint: "OpenAI (InvokeLLM), Nodemailer (SendEmail), disco/S3 (UploadFile), etc.",
  });
});

// ====== Analytics: no-op (apenas registra) ======
app.post("/api/analytics/track", requireAuth, (req, res) => {
  console.log("[analytics]", req.body && req.body.eventName);
  res.json({ ok: true });
});

// ====== Agents: stubs (sem IA no servidor local) ======
app.get("/api/agents/conversations", requireAuth, (req, res) => res.json([]));
app.post("/api/agents/conversations", requireAuth, (req, res) => res.json({ id: "stub", messages: [] }));
app.get("/api/agents/conversations/:id", requireAuth, (req, res) => res.json({ id: req.params.id, messages: [] }));
app.post("/api/agents/conversations/:id/messages", requireAuth, (req, res) => res.json({ ok: true }));

// ====== Healthcheck ======
app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(\`API Central Pulse rodando em http://localhost:\${PORT}\`));
`;
}

// ===== Gera o documento de migração de TODAS as páginas =====
function generatePagesMigrationDoc() {
  const pagesList = PAGES_USING_BASE44.map((p) => {
    if (p.entities.length === 0) {
      return `  ▸ ${p.file}
    (não usa base44.entities diretamente — nenhuma alteração necessária)`;
    }
    const entityLines = p.entities.map(
      (e) => `    base44.entities.${e}.*  →  api.entities.${e}.*`
    );
    return `  ▸ ${p.file}
    ANTES:  import { base44 } from "@/api/base44Client";
    DEPOIS: import { api } from "@/api/apiClient";
${entityLines.join("\n")}`;
  }).join("\n\n");

  return `====================================================================
CENTRAL PULSE — Migração de TODAS as Páginas para Servidor Local
====================================================================

RESUMO: ${PAGES_USING_BASE44.length} páginas identificadas, ${ENTITIES_MAPPING.length} entidades mapeadas

ESTRATÉGIA DE MIGRAÇÃO (2 OPÇÕES):
--------------------------------------------------------------------

OPÇÃO A — Migração automática (RECOMENDADA, zero alteração nas páginas):
  1. Substitua o conteúdo de src/api/base44Client.js pelo reexport:
       export { api as base44 } from "./apiClient";
  2. Crie o arquivo src/api/apiClient.js (ver download separado).
  3. Todas as páginas continuam usando base44.entities.X sem mudança.

OPÇÃO B — Migração explícita (edição página por página):
  Trocar em cada arquivo:
    ANTES:  import { base44 } from "@/api/base44Client";
    DEPOIS: import { api } from "@/api/apiClient";
  E todas as chamadas:
    ANTES:  base44.entities.Scheduling.list()
    DEPOIS: api.entities.Scheduling.list()

====================================================================
PÁGINAS E SUAS ENTIDADES (${PAGES_USING_BASE44.length} arquivos)
====================================================================

${pagesList}

====================================================================
ENTIDADES → ENDPOINTS DA API LOCAL (${ENTITIES_MAPPING.length} entidades)
====================================================================

${ENTITIES_MAPPING.map((e) => `  ${e.entity.padEnd(28)} → ${e.endpoint.padEnd(32)} (tabela: ${e.table})`).join("\n")}

====================================================================
BACKEND FUNCTIONS QUE PRECISAM SER REIMPLEMENTADAS
====================================================================
  As seguintes funções existem no Base44 e precisam de endpoints
  equivalentes na API local:

  - createSchedulingRecord        → POST /api/schedulings (já coberto)
  - createQualityRecord            → POST /api/qualities (já coberto)
  - approveQualityRecord           → PUT /api/qualities/:id/approve
  - qualityEmailAction             → POST /api/emails/quality-action
  - sendQualityAlert               → POST /api/emails/quality-alert
  - getIndiretosCosts              → GET /api/indiretos-costs (já coberto)
  - getLineConfigs                 → GET /api/app-configs?type=line
  - getSuppliers                   → GET /api/suppliers (já coberto)
  - getTecnicoProdutores            → GET /api/produtores?tecnico=:email
  - updateEntityRecord             → PUT /api/:resource/:id (genérico)
  - logTransaction                 → POST /api/transaction-logs (já coberto)
  - scheduledEmailSender           → cron job no servidor
  - sendDailyScheduleEmail         → POST /api/emails/daily-schedule
  - sendDailyUpdateEmail           → POST /api/emails/daily-update
  - sendDataSquadEmail             → POST /api/emails/data-squad
  - sendOriginationDecision        → POST /api/emails/origination-decision
  - extractDocumentData            → POST /api/integrations/extract-document
  - powerBIDataExport              → POST /api/exports/powerbi
  - uploadInsightsImage            → POST /api/integrations/upload-image

====================================================================
INTEGRAÇÕES CORE QUE PRECISAM DE ALTERNATIVAS LOCAIS
====================================================================
  - InvokeLLM        → OpenAI API direta (OPENAI_API_KEY no .env)
  - GenerateImage    → OpenAI DALL-E ou Stable Diffusion
  - GenerateVideo    → Google Veo (mantém no Base44 ou integração direta)
  - GenerateSpeech   → Azure TTS ou Google TTS
  - TranscribeAudio  → OpenAI Whisper
  - UploadFile       → salvar em disco (/uploads) ou S3
  - SendEmail        → Nodemailer + SMTP
  - ExtractDataFromUploadedFile → Apache Tika ou similar

====================================================================
CHECKLIST DE MIGRAÇÃO
====================================================================
  [ ] 1. PostgreSQL instalado e rodando (porta 5433)
  [ ] 2. Script SQL executado: psql -f central_pulse_localhost.sql
  [ ] 3. Backend: npm install (pasta da API)
  [ ] 4. Backend: .env configurado com DATABASE_URL
  [ ] 5. Backend: node server.js (porta 3000)
  [ ] 6. Front: .env com VITE_LOCAL_API_URL=http://localhost:3000/api
  [ ] 7. Front: src/api/apiClient.js criado
  [ ] 8. Front: src/api/base44Client.js reescrito (reexport)
  [ ] 9. Testar: curl http://localhost:3000/api/health
  [ ] 10. Testar: front carrega e lista dados do PostgreSQL local
  [ ] 11. Reimplementar backend functions (emails, LLM, etc)
  [ ] 12. Configurar auth local (JWT/sessão) — Base44 auth não funciona local
`;
}

// ===== Exporta o documento completo concatenado =====
export const FULL_MIGRATION_DOC = generatePagesMigrationDoc();

// ===== Exporta o server.js COMPLETO com todas as entidades =====
export const FULL_SERVER_JS = generateFullServerJS();

// ===== Exporta o apiClient.js completo (já existente no módulo anterior) =====
export { APICLIENT_FILE, BASE44CLIENT_FILE, ENV_FILE, BACKEND_PACKAGE_JSON, BACKEND_ENV_FILE } from "./centralPulseMigrationScripts";