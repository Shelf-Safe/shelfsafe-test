import { resolveVoiceCommand as resolveLocalVoiceCommand } from '../../parser';
import { voiceApiService } from '../../../services/voiceApiService';
import { routePathToPageId } from '../../utils/pageId';
import { buildRecoveryPayload } from '../../cache/buildRecoveryPayload';
import { buildFuzzyRecoveryHints, tryDirectFuzzyResolution } from '../../recovery/fuzzyRecovery';
import { createVoiceLogger } from '../../utils/voiceLogger';

const log = createVoiceLogger('SimpleResolver');

function isActionable(result) {
  return result && result.type && result.type !== 'NO_MATCH' && result.type !== 'CHAIN';
}

function shouldTryAi(transcript) {
  const text = String(transcript || '').toLowerCase().trim();
  if (!text) return false;
  return text.split(/\s+/).length >= 2;
}

function normalizeAiAction(action) {
  if (!action || !action.type) return { type: 'NO_MATCH' };
  return {
    type: action.type,
    route: action.route || '',
    value: action.value || '',
    sortDirection: action.sortDirection || '',
    priorityValue: action.priorityValue || '',
    spokenResponse: action.spokenResponse || '',
    confidence: Number(action.confidence) || 0,
    normalizedText: action.normalizedText || '',
  };
}

export async function resolveSimpleVoiceIntent(transcript, runtime = {}) {
  const local = resolveLocalVoiceCommand(transcript, runtime);
  log.info('Local result', { type: local?.type || 'NO_MATCH' });
  if (isActionable(local)) {
    return { ...local, resolver: 'local-simple' };
  }

  const aiEnabled = String(import.meta.env.VITE_VOICE_AI_ENABLED || 'true') === 'true';
  const groqCooldown = voiceApiService.getGroqCooldownState?.() || { active: false };
  if (!aiEnabled || !shouldTryAi(transcript) || groqCooldown.active) {
    if (groqCooldown.active) {
      log.warn('Skipping Groq simple recovery during cooldown', { retryAfterMs: groqCooldown.retryAfterMs });
    }
    return local;
  }

  try {
    const pageId = routePathToPageId(runtime.routePath || '/dashboard');
    const recoveryPayload = buildRecoveryPayload({
      transcript,
      cacheSnapshot: runtime.cacheSnapshot || {},
    });
    const fuzzyHints = buildFuzzyRecoveryHints({ transcript, recoveryPayload });
    recoveryPayload.fuzzyHints = fuzzyHints;

    const directFuzzy = tryDirectFuzzyResolution({ transcript, recoveryPayload });
    if (directFuzzy) {
      log.info('Direct fuzzy recovery succeeded', { type: directFuzzy.type, value: directFuzzy.value, confidence: directFuzzy.confidence });
      return directFuzzy;
    }

    log.info('Sending Groq simple recovery request', {
      pageId,
      transcript,
      candidateCount: (recoveryPayload.candidateMedications || []).length,
      knownMedicationCount: (recoveryPayload.knownMedicationNames || []).length,
    });

    const aiAction = await voiceApiService.parseIntent({
      mode: 'simple',
      text: transcript,
      pageId,
      currentRoute: runtime.routePath || '/dashboard',
      recoveryPayload,
    }, { signal: runtime.abortSignal });
    const resolved = { ...normalizeAiAction(aiAction), resolver: 'ai-simple' };
    log.info('Groq simple response received', { type: resolved.type, value: resolved.value, confidence: resolved.confidence, normalizedText: resolved.normalizedText });
    return resolved;
  } catch (error) {
    if (error?.code === 'VOICE_ABORTED') {
      log.warn('Simple AI resolver aborted');
      throw error;
    }
    log.warn('Simple AI resolver failed, falling back to local only.', error);
    return local;
  }
}
