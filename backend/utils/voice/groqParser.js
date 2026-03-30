import { buildVoiceSystemPrompt, buildVoiceUserPrompt } from './promptBuilder.js';
import { createVoiceLogger } from './voiceLogger.js';
import { PAGE_CATALOG } from './pageCatalog.js';

const log = createVoiceLogger('Groq');
const DEFAULT_GROQ_TIMEOUT_MS = Math.max(2000, Number(process.env.GROQ_TIMEOUT_MS) || 7000);
const VALID_ROUTES = new Set(['/dashboard', '/inventory', '/reports', '/profile', '/settings']);
const GLOBAL_ACTION_TYPES = new Set(['NAVIGATE', 'GO_BACK', 'STOP_LISTENING', 'NO_MATCH']);
const PAGE_ACTION_TYPES = new Set(Object.values(PAGE_CATALOG).flatMap((page) => page.actions.map((action) => action.type)));
const CHAIN_STEP_TYPES = new Set([
  ...GLOBAL_ACTION_TYPES,
  ...PAGE_ACTION_TYPES,
  'CHAIN',
  'POS_SELECT_PROVIDER',
  'POS_SET_EMAIL',
  'POS_SET_PASSWORD',
  'POS_SUBMIT',
  'POS_CLOSE',
]);

function coerceString(value = '') {
  return typeof value === 'string' ? value.trim() : '';
}

function parseJsonSafely(text = '') {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch {}
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    try {
      return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } catch {}
  }
  return null;
}

function sanitizeRoute(route = '') {
  const nextRoute = coerceString(route);
  if (!nextRoute) return '';
  return VALID_ROUTES.has(nextRoute) ? nextRoute : '';
}

function sanitizeStep(payload = {}) {
  const type = coerceString(payload.type).toUpperCase() || 'NO_MATCH';
  if (!CHAIN_STEP_TYPES.has(type)) {
    return null;
  }
  return {
    type,
    route: sanitizeRoute(payload.route),
    value: coerceString(payload.value),
    sortDirection: ['asc', 'desc'].includes(coerceString(payload.sortDirection).toLowerCase()) ? coerceString(payload.sortDirection).toLowerCase() : '',
    priorityValue: coerceString(payload.priorityValue),
    delayMs: Math.max(0, Number(payload.delayMs) || 0),
    providerKey: coerceString(payload.providerKey).toLowerCase(),
    matchedAlias: coerceString(payload.matchedAlias),
    autoSubmit: Boolean(payload.autoSubmit),
  };
}

function sanitizeAction(payload = {}) {
  const type = coerceString(payload.type).toUpperCase() || 'NO_MATCH';
  if (!GLOBAL_ACTION_TYPES.has(type) && !PAGE_ACTION_TYPES.has(type)) {
    return {
      type: 'NO_MATCH',
      route: '',
      value: '',
      sortDirection: '',
      priorityValue: '',
      confidence: 0,
      spokenResponse: '',
      normalizedText: '',
      source: 'groq-invalid',
    };
  }
  return {
    type,
    route: sanitizeRoute(payload.route),
    value: coerceString(payload.value),
    sortDirection: ['asc', 'desc'].includes(coerceString(payload.sortDirection).toLowerCase()) ? coerceString(payload.sortDirection).toLowerCase() : '',
    priorityValue: coerceString(payload.priorityValue),
    confidence: Math.max(0, Math.min(1, Number(payload.confidence) || 0)),
    spokenResponse: coerceString(payload.spokenResponse),
    normalizedText: coerceString(payload.normalizedText),
    source: 'groq',
  };
}

function sanitizeChain(payload = {}) {
  const rawSteps = Array.isArray(payload.steps) ? payload.steps : [];
  const steps = rawSteps.map(sanitizeStep).filter(Boolean).filter((step) => step.type && step.type !== 'NO_MATCH');
  return {
    type: 'CHAIN',
    steps,
    confidence: Math.max(0, Math.min(1, Number(payload.confidence) || 0)),
    spokenResponse: coerceString(payload.spokenResponse),
    normalizedText: coerceString(payload.normalizedText),
    source: 'groq',
  };
}

export async function parseVoiceWithGroq({ text, pageId = 'dashboard', currentRoute = '/dashboard', recoveryPayload = null, mode = 'simple' }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { type: 'NO_MATCH', route: '', value: '', sortDirection: '', priorityValue: '', confidence: 0, spokenResponse: '', source: 'groq-disabled' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(new Error('Groq voice parsing timed out.')), DEFAULT_GROQ_TIMEOUT_MS);

  log.info('Sending recovery request', { pageId, route: currentRoute, transcript: text, mode, actionCount: recoveryPayload?.allowedActions?.length || 0, timeoutMs: DEFAULT_GROQ_TIMEOUT_MS });

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0,
        max_tokens: mode === 'chain' ? 500 : 260,
        messages: [
          { role: 'system', content: buildVoiceSystemPrompt(pageId, mode) },
          { role: 'user', content: buildVoiceUserPrompt({ text, currentRoute, pageId, recoveryPayload, mode }) },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq voice parsing failed (${response.status}): ${errorText}`);
    }

    const json = await response.json();
    const content = json?.choices?.[0]?.message?.content || '';
    const parsed = parseJsonSafely(content);
    if (!parsed) {
      log.warn('Groq returned non-JSON content');
      return { type: 'NO_MATCH', route: '', value: '', sortDirection: '', priorityValue: '', confidence: 0, spokenResponse: '', source: 'groq-unparsed' };
    }

    if (mode === 'chain') {
      const plan = sanitizeChain(parsed);
      log.info('Recovered chain plan', { stepCount: plan.steps.length, confidence: plan.confidence, normalizedText: plan.normalizedText });
      return plan;
    }

    const action = sanitizeAction(parsed);
    log.info('Recovered action', { type: action.type, confidence: action.confidence, normalizedText: action.normalizedText });
    return action;
  } catch (error) {
    if (controller.signal.aborted) {
      const timeoutError = new Error('Groq voice parsing timed out.');
      timeoutError.code = 'GROQ_TIMEOUT';
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
