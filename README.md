# Gastos Pessoais

Dashboard de gastos pessoais com CRUD completo, gráficos interativos e persistência em SQLite.

## Como executar

```bash
# 1. Instalar dependências
cd gastos-app
npm install

# 2. Popular dados de exemplo (opcional)
npm run seed

# 3. Iniciar o app
npm run dev
```

O app ficará disponível em **http://localhost:3000** (frontend + API).

## Como funciona

### Páginas

**Dashboard** (`/`)
- Cards de resumo: total gasto, média/mês, quantidade de transações e meses
- Filtro por período: todos, últimos 6 meses, ou mês específico
- Gráfico de pizza com distribuição por categoria
- Lista de categorias com valor e percentual (clica para destacar no gráfico)
- Gráfico de evolução mensal (colunas)
- Top 5 maiores gastos (barras horizontais)
- Gráfico de gasto diário

**Gerenciamento** (`/gerenciamento`)
- Tabela com todas as transações (data, descrição, categoria, valor)
- Filtros: busca por texto, por categoria, por mês
- Criar, editar e deletar transações via modal
- Criar, editar e deletar categorias com seletor de cor
- Importar JSON (merge com dados existentes)
- Exportar JSON (todos os meses ou mês específico via dropdown)

### Banco de dados

SQLite via `sql.js` (WebAssembly). O banco é um arquivo `gastos.db` criado automaticamente na primeira execução. Sem necessidade de instalar banco separado.

Tabelas:
- `categories` — id, name (único), color, created_at
- `transactions` — id, date, amount, category, description, created_at

### Backend

Node.js + Express. API REST completa:

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/transactions` | Listar transações |
| GET | `/api/transactions/:id` | Buscar por ID |
| POST | `/api/transactions` | Criar transação |
| PUT | `/api/transactions/:id` | Atualizar transação |
| DELETE | `/api/transactions/:id` | Deletar transação |
| POST | `/api/transactions/bulk` | Importar em lote |
| GET | `/api/categories` | Listar categorias |
| POST | `/api/categories` | Criar categoria |
| PUT | `/api/categories/:id` | Atualizar categoria |
| DELETE | `/api/categories/:id` | Deletar categoria |
| GET | `/api/export` | Exportar JSON |
| POST | `/api/import` | Importar JSON (merge) |

**Filtros de transação (query params):**
- `?month=2024-01` — filtrar por mês
- `?category=Alimentação` — filtrar por categoria
- `?search=super` — buscar na descrição

**Exportação:**
- `GET /api/export` — exporta todos os dados
- `GET /api/export?month=2024-01` — exporta só o mês especificado

**Importação:**
- `POST /api/import` — adiciona dados ao banco (merge)
- Categorias duplicadas são ignoradas
- Transações são sempre adicionadas

## Modelo de JSON

Formato usado para importação e exportação:

```json
{
  "transactions": [
    {
      "date": "2024-01-15",
      "amount": 150.50,
      "category": "Alimentação",
      "description": "Supermercado"
    },
    {
      "date": "2024-01-18",
      "amount": 35.00,
      "category": "Transporte",
      "description": "Uber"
    }
  ],
  "categories": [
    { "name": "Alimentação", "color": "#FF6384" },
    { "name": "Transporte", "color": "#36A2EB" },
    { "name": "Moradia", "color": "#FFCE56" },
    { "name": "Saúde", "color": "#4BC0C0" },
    { "name": "Lazer", "color": "#9966FF" },
    { "name": "Educação", "color": "#FF9F40" },
    { "name": "Tecnologia", "color": "#E7E9ED" }
  ]
}
```

### Campos

**transactions (obrigatório):**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| date | string | sim | Data no formato AAAA-MM-DD |
| amount | number | sim | Valor positivo em reais |
| category | string | sim | Nome da categoria (deve existir em categories) |
| description | string | não | Descrição da transação |

**categories (obrigatório):**
| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| name | string | sim | Nome único da categoria |
| color | string | não | Cor hex (padrão: #C9CBCF) |

### Exemplo com Gemini

Use este prompt no Gemini para extrair dados de um extrato de cartão de crédito e gerar um JSON compatível:

> Analise o extrato abaixo e gere um JSON com as chaves "transactions" e "categories". Cada transação deve ter date (AAAA-MM-DD), amount (positivo), category e description. Crie categorias automaticamente baseadas nos nomes dos estabelecimentos. Formato de saída: apenas o JSON, sem explicação.

## Dependências

| Pacote | Para quê |
|--------|----------|
| express | Servidor HTTP |
| sql.js | SQLite via WebAssembly |
| cors | Cross-origin |
| nodemon | Auto-reload (dev) |

## Estrutura

```
gastos-app/
├── package.json
├── gastos.db              # Banco SQLite (auto-criado)
├── server/
│   ├── index.js           # Express
│   ├── db.js              # SQLite + criação de tabelas
│   ├── seed.js            # Dados de exemplo
│   └── routes/
│       ├── transactions.js
│       ├── categories.js
│       └── import-export.js
├── client/
│   ├── index.html         # Shell SPA
│   ├── css/style.css
│   └── js/
│       ├── api.js         # Chamadas HTTP
│       ├── app.js         # Vue Router
│       ├── pages/
│       │   ├── dashboard.js
│       │   └── management.js
│       └── components/
│           ├── charts.js
│           └── toast.js
└── README.md
```
