import React, { useRef, useState } from 'react';
import voiceIcon from '../assets/voice-control.svg';
import { useVoice } from './VoiceContext';

export function VoiceLauncher() {
  const {
    voiceState,
    toggleListening,
    startChainListening,
    abortVoiceSession,
    isSupported,
    lastHeard,
    statusMessage,
  } = useVoice();

  const active = voiceState === 'listening' || voiceState === 'processing';
  const [isPressing, setIsPressing] = useState(false);
  const holdTimerRef = useRef(null);
  const tapTimerRef = useRef(null);
  const longPressRef = useRef(false);

  function clearHoldTimer() {
    if (holdTimerRef.current) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }

  function clearTapTimer() {
    if (tapTimerRef.current) {
      window.clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
    }
  }

  function handlePressStart(event) {
    if (event?.cancelable) event.preventDefault();
    if (!isSupported) return;
    setIsPressing(true);
    longPressRef.current = false;
    clearHoldTimer();
    holdTimerRef.current = window.setTimeout(() => {
      longPressRef.current = true;
      clearTapTimer();
      startChainListening();
    }, 450);
  }

  function handlePressEnd(event) {
    if (event?.cancelable) event.preventDefault();
    setIsPressing(false);
    if (!isSupported) return;
    const wasLongPress = longPressRef.current;
    clearHoldTimer();
    if (!wasLongPress) {
      clearTapTimer();
      tapTimerRef.current = window.setTimeout(() => {
        toggleListening();
        tapTimerRef.current = null;
      }, 220);
    }
    window.setTimeout(() => {
      longPressRef.current = false;
    }, 0);
  }

  function handleDoubleClick(event) {
    if (event?.cancelable) event.preventDefault();
    clearTapTimer();
    abortVoiceSession();
  }

  const helperText = !isSupported
    ? 'Voice unavailable in this browser'
    : 'Tap once • Hold for chain • Double tap to stop';

  const heardText = lastHeard ? `Heard: ${lastHeard}` : '';

  return (
    <div className={`voice-panel ${active ? 'voice-panel--active' : ''} ${voiceState === 'success' ? 'voice-panel--success' : ''} ${voiceState === 'error' ? 'voice-panel--error' : ''}`}>
      <div className="voice-panel__microcopy" aria-live="polite">{statusMessage}</div>
      <div className="voice-panel__helper">{helperText}</div>

      <button
        onDoubleClick={handleDoubleClick}
        type="button"
        onPointerDown={handlePressStart}
        onPointerUp={handlePressEnd}
        onPointerCancel={handlePressEnd}
        onPointerLeave={() => { setIsPressing(false); clearHoldTimer(); }}
        disabled={!isSupported}
        className={`voice-launcher ${(active || isPressing) ? 'voice-launcher--active' : ''} ${voiceState === 'success' ? 'voice-launcher--success' : ''} ${voiceState === 'error' ? 'voice-launcher--error' : ''}`}
        aria-label={isSupported ? 'Toggle voice assistant' : 'Voice assistant unavailable in this browser'}
        title={helperText}
      >
        <span className="voice-launcher__icon-wrap" aria-hidden="true">
          <img src={voiceIcon} alt="" className="voice-launcher__icon" />
        </span>
        <span className="voice-launcher__content">
          <span className="voice-launcher__label">voice assistant</span>
        </span>
      </button>

      {heardText ? <div className="voice-panel__heard" aria-live="polite">{heardText}</div> : null}
    </div>
  );
}
