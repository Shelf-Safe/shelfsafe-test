import { createVoiceLogger } from '../utils/voiceLogger';
import { resolveSimpleVoiceIntent } from '../resolvers/simple/resolveSimpleVoiceIntent';
import { resolveChainVoiceIntent } from '../resolvers/chain/resolveChainVoiceIntent';

const log = createVoiceLogger('Resolver');

function hasExplicitChainMarkers(transcript = '') {
  const text = String(transcript || '').toLowerCase().trim();
  return /,|\band then\b|\bthen\b|\band\b|\balso\b|\bafter that\b|\bnext\b/.test(text);
}

function shouldTreatAsChain(transcript = '', runtime = {}) {
  const text = String(transcript || '').toLowerCase().trim();
  if (!text) return false;
  if (hasExplicitChainMarkers(text)) return true;
  return runtime?.listeningMode === 'chain' && text.split(/\s+/).length >= 4;
}

export async function resolveVoiceIntent(transcript, runtime = {}) {
  log.info('Starting resolve', { transcript, routePath: runtime.routePath || '/dashboard', listeningMode: runtime.listeningMode || 'single' });

  if (shouldTreatAsChain(transcript, runtime)) {
    const chainResult = await resolveChainVoiceIntent(transcript, runtime);
    if (chainResult?.type === 'CHAIN' && Array.isArray(chainResult.steps) && chainResult.steps.length) {
      return chainResult;
    }
  }

  return resolveSimpleVoiceIntent(transcript, runtime);
}
