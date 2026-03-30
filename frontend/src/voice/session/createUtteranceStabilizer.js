
function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function selectBestFragment(fragments = []) {
  if (!Array.isArray(fragments) || !fragments.length) return null;
  return [...fragments]
    .sort((a, b) => {
      const finalScore = Number(Boolean(b.isFinal)) - Number(Boolean(a.isFinal));
      if (finalScore) return finalScore;
      const lengthScore = (b.normalized?.length || 0) - (a.normalized?.length || 0);
      if (lengthScore) return lengthScore;
      return (b.receivedAt || 0) - (a.receivedAt || 0);
    })[0];
}

export function createUtteranceStabilizer({ onCommit, logger, finalSettleMs = 140, silenceCommitMs = 820 } = {}) {
  let fragments = [];
  let commitTimer = null;

  function clearCommitTimer() {
    if (commitTimer) {
      window.clearTimeout(commitTimer);
      commitTimer = null;
    }
  }

  function scheduleCommit(reason = 'silence', delayMs = silenceCommitMs) {
    clearCommitTimer();
    commitTimer = window.setTimeout(() => commit(reason), delayMs);
  }

  function pushFragment({ transcript = '', isFinal = false, raw = null, sessionId = '' } = {}) {
    const text = String(transcript || '').trim();
    if (!text) return;
    const normalized = normalizeText(text);
    if (!normalized) return;

    const nextFragment = {
      transcript: text,
      normalized,
      isFinal: Boolean(isFinal),
      raw,
      sessionId,
      receivedAt: Date.now(),
    };

    const last = fragments[fragments.length - 1] || null;
    if (!last) {
      fragments.push(nextFragment);
    } else if (last.normalized === normalized) {
      fragments[fragments.length - 1] = {
        ...last,
        transcript: text,
        isFinal: Boolean(last.isFinal || isFinal),
        raw,
        receivedAt: nextFragment.receivedAt,
      };
    } else if (normalized.startsWith(last.normalized) || last.normalized.startsWith(normalized)) {
      const preferred = normalized.length >= last.normalized.length ? nextFragment : { ...last, isFinal: Boolean(last.isFinal || isFinal) };
      fragments[fragments.length - 1] = preferred;
    } else {
      fragments.push(nextFragment);
    }

    logger?.debug?.('Utterance fragment buffered', {
      sessionId,
      fragmentCount: fragments.length,
      isFinal,
      transcript: text,
    });

    scheduleCommit(isFinal ? 'final' : 'silence', isFinal ? finalSettleMs : silenceCommitMs);
  }

  function commit(reason = 'silence') {
    clearCommitTimer();
    const best = selectBestFragment(fragments);
    if (!best?.transcript) {
      fragments = [];
      return null;
    }

    const payload = {
      sessionId: best.sessionId || '',
      transcript: best.transcript,
      normalizedTranscript: best.normalized,
      fragments: [...fragments],
      committedAt: Date.now(),
      reason,
      isFinal: fragments.some((fragment) => fragment.isFinal),
    };

    fragments = [];
    onCommit?.(payload);
    return payload;
  }

  function reset() {
    clearCommitTimer();
    fragments = [];
  }

  function hasBufferedTranscript() {
    return fragments.length > 0;
  }

  function peek() {
    return selectBestFragment(fragments);
  }

  return {
    addFragment: pushFragment,
    flush(reason = 'manual_stop') {
      if (!fragments.length) return null;
      return commit(reason);
    },
    reset,
    hasBufferedTranscript,
    peek,
  };
}
