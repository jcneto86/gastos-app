const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDB } = require('./db');
const transactionsRouter = require('./routes/transactions');
const categoriesRouter = require('./routes/categories');
const importExportRouter = require('./routes/import-export');
const recurringRouter = require('./routes/recurring');
const budgetsRouter = require('./routes/budgets');

const app = express();
const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
});

app.use(limiter);
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(express.static(path.join(__dirname, '..', 'client')));

app.use('/api/transactions', transactionsRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api', importExportRouter);
app.use('/api/recurring', recurringRouter);
app.use('/api/budgets', budgetsRouter);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('[ERRO]', err.stack || err.message || err);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor',
  });
});

async function startServer() {
  await initDB();
  const { processRecurring } = require('./routes/recurring');
  setInterval(processRecurring, 6 * 60 * 60 * 1000);
  processRecurring();
  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`Servidor rodando em http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

if (!process.env.ELECTRON_RUN) {
  startServer().catch((err) => {
    console.error('Erro ao iniciar:', err);
    process.exit(1);
  });
}

module.exports = { startServer };
