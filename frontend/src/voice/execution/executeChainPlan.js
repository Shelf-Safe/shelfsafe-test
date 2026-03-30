import { emitVoiceAppEvent } from '../eventBus';
import { waitForRouteReady } from './waitForRouteReady';
import { speakText } from '../speech/speakText';

const VOICE_TTS_ENABLED = String(import.meta.env.VITE_VOICE_TTS_ENABLED ?? 'true') === 'true';

function sleep(ms = 0, signal) {
  if (!ms) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    const handleAbort = () => {
      cleanup();
      const error = new Error('Chain execution aborted.');
      error.code = 'VOICE_ABORTED';
      reject(error);
    };
    const cleanup = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener?.('abort', handleAbort);
    };
    signal?.addEventListener?.('abort', handleAbort, { once: true });
  });
}

async function waitForCondition(predicate, { timeoutMs = 2400, pollMs = 80, signal } = {}) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    if (signal?.aborted) {
      const error = new Error('Chain execution aborted.');
      error.code = 'VOICE_ABORTED';
      throw error;
    }
    try {
      if (predicate()) return true;
    } catch {}
    await sleep(pollMs, signal);
  }
  return false;
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

function activeContextMatches(runtimeStore, matcher) {
  const activeContext = String(runtimeStore?.getState?.().activeContext || '');
  if (typeof matcher === 'function') return matcher(activeContext);
  return activeContext === matcher;
}

async function ensureRouteForStep(step, { runtimeStore, setStatusMessage, signal, logger }) {
  const requiredRoute = routeForStep(step);
  if (!requiredRoute || step.type === 'NAVIGATE') return true;
  const currentRoute = String(runtimeStore?.getState?.().routePath || '');
  if (currentRoute === requiredRoute) return true;
  setStatusMessage?.(`Routing to ${requiredRoute.replace('/', '') || 'dashboard'}...`);
  logger?.info?.('Auto inserting navigation for step', { stepType: step.type, requiredRoute, currentRoute });
  emitVoiceAppEvent({ type: 'NAVIGATE', route: requiredRoute, source: 'chain-guard' });
  return waitForRouteReady({ runtimeStore, targetRoute: requiredRoute, timeoutMs: 4200, pollMs: 80, signal });
}

async function waitForStepCompletion(step, { runtimeStore, signal } = {}) {
  switch (step.type) {
    case 'NAVIGATE':
      return waitForRouteReady({ runtimeStore, targetRoute: step.route, timeoutMs: 4200, pollMs: 80, signal });
    case 'DASHBOARD_OPEN_POS':
      return waitForCondition(() => activeContextMatches(runtimeStore, (value) => value.startsWith('pos-modal')), { timeoutMs: 2800, pollMs: 70, signal });
    case 'POS_SELECT_PROVIDER':
      return waitForCondition(() => activeContextMatches(runtimeStore, 'pos-modal:credentials'), { timeoutMs: 2600, pollMs: 70, signal });
    case 'POS_SUBMIT': {
      const submittingObserved = await waitForCondition(() => activeContextMatches(runtimeStore, 'pos-modal:submitting') || !activeContextMatches(runtimeStore, (value) => value.startsWith('pos-modal')), { timeoutMs: 1800, pollMs: 70, signal });
      if (!submittingObserved) return false;
      return waitForCondition(() => !activeContextMatches(runtimeStore, (value) => value.startsWith('pos-modal')), { timeoutMs: 6000, pollMs: 80, signal });
    }
    case 'DASHBOARD_SYNC':
      return sleep(180, signal).then(() => true);
    default:
      return sleep(120, signal).then(() => true);
  }
}

export async function executeChainPlan(plan, { runtimeStore, cacheStore, setStatusMessage, setStateWithAutoReset, updateVoiceState, logger, signal } = {}) {
  const steps = Array.isArray(plan?.steps) ? plan.steps : [];
  if (!steps.length) {
    setStatusMessage?.('No chain steps to execute.');
    setStateWithAutoReset?.('error');
    return;
  }

  updateVoiceState?.('processing');
  const executedFingerprints = new Set();

  try {
    for (let index = 0; index < steps.length; index += 1) {
      if (signal?.aborted) {
        const error = new Error('Chain execution aborted.');
        error.code = 'VOICE_ABORTED';
        throw error;
      }

      const step = steps[index];
      const fingerprint = JSON.stringify({
        index,
        type: step.type || '',
        route: step.route || '',
        value: step.value || '',
        providerKey: step.providerKey || '',
      });
      if (executedFingerprints.has(fingerprint)) {
        logger?.warn?.('Skipping duplicate chain step', { index: index + 1, type: step.type });
        continue;
      }
      executedFingerprints.add(fingerprint);

      setStatusMessage?.(`Step ${index + 1}/${steps.length}: ${step.type}`);
      const routeReady = await ensureRouteForStep(step, { runtimeStore, setStatusMessage, signal, logger, cacheStore });
      if (!routeReady) {
        throw new Error(`Unable to reach required route for ${step.type}.`);
      }

      if (Number(step.delayMs) > 0) {
        await sleep(Number(step.delayMs), signal);
      }

      emitVoiceAppEvent(step);
      logger?.info?.('Chain step emitted', { index: index + 1, type: step.type, route: step.route || '', value: step.value || '', providerKey: step.providerKey || '' });

      const completed = await waitForStepCompletion(step, { runtimeStore, signal, cacheStore });
      if (!completed) {
        logger?.warn?.('Chain step timed out waiting for completion', { index: index + 1, type: step.type });
      }
    }

    if (plan?.spokenResponse) {
      speakText(plan.spokenResponse, { enabled: VOICE_TTS_ENABLED });
    }
    setStatusMessage?.('Chain command executed.');
    setStateWithAutoReset?.('success');
  } catch (error) {
    if (error?.code === 'VOICE_ABORTED') {
      setStatusMessage?.('Chain command aborted.');
      setStateWithAutoReset?.('idle');
      return;
    }
    logger?.error?.('Chain execution failed', error);
    setStatusMessage?.(error?.message || 'Chain execution failed.');
    setStateWithAutoReset?.('error');
  }
}
