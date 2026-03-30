import express from 'express';
import { parseVoiceWithGroq } from '../utils/voice/groqParser.js';
import { createDeepgramAccessToken } from '../utils/voice/deepgramAuth.js';
import { createVoiceLogger } from '../utils/voice/voiceLogger.js';

const router = express.Router();
const log = createVoiceLogger('Route');

router.post('/parse', async (req, res) => {
  try {
    const text = String(req.body?.text || '').trim();
    const pageId = String(req.body?.pageId || 'dashboard').trim() || 'dashboard';
    const currentRoute = String(req.body?.currentRoute || '/dashboard').trim() || '/dashboard';
    const mode = String(req.body?.mode || 'simple').trim() || 'simple';
    const recoveryPayload = req.body?.recoveryPayload && typeof req.body.recoveryPayload === 'object'
      ? req.body.recoveryPayload
      : null;

    if (!text) {
      return res.status(400).json({ success: false, message: 'Voice text is required.' });
    }

    log.info('Parse request', { pageId, currentRoute, mode, transcript: text });
    const action = await parseVoiceWithGroq({ text, pageId, currentRoute, recoveryPayload, mode });
    return res.status(200).json({ success: true, action });
  } catch (error) {
    log.error('Voice parse route error', error);
    const message = error.message || 'Unable to parse voice command.';
    const isRateLimited = /rate limit|retry in|rate_limit/i.test(message);
    const isTimeout = /timed out/i.test(message) || error?.code === 'GROQ_TIMEOUT';
    return res.status(isRateLimited ? 429 : isTimeout ? 504 : 500).json({ success: false, message });
  }
});

router.post('/deepgram/token', async (req, res) => {
  try {
    const ttlSeconds = Number(req.body?.ttlSeconds) || Number(process.env.DEEPGRAM_TOKEN_TTL_SECONDS) || 1800;
    const token = await createDeepgramAccessToken({ ttlSeconds });
    return res.status(200).json({
      success: true,
      accessToken: token.accessToken,
      expiresIn: token.expiresIn,
    });
  } catch (error) {
    log.error('Deepgram token route error', error);
    return res.status(500).json({ success: false, message: error.message || 'Unable to create Deepgram access token.' });
  }
});

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    speechProvider: process.env.VOICE_STT_PROVIDER || 'browser',
    groqConfigured: Boolean(process.env.GROQ_API_KEY),
    deepgramConfigured: Boolean(process.env.DEEPGRAM_API_KEY),
  });
});

export default router;
