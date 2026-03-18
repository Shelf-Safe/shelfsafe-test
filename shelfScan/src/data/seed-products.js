export const seedProductsByHealthCanadaId = {
  '10533': {
    healthCanadaDrugProductId: '10533',
    brandName: 'BAYER INC',
    medicationName: 'Claritin Allergy',
    category: 'Allergy Relief',
    dosageForm: 'Tablet',
    strength: '10 mg',
    defaultUnit: 'box',
    currentStock: 120,
    risk: 'Low',
    shelfId: 'Shelf-A1',
    supplierName: 'NorthCare Supply',
    supplierContact: '+1-555-0191',
    photoUrl: 'https://s5m9c8lhxpzrtcaq.public.blob.vercel-storage.com/claritin-allergy.webp',
    barcodeData: '00600000010533',
    gtin: '00600000010533',
    sampleGs1HumanReadable: '(01)00600000010533(10)CLA2027A01(17)270930(30)120(240)SS-CLAR-001(91)HC10533',
    sampleGs1Raw: '010060000001053310CLA2027A011727093030120240SS-CLAR-00191HC10533',
    internalProductId: 'SS-CLAR-001',
    defaultLotNumber: 'CLA2027A01',
    defaultExpiryDate: '2027-09-30',
    description: 'Demo seed data used to complete UI-friendly fields not provided by the Health Canada API.'
  },
  '71300': {
    healthCanadaDrugProductId: '71300',
    brandName: 'PROCTER & GAMBLE INC',
    medicationName: 'Vicks DayQuil Liquicaps',
    category: 'Cold & Flu',
    dosageForm: 'Liquicaps',
    strength: 'Multi-symptom formula',
    defaultUnit: 'box',
    currentStock: 18,
    risk: 'Medium',
    shelfId: 'Shelf-B2',
    supplierName: 'PrimeDose Partners',
    supplierContact: '+1-555-0142',
    photoUrl: 'https://s5m9c8lhxpzrtcaq.public.blob.vercel-storage.com/vicksLiquidDrops.webp',
    barcodeData: '062600071300',
    gtin: '062600071300',
    defaultLotNumber: 'DQL2027B04',
    defaultExpiryDate: '2027-12-31',
    description: 'Demo seed data for barcode-only enrichment and UI display.'
  }
};

export const seedProductsByBarcode = {
  '062600071300': '71300',
  '00600000010533': '10533'
};
