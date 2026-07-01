# Plano de Melhorias — Gastos Pessoais

## Visão Geral

Melhorias propostas para o app `gastos-app`, abrangendo segurança, arquitetura, UX e novas funcionalidades. Cada seção mostra o **antes** (código atual) e **depois** (código proposto).

---

## Índice

1. [Middleware Global de Erro](#1-middleware-global-de-erro)
2. [Rate Limiting](#2-rate-limiting)
3. [Validação Centralizada](#3-validação-centralizada)
4. [Refatorar `WHERE 1=1`](#4-refatorar-where-11)
5. [`saveDB()` Assíncrono](#5-savedb-assíncrono)
6. [Loading States no Frontend](#6-loading-states-no-frontend)
7. [Tratamento de Erro no Frontend](#7-tratamento-de-erro-no-frontend)
8. [Modo Escuro](#8-modo-escuro)
9. [Ordenação na Tabela](#9-ordenação-na-tabela)
10. [Transações Recorrentes](#10-transações-recorrentes)
11. [Orçamento por Categoria](#11-orçamento-por-categoria)
12. [Importação CSV](#12-importação-csv)
13. [Backup Automático](#13-backup-automático)

---

## 1. Middleware Global de Erro

**Problema:** Se uma rota lança uma exceção não tratada, o Express retorna 500 sem corpo e o processo pode ficar instável.

**Antes** (`server/index.js`):

```js
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '..', 'client')));
app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api', importExportRouter);
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});
```

**Depois**:

```js
// Antes das rotas
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Depois das rotas (inclusive do fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

// Global error handler — 4 parâmetros
app.use((err, req, res, next) => {
  console.error('[ERRO]', err.stack || err.message || err);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
  });
});
```

**Arquivos afetados:** `server/index.js`

---

## 2. Rate Limiting

**Problema:** Nenhuma proteção contra abuso — um cliente pode fazer milhares de requisições por segundo.

**Antes** (`server/index.js`):

```js
app.use(cors());
app.use(express.json({ limit: '10mb' }));
```

**Depois** (instalar `npm install express-rate-limit`):

```js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,                  // 200 requisições por janela
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
});

app.use(limiter);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
```

**Arquivos afetados:** `server/index.js`, `package.json` (nova dependência)

---

## 3. Validação Centralizada

**Problema:** Validação de `date`, `amount` e `category` é repetida manualmente em `POST` e `PUT` de transações. Código duplicado e propenso a esquecimento.

**Antes** (`server/routes/transactions.js`):

```js
router.post('/', (req, res) => {
  const { date, amount, category, description } = req.body;

  if (!date || !DATE_RE.test(date)) {
    return res.status(400).json({ error: 'Data inválida. Use o formato AAAA-MM-DD' });
  }
  if (amount == null || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'Valor deve ser um número positivo' });
  }
  if (!category || typeof category !== 'string') {
    return res.status(400).json({ error: 'Categoria é obrigatória' });
  }
  // ... continua
});

router.put('/:id', (req, res) => {
  // mesma validação repetida
});
```

**Depois**:

Criar `server/validation.js`:

```js
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateTransaction(body) {
  const errors = [];
  const { date, amount, category, description } = body || {};

  if (!date || !DATE_RE.test(date)) {
    errors.push('Data inválida. Use o formato AAAA-MM-DD');
  }
  if (amount == null || typeof amount !== 'number' || amount <= 0) {
    errors.push('Valor deve ser um número positivo');
  }
  if (!category || typeof category !== 'string') {
    errors.push('Categoria é obrigatória');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: { date, amount, category, description: description || '' },
  };
}

function validateCategory(body) {
  const errors = [];
  const { name, color } = body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('Campo obrigatório: name');
  }
  return {
    valid: errors.length === 0,
    errors,
    data: { name: name?.trim(), color: color || '#C9CBCF' },
  };
}

module.exports = { validateTransaction, validateCategory };
```

Uso nas rotas:

```js
const { validateTransaction } = require('../validation');

router.post('/', (req, res) => {
  const { valid, errors, data } = validateTransaction(req.body);
  if (!valid) return res.status(400).json({ error: errors.join('; ') });

  const db = getDB();
  db.run(
    'INSERT INTO transactions (date, amount, category, description) VALUES (?, ?, ?, ?)',
    [data.date, data.amount, data.category, data.description]
  );
  saveDB();
  // ...
});

router.put('/:id', (req, res) => {
  const existing = queryOne('SELECT id FROM transactions WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Não encontrado' });

  const { valid, errors, data } = validateTransaction(req.body);
  if (!valid) return res.status(400).json({ error: errors.join('; ') });

  // ... update
});
```

**Arquivos afetados:** `server/validation.js` (novo), `server/routes/transactions.js`, `server/routes/categories.js`

---

## 4. Refatorar `WHERE 1=1`

**Problema:** Padrão `WHERE 1=1` é frágil e considerado má prática — se esquecer um espaço ou `AND` quebra a query.

**Antes** (`server/routes/transactions.js`):

```js
let where = 'WHERE 1=1';
const params = [];

if (month) {
  where += ' AND date LIKE ?';
  params.push(month + '%');
}
if (category) {
  where += ' AND category = ?';
  params.push(category);
}
if (search) {
  where += ' AND (description LIKE ? OR category LIKE ?)';
  params.push(`%${search}%`, `%${search}%`);
}
```

**Depois**:

```js
const conditions = [];
const params = [];

if (month) {
  conditions.push('date LIKE ?');
  params.push(month + '%');
}
if (category) {
  conditions.push('category = ?');
  params.push(category);
}
if (search) {
  conditions.push('(description LIKE ? OR category LIKE ?)');
  params.push(`%${search}%`, `%${search}%`);
}

const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
```

**Arquivos afetados:** `server/routes/transactions.js`

---

## 5. `saveDB()` Assíncrono

**Problema:** `fs.writeFileSync` bloqueia o event loop do Node.js a cada save, podendo causar travamentos com muitos dados.

**Antes** (`server/db.js`):

```js
function saveDB() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}
```

**Depois**:

```js
const fs = require('fs/promises');

async function saveDB() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  await fs.writeFile(DB_PATH, buffer);
}

// Quem chama saveDB() precisa usar await:
// await saveDB();
```

Ajustar todas as chamadas de `saveDB()` nas rotas para `await saveDB()` e marcar os handlers como `async`.

**Arquivos afetados:** `server/db.js`, `server/routes/transactions.js`, `server/routes/categories.js`, `server/routes/import-export.js`

---

## 6. Loading States no Frontend

**Problema:** As chamadas à API não mostram feedback visual de carregamento — o usuário vê uma tela parada até os dados chegarem.

**Antes** (`client/js/pages/management.js` — exemplo):

```js
async function loadTransactions() {
  try {
    const data = await API.transactions.list(filters);
    transactions.value = Array.isArray(data) ? data : data.data || [];
  } catch (e) {
    showToast(e.message, 'error');
  }
}
```

**Depois**:

```js
const loading = Vue.ref(false);

async function loadTransactions() {
  loading.value = true;
  try {
    const data = await API.transactions.list(filters);
    transactions.value = Array.isArray(data) ? data : data.data || [];
  } catch (e) {
    showToast(e.message, 'error');
  } finally {
    loading.value = false;
  }
}
```

No template, adicionar um spinner enquanto carrega:

```html
<div v-if="loading" class="text-center py-4">
  <div class="spinner-border text-primary" role="status">
    <span class="visually-hidden">Carregando...</span>
  </div>
</div>
<div v-else>
  <!-- conteúdo real -->
</div>
```

**Arquivos afetados:** `client/js/pages/dashboard.js`, `client/js/pages/management.js`

---

## 7. Tratamento de Erro no Frontend

**Problema:** Se a API estiver offline ou retornar erro inesperado, o `catch` simplesmente mostra um toast. Não há fallback nem retry.

**Antes** (`client/js/api.js`):

```js
async request(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Erro na requisição');
  }
  return res.json();
},
```

**Depois** — adicionar retry automático e timeout:

```js
async request(url, options = {}, retries = 2) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        ...options,
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || 'Erro na requisição');
      }
      return res.json();
    } catch (e) {
      clearTimeout(timeout);
      if (attempt === retries || e.name === 'AbortError') throw e;
      // espera 1s antes de tentar de novo
      await new Promise(r => setTimeout(r, 1000));
    }
  }
},
```

**Arquivos afetados:** `client/js/api.js`

---

## 8. Modo Escuro

**Problema:** Tema claro fixo sem preferência do sistema.

**Antes** (`client/index.html`):

```html
<html lang="pt-BR">
```

**Depois** — adicionar detecção de preferência e toggle:

No `<head>` do `index.html`:

```html
<script>
  // Aplica tema antes do render para evitar flash
  const theme = localStorage.getItem('theme')
    || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-bs-theme', theme);
</script>
```

Botão de toggle na navbar:

```html
<button class="btn btn-sm btn-outline-secondary" onclick="toggleTheme()">
  🌓
</button>
```

Função global:

```js
function toggleTheme() {
  const html = document.documentElement;
  const current = html.getAttribute('data-bs-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-bs-theme', next);
  localStorage.setItem('theme', next);
}
```

Ajustes no `client/css/style.css` para usar variáveis CSS do Bootstrap (já compatível com `data-bs-theme`).

**Arquivos afetados:** `client/index.html`, `client/css/style.css`

---

## 9. Ordenação na Tabela

**Problema:** A tabela de transações no gerenciamento é ordenada apenas por data decrescente. O usuário não pode ordenar por valor, categoria, etc.

**Antes** (`client/js/pages/management.js`):

```js
// Sem ordenação — dados retornam na ordem da API (date DESC)
```

**Depois** — adicionar estado de ordenação e função de comparação:

```js
const sortKey = Vue.ref('date');
const sortDir = Vue.ref('desc');

function setSort(key) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
  } else {
    sortKey.value = key;
    sortDir.value = 'asc';
  }
}

const sortedTransactions = Vue.computed(() => {
  const arr = [...transactions.value];
  arr.sort((a, b) => {
    let cmp = 0;
    if (sortKey.value === 'amount') {
      cmp = a.amount - b.amount;
    } else if (sortKey.value === 'date') {
      cmp = a.date.localeCompare(b.date);
    } else if (sortKey.value === 'category') {
      cmp = a.category.localeCompare(b.category);
    } else if (sortKey.value === 'description') {
      cmp = (a.description || '').localeCompare(b.description || '');
    }
    return sortDir.value === 'asc' ? cmp : -cmp;
  });
  return arr;
});
```

No template, usar `sortedTransactions.value` no lugar de `transactions.value`.

**Arquivos afetados:** `client/js/pages/management.js`

---

## 10. Transações Recorrentes

**Problema:** Transações fixas (aluguel, assinaturas) precisam ser criadas manualmente todo mês.

**Implementação:**

Nova tabela no `server/db.js`:

```sql
CREATE TABLE IF NOT EXISTS recurring (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  day INTEGER NOT NULL,         -- dia do mês (1-31)
  frequency TEXT DEFAULT 'monthly',  -- monthly, yearly
  active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
```

Nova rota `server/routes/recurring.js`:

```
GET    /api/recurring          — listar recorrentes
POST   /api/recurring          — criar
PUT    /api/recurring/:id      — atualizar
DELETE /api/recurring/:id      — deletar
```

Serviço agendado (`setInterval`) que roda todo dia e gera transações pendentes:

```js
// Em server/index.js, após iniciar
const { processRecurring } = require('./routes/recurring');
setInterval(processRecurring, 6 * 60 * 60 * 1000); // a cada 6h
processRecurring(); // roda na inicialização
```

Função `processRecurring`:

```js
async function processRecurring() {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const todayDay = today.getDate();
  const monthStr = todayStr.slice(0, 7);

  const items = queryAll(
    'SELECT * FROM recurring WHERE active = 1 AND day <= ?',
    [todayDay]
  );

  for (const item of items) {
    // Verifica se já foi gerada este mês
    const exists = queryOne(
      'SELECT id FROM transactions WHERE description = ? AND date LIKE ?',
      [item.description, monthStr + '%']
    );
    if (exists) continue;

    const date = `${monthStr}-${String(item.day).padStart(2, '0')}`;
    const db = getDB();
    db.run(
      'INSERT INTO transactions (date, amount, category, description) VALUES (?, ?, ?, ?)',
      [date, item.amount, item.category, '[Recorrente] ' + item.description]
    );
    await saveDB();
  }
}
```

Frontend: nova seção "Transações Recorrentes" na página de gerenciamento, com tabela e modal para criar/editar.

**Arquivos afetados:** `server/db.js`, `server/index.js`, `server/routes/recurring.js` (novo), `client/js/api.js`, `client/js/pages/management.js`

---

## 11. Orçamento por Categoria

**Problema:** Não há limite de gasto — o usuário só descobre que gastou muito depois de gastar.

**Implementação:**

Nova tabela:

```sql
CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL UNIQUE,
  limit_amount REAL NOT NULL,
  month TEXT NOT NULL,  -- formato YYYY-MM
  created_at TEXT DEFAULT (datetime('now'))
);
```

Nova rota `server/routes/budgets.js`:

```
GET    /api/budgets            — listar orçamentos do mês (ou ?month=...)
POST   /api/budgets            — criar/atualizar orçamento
DELETE /api/budgets/:id        — deletar
GET    /api/budgets/status     — retorna gasto atual vs limite por categoria
```

Função de status:

```js
router.get('/status', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const budgets = queryAll('SELECT * FROM budgets WHERE month = ?', [month]);
  const spent = queryAll(
    'SELECT category, SUM(amount) as total FROM transactions WHERE date LIKE ? GROUP BY category',
    [month + '%']
  );

  const result = budgets.map(b => {
    const s = spent.find(x => x.category === b.category);
    const total = s ? s.total : 0;
    return {
      ...b,
      spent: total,
      remaining: b.limit_amount - total,
      percent: Math.round((total / b.limit_amount) * 100),
    };
  });
  res.json(result);
});
```

Frontend:
- Na dashboard, se houver orçamentos, mostrar barras de progresso ao lado de cada categoria no gráfico de pizza
- Na página de gerenciamento, seção "Orçamentos" com formulário para definir limites por categoria/mês
- Se o gasto ultrapassar 80%, destacar em amarelo; se ultrapassar 100%, em vermelho

**Arquivos afetados:** `server/db.js`, `server/routes/budgets.js` (novo), `server/index.js`, `client/js/api.js`, `client/js/pages/dashboard.js`, `client/js/pages/management.js`

---

## 12. Importação CSV

**Problema:** Só é possível importar JSON, mas muitos bancos e apps exportam CSV.

**Implementação:**

Nova rota `POST /api/import/csv` em `server/routes/import-export.js`:

```js
router.post('/import/csv', (req, res) => {
  const { csv } = req.body; // string CSV
  if (!csv || typeof csv !== 'string') {
    return res.status(400).json({ error: 'Campo csv é obrigatório' });
  }

  const lines = csv.trim().split('\n');
  if (lines.length < 2) {
    return res.status(400).json({ error: 'CSV vazio' });
  }

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const dateIdx = headers.indexOf('date');
  const amountIdx = headers.indexOf('amount');
  const categoryIdx = headers.indexOf('category');
  const descIdx = headers.indexOf('description');

  if (dateIdx === -1 || amountIdx === -1 || categoryIdx === -1) {
    return res.status(400).json({ error: 'Colunas obrigatórias: date, amount, category' });
  }

  const db = getDB();
  let count = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',').map(c => c.trim());
    const date = cols[dateIdx];
    const amount = parseFloat(cols[amountIdx]);
    const category = cols[categoryIdx];
    const description = descIdx !== -1 ? cols[descIdx] || '' : '';

    if (!date || isNaN(amount) || amount <= 0 || !category) continue;

    db.run(
      'INSERT INTO transactions (date, amount, category, description) VALUES (?, ?, ?, ?)',
      [date, amount, category, description]
    );
    count++;
  }

  saveDB();
  res.json({ imported: count });
});
```

Frontend: adicionar botão "Importar CSV" que abre um modal com `<textarea>` para colar CSV ou `<input type="file">` para upload.

**Arquivos afetados:** `server/routes/import-export.js`, `client/js/api.js`, `client/js/pages/management.js`

---

## 13. Backup Automático

**Problema:** O `gastos.db` é um arquivo único. Se corromper (ex: queda de energia durante writeFileSync), todos os dados são perdidos.

**Implementação:**

Em `server/db.js`, adicionar função de backup:

```js
const path = require('path');
const fs = require('fs/promises');

const BACKUP_DIR = path.join(__dirname, '..', 'backups');

async function backupDB() {
  if (!db) return;
  if (!fs.existsSync(BACKUP_DIR)) {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  }

  const today = new Date().toISOString().slice(0, 10);
  const backupPath = path.join(BACKUP_DIR, `gastos_${today}.db`);

  // Só faz backup 1x por dia
  try {
    await fs.access(backupPath);
    return; // já existe backup de hoje
  } catch {
    // não existe, criar
  }

  const data = db.export();
  const buffer = Buffer.from(data);
  await fs.writeFile(backupPath, buffer);
  console.log(`Backup criado: ${backupPath}`);
}
```

Agendar no `initDB()`:

```js
// Backup diário
backupDB(); // na inicialização
setInterval(backupDB, 24 * 60 * 60 * 1000).unref(); // a cada 24h
```

**Arquivos afetados:** `server/db.js`

---

## Prioridade e Esforço

| # | Melhoria | Prioridade | Esforço | Dependências |
|---|----------|-----------|---------|--------------|
| 1 | Middleware global de erro | Alta | 5 min | Nenhuma |
| 2 | Rate limiting | Alta | 5 min | `express-rate-limit` |
| 3 | Validação centralizada | Média | 15 min | Nenhuma |
| 4 | Refatorar `WHERE 1=1` | Média | 10 min | Nenhuma |
| 5 | `saveDB()` assíncrono | Média | 15 min | Nenhuma |
| 6 | Loading states | Média | 20 min | Nenhuma |
| 7 | Tratamento de erro + retry | Média | 15 min | Nenhuma |
| 8 | Modo escuro | Baixa | 15 min | Bootstrap 5 |
| 9 | Ordenação na tabela | Baixa | 20 min | Nenhuma |
| 10 | Transações recorrentes | Baixa | 45 min | #5 |
| 11 | Orçamento por categoria | Baixa | 40 min | #5 |
| 12 | Importação CSV | Baixa | 30 min | Nenhuma |
| 13 | Backup automático | Média | 15 min | #5 |
