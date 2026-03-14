import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';
const api = axios.create({
  baseURL: `${API_BASE}/auth`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  register: async (name, email, password, confirmPassword) => {
    const response = await api.post('/register', {
      name,
      email,
      password,
      confirmPassword,
    });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  login: async (email, password) => {
    const response = await api.post('/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    return response.data;
  },

  verifyTwoFactor: async (email, otp) => {
    const response = await api.post('/verify-2fa', { email, otp });

    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }

    return response.data;
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    try {
      const response = await api.get('/me');
      return response.data.user;
    } catch (error) {
      return null;
    }
  },

  getToken: () => localStorage.getItem('token'),
};
