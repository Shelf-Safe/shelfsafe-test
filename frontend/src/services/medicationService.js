import { API_BASE_URL } from '../config/api';

const responseCache = new Map();
const inflightCache = new Map();
const DEFAULT_TTL_MS = 15000;

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

function makeKey(url, options = {}) {
  const method = options.method || 'GET';
  const auth = options.headers?.Authorization || '';
  return `${method}:${url}:${auth}`;
}

async function fetchJson(url, options = {}, { cacheable = false, ttlMs = DEFAULT_TTL_MS } = {}) {
  const key = makeKey(url, options);
  if (cacheable) {
    const cached = responseCache.get(key);
    if (cached && Date.now() - cached.timestamp < ttlMs) return cached.value;
    if (inflightCache.has(key)) return inflightCache.get(key);
  }

  const promise = fetch(url, options).then(handleResponse);
  if (cacheable) inflightCache.set(key, promise);

  try {
    const value = await promise;
    if (cacheable) responseCache.set(key, { value, timestamp: Date.now() });
    return value;
  } finally {
    if (cacheable) inflightCache.delete(key);
  }
}

function invalidateGetCache(prefix = '') {
  Array.from(responseCache.keys()).forEach((key) => {
    if (key.startsWith('GET:') && (!prefix || key.includes(prefix))) responseCache.delete(key);
  });
}

export const medicationService = {
  async getAll({ search = '', status = '', page = 1, limit = 20 } = {}) {
    const params = new URLSearchParams({ search, status, page, limit }).toString();
    const url = `${API_BASE_URL}/medications?${params}`;
    return fetchJson(url, { headers: authHeaders() }, { cacheable: true, ttlMs: 12000 });
  },

  async create(formData) {
    const res = await fetchJson(`${API_BASE_URL}/medications`, { method: 'POST', headers: authHeaders(), body: formData });
    invalidateGetCache('/medications');
    return res;
  },

  async getById(id) {
    return fetchJson(`${API_BASE_URL}/medications/${id}`, { headers: authHeaders() }, { cacheable: true, ttlMs: 12000 });
  },

  async update(id, formData) {
    const res = await fetchJson(`${API_BASE_URL}/medications/${id}`, { method: 'PUT', headers: authHeaders(), body: formData });
    invalidateGetCache('/medications');
    return res;
  },

  async remove(id) {
    const res = await fetchJson(`${API_BASE_URL}/medications/${id}`, { method: 'DELETE', headers: authHeaders() });
    invalidateGetCache('/medications');
    return res;
  },

  async bulkImport(file) {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetchJson(`${API_BASE_URL}/medications/bulk-import`, { method: 'POST', headers: authHeaders(), body: fd });
    invalidateGetCache('/medications');
    return res;
  },

  async uploadBarcode(photoFile) {
    const fd = new FormData();
    fd.append('photo', photoFile);
    return fetchJson(`${API_BASE_URL}/medications/barcode`, { method: 'POST', headers: authHeaders(), body: fd });
  },

  async scanCreate({ photoFile, photoUrl = '', manualOverrides = {} }) {
    const fd = new FormData();
    if (photoFile) fd.append('photo', photoFile);
    if (photoUrl) fd.append('photoUrl', photoUrl);

    Object.entries(manualOverrides || {}).forEach(([key, value]) => {
      if (value !== undefined && value !== null && String(value).trim() !== '') {
        fd.append(key, value);
      }
    });

    const res = await fetchJson(`${API_BASE_URL}/medications/scan-create`, { method: 'POST', headers: authHeaders(), body: fd });
    invalidateGetCache('/medications');
    return res;
  },
};
