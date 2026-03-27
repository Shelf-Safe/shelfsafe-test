function getRecognitionClass() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export function createBrowserSpeechProvider() {
  return {
    isSupported() {
      return Boolean(getRecognitionClass());
    },
    createSession({ mode = 'single', onStart, onResult, onError, onEnd }) {
      const Recognition = getRecognitionClass();
      if (!Recognition) throw new Error('Browser speech recognition is not supported.');

      const recognition = new Recognition();
      recognition.lang = 'en-US';
      recognition.continuous = mode === 'chain';
      recognition.interimResults = false;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => onStart?.();
      recognition.onerror = (event) => onError?.(event);
      recognition.onend = () => onEnd?.();
      recognition.onresult = (event) => {
        const startIndex = typeof event.resultIndex === 'number' ? event.resultIndex : 0;
        const heardParts = [];
        for (let i = startIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          if (result?.isFinal && result[0]?.transcript) {
            heardParts.push(result[0].transcript);
          }
        }
        const transcript = heardParts.join(' ').trim() || event.results?.[event.results.length - 1]?.[0]?.transcript || '';
        onResult?.(String(transcript || '').trim(), event);
      };

      return {
        start() { recognition.start(); },
        stop() { recognition.stop(); },
      };
    },
  };
}
