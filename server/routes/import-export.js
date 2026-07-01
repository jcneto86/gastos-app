const express = require('express');
const router = express.Router();
const { getDB, saveDB, queryAll } = require('../db');

router.get('/export', (req, res) => {
  const { month } = req.query;

  const conditions = [];
  const params = [];
  if (month) {
    conditions.push('date LIKE ?');
    params.push(month + '%');
  }
  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const transactions = queryAll(`SELECT * FROM transactions ${where} ORDER BY date DESC`, params);
  const categories = queryAll('SELECT * FROM categories ORDER BY name');

  const suffix = month ? `_${month}` : '';
  res.setHeader('Content-Disposition', `attachment; filename=gastos_pessoais${suffix}.json`);
  res.json({ transactions, categories });
});

router.post('/import', async (req, res, next) => {
  try {
    const db = getDB();
    const { transactions, categories } = req.body;

    let txCount = 0;
    let catCount = 0;

    if (Array.isArray(categories)) {
      for (const cat of categories) {
        if (!cat.name) continue;
        try {
          db.run('INSERT INTO categories (name, color) VALUES (?, ?)', [cat.name, cat.color || '#C9CBCF']);
          catCount++;
        } catch (e) { /* duplicada, ignora */ }
      }
    }

    if (Array.isArray(transactions)) {
      for (const tx of transactions) {
        if (!tx.date || tx.amount == null || !tx.category) continue;
        db.run(
          'INSERT INTO transactions (date, amount, category, description) VALUES (?, ?, ?, ?)',
          [tx.date, tx.amount, tx.category, tx.description || '']
        );
        txCount++;
      }
    }

    await saveDB();
    res.json({ transactions: txCount, categories: catCount });
  } catch (e) { next(e); }
});

router.post('/import/csv', async (req, res, next) => {
  try {
    const { csv } = req.body;
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

    await saveDB();
    res.json({ imported: count });
  } catch (e) { next(e); }
});

router.delete('/clear', async (req, res, next) => {
  try {
    const db = getDB();
    db.run('DELETE FROM transactions');
    db.run('DELETE FROM categories');
    await saveDB();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
