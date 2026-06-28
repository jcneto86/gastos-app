const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');
const transactionsRouter = require('./routes/transactions');
const categoriesRouter = require('./routes/categories');
const importExportRouter = require('./routes/import-export');

const app = express();
const PORT = process.env.PORT || 3000;

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

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'index.html'));
});

async function startServer() {
  await initDB();
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
