import { API_BASE_URL } from '../config/api';
import { createVoiceLogger } from '../voice/utils/voiceLogger';

const log = createVoiceLogger('API');
const DEFAULT_PARSE_TIMEOUT_MS = Math.max(1500, Number(import.meta.env.VITE_VOICE_PARSE_TIMEOUT_MS || 6500) || 6500);

let groqCooldownUntil = 0;
let groqCooldownReason = '';
const activeParseControllers = new Set();

function parseRetryDelayMs(message = '') {
  const text = String(message || '');
  const match = text.match(/try again in\s+([^\s,.]+(?:[smh][^\s,}]*)?)/i);
  if (!match) return 0;
  const token = match[1];
  let total = 0;
  const parts = token.match(/(\d+(?:\.\d+)?)(ms|s|m|h)/gi) || [];
  for (const part of parts) {
    const m = part.match(/(\d+(?:\.\d+)?)(ms|s|m|h)/i);
    if (!m) continue;
    const value = Number(m[1]) || 0;
    const unit = m[2].toLowerCase();
    if (unit === 'ms') total += value;
    if (unit === 's') total += value * 1000;
    if (unit === 'm') total += value * 60_000;
    if (unit === 'h') total += value * 3_600_000;
  }
  return Math.round(total);
}

function maybeEnterGroqCooldown(message = '') {
  const delayMs = parseRetryDelayMs(message);
  if (!delayMs) return 0;
  groqCooldownUntil = Date.now() + delayMs;
  groqCooldownReason = String(message || '');
  log.warn('Groq cooldown activated', { delayMs, until: groqCooldownUntil });
  return delayMs;
}

function getGroqCooldownState() {
  const active = groqCooldownUntil > Date.now();
  return { active, retryAfterMs: active ? groqCooldownUntil - Date.now() : 0, reason: groqCooldownReason };
}

function mergeAbortSignals(...signals) {
  const controller = new AbortController();
  const validSignals = signals.filter(Boolean);

  const abort = (eventOrReason) => {
    if (controller.signal.aborted) return;
    const reason = eventOrReason?.target?.reason || eventOrReason?.reason || eventOrReason || new DOMException('Aborted', 'AbortError');
    controller.abort(reason);
  };

  validSignals.forEach((signal) => {
    if (signal.aborted) {
      abort(signal.reason);
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
  });

  return controller;
}

async function parseWithBackend(payload, options = {}) {
  const cooldown = getGroqCooldownState();
  if (cooldown.active) {
    const seconds = Math.ceil(cooldown.retryAfterMs / 1000);
    const error = new Error(`Groq cooldown active. Retry in ${seconds}s.`);
    error.code = 'GROQ_COOLDOWN';
    error.retryAfterMs = cooldown.retryAfterMs;
    throw error;
  }

  const requestController = new AbortController();
  const timeoutController = new AbortController();
  const timeoutMs = Math.max(1200, Number(options.timeoutMs) || DEFAULT_PARSE_TIMEOUT_MS);
  const composite = mergeAbortSignals(options.signal, requestController.signal, timeoutController.signal);
  activeParseControllers.add(requestController);
  const timeoutId = window.setTimeout(() => {
    timeoutController.abort(new DOMException('Voice parse timed out.', 'TimeoutError'));
  }, timeoutMs);

  log.info('Parsing intent via backend', { pageId: payload?.pageId, route: payload?.currentRoute, transcript: payload?.text, timeoutMs });

  try {
    const response = await fetch(`${API_BASE_URL}/voice/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: composite.signal,
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok || !json?.success) {
      const message = json?.message || 'Unable to parse voice command.';
      const delayMs = maybeEnterGroqCooldown(message);
      const error = new Error(message);
      if (delayMs) {
        error.code = 'GROQ_COOLDOWN';
        error.retryAfterMs = delayMs;
      }
      throw error;
    }
    log.info('Parse response', { type: json?.action?.type, confidence: json?.action?.confidence, normalizedText: json?.action?.normalizedText });
    return json.action;
  } catch (error) {
    if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
      const wrapped = new Error(error?.name === 'TimeoutError' ? 'Voice parse timed out.' : 'Voice parse aborted.');
      wrapped.code = error?.name === 'TimeoutError' ? 'GROQ_TIMEOUT' : 'VOICE_ABORTED';
      throw wrapped;
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
    activeParseControllers.delete(requestController);
  }
}

async function getDeepgramToken(options = {}) {
  const ttlSeconds = Number(options.ttlSeconds) || undefined;
  log.info('Requesting Deepgram token', { ttlSeconds });
  const response = await fetch(`${API_BASE_URL}/voice/deepgram/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttlSeconds }),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok || !json?.success) {
    throw new Error(json?.message || 'Unable to get Deepgram access token.');
  }

  log.debug('Deepgram token granted', { expiresIn: json.expiresIn });

  return {
    accessToken: json.accessToken,
    expiresIn: json.expiresIn,
  };
}

function abortActiveParses(reason = 'Voice session aborted.') {
  for (const controller of activeParseControllers) {
    try {
      controller.abort(reason);
    } catch {}
  }
  activeParseControllers.clear();
}

export const voiceApiService = {
  parseIntent: parseWithBackend,
  getDeepgramToken,
  getGroqCooldownState,
  abortActiveParses,
};
