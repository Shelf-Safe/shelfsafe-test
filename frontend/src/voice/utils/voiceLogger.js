const DEBUG_ENABLED = String(import.meta.env.VITE_VOICE_DEBUG_LOGS || 'false') === 'true';
const INFO_ENABLED = String(import.meta.env.VITE_VOICE_INFO_LOGS || 'true') === 'true';
const FILE_LOGGING_ENABLED = String(import.meta.env.VITE_VOICE_FILE_LOGGING || 'false') === 'true';
const FILE_LOG_LIMIT = Math.max(100, Number(import.meta.env.VITE_VOICE_FILE_LOG_MAX || 800) || 800);
const FILE_LOG_STORAGE_KEY = 'shelfsafe:voice:file-logs';
const ACTIVE_SESSION_KEY = '__SHELFSAFE_VOICE_ACTIVE_SESSION__';

function readActiveSessionId() {
  if (typeof window === 'undefined') return '';
  return String(window[ACTIVE_SESSION_KEY] || '').trim();
}

export function setActiveVoiceLogSession(sessionId = '') {
  if (typeof window === 'undefined') return;
  window[ACTIVE_SESSION_KEY] = String(sessionId || '').trim();
}

export function clearActiveVoiceLogSession() {
  if (typeof window === 'undefined') return;
  window[ACTIVE_SESSION_KEY] = '';
}

function prefix(scope) {
  const sessionId = readActiveSessionId();
  return sessionId ? `[Voice][${scope}][${sessionId}]` : `[Voice][${scope}]`;
}

function safeSerialize(value) {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack || '',
    };
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value == null) {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}

function readFileLogBuffer() {
  if (typeof window === 'undefined') return [];
  if (!FILE_LOGGING_ENABLED) return [];
  try {
    const raw = window.localStorage.getItem(FILE_LOG_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeFileLogBuffer(entries) {
  if (typeof window === 'undefined' || !FILE_LOGGING_ENABLED) return;
  try {
    window.localStorage.setItem(FILE_LOG_STORAGE_KEY, JSON.stringify(entries.slice(-FILE_LOG_LIMIT)));
  } catch {}
}

function appendFileLog(level, scope, args) {
  if (!FILE_LOGGING_ENABLED || typeof window === 'undefined') return;
  const nextEntry = {
    ts: new Date().toISOString(),
    level,
    scope,
    sessionId: readActiveSessionId(),
    args: args.map(safeSerialize),
  };
  const buffer = readFileLogBuffer();
  buffer.push(nextEntry);
  writeFileLogBuffer(buffer);
}

function exposeFileLogHelpers() {
  if (typeof window === 'undefined') return;
  if (window.__SHELFSAFE_VOICE_LOG_FILE__) return;

  window.__SHELFSAFE_VOICE_LOG_FILE__ = {
    enabled() { return FILE_LOGGING_ENABLED; },
    download(filename = `shelfsafe-voice-logs-${Date.now()}.txt`) {
      if (!FILE_LOGGING_ENABLED) return 'Voice file logging is disabled.';
      const entries = readFileLogBuffer();
      const body = entries
        .map((entry) => `${entry.ts} [${entry.level}] [${entry.scope}]${entry.sessionId ? ` [${entry.sessionId}]` : ''} ${entry.args.map((arg) => typeof arg === 'string' ? arg : JSON.stringify(arg)).join(' ')}`)
        .join('\n');
      const blob = new Blob([body], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      return entries.length;
    },
    clear() {
      if (!FILE_LOGGING_ENABLED) return 'Voice file logging is disabled.';
      try {
        window.localStorage.removeItem(FILE_LOG_STORAGE_KEY);
      } catch {}
    },
    read() {
      return readFileLogBuffer();
    },
    currentSession() {
      return readActiveSessionId();
    },
    storageKey: FILE_LOG_STORAGE_KEY,
    maxEntries: FILE_LOG_LIMIT,
  };

  window.__SHELFSAFE_VOICE_LOG_BUFFER__ = readFileLogBuffer();
}

exposeFileLogHelpers();

export function createVoiceLogger(scope = 'General') {
  return {
    debug: (...args) => {
      appendFileLog('debug', scope, args);
      if (!DEBUG_ENABLED) return;
      console.debug(prefix(scope), ...args);
    },
    info: (...args) => {
      appendFileLog('info', scope, args);
      if (!INFO_ENABLED) return;
      console.log(prefix(scope), ...args);
    },
    warn: (...args) => {
      appendFileLog('warn', scope, args);
      console.warn(prefix(scope), ...args);
    },
    error: (...args) => {
      appendFileLog('error', scope, args);
      console.error(prefix(scope), ...args);
    },
  };
}

export function summarizeForLog(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return { type: 'array', count: value.length };
  const clone = { ...value };
  if (Array.isArray(clone.candidateMedications)) clone.candidateMedications = `${clone.candidateMedications.length} candidates`;
  if (Array.isArray(clone.candidateAlerts)) clone.candidateAlerts = `${clone.candidateAlerts.length} alerts`;
  if (Array.isArray(clone.knownMedicationNames)) clone.knownMedicationNames = `${clone.knownMedicationNames.length} known meds`;
  if (clone.runtime && typeof clone.runtime === 'object') clone.runtime = { ...clone.runtime };
  return clone;
}
