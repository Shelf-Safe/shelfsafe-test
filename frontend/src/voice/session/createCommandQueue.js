function fingerprintPayload(payload = {}) {
  if (!payload || typeof payload !== 'object') return String(payload || '');
  const candidate = {
    type: payload.type || '',
    route: payload.route || '',
    value: payload.value || '',
    normalizedText: payload.normalizedText || '',
    stepCount: Array.isArray(payload.steps) ? payload.steps.length : 0,
  };
  try {
    return JSON.stringify(candidate);
  } catch {
    return `${candidate.type}:${candidate.route}:${candidate.value}`;
  }
}

export function createCommandQueue({ onExecute, dedupeWindowMs = 1400 } = {}) {
  const queue = [];
  const recentFingerprints = new Map();
  let running = false;
  let generation = 0;

  async function drain() {
    if (running) return;
    running = true;

    while (queue.length) {
      const nextTask = queue.shift();
      if (nextTask.generation !== generation) {
        nextTask.resolve?.({ skipped: true, reason: 'queue_reset' });
        continue;
      }
      try {
        await onExecute?.(nextTask.payload, { generation: nextTask.generation, enqueuedAt: nextTask.enqueuedAt });
      } catch (error) {
        console.error('[Voice] command queue execution failed', error);
      } finally {
        nextTask.resolve?.({ skipped: false });
      }
    }

    running = false;
  }

  return {
    enqueue(payload) {
      const fingerprint = fingerprintPayload(payload);
      const now = Date.now();
      const recentAt = recentFingerprints.get(fingerprint) || 0;
      if (recentAt && now - recentAt < dedupeWindowMs) {
        return Promise.resolve({ skipped: true, reason: 'duplicate' });
      }
      recentFingerprints.set(fingerprint, now);
      for (const [key, ts] of recentFingerprints.entries()) {
        if (now - ts > dedupeWindowMs * 3) recentFingerprints.delete(key);
      }

      return new Promise((resolve) => {
        queue.push({ payload, resolve, generation, enqueuedAt: now });
        drain();
      });
    },
    clear() {
      generation += 1;
      queue.length = 0;
    },
    size() {
      return queue.length;
    },
    getGeneration() {
      return generation;
    },
  };
}
