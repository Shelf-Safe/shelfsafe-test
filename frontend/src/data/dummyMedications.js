
const CATEGORIES = ['Analgesic', 'Antibiotic', 'Antidiabetic', 'Cardiovascular', 'Antacid', 'Antiviral'];

const PHOTO_URLS = [
  'https://s5m9c8lhxpzrtcaq.public.blob.vercel-storage.com/advil.png',
  'https://s5m9c8lhxpzrtcaq.public.blob.vercel-storage.com/tylenol.jpg',
  'https://s5m9c8lhxpzrtcaq.public.blob.vercel-storage.com/Amoxicillin%20250mg.png',
];
export const DUMMY_MEDICATIONS = Array.from({ length: 65 }, (_, i) => {
  const id = i + 1;
  const name =
    i % 4 === 0 ? 'Paracetamol 500mg' :
    i % 4 === 1 ? 'Amoxicillin 250mg' :
    i % 4 === 2 ? 'Metformin 850mg' :
                  'Atorvastatin 20mg';

  const brand =
    name.startsWith('Paracetamol') ? 'Stramol-500' :
    name.startsWith('Amoxicillin') ? 'Generic' :
    name.startsWith('Metformin') ? 'Glucophage' :
    'Lipitor';

  const monthNames = ['Jan', 'Mar', 'Sep', 'Feb', 'Dec'];
  const expiryLabel = monthNames[i % 5] + ' ' + (i % 5 === 3 ? '2027' : '2026');
  const expiryDateISO =
    i % 5 === 0 ? '2026-01-01T00:00:00.000Z' :
    i % 5 === 1 ? '2026-03-01T00:00:00.000Z' :
    i % 5 === 2 ? '2026-09-01T00:00:00.000Z' :
    i % 5 === 3 ? '2027-02-01T00:00:00.000Z' :
                  '2027-12-01T00:00:00.000Z';

  const stock = i % 7 === 0 ? 0 : i % 7 === 1 ? 7 : 1370 + i * 5;

  const status = i % 7 === 0 ? 'Out of Stock' :
                 i % 7 === 1 ? 'Low Stock' :
                 i % 5 === 0 ? 'Expiring Soon' :
                               'In Stock';

  const photoUrl =
    name.startsWith('Amoxicillin') ? PHOTO_URLS[2] :
    name.startsWith('Paracetamol') ? PHOTO_URLS[1] :
    PHOTO_URLS[i % PHOTO_URLS.length];

  return {
    id, // used by routes in dummy mode
    medicationName: name,
    brandName: brand,
    sku: `123456789${String(i).padStart(4, '0')}`,
    barcodeData: `123456789${String(i).padStart(4, '0')}`,
    batchLotNumber: `LOT${20260100 + i}`,
    expiryDate: expiryDateISO,
    expiryMonth: expiryLabel.split(' ')[0],
    expiryYear: expiryLabel.split(' ')[1],
    currentStock: stock,
    category: CATEGORIES[i % CATEGORIES.length],
    supplierName: 'LD Supply',
    supplierContact: 'ldsupply@gmail.com',
    status,
    shelfId: i % 3 === 0 ? '25B' : i % 3 === 1 ? 'Aisle 3' : 'Aisle 4',
    risk: i % 6 === 0 ? 'Medium' : 'Low',
    photoUrl,
  };
});

export function getDummyMedicationById(idParam) {
  const idNum = Number(idParam);
  if (!Number.isFinite(idNum)) return null;
  return DUMMY_MEDICATIONS.find((m) => m.id === idNum) || null;
}
