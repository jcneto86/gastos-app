const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateTransaction(body) {
  const errors = [];
  const { date, amount, category, description } = body || {};

  if (!date || !DATE_RE.test(date)) {
    errors.push('Data inválida. Use o formato AAAA-MM-DD');
  }
  if (amount == null || typeof amount !== 'number' || amount <= 0) {
    errors.push('Valor deve ser um número positivo');
  }
  if (!category || typeof category !== 'string') {
    errors.push('Categoria é obrigatória');
  }

  return {
    valid: errors.length === 0,
    errors,
    data: { date, amount, category, description: description || '' },
  };
}

function validateCategory(body) {
  const errors = [];
  const { name, color } = body || {};
  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.push('Campo obrigatório: name');
  }
  return {
    valid: errors.length === 0,
    errors,
    data: { name: name ? name.trim() : '', color: color || '#C9CBCF' },
  };
}

module.exports = { validateTransaction, validateCategory };
