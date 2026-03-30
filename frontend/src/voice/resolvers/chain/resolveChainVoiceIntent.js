import { voiceApiService } from '../../../services/voiceApiService';
import { resolveVoiceCommand as resolveLocalVoiceCommand } from '../../parser';
import { buildRecoveryPayload } from '../../cache/buildRecoveryPayload';
import { createVoiceLogger } from '../../utils/voiceLogger';
import { planChainLocally } from './sharedChainPlanner';

const log = createVoiceLogger('ChainResolver');

const POS_PROVIDER_ALIASES = {
  mckesson: ['mckesson'],
  toshiba: ['toshiba', 'tcx'],
  square: ['square'],
  ncr: ['ncr'],
  lightspeed: ['lightspeed'],
  lsretail: ['ls retail', 'lsretail'],
  oracle: ['oracle'],
  propel: ['propel'],
};

function normalizeText(value = '') {
  return String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function inferProviderKey(transcript = '') {
  const normalized = normalizeText(transcript);
  for (const [providerKey, aliases] of Object.entries(POS_PROVIDER_ALIASES)) {
    for (const alias of aliases) {
      if (normalized.includes(alias)) return providerKey;
    }
  }
  return '';
}

function transcriptLooksLikeOpenMedication(transcript = '') {
  const normalized = normalizeText(transcript);
  return /^(open|click|press|select|view|touch)\b/.test(normalized) && !normalized.includes(' pos');
}

function transcriptLooksSimple(transcript = '') {
  const normalized = normalizeText(transcript);
  if (!normalized) return false;
  if (/,|\band then\b|\bthen\b|\balso\b|\bafter that\b|\bnext\b/.test(normalized)) return false;
  return /^(open|click|press|select|view|touch|edit|delete|remove|search|find|go to|open dashboard|open inventory|dashboard|inventory|reports|profile|settings|change pos|connect pos|connect to pos|sync|sync inventory)/.test(normalized);
}

function trySimpleLocalShortcut(transcript = '', runtime = {}) {
  if (!transcriptLooksSimple(transcript)) return null;
  const result = resolveLocalVoiceCommand(transcript, runtime);
  if (!result || result.type === 'NO_MATCH') return null;
  if (result.type === 'BATCH' && Array.isArray(result.commands) && result.commands.length) {
    return { type: 'CHAIN', steps: result.commands, confidence: 0.95, normalizedText: transcript, resolver: 'local-shortcut' };
  }
  if (result.type !== 'CHAIN') {
    return result;
  }
  return null;
}

function routeForStep(step = {}) {
  const type = String(step.type || '');
  if (type === 'NAVIGATE') return step.route || '';
  if (type.startsWith('DASHBOARD_') || type.startsWith('POS_')) return '/dashboard';
  if (type.startsWith('INVENTORY_')) return '/inventory';
  if (type.startsWith('REPORTS_')) return '/reports';
  if (type.startsWith('PROFILE_')) return '/profile';
  return '';
}

function dedupeSteps(steps = []) {
  const seen = new Set();
  return steps.filter((step) => {
    const key = JSON.stringify({
      type: step.type || '',
      route: step.route || '',
      value: step.value || '',
      providerKey: step.providerKey || '',
      delayMs: Number(step.delayMs) || 0,
    });
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function ensureStepNavigation(steps = [], runtime = {}) {
  const currentRoute = String(runtime.routePath || '/dashboard');
  const nextSteps = [];
  let activeRoute = currentRoute;

  for (const step of steps) {
    const requiredRoute = routeForStep(step);
    if (requiredRoute && requiredRoute !== activeRoute && step.type !== 'NAVIGATE') {
      nextSteps.push({ type: 'NAVIGATE', route: requiredRoute, delayMs: 0 });
      activeRoute = requiredRoute;
    }
    nextSteps.push(step);
    if (step.type === 'NAVIGATE' && step.route) activeRoute = step.route;
  }

  return dedupeSteps(nextSteps);
}

function sanitizePlanAgainstTranscript(plan = {}, transcript = '', runtime = {}) {
  const normalized = normalizeText(transcript);
  let steps = Array.isArray(plan.steps) ? [...plan.steps] : [];
  const providerKey = inferProviderKey(transcript);
  const wantsPos = normalized.includes('pos') || normalized.includes('point of sale');

  steps = steps.filter((step) => {
    if (!wantsPos && step.type === 'DASHBOARD_OPEN_POS') return false;
    return true;
  });

  steps = steps.map((step) => {
    if (transcriptLooksLikeOpenMedication(transcript) && step.type === 'DASHBOARD_EDIT_ITEM') {
      return { ...step, type: 'DASHBOARD_OPEN_ITEM' };
    }
    if (step.type === 'POS_SELECT_PROVIDER' && !step.providerKey && providerKey) {
      return { ...step, providerKey };
    }
    return step;
  });

  if (wantsPos && !steps.some((step) => step.type === 'DASHBOARD_OPEN_POS')) {
    steps.unshift({ type: 'DASHBOARD_OPEN_POS', delayMs: 0 });
  }

  if (wantsPos && providerKey && !steps.some((step) => step.type === 'POS_SELECT_PROVIDER')) {
    steps.push({ type: 'POS_SELECT_PROVIDER', providerKey, autoSubmit: true, delayMs: 0 });
  }

  if (wantsPos && steps.some((step) => step.type === 'POS_SELECT_PROVIDER') && !steps.some((step) => step.type === 'POS_SUBMIT')) {
    steps.push({ type: 'POS_SUBMIT', autoSubmit: true, delayMs: 0 });
  }

  if (wantsPos && steps.some((step) => step.type === 'POS_SUBMIT') && !steps.some((step) => step.type === 'DASHBOARD_SYNC')) {
    steps.push({ type: 'DASHBOARD_SYNC', delayMs: 0 });
  }

  steps = ensureStepNavigation(steps, runtime);
  return { ...plan, steps };
}

function normalizeChainStep(step = {}) {
  return {
    type: step.type || 'NO_MATCH',
    route: step.route || '',
    value: step.value || '',
    sortDirection: step.sortDirection || '',
    priorityValue: step.priorityValue || '',
    delayMs: Number(step.delayMs) || 0,
    providerKey: step.providerKey || '',
    matchedAlias: step.matchedAlias || '',
    autoSubmit: Boolean(step.autoSubmit),
  };
}

function normalizeChainPlan(plan = {}) {
  const steps = Array.isArray(plan.steps) ? plan.steps.map(normalizeChainStep).filter((step) => step.type && step.type !== 'NO_MATCH') : [];
  return {
    type: 'CHAIN',
    steps,
    confidence: Math.max(0, Math.min(1, Number(plan.confidence) || 0)),
    normalizedText: plan.normalizedText || '',
    spokenResponse: plan.spokenResponse || '',
  };
}

export async function resolveChainVoiceIntent(transcript, runtime = {}) {
  const simpleShortcut = trySimpleLocalShortcut(transcript, runtime);
  if (simpleShortcut) {
    if (simpleShortcut.type === 'CHAIN') return sanitizePlanAgainstTranscript(simpleShortcut, transcript, runtime);
    return sanitizePlanAgainstTranscript({ type: 'CHAIN', steps: [normalizeChainStep(simpleShortcut)], confidence: 0.95, normalizedText: transcript, resolver: 'local-shortcut' }, transcript, runtime);
  }

  const localPlan = planChainLocally(transcript, runtime);
  if (localPlan?.steps?.length) {
    log.info('Local chain plan created', { stepCount: localPlan.steps.length, source: localPlan.source });
    return { ...sanitizePlanAgainstTranscript(localPlan, transcript, runtime), resolver: localPlan.source };
  }

  const aiEnabled = String(import.meta.env.VITE_VOICE_AI_ENABLED || 'true') === 'true';
  const groqCooldown = voiceApiService.getGroqCooldownState?.() || { active: false };
  if (!aiEnabled || groqCooldown.active) {
    if (groqCooldown.active) {
      log.warn('Skipping Groq chain recovery during cooldown', { retryAfterMs: groqCooldown.retryAfterMs });
    }
    return { type: 'NO_MATCH' };
  }

  const recoveryPayload = buildRecoveryPayload({ transcript, cacheSnapshot: runtime.cacheSnapshot || {} });
  log.info('Sending Groq chain recovery request', { pageId: recoveryPayload.page, transcript });

  try {
    const aiPlan = await voiceApiService.parseIntent({
      mode: 'chain',
      text: transcript,
      pageId: recoveryPayload.page,
      currentRoute: runtime.routePath || '/dashboard',
      recoveryPayload,
    }, { signal: runtime.abortSignal });
    const normalized = normalizeChainPlan(sanitizePlanAgainstTranscript(aiPlan, transcript, runtime));
    if (!normalized.steps.length) return { type: 'NO_MATCH' };
    log.info('Groq chain response received', { stepCount: normalized.steps.length, confidence: normalized.confidence });
    return { ...normalized, resolver: 'ai-chain' };
  } catch (error) {
    if (error?.code === 'VOICE_ABORTED') {
      log.warn('Groq chain recovery aborted');
      throw error;
    }
    throw error;
  }
}
