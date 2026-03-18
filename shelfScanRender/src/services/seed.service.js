import { seedProducts } from '../data/seed-products.js';

export function getSeedProductByHealthCanadaId(healthCanadaDrugProductId) {
  return seedProducts.find(
    (item) => String(item.healthCanadaDrugProductId) === String(healthCanadaDrugProductId)
  ) || null;
}

export function resolveHealthCanadaIdFromBarcode(barcodeData) {
  const matched = seedProducts.find(
    (item) => String(item.barcodeUpc) === String(barcodeData) || String(item.gtin) === String(barcodeData)
  );

  return matched?.healthCanadaDrugProductId || null;
}

export function guessSeedProductFromImageUrl(sourceImageUrl) {
  if (!sourceImageUrl) return null;
  const normalizedUrl = String(sourceImageUrl).toLowerCase();

  return seedProducts.find((item) => {
    const candidates = [
      item.imageUrl,
      item.imageFileName,
      item.medicationName,
      item.brandName,
      item.barcodeUpc,
      item.gtin
    ]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());

    return candidates.some((candidate) => normalizedUrl.includes(candidate));
  }) || null;
}
