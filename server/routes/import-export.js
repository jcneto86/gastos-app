const express = require('express');
const router = express.Router();
const { getDB, saveDB, queryAll } = require('../db');

router.get('/export', (req, res) => {
  const { month } = req.query;

  let sql = 'SELECT * FROM transactions';
  const params = [];
  if (month) {
    sql += ' WHERE date LIKE ?';
    params.push(month + '%');
  }
  sql += ' ORDER BY date DESC';

  const transactions = queryAll(sql, params);
  const categories = queryAll('SELECT * FROM categories ORDER BY name');

  const suffix = month ? `_${month}` : '';
  res.setHeader('Content-Disposition', `attachment; filename=gastos_pessoais${suffix}.json`);
  res.json({ transactions, categories });
});

router.post('/import', (req, res) => {
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

  saveDB();
  res.json({ transactions: txCount, categories: catCount });
});

router.delete('/clear', (req, res) => {
  const db = getDB();
  db.run('DELETE FROM transactions');
  db.run('DELETE FROM categories');
  saveDB();
  res.json({ ok: true });
});

module.exports = router;
