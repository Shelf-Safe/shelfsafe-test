let sharpModulePromise = null;
let zxingReaderPromise = null;

const SUPPORTED_FORMATS = ['DataMatrix', 'EAN13', 'EAN8', 'UPCA', 'UPCE', 'Code128', 'Code39', 'ITF'];

async function getSharp() {
  if (!sharpModulePromise) {
    sharpModulePromise = import('sharp').then((mod) => mod.default || mod);
  }
  return sharpModulePromise;
}

async function getReadBarcodes() {
  if (!zxingReaderPromise) {
    zxingReaderPromise = import('zxing-wasm/reader').then((mod) => mod.readBarcodes);
  }
  return zxingReaderPromise;
}

async function bufferToImageData(buffer) {
  const sharp = await getSharp();
  const { data, info } = await sharp(buffer, { animated: false })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data: new Uint8ClampedArray(data),
    width: info.width,
    height: info.height
  };
}

function normalizeDecoderResult(result) {
  return {
    text: result?.text || result?.value || result?.rawValue || result?.content || null,
    format: result?.format || result?.symbology || result?.barcodeFormat || null
  };
}

export async function decodeImageBuffer(buffer) {
  if (!buffer) return null;

  const imageData = await bufferToImageData(buffer);
  const readBarcodes = await getReadBarcodes();
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
