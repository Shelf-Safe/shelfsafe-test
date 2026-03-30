import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { put } from '@vercel/blob';
import Medication from '../models/Medication.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Unsupported file type'));
  },
});

function normalizeDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function deriveStatus({ expiryDate, currentStock, status }) {
  const today = normalizeDay(new Date());
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 30);
  const exp = expiryDate ? normalizeDay(expiryDate) : null;

  if (status === 'Removed' || status === 'Recalled') return status;
  if (exp && exp < today) return 'Expired';
  if (exp && exp <= soon) return 'Expiring Soon';
  const stock = Number(currentStock || 0);
  if (stock <= 0) return 'Out of Stock';
  if (stock <= 10) return 'Low Stock';
  return 'In Stock';
}

function buildExpiryDate(month, year) {
  if (!month || !year) return null;
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const monthIndex = isNaN(month) ? months.indexOf(month) : parseInt(month, 10) - 1;
  if (monthIndex < 0) return null;
  return new Date(parseInt(year, 10), monthIndex + 1, 0);
}

function monthNameFromDate(dateValue) {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-US', { month: 'long' });
}

function yearFromDate(dateValue) {
  if (!dateValue) return '';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return '';
  return String(d.getFullYear());
}

function makeBlobPath(prefix, originalName = 'image.jpg') {
  const safeName = String(originalName || 'image.jpg').replace(/[^a-zA-Z0-9._-]/g, '-');
  return `${prefix}/${Date.now()}-${safeName}`;
}

async function uploadImageToBlob(file, prefix = 'images') {
  if (!file?.buffer) return '';
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  }
  const blob = await put(makeBlobPath(prefix, file.originalname), file.buffer, {
    access: 'public',
    token,
    contentType: file.mimetype || 'image/jpeg',
    addRandomSuffix: false,
  });
  return blob?.url || '';
}

async function resolveWithShelfScan({ sourceImageUrl, manualOverrides = {} }) {
  const endpoint = process.env.SHELFSCAN_API_URL || 'https://shelfscan.onrender.com/api/scan/resolve';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceImageUrl, manualOverrides }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || payload?.error || 'ShelfScan failed to resolve the barcode image.');
  }
  return payload;
}

function buildMedicationFromShelfScanResult(result, req, fallbackPhotoUrl = '') {
  const record = result?.normalized?.medicationRecord || {};
  const seed = result?.seedData || {};
  const scan = result?.scan || {};

  const expiryDate = record.expiryDate ? new Date(record.expiryDate) : null;
  const safeExpiryDate = expiryDate && !Number.isNaN(expiryDate.getTime()) ? expiryDate : null;

  return new Medication({
    medicationName: record.medicationName || seed.medicationName || 'Unknown Medication',
    brandName: record.brandName || seed.brandName || '',
    sku: record.barcodeData || scan.barcodeData || seed.barcodeUpc || seed.gtin || '',
    batchLotNumber: record.batchLotNumber || seed.defaultLotNumber || '',
    risk: record.risk || seed.risk || '',
    shelfId: record.shelfId || seed.shelfId || '',
    expiryMonth: safeExpiryDate ? monthNameFromDate(safeExpiryDate) : '',
    expiryYear: safeExpiryDate ? yearFromDate(safeExpiryDate) : '',
    expiryDate: safeExpiryDate,
    currentStock: Number(record.currentStock || seed.currentStock || 0),
    supplierName: record.supplierName || seed.supplierName || '',
    supplierContact: record.supplierContact || seed.supplierContact || '',
    status: '',
    category: record.category || seed.category || '',
    barcodeData: record.barcodeData || scan.barcodeData || seed.barcodeUpc || seed.gtin || '',
    photoUrl: record.photoUrl || seed.photoUrl || fallbackPhotoUrl || '',
    addedBy: req.user.userId,
    orgId: req.user.orgId || 'dummy01',
  });
}

function scopeFilter(req) {
  return req.user.orgId ? { orgId: req.user.orgId } : { addedBy: req.user.userId };
}

