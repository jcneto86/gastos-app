const express = require('express');
const router = express.Router();
const { getDB, saveDB, queryAll, queryOne } = require('../db');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

router.get('/', (req, res) => {
  const { month, category, search, page, limit } = req.query;

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

  if (page) {
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const offset = (pageNum - 1) * limitNum;
    const { total } = queryOne(`SELECT COUNT(*) as total FROM transactions ${where}`, params);
    const data = queryAll(
      `SELECT * FROM transactions ${where} ORDER BY date DESC, id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    return res.json({ data, total, page: pageNum, limit: limitNum });
  }

  const data = queryAll(`SELECT * FROM transactions ${where} ORDER BY date DESC, id DESC`, params);
  res.json(data);
});

router.get('/:id', (req, res) => {
  const tx = queryOne('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
  if (!tx) return res.status(404).json({ error: 'Não encontrado' });
  res.json(tx);
});

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

  const db = getDB();
  db.run(
    'INSERT INTO transactions (date, amount, category, description) VALUES (?, ?, ?, ?)',
    [date, amount, category, description || '']
  );
  saveDB();
  const { id } = queryOne('SELECT last_insert_rowid() as id');
  const tx = queryOne('SELECT * FROM transactions WHERE id = ?', [id]);
  res.status(201).json(tx);
});

router.put('/:id', (req, res) => {
  const existing = queryOne('SELECT id FROM transactions WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Não encontrado' });

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

  const db = getDB();
  db.run(
    'UPDATE transactions SET date = ?, amount = ?, category = ?, description = ? WHERE id = ?',
    [date, amount, category, description || '', req.params.id]
  );
  saveDB();
  const tx = queryOne('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
  res.json(tx);
});

router.delete('/:id', (req, res) => {
  const db = getDB();
  db.run('DELETE FROM transactions WHERE id = ?', [req.params.id]);
  saveDB();
  res.json({ ok: true });
});

router.post('/bulk', (req, res) => {
  const db = getDB();
  const { transactions } = req.body;
  if (!Array.isArray(transactions)) {
    return res.status(400).json({ error: 'transactions deve ser um array' });
  }
  let count = 0;
  for (const tx of transactions) {
    if (!tx.date || !DATE_RE.test(tx.date)) continue;
    if (tx.amount == null || typeof tx.amount !== 'number' || tx.amount <= 0) continue;
    if (!tx.category) continue;
    db.run(
      'INSERT INTO transactions (date, amount, category, description) VALUES (?, ?, ?, ?)',
      [tx.date, tx.amount, tx.category, tx.description || '']
    );
    count++;
  }
  saveDB();
  res.status(201).json({ imported: count });
});

module.exports = router;
