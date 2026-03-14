

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Medication from '../models/Medication.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Missing MONGO_URI in backend/.env');
  process.exit(1);
}

const orgId = 'dummy01';

const meds = [
  {
    orgId,
    medicationName: 'Advil 200mg',
    brandName: 'Advil',
    category: 'Pain Relief',
    sku: '012345678905',
    batchLotNumber: 'LOT202601',
    expiryDate: new Date('2026-08-15T00:00:00.000Z'),
    currentStock: 24,
    supplierName: 'Demo Supplier',
    supplierContact: 'demo@shelfsafe.demo',
    status: 'In Stock',
    shelfId: 'A-3',
    risk: 'Low',
    photoUrl: 'https://s5m9c8lhxpzrtcaq.public.blob.vercel-storage.com/advil.png',
  },
  {
    orgId,
    medicationName: 'Tylenol Extra Strength 500mg',
    brandName: 'Tylenol',
    category: 'Pain Relief',
    sku: '012345678906',
    batchLotNumber: 'LOT202602',
    expiryDate: new Date('2026-12-01T00:00:00.000Z'),
    currentStock: 18,
    supplierName: 'Demo Supplier',
    supplierContact: 'demo@shelfsafe.demo',
    status: 'In Stock',
    shelfId: 'A-4',
    risk: 'Low',
    photoUrl: 'https://s5m9c8lhxpzrtcaq.public.blob.vercel-storage.com/tylenol.jpg',
  },
  {
    orgId,
    medicationName: 'Amoxicillin 250mg',
    brandName: 'Amoxicillin',
    category: 'Antibiotic',
    sku: '012345678907',
    batchLotNumber: 'LOT202603',
    expiryDate: new Date('2026-05-20T00:00:00.000Z'),
    currentStock: 10,
    supplierName: 'Demo Supplier',
    supplierContact: 'demo@shelfsafe.demo',
    status: 'In Stock',
    shelfId: 'B-1',
    risk: 'Low',
    photoUrl: 'https://s5m9c8lhxpzrtcaq.public.blob.vercel-storage.com/Amoxicillin%20250mg.png',
  },
];

async function main() {
  await mongoose.connect(MONGO_URI);
  const existing = await Medication.find({ orgId }).lean();
  if (existing.length) {
    console.log(`Found ${existing.length} existing meds for orgId=${orgId}. Not inserting duplicates.`);
  } else {
    const inserted = await Medication.insertMany(meds);
    console.log(`Inserted ${inserted.length} medications.`);
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
