const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';

function getToken() {
  return localStorage.getItem('token') || '';
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` };
}

async function handleResponse(res) {
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.message || `Request failed: ${res.status}`);
  return json;
}

export const medicationService = {
  async getAll({ search = '', status = '', page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams({ search, status, page, limit }).toString();
    const res = await fetch(`${API_BASE}/medications?${params}`, {
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  async create(formData) {
    const res = await fetch(`${API_BASE}/medications`, {
      method: 'POST',
      headers: authHeaders(),
      body: formData,
    });
    return handleResponse(res);
  },

  async getById(id) {
    const res = await fetch(`${API_BASE}/medications/${id}`, {
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  async update(id, formData) {
    const res = await fetch(`${API_BASE}/medications/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: formData,
    });
    return handleResponse(res);
  },

  async remove(id) {
    const res = await fetch(`${API_BASE}/medications/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    return handleResponse(res);
  },

  async bulkImport(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${API_BASE}/medications/bulk-import`, {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    return handleResponse(res);
  },

  async uploadBarcode(photoFile) {
    const fd = new FormData();
    fd.append('photo', photoFile);
    const res = await fetch(`${API_BASE}/medications/barcode`, {
      method: 'POST',
      headers: authHeaders(),
      body: fd,
    });
    return handleResponse(res);
  },
};
