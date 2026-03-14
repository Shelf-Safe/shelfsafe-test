const base = import.meta.env.VITE_API_URL || 'http://localhost:5003/api';
export const API_BASE_URL = base;
export const API_ORIGIN = base.replace(/\/api\/?$/, '') || 'http://localhost:5003';
