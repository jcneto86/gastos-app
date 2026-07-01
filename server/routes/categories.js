const express = require('express');
const router = express.Router();
const { getDB, saveDB, queryAll, queryOne } = require('../db');
const { validateCategory } = require('../validation');

router.get('/', (req, res) => {
  const data = queryAll('SELECT * FROM categories ORDER BY name');
  res.json(data);
});

router.post('/', async (req, res, next) => {
  try {
    const { valid, errors, data } = validateCategory(req.body);
    if (!valid) return res.status(400).json({ error: errors.join('; ') });

    const db = getDB();
    db.run('INSERT INTO categories (name, color) VALUES (?, ?)', [data.name, data.color]);
    await saveDB();
    const { id } = queryOne('SELECT last_insert_rowid() as id');
    const cat = queryOne('SELECT * FROM categories WHERE id = ?', [id]);
    res.status(201).json(cat);
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Categoria já existe' });
    }
    next(e);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const existing = queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Não encontrado' });

    const { valid, errors, data } = validateCategory(req.body);
    if (!valid) return res.status(400).json({ error: errors.join('; ') });

    const db = getDB();
    db.run('UPDATE categories SET name = ?, color = ? WHERE id = ?', [data.name, data.color, req.params.id]);
    if (existing.name !== data.name) {
      db.run('UPDATE transactions SET category = ? WHERE category = ?', [data.name, existing.name]);
    }
    await saveDB();
    const cat = queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json(cat);
  } catch (e) {
    if (e.message && e.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Categoria já existe' });
    }
    next(e);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const existing = queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!existing) return res.status(404).json({ error: 'Não encontrado' });

    const { total } = queryOne('SELECT COUNT(*) as total FROM transactions WHERE category = ?', [existing.name]);
    if (total > 0) {
      return res.status(400).json({ error: `Exclua as ${total} transações desta categoria antes de deletá-la` });
    }

    const db = getDB();
    db.run('DELETE FROM categories WHERE id = ?', [req.params.id]);
    await saveDB();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
