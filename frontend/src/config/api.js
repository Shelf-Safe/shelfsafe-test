const LOCAL_API_ORIGIN = 'http://localhost:5003';

function isLocalhostHost(hostname = '') {
  return ['localhost', '127.0.0.1', '::1'].includes(String(hostname || '').toLowerCase());
}

function getDefaultApiBase() {
  if (typeof window === 'undefined') {
    return `${LOCAL_API_ORIGIN}/api`;
  }

  const { origin, hostname } = window.location;
  if (isLocalhostHost(hostname)) {
    return `${LOCAL_API_ORIGIN}/api`;
  }

  return `${origin.replace(/\/$/, '')}/api`;
}

function normalizeApiBase(rawValue) {
  const cleaned = String(rawValue || '').trim().replace(/\/$/, '');
  if (!cleaned) {
    return getDefaultApiBase();
  }
  return cleaned.endsWith('/api') ? cleaned : `${cleaned}/api`;
}

const configuredBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';

export const DEEPGRAM_API_BASE = import.meta.env.DEEPGRAM_API_BASE || 'https://api.deepgram.com';
export const API_BASE_URL = normalizeApiBase(configuredBase);
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '') || LOCAL_API_ORIGIN;
