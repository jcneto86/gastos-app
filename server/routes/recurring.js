const express = require('express');
const router = express.Router();
const { getDB, saveDB, queryAll, queryOne } = require('../db');

router.get('/', (req, res) => {
  const data = queryAll('SELECT * FROM recurring ORDER BY day, description');
  res.json(data);
});

router.post('/', async (req, res, next) => {
  try {
    const { description, amount, category, day, frequency } = req.body;
    if (!description || amount == null || !category || !day) {
      return res.status(400).json({ error: 'Campos obrigatórios: description, amount, category, day' });
    }

    const db = getDB();
    db.run(
      'INSERT INTO recurring (description, amount, category, day, frequency) VALUES (?, ?, ?, ?, ?)',
      [description, amount, category, day, frequency || 'monthly']
    );
    await saveDB();
    const { id } = queryOne('SELECT last_insert_rowid() as id');
    const item = queryOne('SELECT * FROM recurring WHERE id = ?', [id]);
    res.status(201).json(item);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = queryOne('SELECT id FROM recurring WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Não encontrado' });

    const { description, amount, category, day, frequency, active } = req.body;
    const db = getDB();
    db.run(
      'UPDATE recurring SET description = ?, amount = ?, category = ?, day = ?, frequency = ?, active = ? WHERE id = ?',
      [description, amount, category, day, frequency || 'monthly', active != null ? (active ? 1 : 0) : 1, req.params.id]
    );
    await saveDB();
    const item = queryOne('SELECT * FROM recurring WHERE id = ?', [req.params.id]);
    res.json(item);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const db = getDB();
    db.run('DELETE FROM recurring WHERE id = ?', [req.params.id]);
    await saveDB();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

async function processRecurring() {
  try {
    const today = new Date();
    const todayDay = today.getDate();
    const monthStr = today.toISOString().slice(0, 7);

    const items = queryAll(
      'SELECT * FROM recurring WHERE active = 1 AND day <= ?',
      [todayDay]
    );

    let count = 0;
    for (const item of items) {
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
      count++;
    }

    if (count > 0) {
      await saveDB();
      console.log(`[Recorrentes] ${count} transação(ões) gerada(s) para ${monthStr}`);
    }
  } catch (e) {
    console.error('[Recorrentes] Erro ao processar:', e.message);
  }
}

module.exports = router;
module.exports.processRecurring = processRecurring;
