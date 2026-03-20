import axios from 'axios';
import { API_ORIGIN } from '../config/api';

const responseCache = new Map();
const inflightCache = new Map();
const TTL_MS = 15000;

const api = axios.create({
  baseURL: `${API_ORIGIN}/api/pos`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function cacheKey(path) {
  return `${path}:${localStorage.getItem('token') || ''}`;
}

async function cachedGet(path) {
  const key = cacheKey(path);
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < TTL_MS) return cached.value;
  if (inflightCache.has(key)) return inflightCache.get(key);
  const promise = api.get(path).then((res) => res.data).finally(() => inflightCache.delete(key));
  inflightCache.set(key, promise);
  const value = await promise;
  responseCache.set(key, { value, timestamp: Date.now() });
  return value;
}

function clearPosCache() {
  responseCache.clear();
  inflightCache.clear();
}

export const posSyncService = {
  getProviders: async () => cachedGet('/providers'),
  getConnection: async () => cachedGet('/connection'),
  connect: async (payload) => {
    const res = (await api.post('/connect', payload)).data;
    clearPosCache();
    return res;
  },
  sync: async () => {
    const res = (await api.post('/sync')).data;
    clearPosCache();
    return res;
  },
  disconnect: async () => {
    const res = (await api.post('/disconnect')).data;
    clearPosCache();
    return res;
  },
};
