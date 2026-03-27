import { buildVoiceSystemPrompt, buildVoiceUserPrompt } from './promptBuilder.js';
import { createVoiceLogger } from './voiceLogger.js';

const log = createVoiceLogger('Groq');

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

function sanitizeStep(payload = {}) {
  return {
    type: coerceString(payload.type).toUpperCase() || 'NO_MATCH',
    route: coerceString(payload.route),
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
  return {
    type,
    route: coerceString(payload.route),
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
  const steps = Array.isArray(payload.steps) ? payload.steps.map(sanitizeStep).filter((step) => step.type && step.type !== 'NO_MATCH') : [];
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

  log.info('Sending recovery request', { pageId, route: currentRoute, transcript: text, mode, actionCount: recoveryPayload?.allowedActions?.length || 0 });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
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
}
