import { voiceApiService } from '../../../services/voiceApiService';
import { createPcmCapture } from './pcmCapture';
import { DEFAULT_DEEPGRAM_MODEL, DEFAULT_DEEPGRAM_SAMPLE_RATE } from './constants';
import { pickVoiceEnv } from '../shared/providerConfig';
import { createVoiceLogger } from '../../utils/voiceLogger';

const BASE_COMMAND_TERMS = [
  'search', 'find', 'edit', 'delete', 'sync inventory', 'change pos', 'open pos', 'show expired',
  'dashboard', 'inventory', 'reports', 'profile', 'advil', 'tylenol', 'motrin', 'aleve',
];

function parseSocketMessage(eventData) {
  if (!eventData) return null;
  let payload = eventData;
  if (typeof eventData === 'string') {
    try { payload = JSON.parse(eventData); } catch { return null; }
  }
  if (!payload || typeof payload !== 'object') return null;
  return payload;
}

function parseTranscriptPayload(message) {
  const payload = parseSocketMessage(message);
  if (!payload || payload.type !== 'Results') return null;
  const transcript = String(payload.channel?.alternatives?.[0]?.transcript || '').trim();
  if (!transcript) return null;
  return {
    transcript,
    isFinal: Boolean(payload.is_final || payload.speech_final || payload.from_finalize),
    raw: payload,
  };
}

function readSpeechHints() {
  const hints = window.__SHELFSAFE_VOICE_HINTS__ || {};
  const terms = [
    ...BASE_COMMAND_TERMS,
    ...(hints.keyterms || []),
    ...(hints.medications || []),
    ...(hints.posProviders || []),
  ];
  return Array.from(new Set(terms.filter(Boolean).map((item) => String(item).trim()).filter(Boolean))).slice(0, 40);
}

function buildDeepgramSocketUrl() {
  const model = pickVoiceEnv('VITE_DEEPGRAM_MODEL', DEFAULT_DEEPGRAM_MODEL);
  const url = new URL('wss://api.deepgram.com/v1/listen');
  url.searchParams.set('model', model);
  url.searchParams.set('language', pickVoiceEnv('VITE_DEEPGRAM_LANGUAGE', 'en-US'));
  url.searchParams.set('smart_format', 'true');
  url.searchParams.set('interim_results', 'true');
  url.searchParams.set('punctuate', 'true');
  url.searchParams.set('encoding', 'linear16');
  url.searchParams.set('sample_rate', String(Number(pickVoiceEnv('VITE_DEEPGRAM_SAMPLE_RATE', DEFAULT_DEEPGRAM_SAMPLE_RATE))));
  url.searchParams.set('channels', '1');
  url.searchParams.set('endpointing', String(Number(pickVoiceEnv('VITE_DEEPGRAM_ENDPOINTING_MS', 500))));
  url.searchParams.set('utterance_end_ms', String(Number(pickVoiceEnv('VITE_DEEPGRAM_UTTERANCE_END_MS', 1200))));
  url.searchParams.set('vad_events', 'true');
  url.searchParams.set('filler_words', 'false');
  url.searchParams.set('no_delay', 'true');

  const hintTerms = readSpeechHints();
  if (/^nova-3/i.test(model) || /flux/i.test(model)) {
    hintTerms.slice(0, 20).forEach((term) => url.searchParams.append('keyterm', term));
  } else {
    hintTerms.slice(0, 20).forEach((term) => url.searchParams.append('keywords', `${term}:5`));
  }

  return { socketUrl: url.toString(), hintTerms };
}

function safeSocketClose(socket) {
  if (!socket) return;
  try {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
      socket.close();
    }
  } catch {}
}

function createLogger(mode) {
  const logger = createVoiceLogger('Deepgram');
  return {
    info: (...args) => logger.info(`[${mode}]`, ...args),
    debug: (...args) => logger.debug(`[${mode}]`, ...args),
    warn: (...args) => logger.warn(`[${mode}]`, ...args),
    error: (...args) => logger.error(`[${mode}]`, ...args),
  };
}

