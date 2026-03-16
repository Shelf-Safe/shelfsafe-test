import axios from 'axios';
import { API_BASE_URL } from '../config/api';

const api = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function persistSession(payload) {
  if (payload?.token) localStorage.setItem('token', payload.token);
  if (payload?.user) localStorage.setItem('user', JSON.stringify(payload.user));
}

export const authService = {
  register: async (name, email, password, confirmPassword) => {
    const response = await api.post('/register', { name, email, password, confirmPassword });
    persistSession(response.data);
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/login', { email, password });
    persistSession(response.data);
    return response.data;
  },

  verifyTwoFactor: async (email, otp) => {
    const response = await api.post('/verify-2fa', { email, otp });
    persistSession(response.data);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  clearStaleSession: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/me');
      if (response.data?.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data.user;
    } catch (error) {
      return null;
    }
  },

  getToken: () => localStorage.getItem('token'),
};
