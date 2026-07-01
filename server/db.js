const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');

const DB_DIR = process.env.GASTOS_DB_PATH || path.join(__dirname, '..');
const DB_PATH = path.join(DB_DIR, 'gastos.db');
const BACKUP_DIR = path.join(DB_DIR, 'backups');
let db = null;

async function initDB() {
  const SQL = await initSqlJs();

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#C9CBCF',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS recurring (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      category TEXT NOT NULL,
      day INTEGER NOT NULL,
      frequency TEXT DEFAULT 'monthly',
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL,
      limit_amount REAL NOT NULL,
      month TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(category, month)
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category)`);

  await saveDB();
  await backupDB();

  setInterval(() => { saveDB(); }, 5000).unref();
  setInterval(() => { backupDB(); }, 24 * 60 * 60 * 1000).unref();

  return db;
}

async function saveDB() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  await fsp.writeFile(DB_PATH, buffer);
}

async function backupDB() {
  if (!db) return;
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const today = new Date().toISOString().slice(0, 10);
  const backupPath = path.join(BACKUP_DIR, `gastos_${today}.db`);

  try {
    await fsp.access(backupPath);
    return;
  } catch { /* não existe, criar */ }

  const data = db.export();
  const buffer = Buffer.from(data);
  await fsp.writeFile(backupPath, buffer);
  console.log(`Backup criado: ${backupPath}`);
}

function getDB() {
  return db;
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const row = stmt.step() ? stmt.getAsObject() : null;
  stmt.free();
  return row;
}

module.exports = { initDB, getDB, saveDB, backupDB, queryAll, queryOne };