export function createDeepgramLiveProvider() {
  return {
    isSupported() {
      return Boolean(window?.WebSocket && navigator?.mediaDevices?.getUserMedia && (window.AudioContext || window.webkitAudioContext));
    },

    createSession({ mode = 'single', onStart, onInterimResult, onResult, onError, onEnd }) {
      const log = createLogger(mode);
      let connection = null;
      let pcmCapture = null;
      let closed = false;
      let started = false;
      let keepAliveTimer = null;
      let interimCommitTimer = null;
      let lastInterimTranscript = '';

      function clearTimers() {
        if (keepAliveTimer) {
          window.clearInterval(keepAliveTimer);
          keepAliveTimer = null;
        }
        if (interimCommitTimer) {
          window.clearTimeout(interimCommitTimer);
          interimCommitTimer = null;
        }
      }

      function commitBufferedInterim(reason = 'silence') {
        const transcript = String(lastInterimTranscript || '').trim();
        if (!transcript) return;
        lastInterimTranscript = '';
        onResult?.(transcript, { type: 'BufferedInterimCommit', reason });
      }

      function scheduleBufferedInterimCommit() {
        if (interimCommitTimer) window.clearTimeout(interimCommitTimer);
        interimCommitTimer = window.setTimeout(() => commitBufferedInterim('interim_timeout'), 1200);
      }

      function sendControlMessage(socket, payload) {
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        try {
          socket.send(JSON.stringify(payload));
        } catch (error) {
          log.warn('Control message send failed', error);
          onError?.(error);
        }
      }

      function startKeepAlive(socket) {
        if (mode !== 'chain' || !socket) return;
        if (keepAliveTimer) window.clearInterval(keepAliveTimer);
        keepAliveTimer = window.setInterval(() => {
          if (closed || !connection || connection !== socket || socket.readyState !== WebSocket.OPEN) return;
          sendControlMessage(socket, { type: 'KeepAlive' });
        }, 4000);
      }

      async function openSocketWithProtocols(socketUrl, protocols) {
        const socket = new window.WebSocket(socketUrl, protocols);
        socket.binaryType = 'arraybuffer';

        await new Promise((resolve, reject) => {
          let settled = false;
          const handleOpen = () => {
            if (settled) return;
            settled = true;
            socket.removeEventListener('error', handleError);
            resolve();
          };
          const handleError = () => {
            if (settled) return;
            settled = true;
            socket.removeEventListener('open', handleOpen);
            safeSocketClose(socket);
            reject(new Error('Failed to open Deepgram websocket.'));
          };
          socket.addEventListener('open', handleOpen, { once: true });
          socket.addEventListener('error', handleError, { once: true });
        });

        return socket;
      }

      async function createConnection() {
        const tokenPayload = await voiceApiService.getDeepgramToken({ ttlSeconds: Number(pickVoiceEnv('VITE_DEEPGRAM_TOKEN_TTL_SECONDS', 300)) });
        const { socketUrl, hintTerms } = buildDeepgramSocketUrl();
        const accessToken = String(tokenPayload.accessToken || '').trim();
        const primaryProtocols = [String(tokenPayload.credentialScheme || 'bearer').toLowerCase(), accessToken];
        const fallbackProtocols = ['token', accessToken];
        const protocolAttempts = [primaryProtocols];
        if (primaryProtocols.join('|') !== fallbackProtocols.join('|')) protocolAttempts.push(fallbackProtocols);

        log.info('Opening realtime session', { model: pickVoiceEnv('VITE_DEEPGRAM_MODEL', DEFAULT_DEEPGRAM_MODEL), hints: hintTerms.length });

        let socket = null;
        let lastError = null;
        for (const protocols of protocolAttempts) {
          try {
            socket = await openSocketWithProtocols(socketUrl, protocols);
            break;
          } catch (error) {
            lastError = error;
          }
        }
        if (!socket) throw lastError || new Error('Failed to open Deepgram websocket.');

        socket.addEventListener('error', () => {
          if (!closed) onError?.(new Error('Deepgram websocket error.'));
        });
        socket.addEventListener('close', (event) => {
          log.info('Socket closed', { code: event.code, wasClean: event.wasClean });
          if (!closed) cleanup();
        });
        socket.addEventListener('message', (event) => {
          const transcriptPayload = parseTranscriptPayload(event.data);
          const parsedMessage = parseSocketMessage(event.data);

          if (parsedMessage?.type === 'UtteranceEnd') {
            commitBufferedInterim('utterance_end');
            return;
          }
          if (!transcriptPayload) return;
          if (transcriptPayload.isFinal) {
            if (interimCommitTimer) {
              window.clearTimeout(interimCommitTimer);
              interimCommitTimer = null;
            }
            lastInterimTranscript = '';
            log.info('Final transcript', transcriptPayload.transcript);
            onResult?.(transcriptPayload.transcript, transcriptPayload.raw);
            if (mode === 'single') {
              sendControlMessage(socket, { type: 'CloseStream' });
              cleanup();
            }
            return;
          }
          lastInterimTranscript = transcriptPayload.transcript;
          scheduleBufferedInterimCommit();
          onInterimResult?.(transcriptPayload.transcript, transcriptPayload.raw);
        });

        if (!started) {
          onStart?.();
          started = true;
        }
        startKeepAlive(socket);
        return socket;
      }

      async function cleanup() {
        if (closed) return;
        closed = true;
        clearTimers();
        try {
          await pcmCapture?.stop?.();
        } catch {}
        pcmCapture = null;
        safeSocketClose(connection);
        connection = null;
        onEnd?.();
      }

      return {
        async start() {
          try {
            connection = await createConnection();
            pcmCapture = await createPcmCapture({
              onAudioChunk: (chunk) => {
                if (!connection || connection.readyState !== WebSocket.OPEN) return;
                connection.send(chunk);
              },
            });
          } catch (error) {
            log.error('Session start failed', error);
            onError?.(error);
            cleanup();
          }
        },
        async stop() {
          await cleanup();
        },
      };
    },
  };
}
