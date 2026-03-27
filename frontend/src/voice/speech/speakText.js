/**
 * Browser TTS for AI confirmations. No-ops when synthesis is unavailable.
 */
export function speakText(text, { enabled = true } = {}) {
  if (!enabled || !text || typeof window === 'undefined' || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(text));
    u.rate = 1;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}