router.get('/', verifyToken, async (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 20 } = req.query;
    const query = { ...scopeFilter(req) };

    if (search) {
      query.$or = [
        { medicationName: { $regex: search, $options: 'i' } },
        { brandName: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { batchLotNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const limitNum = limit === 'all' ? 50000 : Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50000);
    const skip = limit === 'all' ? 0 : (Math.max(parseInt(page, 10) || 1, 1) - 1) * limitNum;
    let medications = await Medication.find(query).sort({ createdAt: -1 }).lean();

    medications = medications.map((m) => ({ ...m, status: deriveStatus(m) }));
    if (status && status !== 'All') medications = medications.filter((m) => m.status === status);

    const total = medications.length;
    const paged = limit === 'all' ? medications : medications.slice(skip, skip + limitNum);

    res.json({
      success: true,
      data: paged,
      pagination: {
        total,
        page: Math.max(parseInt(page, 10) || 1, 1),
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    const { medicationName, brandName, risk, shelfId, expiryMonth, expiryYear, currentStock, supplierName, supplierContact, status, category, barcodeData, sku, batchLotNumber } = req.body;
    if (!medicationName) return res.status(400).json({ success: false, message: 'Medication name is required' });

    const expiryDate = buildExpiryDate(expiryMonth, expiryYear);
    const photoUrl = req.file ? await uploadImageToBlob(req.file, 'medications') : String(req.body.photoUrl || '').trim();
    const med = new Medication({
      medicationName, brandName, risk, shelfId, expiryMonth, expiryYear, expiryDate,
      currentStock: parseInt(currentStock, 10) || 0, supplierName, supplierContact,
      status, category, barcodeData, sku, batchLotNumber, photoUrl,
      addedBy: req.user.userId, orgId: req.user.orgId || 'dummy01',
    });
    await med.save();
    res.status(201).json({ success: true, data: med });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/scan-create', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    const photoUrlFromBody = String(req.body.photoUrl || '').trim();
    const sourceImageUrl = req.file ? await uploadImageToBlob(req.file, 'barcodes') : photoUrlFromBody;
    if (!sourceImageUrl) return res.status(400).json({ success: false, message: 'A barcode image is required.' });

    const manualOverrides = {
      quantity: req.body.currentStock ? Number(req.body.currentStock) : undefined,
      shelfId: req.body.shelfId || undefined,
      supplierName: req.body.supplierName || undefined,
      supplierContact: req.body.supplierContact || undefined,
      category: req.body.category || undefined,
    };

    const scanResult = await resolveWithShelfScan({ sourceImageUrl, manualOverrides });
    const med = buildMedicationFromShelfScanResult(scanResult, req, sourceImageUrl);
    await med.save();

    res.status(201).json({
      success: true,
      data: med,
      scan: {
        sourceImageUrl,
        barcodeImageUrl: sourceImageUrl,
        resolvedVia: scanResult?.resolvedVia || null,
        warnings: scanResult?.warnings || [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const med = await Medication.findOne({ _id: req.params.id, ...scopeFilter(req) });
    if (!med) return res.status(404).json({ success: false, message: 'Medication not found' });
    res.json({ success: true, data: med });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    const med = await Medication.findOne({ _id: req.params.id, ...scopeFilter(req) });
    if (!med) return res.status(404).json({ success: false, message: 'Medication not found' });

    const fields = ['medicationName', 'brandName', 'risk', 'shelfId', 'expiryMonth', 'expiryYear', 'currentStock', 'supplierName', 'supplierContact', 'status', 'category', 'barcodeData', 'sku', 'batchLotNumber'];
    fields.forEach((f) => { if (req.body[f] !== undefined) med[f] = req.body[f]; });
    if (req.body.expiryMonth || req.body.expiryYear) med.expiryDate = buildExpiryDate(med.expiryMonth, med.expiryYear);
    if (req.body.currentStock !== undefined) med.currentStock = parseInt(req.body.currentStock, 10) || 0;
    if (req.file) med.photoUrl = await uploadImageToBlob(req.file, 'medications');
    else if (req.body.photoUrl !== undefined) med.photoUrl = String(req.body.photoUrl || '').trim();

    await med.save();
    res.json({ success: true, data: med });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const med = await Medication.findOneAndDelete({ _id: req.params.id, ...scopeFilter(req) });
    if (!med) return res.status(404).json({ success: false, message: 'Medication not found' });
    res.json({ success: true, message: 'Medication deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/bulk-import', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (!rows.length) return res.status(400).json({ success: false, message: 'Excel file is empty' });

    const medications = rows.map((row) => {
      const expiryMonth = String(row['Expiry Month'] || row.expiryMonth || '').trim();
      const expiryYear = String(row['Expiry Year'] || row.expiryYear || '').trim();
      const expiryDate = buildExpiryDate(expiryMonth, expiryYear);
      const currentStock = parseInt(row['Current Stock'] || row.currentStock || 0, 10) || 0;
      const manualStatus = String(row.Status || row.status || '').trim();
      const photoUrl = String(row.photoUrl || row['Photo URL'] || '').trim();
      return {
        medicationName: String(row['Medication Name'] || row.medicationName || '').trim(),
        brandName: String(row['Brand Name'] || row.brandName || '').trim(),
        sku: String(row.SKU || row.sku || row['SKU / Barcode'] || '').trim(),
        batchLotNumber: String(row['Batch/Lot Number'] || row.batchLotNumber || '').trim(),
        risk: String(row.Risk || row.risk || '').trim(),
        shelfId: String(row['Shelf ID'] || row.shelfId || '').trim(),
        expiryMonth,
        expiryYear,
        expiryDate,
        currentStock,
        supplierName: String(row['Supplier Name'] || row.supplierName || '').trim(),
        supplierContact: String(row['Supplier Contact'] || row.supplierContact || '').trim(),
        status: manualStatus || deriveStatus({ expiryDate, currentStock }),
        category: String(row.Category || row.category || '').trim(),
        photoUrl,
        addedBy: req.user.userId,
        orgId: req.user.orgId || 'dummy01',
      };
    }).filter((m) => m.medicationName);

    const insertedItems = await Medication.insertMany(medications);
    res.status(200).json({ success: true, count: insertedItems.length, data: insertedItems });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/barcode', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No photo uploaded' });
    const photoUrl = await uploadImageToBlob(req.file, 'barcodes');
    res.json({
      success: true,
      data: {
        photoUrl,
        barcode: req.body.barcodeData || '',
        medicationName: '',
        brandName: '',
        batchLotNumber: '',
        expiryMonth: '',
        expiryYear: '',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
