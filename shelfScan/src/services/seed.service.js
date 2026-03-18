import { seedProductsByBarcode, seedProductsByHealthCanadaId } from '../data/seed-products.js';

export function getSeedProductByHealthCanadaId(healthCanadaDrugProductId) {
  return seedProductsByHealthCanadaId[String(healthCanadaDrugProductId)] || null;
}

export function resolveHealthCanadaIdFromBarcode(barcodeText) {
  return seedProductsByBarcode[String(barcodeText)] || null;
}
