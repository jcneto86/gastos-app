const express = require('express');
const router = express.Router();
const { getDB, saveDB, queryAll, queryOne } = require('../db');

router.get('/', (req, res) => {
  const data = queryAll('SELECT * FROM categories ORDER BY name');
  res.json(data);
});

router.post('/', (req, res) => {
  const { name, color } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Campo obrigatório: name' });
  }
  const db = getDB();
  try {
    db.run('INSERT INTO categories (name, color) VALUES (?, ?)', [name.trim(), color || '#C9CBCF']);
    saveDB();
    const { id } = queryOne('SELECT last_insert_rowid() as id');
    const cat = queryOne('SELECT * FROM categories WHERE id = ?', [id]);
    res.status(201).json(cat);
  } catch (e) {
    res.status(400).json({ error: 'Categoria já existe' });
  }
});

router.put('/:id', (req, res) => {
  const existing = queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Não encontrado' });

  const { name, color } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Campo obrigatório: name' });
  }

  const newName = name.trim();
  const db = getDB();

  try {
    db.run('UPDATE categories SET name = ?, color = ? WHERE id = ?', [newName, color, req.params.id]);
    if (existing.name !== newName) {
      db.run('UPDATE transactions SET category = ? WHERE category = ?', [newName, existing.name]);
    }
    saveDB();
    const cat = queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    res.json(cat);
  } catch (e) {
    res.status(400).json({ error: 'Categoria já existe' });
  }
});

router.delete('/:id', (req, res) => {
  const existing = queryOne('SELECT * FROM categories WHERE id = ?', [req.params.id]);
  if (!existing) return res.status(404).json({ error: 'Não encontrado' });

  const { total } = queryOne('SELECT COUNT(*) as total FROM transactions WHERE category = ?', [existing.name]);
  if (total > 0) {
    return res.status(400).json({ error: `Exclua as ${total} transações desta categoria antes de deletá-la` });
  }

  const db = getDB();
  db.run('DELETE FROM categories WHERE id = ?', [req.params.id]);
  saveDB();
  res.json({ ok: true });
});

module.exports = router;
