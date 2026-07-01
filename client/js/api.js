const API = {
  async request(url, options = {}, retries = 2) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url, {
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          ...options,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: res.statusText }));
          throw new Error(err.error || 'Erro na requisição');
        }
        return res.json();
      } catch (e) {
        clearTimeout(timeout);
        if (attempt === retries || e.name === 'AbortError') throw e;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  },

  transactions: {
    list(params = {}) {
      const q = new URLSearchParams(params).toString();
      return API.request('/api/transactions' + (q ? '?' + q : ''));
    },
    get(id) { return API.request('/api/transactions/' + id); },
    create(data) { return API.request('/api/transactions', { method: 'POST', body: JSON.stringify(data) }); },
    update(id, data) { return API.request('/api/transactions/' + id, { method: 'PUT', body: JSON.stringify(data) }); },
    delete(id) { return API.request('/api/transactions/' + id, { method: 'DELETE' }); },
    bulk(list) { return API.request('/api/transactions/bulk', { method: 'POST', body: JSON.stringify({ transactions: list }) }); },
  },

  categories: {
    list() { return API.request('/api/categories'); },
    create(data) { return API.request('/api/categories', { method: 'POST', body: JSON.stringify(data) }); },
    update(id, data) { return API.request('/api/categories/' + id, { method: 'PUT', body: JSON.stringify(data) }); },
    delete(id) { return API.request('/api/categories/' + id, { method: 'DELETE' }); },
  },

  importExport: {
    export(month) {
      const q = month ? '?month=' + encodeURIComponent(month) : '';
      return API.request('/api/export' + q);
    },
    import(data) { return API.request('/api/import', { method: 'POST', body: JSON.stringify(data) }); },
    importCSV(csv) { return API.request('/api/import/csv', { method: 'POST', body: JSON.stringify({ csv }) }); },
    clear() { return API.request('/api/clear', { method: 'DELETE' }); },
  },

  recurring: {
    list() { return API.request('/api/recurring'); },
    create(data) { return API.request('/api/recurring', { method: 'POST', body: JSON.stringify(data) }); },
    update(id, data) { return API.request('/api/recurring/' + id, { method: 'PUT', body: JSON.stringify(data) }); },
    delete(id) { return API.request('/api/recurring/' + id, { method: 'DELETE' }); },
  },

  budgets: {
    list(month) {
      const q = month ? '?month=' + encodeURIComponent(month) : '';
      return API.request('/api/budgets' + q);
    },
    status(month) {
      const q = month ? '?month=' + encodeURIComponent(month) : '';
      return API.request('/api/budgets/status' + q);
    },
    save(data) { return API.request('/api/budgets', { method: 'POST', body: JSON.stringify(data) }); },
    delete(id) { return API.request('/api/budgets/' + id, { method: 'DELETE' }); },
  },
};
