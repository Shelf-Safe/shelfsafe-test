import { decodeImageBuffer } from '../services/decoder.service.js';
import { enrichScan } from '../services/enrichment.service.js';
import { HttpError } from '../utils/httpError.js';

function safeJsonParse(value, fallback = {}) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export async function resolveScanController(req, res, next) {
  try {
    const manualOverrides = safeJsonParse(req.body.manualOverrides, {});
    let decodedText = String(req.body.decodedText || '').trim();
    let decoderInfo = null;

    if (!decodedText && req.file?.buffer) {
      const decoded = await decodeImageBuffer(req.file.buffer);
      decodedText = decoded?.text || '';
      decoderInfo = decoded;
    }

    if (!decodedText) {
      throw new HttpError(
        400,
        'No decodable barcode or GS1 payload was found. Upload a clearer image or pass decodedText for testing.'
      );
    }

    const result = await enrichScan({
      rawText: decodedText,
      manualOverrides,
      sourceImageUrl: req.body.sourceImageUrl || null
    });

    res.json({
      ok: true,
      decoder: {
        usedImageUpload: Boolean(req.file),
        usedDecodedTextOverride: Boolean(req.body.decodedText),
        format: decoderInfo?.format || null
      },
      ...result
    });
  } catch (error) {
    next(error);
  }
}
