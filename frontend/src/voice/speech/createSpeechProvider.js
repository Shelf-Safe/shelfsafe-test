import { createBrowserSpeechProvider } from './providers/browserSpeechProvider';
import { createDeepgramLiveProvider } from './deepgram/createDeepgramLiveProvider';

export function createSpeechProvider(providerName = 'browser') {
  switch (providerName) {
    case 'deepgram':
      return createDeepgramLiveProvider();
    case 'browser':
    default:
      return createBrowserSpeechProvider();
  }
}
