const rawBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:5003/api';
const normalizedBase = rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/$/, '')}/api`;

export const API_BASE_URL = normalizedBase;
export const API_ORIGIN = normalizedBase.replace(/\/api\/?$/, '') || 'http://localhost:5003';
