export const VOICE_APP_EVENT = 'shelfsafe:voice-app-event';

export function emitVoiceAppEvent(detail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(VOICE_APP_EVENT, { detail }));
}

export function subscribeVoiceAppEvent(handler) {
  if (typeof window === 'undefined') return () => {};
  const listener = (event) => handler(event.detail || {});
  window.addEventListener(VOICE_APP_EVENT, listener);
  return () => window.removeEventListener(VOICE_APP_EVENT, listener);
}
