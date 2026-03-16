import mongoose from 'mongoose';
import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import Medication from '../models/Medication.js';
import { verifyToken } from '../middleware/auth.js';
import { uploadBufferToBlob } from '../utils/blob.js';

const router = express.Router();
const { Types } = mongoose;

// Multer: memory storage for bulk import (Excel) and photo uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
});

// ─── Helper ──────────────────────────────────────────────────────────────────
function buildExpiryDate(month, year) {
  if (!month || !year) return null;
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthIndex = isNaN(month) ? months.indexOf(month) : parseInt(month, 10) - 1;
  if (monthIndex < 0) return null;
  return new Date(parseInt(year, 10), monthIndex + 1, 0); // last day of month
}


function serializeMedication(doc) {
  if (!doc) return null;
  const src = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  const mongoId = src && src._id ? String(src._id) : '';
  const legacyId = src && src.legacyId ? String(src.legacyId) : '';
  const routeId = mongoId || legacyId || src.sku || src.barcodeData || src.batchLotNumber || '';
  return {
    ...src,
    _id: mongoId,
    id: mongoId,
    legacyId,
    routeId,
  };
}

function buildScopedCandidates(rawId, scopeFilter) {
  const id = String(rawId || '').trim();
  const candidates = [];
  if (!id) return candidates;
  if (Types.ObjectId.isValid(id)) candidates.push({ _id: id, ...scopeFilter });
  candidates.push({ legacyId: id, ...scopeFilter });
  candidates.push({ routeId: id, ...scopeFilter });
  candidates.push({ sku: id, ...scopeFilter });
  candidates.push({ barcodeData: id, ...scopeFilter });
  candidates.push({ batchLotNumber: id, ...scopeFilter });
  return candidates;
}

async function findScopedMedication(rawId, scopeFilter) {
  const candidates = buildScopedCandidates(rawId, scopeFilter);
  for (const filter of candidates) {
    const med = await Medication.findOne(filter);
    if (med) return med;
  }
  return null;
}


