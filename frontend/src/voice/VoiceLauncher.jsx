import React, { useRef, useState } from 'react';
import voiceIcon from '../assets/voice-control.svg';
import { useVoice } from './VoiceContext';

export function VoiceLauncher() {
  const { voiceState, toggleListening, startChainListening, stopListening, isSupported, listeningMode, lastHeard, statusMessage, speechProviderName } = useVoice();
  const active = voiceState === 'listening' || voiceState === 'processing';
  const [isPressing, setIsPressing] = useState(false);
  const holdTimerRef = useRef(null);
  const longPressRef = useRef(false);

  function clearHoldTimer() {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  function handlePressStart(event) {
    if (event?.cancelable) event.preventDefault();
    console.log('[Voice][Launcher] press start', { isSupported, active, listeningMode });
    if (!isSupported) return;
    setIsPressing(true);
    longPressRef.current = false;
    clearHoldTimer();
    holdTimerRef.current = window.setTimeout(() => {
      longPressRef.current = true;
      if (active && listeningMode === 'chain') {
        stopListening();
        return;
      }
      startChainListening();
    }, 450);
  }

  function handlePressEnd(event) {
    if (event?.cancelable) event.preventDefault();
    console.log('[Voice][Launcher] press end', { isSupported, active, listeningMode });
    setIsPressing(false);
    if (!isSupported) return;
    const wasLongPress = longPressRef.current;
    clearHoldTimer();
    if (!wasLongPress) {
      toggleListening();
    }
    window.setTimeout(() => {
      longPressRef.current = false;
    }, 0);
  }

  const title = !isSupported
    ? 'Voice control unavailable in this browser'
    : 'Click once for one command. Press and hold for continuous chain mode. Double click to stop.';

  return (
    <button
      onDoubleClick={stopListening}
      type="button"
      onPointerDown={handlePressStart}
      onPointerUp={handlePressEnd}
      onPointerCancel={handlePressEnd}
      onPointerLeave={() => { setIsPressing(false); clearHoldTimer(); }}
      disabled={!isSupported}
      className={`voice-launcher ${(active || isPressing) ? 'voice-launcher--active' : ''} ${voiceState === 'success' ? 'voice-launcher--success' : ''} ${voiceState === 'error' ? 'voice-launcher--error' : ''}`}
      aria-label={isSupported ? 'Toggle voice control' : 'Voice control unavailable in this browser'}
      title={title}
    >
      <span className="voice-launcher__icon-wrap" aria-hidden="true">
        <img src={voiceIcon} alt="" className="voice-launcher__icon" />
      </span>
      <span className="voice-launcher__label">{active && listeningMode === 'chain' ? 'Voice Chain' : 'Voice Control'}</span>
      <span style={{ display: 'block', fontSize: 10, opacity: 0.8, marginTop: 4 }}>{speechProviderName}</span>
      <span style={{ display: 'block', fontSize: 10, opacity: 0.8, marginTop: 2, maxWidth: 120, whiteSpace: 'normal' }}>{statusMessage}</span>
      {lastHeard ? <span style={{ display: 'block', fontSize: 10, opacity: 0.7, marginTop: 2, maxWidth: 120, whiteSpace: 'normal' }}>Heard: {lastHeard}</span> : null}
    </button>
  );
}
