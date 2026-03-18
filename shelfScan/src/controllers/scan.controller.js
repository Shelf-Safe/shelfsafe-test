import { decodeImageBuffer } from '../services/decoder.service.js';
import { enrichScan } from '../services/enrichment.service.js';
import { fetchImageBufferFromUrl } from '../services/image-source.service.js';
import { HttpError } from '../utils/httpError.js';

function safeJsonParse(value, fallback = {}) {
  if (!value) {
    return fallback;
  }

  if (typeof value === 'object') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function decodeWithTimeout(buffer) {
  return Promise.race([
    decodeImageBuffer(buffer),
    new Promise((_, reject) => setTimeout(() => reject(new HttpError(422, 'Image decoding timed out on the server. Try the browser-side decoder in the tester, or pass decodedText directly.')), 8000))
  ]);
}

export async function resolveScanController(req, res, next) {
  try {
    const manualOverrides = safeJsonParse(req.body.manualOverrides, {});
    const sourceImageUrl = String(req.body.sourceImageUrl || '').trim() || null;
    let decodedText = String(req.body.decodedText || '').trim();
    let decoderInfo = null;

    if (!decodedText && req.file?.buffer) {
      const decoded = await decodeWithTimeout(req.file.buffer);
      decodedText = decoded?.text || '';
      decoderInfo = decoded;
    }

    if (!decodedText && sourceImageUrl) {
      const imageBuffer = await fetchImageBufferFromUrl(sourceImageUrl);
      const decoded = await decodeWithTimeout(imageBuffer);
      decodedText = decoded?.text || '';
      decoderInfo = decoded;
    }

    if (!decodedText) {
      throw new HttpError(
        400,
        'No decodable barcode or GS1 payload was found. Upload a clearer image, provide sourceImageUrl, or pass decodedText for testing.'
      );
    }

    const result = await enrichScan({
      rawText: decodedText,
      manualOverrides,
      sourceImageUrl
    });

    res.json({
      ok: true,
      decoder: {
        usedImageUpload: Boolean(req.file),
        usedDecodedTextOverride: Boolean(req.body.decodedText),
        usedSourceImageUrl: Boolean(sourceImageUrl),
        format: decoderInfo?.format || null
      },
      ...result
    });
  } catch (error) {
    next(error);
  }
}
