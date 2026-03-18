import sharp from 'sharp';
import { readBarcodes } from 'zxing-wasm/reader';

const SUPPORTED_FORMATS = ['DataMatrix', 'EAN13', 'EAN8', 'UPCA', 'UPCE', 'Code128', 'Code39', 'ITF'];

async function bufferToImageData(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  return {
    data: new Uint8ClampedArray(data),
    width: info.width,
    height: info.height
  };
}

function normalizeDecoderResult(result) {
  return {
    text:
      result?.text ||
      result?.value ||
      result?.rawValue ||
      result?.content ||
      null,
    format:
      result?.format ||
      result?.symbology ||
      result?.barcodeFormat ||
      null
  };
}

export async function decodeImageBuffer(buffer) {
  if (!buffer) {
    return null;
  }

  const imageData = await bufferToImageData(buffer);
  const results = await readBarcodes(imageData, {
    formats: SUPPORTED_FORMATS,
    tryHarder: true,
    maxNumberOfSymbols: 4
  });

  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  return normalizeDecoderResult(results[0]);
}
