const express = require('express');
const router = express.Router();
const { saveDB, queryAll, queryOne } = require('../db');

router.get('/', (req, res) => {
  const month = req.query.month || new Date().toISOString().slice(0, 7);
  const budgets = queryAll('SELECT * FROM budgets WHERE month = ? ORDER BY category', [month]);
  res.json(budgets);
});

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
      percent: b.limit_amount > 0 ? Math.round((total / b.limit_amount) * 100) : 0,
    };
  });
  res.json(result);
});

router.post('/', async (req, res, next) => {
  try {
    const { category, limit_amount, month } = req.body;
    if (!category || limit_amount == null) {
      return res.status(400).json({ error: 'Campos obrigatórios: category, limit_amount' });
    }

    const budgetMonth = month || new Date().toISOString().slice(0, 7);
    const db = require('../db').getDB();

    const existing = queryOne(
      'SELECT id FROM budgets WHERE category = ? AND month = ?',
      [category, budgetMonth]
    );

    if (existing) {
      db.run(
        'UPDATE budgets SET limit_amount = ? WHERE id = ?',
        [limit_amount, existing.id]
      );
    } else {
      db.run(
        'INSERT INTO budgets (category, limit_amount, month) VALUES (?, ?, ?)',
        [category, limit_amount, budgetMonth]
      );
    }

    await saveDB();
    const result = queryOne(
      'SELECT * FROM budgets WHERE category = ? AND month = ?',
      [category, budgetMonth]
    );
    res.status(existing ? 200 : 201).json(result);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const db = require('../db').getDB();
    db.run('DELETE FROM budgets WHERE id = ?', [req.params.id]);
    await saveDB();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
