import { createVoiceLogger } from '../utils/voiceLogger';

export function createVoiceSessionManager({ provider, onVoiceStateChange, onTranscript, onError } = {}) {
  const log = createVoiceLogger('Session');
  let session = null;
  let stoppedByUser = false;
  let listeningMode = 'single';
  let restartTimer = null;

  function clearRestartTimer() {
    if (restartTimer) {
      window.clearTimeout(restartTimer);
      restartTimer = null;
    }
  }

  function stopSession() {
    clearRestartTimer();
    try {
      session?.stop?.();
    } catch {}
    session = null;
  }

  function scheduleChainRecovery() {
    clearRestartTimer();
    restartTimer = window.setTimeout(() => {
      if (!stoppedByUser && listeningMode === 'chain') {
        log.info('Restarting chain session');
        startSession('chain');
      }
    }, 180);
  }

  function startSession(mode = 'single') {
    if (!provider?.isSupported?.()) {
      onError?.(new Error('Selected voice provider is not supported in this browser.'));
      return;
    }

    stoppedByUser = false;
    listeningMode = mode;
    stopSession();

    log.info('Starting session', { mode });
    session = provider.createSession({
      mode,
      onStart: () => { onVoiceStateChange?.('listening'); },
      onInterimResult: (transcript, raw) => { onTranscript?.({ transcript, raw, isFinal: false }); },
      onResult: (transcript, raw) => { log.info('Final transcript received', transcript); onTranscript?.({ transcript, raw, isFinal: true }); },
      onError: (error) => {
        log.warn('Provider error', error);
        if (stoppedByUser) return;
        onError?.(error);
      },
      onEnd: () => {
        session = null;
        if (!stoppedByUser && listeningMode === 'chain') {
          scheduleChainRecovery();
          return;
        }
        onVoiceStateChange?.('idle');
      },
    });

    session.start();
  }

  return {
    start(mode = 'single') {
      startSession(mode);
    },
    stop() {
      stoppedByUser = true;
      stopSession();
      onVoiceStateChange?.('idle');
    },
    getListeningMode() {
      return listeningMode;
    },
    isActive() {
      return Boolean(session);
    },
  };
}
