const API = {
  async request(url, options = {}) {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Erro na requisição');
    }
    return res.json();
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
    clear() { return API.request('/api/clear', { method: 'DELETE' }); },
  },
};
