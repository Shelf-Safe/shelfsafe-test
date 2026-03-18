import { looksLikeGs1Payload, parseGs1Text } from './gs1.service.js';
import { fetchDrugProductById } from './health-canada.service.js';
import { buildNormalizedResponse } from './response-mapper.service.js';
import { getSeedProductByHealthCanadaId, guessSeedProductFromImageUrl, resolveHealthCanadaIdFromBarcode } from './seed.service.js';

function normalizeBarcodeText(rawText) {
  return String(rawText || '').replace(/\s+/g, '').trim();
}

function parseBarcodeText(rawText) {
  const barcodeData = normalizeBarcodeText(rawText);
  return {
    scanType: 'BARCODE',
    rawText,
    barcodeData,
    gtin: barcodeData,
    lotNumber: null,
    expiryDate: null,
    quantity: 1,
    internalProductId: null,
    healthCanadaDrugProductId: resolveHealthCanadaIdFromBarcode(barcodeData)
  };
}

function parseScan(rawText) {
  return looksLikeGs1Payload(rawText) ? parseGs1Text(rawText) : parseBarcodeText(rawText);
}

export async function enrichScan({ rawText, manualOverrides = {}, sourceImageUrl = null }) {
  const warnings = [];
  const parsedScan = parseScan(rawText);

  let healthCanadaDrugProductId =
    parsedScan.healthCanadaDrugProductId || manualOverrides.healthCanadaDrugProductId || null;

  let seedProduct = healthCanadaDrugProductId
    ? getSeedProductByHealthCanadaId(healthCanadaDrugProductId)
    : guessSeedProductFromImageUrl(sourceImageUrl);

  if (!healthCanadaDrugProductId && seedProduct?.healthCanadaDrugProductId) {
    healthCanadaDrugProductId = seedProduct.healthCanadaDrugProductId;
  }

  if (!healthCanadaDrugProductId && parsedScan.scanType === 'BARCODE') {
    warnings.push('Barcode was decoded, but no Health Canada product id mapping was found in seed data.');
  }

  let healthCanadaProduct = null;
  if (healthCanadaDrugProductId) {
    try {
      healthCanadaProduct = await fetchDrugProductById(healthCanadaDrugProductId);
    } catch (error) {
      warnings.push(`Health Canada lookup failed: ${error.message}`);
    }
  }

  if (!healthCanadaProduct) {
    warnings.push('Health Canada API did not return a product. Seed/demo data is doing more of the work for this response.');
  }

  seedProduct = seedProduct || getSeedProductByHealthCanadaId(healthCanadaProduct?.drug_code || healthCanadaDrugProductId);

  if (!seedProduct) {
    warnings.push('No seed/demo product mapping was found. The response may need manual completion for UI-only fields.');
  }

  const effectiveExpiryDate = manualOverrides?.expiryDate || parsedScan?.expiryDate || seedProduct?.defaultExpiryDate || null;
  const effectiveLotNumber = manualOverrides?.lotNumber || parsedScan?.lotNumber || seedProduct?.defaultLotNumber || null;

  if (parsedScan.scanType === 'BARCODE' && !effectiveExpiryDate) {
    warnings.push('Barcode flow still needs expiry date from OCR or manual confirmation.');
  }

  if (parsedScan.scanType === 'BARCODE' && !effectiveLotNumber) {
    warnings.push('Barcode flow still needs lot number from OCR or manual confirmation.');
  }

  const normalized = buildNormalizedResponse({
    parsedScan: {
      ...parsedScan,
      healthCanadaDrugProductId: String(healthCanadaProduct?.drug_code || healthCanadaDrugProductId || '')
    },
    healthCanadaProduct,
    seedProduct,
    manualOverrides
  });

  return {
    sourceImageUrl,
    warnings,
    scan: parsedScan,
    healthCanada: healthCanadaProduct,
    seedData: seedProduct,
    normalized
  };
}
