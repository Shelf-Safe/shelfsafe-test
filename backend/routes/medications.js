import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
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
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  },
});

function buildExpiryDate(month, year) {
  if (!month || !year) return null;
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const monthIndex = isNaN(month) ? months.indexOf(month) : parseInt(month, 10) - 1;
  if (monthIndex < 0) return null;
  return new Date(parseInt(year, 10), monthIndex + 1, 0);
}

router.get('/', verifyToken, async (req, res) => {
  try {
    const { search = '', status = '', page = 1, limit = 20 } = req.query;

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

    const limitNum = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50000);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limitNum;
    const total = await Medication.countDocuments(query);
    const medications = await Medication.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: medications,
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
    const {
      medicationName, brandName, risk, shelfId,
      expiryMonth, expiryYear, currentStock, supplierName,
      supplierContact, status, category, barcodeData, sku, batchLotNumber,
    } = req.body;

    if (!medicationName) {
      return res.status(400).json({ success: false, message: 'Medication name is required' });
    }

    const expiryDate = buildExpiryDate(expiryMonth, expiryYear);

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
      photoUrl: req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` : '',
      addedBy: req.user.userId,
      orgId: req.user.orgId || 'dummy01',
    });

    await med.save();

    res.status(201).json({ success: true, data: med });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const scopeFilter = req.user.orgId
      ? { orgId: req.user.orgId }
      : { addedBy: req.user.userId };
    const med = await Medication.findOne({ _id: req.params.id, ...scopeFilter });
    if (!med) return res.status(404).json({ success: false, message: 'Medication not found' });
    res.json({ success: true, data: med });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/:id', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    const scopeFilter = req.user.orgId
      ? { orgId: req.user.orgId }
      : { addedBy: req.user.userId };
    const med = await Medication.findOne({ _id: req.params.id, ...scopeFilter });
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
      med.photoUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }

    await med.save();
    res.json({ success: true, data: med });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const scopeFilter = req.user.orgId
      ? { orgId: req.user.orgId }
      : { addedBy: req.user.userId };
    const med = await Medication.findOneAndDelete({ _id: req.params.id, ...scopeFilter });
    if (!med) return res.status(404).json({ success: false, message: 'Medication not found' });
    res.json({ success: true, message: 'Medication deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/bulk-import', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'Excel file is empty' });
    }

    const medications = rows.map((row) => {
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

      return {
        medicationName: String(row['Medication Name'] || row['medicationName'] || '').trim(),
        brandName: String(row['Brand Name'] || row['brandName'] || '').trim(),
        sku: String(row['SKU'] || row['sku'] || row['SKU / Barcode'] || '').trim(),
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
    };
  });

  res.status(200).json({ success: true, count: medications.length });

 } catch (error) {
   res.status(500).json({ success: false, message: error.message });
 }
});

router.post('/barcode', verifyToken, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No photo uploaded' });
    }

    const imageDataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    res.json({
      success: true,
      data: {
        imageDataUrl,
        barcodeData: req.body.barcodeData || '',
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
