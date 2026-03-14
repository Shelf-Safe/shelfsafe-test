import axios from 'axios';
import { API_ORIGIN } from '../config/api';

const api = axios.create({
  baseURL: `${API_ORIGIN}/api/pos`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const posSyncService = {
  getProviders: async () => (await api.get('/providers')).data,
  getConnection: async () => (await api.get('/connection')).data,
  connect: async (payload) => (await api.post('/connect', payload)).data,
  sync: async () => (await api.post('/sync')).data,
  disconnect: async () => (await api.post('/disconnect')).data,
};
