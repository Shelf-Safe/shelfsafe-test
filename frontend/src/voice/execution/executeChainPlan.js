import { emitVoiceAppEvent } from '../eventBus';
import { waitForRouteReady } from './waitForRouteReady';
import { speakText } from '../speech/speakText';

const VOICE_TTS_ENABLED = String(import.meta.env.VITE_VOICE_TTS_ENABLED ?? 'true') === 'true';

async function waitForActiveContext(runtimeStore, targetContext, timeoutMs = 2500, pollMs = 60) {
  if (!runtimeStore || !targetContext) return false;
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const activeContext = runtimeStore.getState?.().activeContext || null;
    if (activeContext === targetContext) return true;
    await new Promise((resolve) => window.setTimeout(resolve, pollMs));
  }
  return false;
}

export async function executeChainPlan(plan, { runtimeStore, setStatusMessage, setStateWithAutoReset, updateVoiceState, logger } = {}) {
  const steps = Array.isArray(plan?.steps) ? plan.steps : [];
  if (!steps.length) {
    setStatusMessage?.('No chain steps to execute.');
    setStateWithAutoReset?.('error');
    return;
  }

  updateVoiceState?.('processing');

  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    const delay = Number(step.delayMs || 0) || 0;
    setStatusMessage?.(`Step ${index + 1}/${steps.length}: ${step.type}`);
    if (delay) {
      await new Promise((resolve) => window.setTimeout(resolve, delay));
    }
    emitVoiceAppEvent(step);
    logger?.info?.('Chain step emitted', { index: index + 1, type: step.type, route: step.route || '', value: step.value || '' });

    if (step.type === 'NAVIGATE' && step.route) {
      await waitForRouteReady({ runtimeStore, targetRoute: step.route });
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    } else if (String(step.type || '').startsWith('POS_')) {
      await waitForActiveContext(runtimeStore, 'pos-modal');
      await new Promise((resolve) => window.setTimeout(resolve, 300));
    } else {
      await new Promise((resolve) => window.setTimeout(resolve, 300));
    }
  }

  if (plan?.spokenResponse) {
    speakText(plan.spokenResponse, { enabled: VOICE_TTS_ENABLED });
  }
  setStatusMessage?.('Chain command executed.');
  setStateWithAutoReset?.('success');
}
