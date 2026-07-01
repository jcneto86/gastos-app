const express = require('express');
const router = express.Router();
const { getDB, saveDB, queryAll, queryOne } = require('../db');
const { validateTransaction } = require('../validation');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

router.get('/', (req, res) => {
  const { month, category, search, page, limit } = req.query;

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

router.post('/', async (req, res, next) => {
  try {
    const { valid, errors, data } = validateTransaction(req.body);
    if (!valid) return res.status(400).json({ error: errors.join('; ') });

    const db = getDB();
    db.run(
      'INSERT INTO transactions (date, amount, category, description) VALUES (?, ?, ?, ?)',
      [data.date, data.amount, data.category, data.description]
    );
    await saveDB();
    const { id } = queryOne('SELECT last_insert_rowid() as id');
    const tx = queryOne('SELECT * FROM transactions WHERE id = ?', [id]);
    res.status(201).json(tx);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = queryOne('SELECT id FROM transactions WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Não encontrado' });

    const { valid, errors, data } = validateTransaction(req.body);
    if (!valid) return res.status(400).json({ error: errors.join('; ') });

    const db = getDB();
    db.run(
      'UPDATE transactions SET date = ?, amount = ?, category = ?, description = ? WHERE id = ?',
      [data.date, data.amount, data.category, data.description, req.params.id]
    );
    await saveDB();
    const tx = queryOne('SELECT * FROM transactions WHERE id = ?', [req.params.id]);
    res.json(tx);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    db.run('DELETE FROM transactions WHERE id = ?', [req.params.id]);
    await saveDB();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.post('/bulk', async (req, res, next) => {
  try {
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
    await saveDB();
    res.status(201).json({ imported: count });
  } catch (e) { next(e); }
});

module.exports = router;
