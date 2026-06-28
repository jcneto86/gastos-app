const { initDB, getDB, saveDB } = require('./db');

const CATEGORIES = [
  { name: 'Alimentação', color: '#FF6384' },
  { name: 'Transporte', color: '#36A2EB' },
  { name: 'Moradia', color: '#FFCE56' },
  { name: 'Saúde', color: '#4BC0C0' },
  { name: 'Lazer', color: '#9966FF' },
  { name: 'Educação', color: '#FF9F40' },
  { name: 'Tecnologia', color: '#E7E9ED' },
];

const TRANSACTIONS = [
  { date: '2024-01-05', amount: 450.00, category: 'Alimentação', description: 'Supermercado' },
  { date: '2024-01-07', amount: 35.00, category: 'Transporte', description: 'Uber' },
  { date: '2024-01-10', amount: 1200.00, category: 'Moradia', description: 'Aluguel' },
  { date: '2024-01-12', amount: 89.90, category: 'Saúde', description: 'Farmácia' },
  { date: '2024-01-15', amount: 200.00, category: 'Lazer', description: 'Jantar' },
  { date: '2024-01-18', amount: 50.00, category: 'Transporte', description: 'Gasolina' },
  { date: '2024-01-20', amount: 350.00, category: 'Alimentação', description: 'Supermercado' },
  { date: '2024-01-22', amount: 150.00, category: 'Educação', description: 'Curso online' },
  { date: '2024-01-25', amount: 80.00, category: 'Lazer', description: 'Cinema' },
  { date: '2024-01-28', amount: 100.00, category: 'Saúde', description: 'Consulta' },
  { date: '2024-02-03', amount: 520.00, category: 'Alimentação', description: 'Supermercado' },
  { date: '2024-02-08', amount: 45.00, category: 'Transporte', description: 'Uber' },
  { date: '2024-02-10', amount: 1200.00, category: 'Moradia', description: 'Aluguel' },
  { date: '2024-02-14', amount: 320.00, category: 'Lazer', description: 'Jantar especial' },
  { date: '2024-02-18', amount: 60.00, category: 'Transporte', description: 'Gasolina' },
  { date: '2024-02-20', amount: 280.00, category: 'Alimentação', description: 'Supermercado' },
  { date: '2024-02-25', amount: 75.00, category: 'Saúde', description: 'Farmácia' },
  { date: '2024-03-02', amount: 480.00, category: 'Alimentação', description: 'Supermercado' },
  { date: '2024-03-05', amount: 890.00, category: 'Tecnologia', description: 'Notebook' },
  { date: '2024-03-10', amount: 1200.00, category: 'Moradia', description: 'Aluguel' },
  { date: '2024-03-12', amount: 40.00, category: 'Transporte', description: 'Uber' },
  { date: '2024-03-15', amount: 180.00, category: 'Lazer', description: 'Show' },
  { date: '2024-03-20', amount: 310.00, category: 'Alimentação', description: 'Supermercado' },
  { date: '2024-03-22', amount: 95.00, category: 'Saúde', description: 'Consulta' },
  { date: '2024-03-28', amount: 55.00, category: 'Transporte', description: 'Gasolina' },
];

async function seed() {
  await initDB();
  const db = getDB();

  db.run('DELETE FROM transactions');
  db.run('DELETE FROM categories');

  for (const cat of CATEGORIES) {
    db.run('INSERT INTO categories (name, color) VALUES (?, ?)', [cat.name, cat.color]);
  }

  for (const tx of TRANSACTIONS) {
    db.run(
      'INSERT INTO transactions (date, amount, category, description) VALUES (?, ?, ?, ?)',
      [tx.date, tx.amount, tx.category, tx.description]
    );
  }

  saveDB();
  console.log(`Seed concluído: ${CATEGORIES.length} categorias, ${TRANSACTIONS.length} transações.`);
  process.exit(0);
}

seed();
