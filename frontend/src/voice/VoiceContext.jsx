import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { emitVoiceAppEvent } from './eventBus';
import { createSpeechProvider } from './speech/createSpeechProvider';
import { resolveVoiceIntent } from './orchestrators/resolveVoiceIntent';
import { createVoiceSessionManager } from './session/createVoiceSessionManager';
import { createCommandQueue } from './session/createCommandQueue';
import { createUtteranceStabilizer } from './session/createUtteranceStabilizer';
import { executeChainPlan } from './execution/executeChainPlan';
import { createVoiceRuntimeStore } from './runtime/createVoiceRuntimeStore';
import { createVoiceCacheStore } from './cache/createVoiceCacheStore';
import { GLOBAL_VOICE_CONFIG } from './cache/globalVoiceConfig';
import { DASHBOARD_VOICE_SCHEMA, INVENTORY_VOICE_SCHEMA, PROFILE_VOICE_SCHEMA } from './cache/pageSchemas';
import { routePathToPageId } from './utils/pageId';
import { createVoiceLogger, setActiveVoiceLogSession, clearActiveVoiceLogSession } from './utils/voiceLogger';
import { speakText } from './speech/speakText';
import { voiceApiService } from '../services/voiceApiService';

const VoiceContext = createContext(null);
const SPEECH_PROVIDER_NAME = import.meta.env.VITE_VOICE_STT_PROVIDER || 'browser';
const VOICE_TTS_ENABLED = String(import.meta.env.VITE_VOICE_TTS_ENABLED ?? 'true') === 'true';

