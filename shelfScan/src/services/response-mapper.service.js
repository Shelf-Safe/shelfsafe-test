import { env } from '../config/env.js';

function pickStatus(expiryDate, quantity) {
  if (!expiryDate) {
    return quantity <= 5 ? 'Low Stock' : 'Pending Review';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  if (expiry < today) {
    return 'Expired';
  }

  return quantity <= 5 ? 'Low Stock' : 'Active';
}

function pickRisk(status) {
  if (status === 'Expired') {
    return 'High';
  }

  if (status === 'Low Stock') {
    return 'Medium';
  }

  return 'Low';
}

export function buildNormalizedResponse({ parsedScan, healthCanadaProduct, seedProduct, manualOverrides }) {
  const quantity = Number(manualOverrides?.quantity ?? parsedScan?.quantity ?? seedProduct?.currentStock ?? 1);
  const lotNumber =
    manualOverrides?.lotNumber ||
    parsedScan?.lotNumber ||
    seedProduct?.defaultLotNumber ||
    `${seedProduct?.healthCanadaDrugProductId || 'LOT'}-PENDING`;
  const expiryDate = manualOverrides?.expiryDate || parsedScan?.expiryDate || seedProduct?.defaultExpiryDate || null;
  const shelfId = manualOverrides?.shelfId || seedProduct?.shelfId || 'Unassigned';
  const productName =
    healthCanadaProduct?.brand_name ||
    seedProduct?.medicationName ||
    'Unknown Product';
  const brandName = healthCanadaProduct?.company_name || seedProduct?.brandName || '';
  const healthCanadaDrugProductId = String(
    parsedScan?.healthCanadaDrugProductId || seedProduct?.healthCanadaDrugProductId || ''
  );
  const status = pickStatus(expiryDate, quantity);
  const now = new Date().toISOString();

  const product = {
    orgId: env.defaultOrgId,
    healthCanadaDrugProductId,
    drugIdentificationNumber: healthCanadaProduct?.drug_identification_number || null,
    drugCode: healthCanadaProduct?.drug_code || healthCanadaDrugProductId,
    medicationName: productName,
    brandName,
    descriptor: healthCanadaProduct?.descriptor || '',
    className: healthCanadaProduct?.class_name || '',
    aiGroupNo: healthCanadaProduct?.ai_group_no || null,
    numberOfAis: healthCanadaProduct?.number_of_ais || null,
    barcodeData: parsedScan?.barcodeData || seedProduct?.barcodeData || null,
    gtin: parsedScan?.gtin || seedProduct?.gtin || null,
    category: manualOverrides?.category || seedProduct?.category || 'OTC',
    dosageForm: seedProduct?.dosageForm || null,
    strength: seedProduct?.strength || null,
    defaultUnit: seedProduct?.defaultUnit || 'unit',
    photoUrl: manualOverrides?.photoUrl || seedProduct?.photoUrl || null,
    source: 'health-canada+seed',
    updatedAt: now
  };

  const inventoryLot = {
    orgId: env.defaultOrgId,
    healthCanadaDrugProductId,
    barcodeData: product.barcodeData,
    batchLotNumber: lotNumber,
    expiryDate,
    shelfId,
    quantity,
    currentStock: quantity,
    status,
    risk: pickRisk(status),
    supplierName: manualOverrides?.supplierName || seedProduct?.supplierName || null,
    supplierContact: manualOverrides?.supplierContact || seedProduct?.supplierContact || null,
    createdAt: now,
    updatedAt: now
  };

  const medicationRecord = {
    orgId: env.defaultOrgId,
    barcodeData: product.barcodeData,
    healthCanadaDrugProductId,
    drugIdentificationNumber: product.drugIdentificationNumber,
    medicationName: product.medicationName,
    brandName: product.brandName,
    category: product.category,
    batchLotNumber: inventoryLot.batchLotNumber,
    currentStock: inventoryLot.currentStock,
    expiryDate: inventoryLot.expiryDate,
    risk: inventoryLot.risk,
    shelfId: inventoryLot.shelfId,
    status: inventoryLot.status,
    supplierName: inventoryLot.supplierName,
    supplierContact: inventoryLot.supplierContact,
    photoUrl: product.photoUrl,
    createdAt: inventoryLot.createdAt,
    updatedAt: inventoryLot.updatedAt,
    sourceTrace: {
      scanType: parsedScan?.scanType,
      decodedText: parsedScan?.rawText || null,
      internalProductId: parsedScan?.internalProductId || null,
      healthCanadaDrugProductId,
      healthCanadaApiUsed: Boolean(healthCanadaProduct)
    }
  };

  return {
    product,
    inventoryLot,
    medicationRecord
  };
}
