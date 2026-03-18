import path from 'node:path';
import { decodeImageBuffer } from '../services/decoder.service.js';
import { enrichScan } from '../services/enrichment.service.js';
import { fetchImageBufferFromUrl } from '../services/image-source.service.js';
import { uploadScanToBlob } from '../services/blob-storage.service.js';
import { writeBufferToTmp } from '../services/file-storage.service.js';
import { env } from '../config/env.js';
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
  return await Promise.race([
    decodeImageBuffer(buffer),
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new HttpError(422, 'Image decoding timed out on the server. Try the browser-side decoder in the tester, or pass decodedText directly.')),
        env.decodeTimeoutMs
      )
    )
  ]);
}

export async function resolveScanController(req, res, next) {
  try {
    const manualOverrides = safeJsonParse(req.body.manualOverrides, {});
    let decodedText = String(req.body.decodedText || '').trim();
    let decoderInfo = null;
    let sourceImageUrl = String(req.body.sourceImageUrl || '').trim() || null;
    let uploadedBlob = null;
    let tmpFile = null;
    let imageBuffer = null;
    let imageFilename = req.file?.originalname || 'remote-scan-image';
    let imageContentType = req.file?.mimetype || 'application/octet-stream';

    if (req.file?.buffer) {
      imageBuffer = req.file.buffer;
      tmpFile = await writeBufferToTmp({ buffer: imageBuffer, filename: imageFilename });

      try {
        uploadedBlob = await uploadScanToBlob({
          buffer: imageBuffer,
          filename: imageFilename,
          contentType: imageContentType
        });

        if (uploadedBlob?.url) {
          sourceImageUrl = uploadedBlob.url;
        }
      } catch (error) {
        // Non-fatal. Keep processing.
      }
    } else if (sourceImageUrl) {
      const remoteImage = await fetchImageBufferFromUrl(sourceImageUrl);
      imageBuffer = remoteImage.buffer;
      imageContentType = remoteImage.contentType || imageContentType;
      imageFilename = path.basename(new URL(sourceImageUrl).pathname) || imageFilename;
      tmpFile = await writeBufferToTmp({ buffer: imageBuffer, filename: imageFilename });
    }

    if (!decodedText && imageBuffer) {
      const decoded = await decodeWithTimeout(imageBuffer);
      decodedText = decoded?.text || '';
      decoderInfo = decoded;
    }

    if (!decodedText) {
      throw new HttpError(
        400,
        'No decodable barcode or GS1 payload was found. Upload a clearer image, send a blob image URL, or pass decodedText for testing.'
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
        usedSourceImageUrl: Boolean(req.body.sourceImageUrl),
        usedDecodedTextOverride: Boolean(req.body.decodedText),
        format: decoderInfo?.format || null
      },
      storage: {
        tmpPath: tmpFile?.path || null,
        blobUrl: uploadedBlob?.url || null,
        blobPathname: uploadedBlob?.pathname || null
      },
      ...result
    });
  } catch (error) {
    next(error);
  }
}