function createSessionId(mode = 'single') {
  return `voice-${mode}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeTranscriptFingerprint(text = '') {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function syncSpeechHints(cacheStore) {
  const snapshot = cacheStore.getState();
  const pageId = snapshot?.runtime?.activePage || 'dashboard';
  const pageState = snapshot?.pages?.[pageId]?.state || {};
  const pageSchema = snapshot?.pages?.[pageId]?.schema || {};
  window.__SHELFSAFE_VOICE_HINTS__ = {
    pageId,
    keyterms: [
      ...(pageSchema.allowedIntents || []),
      ...(pageState.visibleMedications || []),
      ...(pageState.knownMedicationNames || []),
      ...(pageState.alertNames || []),
    ].slice(0, 30),
    medications: [
      ...(pageState.visibleMedications || []),
      ...(pageState.knownMedicationNames || []),
    ].slice(0, 30),
    posProviders: snapshot?.global?.posProviders || [],
  };
}

export function VoiceProvider({ children }) {
  const log = createVoiceLogger('Context');
  const speechProviderRef = useRef(createSpeechProvider(SPEECH_PROVIDER_NAME));
  const runtimeStoreRef = useRef(createVoiceRuntimeStore());
  const cacheStoreRef = useRef(createVoiceCacheStore());
  const voiceStateRef = useRef('idle');
  const lastTranscriptRef = useRef({ text: '', time: 0, sessionId: '' });
  const resetStateTimerRef = useRef(null);
  const chainEnabledRef = useRef(false);
  const activeSessionRef = useRef({ id: '', mode: 'single' });
  const currentAbortControllerRef = useRef(null);

  const [voiceState, setVoiceState] = useState('idle');
  const [isSupported] = useState(Boolean(speechProviderRef.current?.isSupported?.()));
  const [activeContext, setActiveContextState] = useState(null);
  const [routePath, setRoutePathState] = useState('/dashboard');
  const [lastHeard, setLastHeard] = useState('');
  const [statusMessage, setStatusMessage] = useState('Ready');
  const [listeningMode, setListeningModeState] = useState('single');

  if (!cacheStoreRef.current.__seeded) {
    cacheStoreRef.current.patchGlobal(GLOBAL_VOICE_CONFIG);
    cacheStoreRef.current.registerPageSchema('dashboard', DASHBOARD_VOICE_SCHEMA);
    cacheStoreRef.current.registerPageSchema('inventory', INVENTORY_VOICE_SCHEMA);
    cacheStoreRef.current.registerPageSchema('profile', PROFILE_VOICE_SCHEMA);
    cacheStoreRef.current.__seeded = true;
    syncSpeechHints(cacheStoreRef.current);
    log.info('Voice cache seeded');
  }

  const updateVoiceState = useCallback((nextState) => {
    voiceStateRef.current = nextState;
    setVoiceState(nextState);
  }, []);

  const setStateWithAutoReset = useCallback((nextState) => {
    updateVoiceState(nextState);
    if (nextState === 'success' || nextState === 'error') {
      window.clearTimeout(resetStateTimerRef.current);
      resetStateTimerRef.current = window.setTimeout(() => updateVoiceState('idle'), 1200);
    }
  }, [updateVoiceState]);

  const resetAbortController = useCallback(() => {
    try {
      currentAbortControllerRef.current?.abort?.('Voice session replaced.');
    } catch {}
    currentAbortControllerRef.current = new AbortController();
    return currentAbortControllerRef.current;
  }, []);

  const executeResolvedCommand = useCallback(async (resolved) => {
    cacheStoreRef.current.patchRuntime({ lastCommand: resolved || null });
    runtimeStoreRef.current.patch({ lastCommand: resolved || null });
    syncSpeechHints(cacheStoreRef.current);
    setStatusMessage(`Executing ${resolved?.type || 'command'}...`);
    if (!resolved || resolved.type === 'NO_MATCH') {
      setStatusMessage('No matching command found.');
      setStateWithAutoReset('error');
      return;
    }

    if (resolved.type === 'STOP_LISTENING') {
      chainEnabledRef.current = false;
      sessionManagerRef.current?.stop?.();
      setStatusMessage('Voice control stopped.');
      setStateWithAutoReset('idle');
      return;
    }

    updateVoiceState('processing');
    const signal = currentAbortControllerRef.current?.signal;

    if (resolved.type === 'CHAIN' && Array.isArray(resolved.steps)) {
      await executeChainPlan(resolved, {
        runtimeStore: runtimeStoreRef.current,
        cacheStore: cacheStoreRef.current,
        setStatusMessage,
        setStateWithAutoReset,
        updateVoiceState,
        logger: log,
        signal,
      });
      return;
    }

    if (resolved.type === 'BATCH' && Array.isArray(resolved.commands)) {
      await executeChainPlan({ type: 'CHAIN', steps: resolved.commands }, {
        runtimeStore: runtimeStoreRef.current,
        cacheStore: cacheStoreRef.current,
        setStatusMessage,
        setStateWithAutoReset,
        updateVoiceState,
        logger: log,
        signal,
      });
      return;
    }

    if (signal?.aborted) return;
    emitVoiceAppEvent(resolved);
    if (resolved?.spokenResponse) {
      speakText(resolved.spokenResponse, { enabled: VOICE_TTS_ENABLED });
    }
    setStatusMessage('Command executed.');
    setStateWithAutoReset('success');
  }, [setStateWithAutoReset, updateVoiceState]);

  const commandQueueRef = useRef(createCommandQueue({ onExecute: executeResolvedCommand }));

  const commitTranscriptRef = useRef(async () => {});

  const stabilizerRef = useRef(createUtteranceStabilizer({
    logger: log,
    onCommit: (payload) => commitTranscriptRef.current?.(payload),
  }));

  const processCommittedTranscript = useCallback(async ({ transcript, normalizedTranscript, reason, sessionId, fragments = [] } = {}) => {
    const cleanedTranscript = String(transcript || '').trim();
    if (!cleanedTranscript) return;

    const fingerprint = normalizeTranscriptFingerprint(normalizedTranscript || cleanedTranscript);
    const now = Date.now();
    const sameSession = lastTranscriptRef.current.sessionId === sessionId;
    if (sameSession && lastTranscriptRef.current.text === fingerprint && now - lastTranscriptRef.current.time < 1600) {
      log.debug('Skipping duplicate committed transcript', { sessionId, transcript: cleanedTranscript, reason });
      return;
    }

    lastTranscriptRef.current = { text: fingerprint, time: now, sessionId };
    setLastHeard(cleanedTranscript);
    setStatusMessage(`Heard: ${cleanedTranscript}`);
    runtimeStoreRef.current.patch({ lastHeard: cleanedTranscript });
    cacheStoreRef.current.patchRuntime({ lastTranscript: cleanedTranscript });
    syncSpeechHints(cacheStoreRef.current);

    const runtime = runtimeStoreRef.current.getState();
    const cacheSnapshot = cacheStoreRef.current.getState();

    log.info('Committed transcript', {
      sessionId,
      transcript: cleanedTranscript,
      reason,
      fragmentCount: fragments.length,
      routePath: runtime.routePath,
      listeningMode: runtime.listeningMode,
    });

    try {
      const resolved = await resolveVoiceIntent(cleanedTranscript, {
        activeContext: runtime.activeContext,
        routePath: runtime.routePath,
        listeningMode: runtime.listeningMode,
        cacheSnapshot,
        abortSignal: currentAbortControllerRef.current?.signal,
      });

      if (currentAbortControllerRef.current?.signal?.aborted) return;

      cacheStoreRef.current.patchRuntime({
        lastNormalizedText: resolved?.normalizedText || '',
        lastCommand: resolved || null,
      });
      cacheStoreRef.current.appendHistory({
        transcript: cleanedTranscript,
        resolvedType: resolved?.type || 'NO_MATCH',
        resolver: resolved?.resolver || 'unknown',
        sessionId,
      });
      syncSpeechHints(cacheStoreRef.current);

      log.info('Resolved transcript', {
        sessionId,
        type: resolved?.type || 'NO_MATCH',
        resolver: resolved?.resolver || 'unknown',
        value: resolved?.value || '',
      });
      await commandQueueRef.current.enqueue(resolved);
    } catch (error) {
      if (error?.code === 'VOICE_ABORTED') {
        log.warn('Transcript resolution aborted', { sessionId });
        return;
      }
      log.warn('Transcript resolution failed', error);
      setStatusMessage(error?.message || 'Unable to resolve voice command.');
      setStateWithAutoReset('error');
    }
  }, [log, setStateWithAutoReset]);

  commitTranscriptRef.current = processCommittedTranscript;

  const sessionManagerRef = useRef(createVoiceSessionManager({
    provider: speechProviderRef.current,
    onVoiceStateChange: updateVoiceState,
    onTranscript: ({ transcript, raw, isFinal }) => {
      const cleanedTranscript = String(transcript || '').trim();
      if (!cleanedTranscript) return;
      setStatusMessage(isFinal ? `Heard final: ${cleanedTranscript}` : `Hearing: ${cleanedTranscript}`);
      setLastHeard(cleanedTranscript);
      runtimeStoreRef.current.patch({ lastHeard: cleanedTranscript });
      cacheStoreRef.current.patchRuntime({ lastTranscript: cleanedTranscript });
      syncSpeechHints(cacheStoreRef.current);
      stabilizerRef.current.addFragment({
        transcript: cleanedTranscript,
        raw,
        isFinal,
        sessionId: activeSessionRef.current.id,
      });
    },
    onError: (error) => {
      setStatusMessage(error?.message || 'Voice provider error.');
      if (!chainEnabledRef.current) {
        setStateWithAutoReset('error');
      }
    },
    shouldRecoverChainSession: () => chainEnabledRef.current && !currentAbortControllerRef.current?.signal?.aborted,
  }));

  const beginVoiceSession = useCallback((mode = 'single') => {
    const sessionId = createSessionId(mode);
    activeSessionRef.current = { id: sessionId, mode };
    setActiveVoiceLogSession(sessionId);
    resetAbortController();
    commandQueueRef.current.clear();
    runtimeStoreRef.current.patch({ listeningMode: mode, sessionId, lastCommand: null });
    cacheStoreRef.current.patchRuntime({ listeningMode: mode, sessionId, lastCommand: null });
    syncSpeechHints(cacheStoreRef.current);
    stabilizerRef.current.reset();
    log.info('Voice session started', { sessionId, mode });
    return sessionId;
  }, [log, resetAbortController]);

  const stopListening = useCallback(({ flushBuffered = true, abortRunning = false, reason = 'manual_stop', nextMessage = 'Voice control stopped.' } = {}) => {
    chainEnabledRef.current = false;
    if (flushBuffered) {
      stabilizerRef.current.flush(reason);
    } else {
      stabilizerRef.current.reset();
    }
    if (abortRunning) {
      try {
        currentAbortControllerRef.current?.abort?.(nextMessage);
      } catch {}
      voiceApiService.abortActiveParses(nextMessage);
      commandQueueRef.current.clear();
    }
    sessionManagerRef.current.stop();
    setStatusMessage(nextMessage);
    setStateWithAutoReset('idle');
    clearActiveVoiceLogSession();
  }, [setStateWithAutoReset]);

  const abortVoiceSession = useCallback(() => {
    stopListening({
      flushBuffered: false,
      abortRunning: true,
      reason: 'abort',
      nextMessage: 'Chain command aborted.',
    });
  }, [stopListening]);

  const startListening = useCallback((mode = 'single') => {
    setStatusMessage(mode === 'chain' ? 'Starting chain listening...' : 'Starting listening...');
    chainEnabledRef.current = mode === 'chain';
    beginVoiceSession(mode);
    setListeningModeState(mode);
    sessionManagerRef.current.start(mode);
  }, [beginVoiceSession]);

  const toggleListening = useCallback(() => {
    if (voiceStateRef.current === 'listening' || voiceStateRef.current === 'processing') {
      stopListening({
        flushBuffered: true,
        abortRunning: voiceStateRef.current === 'processing',
        reason: 'manual_stop',
        nextMessage: 'Voice control stopped.',
      });
      return;
    }
    startListening('single');
  }, [startListening, stopListening]);

  const startChainListening = useCallback(() => {
    if (voiceStateRef.current === 'listening' && runtimeStoreRef.current.getState().listeningMode === 'chain') return;
    startListening('chain');
  }, [startListening]);

  const setActiveContext = useCallback((value) => {
    runtimeStoreRef.current.patch({ activeContext: value });
    cacheStoreRef.current.patchRuntime({ focusedComponent: value || null });
    syncSpeechHints(cacheStoreRef.current);
    setActiveContextState(value);
  }, []);

  const setRoutePath = useCallback((value) => {
    const pageId = routePathToPageId(value);
    runtimeStoreRef.current.patch({ routePath: value });
    cacheStoreRef.current.patchRuntime({ currentRoute: value, activePage: pageId });
    syncSpeechHints(cacheStoreRef.current);
    setRoutePathState(value);
  }, []);

  const registerVoicePageSchema = useCallback((pageId, schema) => {
    cacheStoreRef.current.registerPageSchema(pageId, schema);
    syncSpeechHints(cacheStoreRef.current);
    log.info('Page schema registered', { pageId, actionCount: schema?.actions?.length || 0 });
  }, [log]);

  const updateVoicePageState = useCallback((pageId, nextState) => {
    cacheStoreRef.current.patchPageState(pageId, nextState);
    syncSpeechHints(cacheStoreRef.current);
    log.info('Page state updated', {
      pageId,
      visibleMedicationCount: nextState?.visibleMedications?.length || 0,
      knownMedicationCount: nextState?.knownMedicationNames?.length || 0,
    });
  }, [log]);

  const getVoiceCacheSnapshot = useCallback(() => cacheStoreRef.current.getState(), []);

  const value = useMemo(() => ({
    voiceState,
    isSupported,
    toggleListening,
    stopListening,
    abortVoiceSession,
    activeContext,
    setActiveContext,
    routePath,
    setRoutePath,
    lastHeard,
    statusMessage,
    listeningMode,
    startChainListening,
    speechProviderName: SPEECH_PROVIDER_NAME,
    registerVoicePageSchema,
    updateVoicePageState,
    getVoiceCacheSnapshot,
  }), [voiceState, isSupported, toggleListening, stopListening, abortVoiceSession, activeContext, setActiveContext, routePath, setRoutePath, lastHeard, statusMessage, listeningMode, startChainListening, registerVoicePageSchema, updateVoicePageState, getVoiceCacheSnapshot]);

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) throw new Error('useVoice must be used inside VoiceProvider');
  return context;
}
