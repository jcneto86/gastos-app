# Plano: Dashboard de Gastos com CRUD + SQLite

## Visão Geral

Transformar a SPA atual em um app completo com backend Node.js + Express, banco SQLite (arquivo local, sem servidor separado), duas páginas (CRUD + Dashboard), importação/exportação JSON, e um único comando para iniciar tudo.

## Arquitetura

```
gastos-app/
├── package.json
├── server/
│   ├── index.js              # Entry point do Express
│   ├── db.js                 # Inicializa SQLite + cria tabelas
│   ├── seed.js               # Popula dados de exemplo
│   └── routes/
│       ├── transactions.js   # CRUD transações
│       ├── categories.js     # CRUD categorias
│       └── import-export.js  # Import/export JSON
├── client/
│   ├── index.html            # Shell SPA (Vue + Bootstrap + Google Charts)
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── app.js            # Vue Router + criação do app
│       ├── api.js            # Serviço de chamadas HTTP (fetch)
│       ├── pages/
│       │   ├── dashboard.js  # Página Dashboard
│       │   └── management.js # Página CRUD
│       └── components/
│           ├── charts.js     # Funções de desenho dos gráficos
│           └── toast.js      # Componente de notificação
├── gastos.db                 # Banco SQLite (criado automaticamente)
└── README.md
```

## Etapas de Implementação

### Fase 1 — Estrutura do Projeto e Backend

#### 1.1 Criar `gastos-app/` e `package.json`
- `npm init -y`
- Instalar dependências:
  - `express` — servidor HTTP
  - `better-sqlite3` — driver SQLite síncrono e rápido
  - `cors` — cross-origin
  - `concurrently` — rodar backend + live-server juntos
  - `nodemon` — auto-reload
- Scripts:
  - `"dev": "concurrently \"nodemon server/index.js\" \"npx live-server client --port=3001 --quiet\""`
  - `"start": "node server/index.js"`
  - `"seed": "node server/seed.js"`

#### 1.2 Criar `server/db.js`
- Importar `better-sqlite3`
- Criar/open banco `gastos.db` na raiz do projeto
- Criar tabelas se não existirem:

```sql
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#C9CBCF',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  amount REAL NOT NULL,
  category TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
```

- Exportar instância do banco

#### 1.3 Criar `server/index.js`
- Criar app Express
- Usar `cors()`, `express.json()`
- Servir arquivos estáticos de `client/`
- Montar rotas: `/api/transactions`, `/api/categories`, `/api/import-export`
- Fallback para `index.html` (SPA routing)
- Escutar na porta 3000

### Fase 2 — Rotas da API

#### 2.1 Criar `server/routes/transactions.js`
- `GET /api/transactions` — listar com filtros (`?month=2024-01`, `?category=Alimentação`, `?search=super`)
- `GET /api/transactions/:id` — buscar por ID
- `POST /api/transactions` — criar
- `PUT /api/transactions/:id` — atualizar
- `DELETE /api/transactions/:id` — deletar
- `POST /api/transactions/bulk` — bulk insert (importação)

#### 2.2 Criar `server/routes/categories.js`
- `GET /api/categories` — listar todas
- `POST /api/categories` — criar
- `PUT /api/categories/:id` — atualizar
- `DELETE /api/categories/:id` — deletar

#### 2.3 Criar `server/routes/import-export.js`
- `GET /api/export` — exportar tudo (transactions + categories) como JSON
- `POST /api/import` — importar JSON com opção de merge ou substituir

### Fase 3 — Frontend (SPA com Vue.js)

#### 3.1 Criar `client/index.html`
- Shell com CDNs: Vue 3, Vue Router, Bootstrap 5, Google Charts
- Navbar: logo + links (Dashboard, Gerenciamento)
- `<div id="app"><router-view></router-view></div>`

#### 3.2 Criar `client/js/api.js`
- Objeto com funções que usam `fetch`:
  - `transactions.list(filters)`, `.get(id)`, `.create(data)`, `.update(id, data)`, `.delete(id)`, `.bulk(list)`
  - `categories.list()`, `.create(data)`, `.update(id, data)`, `.delete(id)`
  - `importExport.export()`, `.import(json, mode)`

#### 3.3 Criar `client/js/app.js`
- Vue Router com rotas:
  - `/` → Dashboard
  - `/gerenciamento` → CRUD

#### 3.4 Criar `client/js/pages/dashboard.js`
- Cards: Total Gasto, Média/Mês, Transações, Meses
- Dropdown: Todos, Últimos 6, mês individual
- Gráficos: Pizza, Evolução Mensal, Top 5, Gasto Diário
- Dados vêm da API (`GET /api/transactions`)

#### 3.5 Criar `client/js/pages/management.js`
- Tabela responsiva: data, valor, categoria, descrição, ações (editar/deletar)
- Filtros: busca por texto, por categoria, por mês
- Modal Bootstrap para criar/editar transação
- Modal para gerenciar categorias (criar/editar/deletar)
- Botões: Importar JSON, Exportar JSON, Nova Transação, Nova Categoria
- Toast de feedback

### Fase 4 — Dados de Exemplo e Testes

#### 4.1 Criar `server/seed.js`
- Deleta dados existentes
- Insere 7 categorias + 25 transações em 3 meses
- Roda com `npm run seed`

#### 4.2 Testar fluxo completo
- `npm run dev` — inicia tudo
- Testar CRUD completo na página de gerenciamento
- Testar filtros e gráficos no dashboard
- Testar importação/exportação JSON
- Testar persistência (recarregar → dados mantidos)

## Comandos

```bash
cd gastos-app
npm install
npm run seed      # opcional: popula dados de exemplo
npm run dev       # inicia backend (porta 3000) + frontend (porta 3001)

# Acessar: http://localhost:3000
```

## Dependências

| Pacote | Para quê |
|--------|----------|
| express | Servidor HTTP |
| better-sqlite3 | Banco SQLite (arquivo, sem servidor) |
| cors | Cross-origin |
| nodemon | Auto-reload (dev) |
| concurrently | Rodar backend + frontend juntos |

## Pré-requisitos

- [Node.js](https://nodejs.org/) (v18+)
- Nada mais. SQLite é um arquivo, sem instalação de banco.

## Dificuldade Estimada

| Fase | Dificuldade | Tempo |
|------|-------------|-------|
| 1 — Backend + SQLite | Fácil | 15 min |
| 2 — Rotas API | Média | 20 min |
| 3 — Frontend Vue | Média | 30 min |
| 4 — Seed + Testes | Fácil | 10 min |
| **Total** | | **~75 min** |