// ─── GET /api/medications ─────────────────────────────────────────────────────
router.get('/', verifyToken, async (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 20 } = req.query;

    // Scope by orgId when available; fall back to addedBy so existing personal records still work
    const scopeFilter = req.user.orgId
      ? { orgId: req.user.orgId }
      : { addedBy: req.user.userId };

    const query = { ...scopeFilter };
    if (status && status !== 'All') query.status = status;
    if (search) {
      query.$or = [
        { medicationName: { $regex: search, $options: 'i' } },
        { brandName: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { batchLotNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const numericPage = Math.max(1, parseInt(page, 10) || 1);
    const unlimited = String(limit).toLowerCase() === 'all' || parseInt(limit, 10) <= 0;
    const total = await Medication.countDocuments(query);

    let findQuery = Medication.find(query).sort({ createdAt: -1 });
    let pagination;

    if (!unlimited) {
      const numericLimit = Math.max(1, parseInt(limit, 10) || 20);
      const skip = (numericPage - 1) * numericLimit;
      findQuery = findQuery.skip(skip).limit(numericLimit);
      pagination = {
        total,
        page: numericPage,
        pages: Math.ceil(total / numericLimit),
        limit: numericLimit,
      };
    } else {
      pagination = {
        total,
        page: 1,
        pages: total > 0 ? 1 : 0,
        limit: 'all',
      };
    }

    const medications = await findQuery;
    const serialized = medications.map(serializeMedication);

    res.json({
      success: true,
      data: serialized,
      pagination,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/medications ────────────────────────────────────────────────────
router.post('/', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    const {
      medicationName, brandName, risk, shelfId,
      expiryMonth, expiryYear, currentStock, supplierName,
      supplierContact, status, category, barcodeData, sku, batchLotNumber,
    } = req.body;

    if (!medicationName) {
      return res.status(400).json({ success: false, message: 'Medication name is required' });
    }

    const expiryDate = buildExpiryDate(expiryMonth, expiryYear);

    let photoUrl = '';
    if (req.file) {
      photoUrl = await uploadBufferToBlob({
        buffer: req.file.buffer,
        filename: req.file.originalname || `medication-${Date.now()}.jpg`,
        contentType: req.file.mimetype,
        prefix: `medications/${req.user.orgId || req.user.userId || 'user'}`,
      });
    } else if (req.body.photoUrl) {
      photoUrl = String(req.body.photoUrl);
    }

    const med = new Medication({
      medicationName,
      brandName,
      risk,
      shelfId,
      expiryMonth,
      expiryYear,
      expiryDate,
      currentStock: parseInt(currentStock, 10) || 0,
      supplierName,
      supplierContact,
      status,
      category,
      barcodeData,
      sku,
      batchLotNumber,
      photoUrl,
      addedBy: req.user.userId,
      orgId: req.user.orgId || 'dummy01',
    });

    await med.save();

    res.status(201).json({ success: true, data: serializeMedication(med) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET /api/medications/:id ─────────────────────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const scopeFilter = req.user.orgId
      ? { orgId: req.user.orgId }
      : { addedBy: req.user.userId };
    const med = await findScopedMedication(req.params.id, scopeFilter);
    if (!med) return res.status(404).json({ success: false, message: 'Medication not found' });
    res.json({ success: true, data: serializeMedication(med) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── PUT /api/medications/:id ─────────────────────────────────────────────────
router.put('/:id', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    const scopeFilter = req.user.orgId
      ? { orgId: req.user.orgId }
      : { addedBy: req.user.userId };
    const med = await findScopedMedication(req.params.id, scopeFilter);
    if (!med) return res.status(404).json({ success: false, message: 'Medication not found' });

    const fields = [
      'medicationName','brandName','risk','shelfId','expiryMonth','expiryYear',
      'currentStock','supplierName','supplierContact','status','category',
      'barcodeData','sku','batchLotNumber',
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) med[f] = req.body[f];
    });

    if (req.body.expiryMonth || req.body.expiryYear) {
      med.expiryDate = buildExpiryDate(med.expiryMonth, med.expiryYear);
    }
    if (req.body.currentStock !== undefined) {
      med.currentStock = parseInt(req.body.currentStock, 10) || 0;
    }
    if (req.file) {
      med.photoUrl = await uploadBufferToBlob({
        buffer: req.file.buffer,
        filename: req.file.originalname || `medication-${med._id}-${Date.now()}.jpg`,
        contentType: req.file.mimetype,
        prefix: `medications/${req.user.orgId || req.user.userId || 'user'}`,
      });
    } else if (req.body.photoUrl !== undefined) {
      // Allow passing an already-uploaded blob URL (e.g. barcode scan flow)
      med.photoUrl = String(req.body.photoUrl || '');
    }

    await med.save();
    res.json({ success: true, data: serializeMedication(med) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELETE /api/medications/:id ──────────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const scopeFilter = req.user.orgId
      ? { orgId: req.user.orgId }
      : { addedBy: req.user.userId };
    const med = await findScopedMedication(req.params.id, scopeFilter);
    if (!med) return res.status(404).json({ success: false, message: 'Medication not found' });
    await med.deleteOne();
    res.json({ success: true, message: 'Medication deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── POST /api/medications/bulk-import ───────────────────────────────────────
router.post('/bulk-import', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const importFileUrl = await uploadBufferToBlob({
      buffer: req.file.buffer,
      filename: req.file.originalname || `bulk-import-${Date.now()}.xlsx`,
      contentType: req.file.mimetype,
      prefix: `imports/${req.user.orgId || req.user.userId || 'user'}`,
    });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'Excel file is empty' });
    }

    const errors = [];
    const toInsert = [];

    rows.forEach((row, idx) => {
      const expiryMonth = String(row['Expiry Month'] || row['expiryMonth'] || '');
      const expiryYear = String(row['Expiry Year'] || row['expiryYear'] || '');
      const expiryDate = buildExpiryDate(expiryMonth, expiryYear);
      const currentStock = parseInt(row['Current Stock'] || row['currentStock'] || 0, 10);

      const today = new Date();
      const thirtyDaysOut = new Date(); thirtyDaysOut.setDate(today.getDate() + 30);
      let status = 'In Stock';
      if (currentStock === 0) status = 'Out of Stock';
      else if (currentStock <= 10) status = 'Low Stock';
      else if (expiryDate && expiryDate <= thirtyDaysOut) status = 'Expiring Soon';

      const medicationName = String(row['Medication Name'] || row['medicationName'] || '').trim();
      const sku = String(row['SKU'] || row['sku'] || row['SKU / Barcode'] || '').trim();

      if (!medicationName) {
        errors.push({ row: idx + 2, field: 'Medication Name', message: 'Medication name is required' });
        return;
      }

      toInsert.push({
        medicationName,
        brandName: String(row['Brand Name'] || row['brandName'] || '').trim(),
        sku,
        batchLotNumber: String(row['Batch/Lot Number'] || row['batchLotNumber'] || '').trim(),
        risk: String(row['Risk'] || row['risk'] || '').trim(),
        shelfId: String(row['Shelf ID'] || row['shelfId'] || '').trim(),
        expiryMonth,
        expiryYear,
        expiryDate,
        currentStock,
        supplierName: String(row['Supplier Name'] || row['supplierName'] || '').trim(),
        supplierContact: String(row['Supplier Contact'] || row['supplierContact'] || '').trim(),
        status: String(row['Status'] || status).trim(),
        category: String(row['Category'] || row['category'] || '').trim(),
        addedBy: req.user.userId,
        orgId: req.user.orgId || 'dummy01',
        importFileUrl,
      });
    });

    let inserted = [];
    if (toInsert.length) {
      try {
        inserted = await Medication.insertMany(toInsert, { ordered: false });
      } catch (e) {
        // If ordered:false, Mongo can still insert some docs and throw for duplicates/validation.
        inserted = e?.insertedDocs || [];
        if (Array.isArray(e?.writeErrors)) {
          e.writeErrors.slice(0, 50).forEach((we) => {
            errors.push({
              row: (we?.index ?? 0) + 2,
              field: 'Row',
              message: we?.errmsg || 'Failed to insert row',
            });
          });
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        importFileUrl,
        insertedCount: inserted.length,
        items: inserted.map(serializeMedication),
        errors,
      },
    });

 } catch (error) {
   res.status(500).json({ success: false, message: error.message });
 }
});

// ─── POST /api/medications/barcode ───────────────────────────────────────────
// Accepts a photo upload; returns parsed barcode data (mock lookup)
router.post('/barcode', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo uploaded' });
    }

    const photoUrl = await uploadBufferToBlob({
      buffer: req.file.buffer,
      filename: req.file.originalname || `barcode-${Date.now()}.jpg`,
      contentType: req.file.mimetype,
      prefix: `barcode/${req.user.orgId || req.user.userId || 'user'}`,
    });

    // Best-effort: barcode may be decoded on the client and sent here.
    const barcode = String(req.body.barcode || req.body.barcodeData || '').trim();
    const format = String(req.body.format || '').trim();

    res.json({
      success: true,
      data: {
        photoUrl,
        barcode,
        format,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
