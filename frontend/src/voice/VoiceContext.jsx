import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { emitVoiceAppEvent } from './eventBus';
import { createSpeechProvider } from './speech/createSpeechProvider';
import { resolveVoiceIntent } from './orchestrators/resolveVoiceIntent';
import { createVoiceSessionManager } from './session/createVoiceSessionManager';
import { createCommandQueue } from './session/createCommandQueue';
import { executeChainPlan } from './execution/executeChainPlan';
import { createVoiceRuntimeStore } from './runtime/createVoiceRuntimeStore';
import { createVoiceCacheStore } from './cache/createVoiceCacheStore';
import { GLOBAL_VOICE_CONFIG } from './cache/globalVoiceConfig';
import { DASHBOARD_VOICE_SCHEMA, INVENTORY_VOICE_SCHEMA, PROFILE_VOICE_SCHEMA } from './cache/pageSchemas';
import { routePathToPageId } from './utils/pageId';
import { createVoiceLogger } from './utils/voiceLogger';
import { speakText } from './speech/speakText';

const VoiceContext = createContext(null);
const SPEECH_PROVIDER_NAME = import.meta.env.VITE_VOICE_STT_PROVIDER || 'browser';
const VOICE_TTS_ENABLED = String(import.meta.env.VITE_VOICE_TTS_ENABLED ?? 'true') === 'true';

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
  const lastTranscriptRef = useRef({ text: '', time: 0 });
  const resetStateTimerRef = useRef(null);
  const chainEnabledRef = useRef(false);

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

  const executeResolvedCommand = useCallback(async (resolved) => {
    cacheStoreRef.current.patchRuntime({ lastCommand: resolved || null });
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

    if (resolved.type === 'CHAIN' && Array.isArray(resolved.steps)) {
      await executeChainPlan(resolved, {
        runtimeStore: runtimeStoreRef.current,
        setStatusMessage,
        setStateWithAutoReset,
        updateVoiceState,
        logger: log,
      });
      return;
    }

    updateVoiceState('processing');

    if (resolved.type === 'BATCH' && Array.isArray(resolved.commands)) {
      await executeChainPlan({ type: 'CHAIN', steps: resolved.commands }, {
        runtimeStore: runtimeStoreRef.current,
        setStatusMessage,
        setStateWithAutoReset,
        updateVoiceState,
        logger: log,
      });
      return;
    }

    emitVoiceAppEvent(resolved);
    if (resolved?.spokenResponse) {
      speakText(resolved.spokenResponse, { enabled: VOICE_TTS_ENABLED });
    }
    setStatusMessage('Command executed.');
    setStateWithAutoReset('success');
  }, [setStateWithAutoReset, updateVoiceState]);

  const commandQueueRef = useRef(createCommandQueue({ onExecute: executeResolvedCommand }));

  const processTranscript = useCallback(async ({ transcript, isFinal }) => {
    const cleanedTranscript = String(transcript || '').trim();
    setStatusMessage(isFinal ? `Heard final: ${cleanedTranscript}` : `Hearing: ${cleanedTranscript}`);
    if (!cleanedTranscript) return;

    setLastHeard(cleanedTranscript);
    runtimeStoreRef.current.patch({ lastHeard: cleanedTranscript });
    cacheStoreRef.current.patchRuntime({ lastTranscript: cleanedTranscript });
    syncSpeechHints(cacheStoreRef.current);

    if (!isFinal) return;

    const now = Date.now();
    if (lastTranscriptRef.current.text === cleanedTranscript.toLowerCase() && now - lastTranscriptRef.current.time < 1500) {
      return;
    }

    lastTranscriptRef.current = { text: cleanedTranscript.toLowerCase(), time: now };

    const runtime = runtimeStoreRef.current.getState();
    const cacheSnapshot = cacheStoreRef.current.getState();
    const resolved = await resolveVoiceIntent(cleanedTranscript, {
      activeContext: runtime.activeContext,
      routePath: runtime.routePath,
      listeningMode: runtime.listeningMode,
      cacheSnapshot,
    });

    cacheStoreRef.current.patchRuntime({
      lastNormalizedText: resolved?.normalizedText || '',
      lastCommand: resolved || null,
    });
    cacheStoreRef.current.appendHistory({
      transcript: cleanedTranscript,
      resolvedType: resolved?.type || 'NO_MATCH',
      resolver: resolved?.resolver || 'unknown',
    });
    syncSpeechHints(cacheStoreRef.current);

    log.info('Resolved transcript', { type: resolved?.type || 'NO_MATCH', resolver: resolved?.resolver || 'unknown', value: resolved?.value || '' });
    await commandQueueRef.current.enqueue(resolved);
  }, []);

  const sessionManagerRef = useRef(createVoiceSessionManager({
    provider: speechProviderRef.current,
    onVoiceStateChange: updateVoiceState,
    onTranscript: processTranscript,
    onError: (error) => {
      setStatusMessage(error?.message || 'Voice provider error.');
      if (!chainEnabledRef.current) {
        setStateWithAutoReset('error');
      }
    },
  }));

  const stopListening = useCallback(() => {
    chainEnabledRef.current = false;
    commandQueueRef.current.clear();
    sessionManagerRef.current.stop();
  }, []);

  const startListening = useCallback((mode = 'single') => {
    setStatusMessage(mode === 'chain' ? 'Starting chain listening...' : 'Starting listening...');
    chainEnabledRef.current = mode === 'chain';
    runtimeStoreRef.current.patch({ listeningMode: mode });
    cacheStoreRef.current.patchRuntime({ listeningMode: mode });
    syncSpeechHints(cacheStoreRef.current);
    setListeningModeState(mode);
    sessionManagerRef.current.start(mode);
  }, []);

  const toggleListening = useCallback(() => {
    if (voiceStateRef.current === 'listening' || voiceStateRef.current === 'processing') {
      stopListening();
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
  }, []);

  const updateVoicePageState = useCallback((pageId, nextState) => {
    cacheStoreRef.current.patchPageState(pageId, nextState);
    syncSpeechHints(cacheStoreRef.current);
    log.info('Page state updated', {
      pageId,
      visibleMedicationCount: nextState?.visibleMedications?.length || 0,
      knownMedicationCount: nextState?.knownMedicationNames?.length || 0,
    });
  }, []);

  const getVoiceCacheSnapshot = useCallback(() => cacheStoreRef.current.getState(), []);

  const value = useMemo(() => ({
    voiceState,
    isSupported,
    toggleListening,
    stopListening,
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
  }), [voiceState, isSupported, toggleListening, stopListening, activeContext, setActiveContext, routePath, setRoutePath, lastHeard, statusMessage, listeningMode, startChainListening, registerVoicePageSchema, updateVoicePageState, getVoiceCacheSnapshot]);

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
}

export function useVoice() {
  const context = useContext(VoiceContext);
  if (!context) throw new Error('useVoice must be used inside VoiceProvider');
  return context;
}
