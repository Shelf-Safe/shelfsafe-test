import express from 'express';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { Parser as Json2CsvParser } from 'json2csv';
import { put, del } from '@vercel/blob';

import Medication from '../models/Medication.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();
const LOCAL_REPORTS_DIR = path.resolve(process.cwd(), 'uploads', 'reports');

function parseDateRange(dateFilter = '') {
  const now = new Date();
  const to = new Date(now);
  const lower = String(dateFilter || '').toLowerCase();
  let from = null;

  const setFromDays = (days) => {
    from = new Date(now);
    from.setDate(from.getDate() - days);
  };

  if (!lower || lower === 'all' || lower === 'all time') return { from: null, to };
  if (lower.includes('30')) setFromDays(30);
  else if (lower.includes('60')) setFromDays(60);
  else if (lower.includes('90')) setFromDays(90);
  else if (lower.includes('6')) setFromDays(183);
  else if (lower.includes('year')) setFromDays(365);
  else setFromDays(60);
  return { from, to };
}

function safeFileName(name) {
  return String(name).replace(/[^a-z0-9\-_\.]/gi, '_');
}

function formatDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function getCurrentUser(req) {
  return User.findById(req.user.userId).select('name email orgId').lean();
}

async function getScope(req) {
  const currentUser = await getCurrentUser(req);
  const orgId = req.user.orgId || currentUser?.orgId || 'dummy01';
  return { orgId, userId: req.user.userId, currentUser };
}

function buildMedicationScope(scope) {
  if (scope.orgId) {
    return { $or: [{ orgId: scope.orgId }, { addedBy: scope.userId }] };
  }
  return { addedBy: scope.userId };
}

function buildReportScope(scope) {
  if (scope.orgId) {
    return { $or: [{ orgId: scope.orgId }, { generatedBy: scope.userId }] };
  }
  return { generatedBy: scope.userId };
}

async function buildReportData({ scope, reportType, reportSubType, filters }) {
  const now = new Date();
  const search = String(filters.search || '').trim();
  const category = String(filters.category || '').trim();
  const status = String(filters.status || '').trim();
  const q = { ...buildMedicationScope(scope) };

  if (search) {
    q.$and = q.$and || [];
    q.$and.push({
      $or: [
        { medicationName: { $regex: search, $options: 'i' } },
        { brandName: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { batchLotNumber: { $regex: search, $options: 'i' } },
      ],
    });
  }

  if (category && category !== 'All') q.category = category;
  if (status && status !== 'All') q.status = status;

  const { from, to } = parseDateRange(filters.dateFilter);
  const applyCreatedAtFilter = from && !['Expiry Reports', 'Stock Reports', 'Compliance & Safety Reports', 'Usage & Trends'].includes(reportType);
  if (applyCreatedAtFilter) q.createdAt = { $gte: from, $lte: to };

  if (reportType === 'Expiry Reports') {
    const expirySubtype = reportSubType || 'expired_only';
    if (expirySubtype === 'expired_only') {
      q.$and = q.$and || [];
      q.$and.push({ $or: [{ status: 'Expired' }, { expiryDate: { $lt: now } }] });
    } else if (expirySubtype === 'expiring_soon') {
      const windowDays = Number(filters.expiryWindowDays || 30);
      const until = new Date(now);
      until.setDate(until.getDate() + (Number.isFinite(windowDays) ? windowDays : 30));
      q.expiryDate = { $ne: null, $gte: now, $lte: until };
      q.status = { $nin: ['Removed', 'Expired'] };
    } else {
      q.expiryDate = { $ne: null };
      q.status = { $nin: ['Removed'] };
    }

    const rows = await Medication.find(q).sort({ expiryDate: 1, medicationName: 1 }).lean();
    return { kind: 'table', rows };
  }

  if (reportType === 'Stock Reports') {
    q.$and = q.$and || [];
    q.$and.push({
      $or: [
        { expiryDate: null },
        { expiryDate: { $gte: new Date() } }
      ]
    });
    const stockSubtype = reportSubType || 'stock_risk';
    if (stockSubtype === 'out_of_stock') {
      q.$and = q.$and || [];
      q.$and.push({ $or: [{ status: 'Out of Stock' }, { currentStock: { $lte: 0 } }] });
    } else if (stockSubtype === 'low_stock') {
      q.$and = q.$and || [];
      q.$and.push({ $or: [{ status: 'Low Stock' }, { currentStock: { $gt: 0, $lte: 10 } }] });
    } else if (stockSubtype === 'restock_priority') {
      q.$and = q.$and || [];
      q.$and.push({ $or: [{ status: { $in: ['Low Stock', 'Out of Stock'] } }, { currentStock: { $lte: 10 } }] });
    } else {
      q.$and = q.$and || [];
      q.$and.push({ $or: [{ status: 'Low Stock' }, { status: 'Out of Stock' }, { currentStock: { $lte: 10 } }] });
    }

    const rows = await Medication.find(q).sort({ currentStock: 1, medicationName: 1 }).lean();
    return { kind: 'table', rows };
  }

  if (reportType === 'Compliance & Safety Reports') {
    const complianceSubtype = reportSubType || 'non_compliant_items';
    q.$and = q.$and || [];
    if (complianceSubtype === 'removed_expired_audit') {
      q.$and.push({ $or: [{ status: 'Removed' }, { status: 'Expired' }, { expiryDate: { $lt: now } }] });
    } else if (complianceSubtype === 'recalled_and_expired') {
      q.$and.push({ $or: [{ status: 'Expired' }, { status: 'Recalled' }, { expiryDate: { $lt: now } }] });
    } else {
      q.$and.push({ $or: [{ status: 'Expired' }, { status: 'Recalled' }, { status: 'Removed' }, { status: 'Expiring Soon' }, { expiryDate: { $lt: now } }] });
    }

    const rows = await Medication.find(q).sort({ status: 1, expiryDate: 1, medicationName: 1 }).lean();
    return { kind: 'table', rows };
  }

  if (reportType === 'Usage & Trends') {
    const trendRangeDays = Number(filters.trendWindowDays || 365);
    const fromD = new Date(now);
    fromD.setDate(fromD.getDate() - (Number.isFinite(trendRangeDays) ? trendRangeDays : 365));

    const scopedMatch = { ...buildMedicationScope(scope) };
    if (category && category !== 'All') scopedMatch.category = category;

    const expiredMatch = { ...scopedMatch, expiryDate: { $ne: null, $gte: fromD, $lte: now }, $or: [{ status: 'Expired' }, { expiryDate: { $lt: now } }] };
    const statusMatch = { ...scopedMatch };

    const [expiredWasteOverTime, mostExpiredItems, inventoryStatusMix, categoryWaste] = await Promise.all([
      Medication.aggregate([
        { $match: expiredMatch },
        { $group: { _id: { y: { $year: '$expiryDate' }, m: { $month: '$expiryDate' } }, itemsExpired: { $sum: 1 }, unitsExpired: { $sum: '$currentStock' } } },
        { $sort: { '_id.y': 1, '_id.m': 1 } },
        { $project: { _id: 0, period: { $concat: [{ $toString: '$_id.y' }, '-', { $cond: [{ $lte: ['$_id.m', 9] }, { $concat: ['0', { $toString: '$_id.m' }] }, { $toString: '$_id.m' }] }] }, itemsExpired: 1, unitsExpired: 1 } },
      ]),
      Medication.aggregate([
        { $match: expiredMatch },
        { $group: { _id: '$medicationName', timesExpired: { $sum: 1 } } },
        { $sort: { timesExpired: -1, _id: 1 } },
        { $limit: 15 },
        { $project: { _id: 0, medicationName: '$_id', timesExpired: 1 } },
      ]),
      Medication.aggregate([
        { $match: statusMatch },
        { $group: { _id: '$status', itemCount: { $sum: 1 }, totalUnits: { $sum: '$currentStock' } } },
        { $sort: { itemCount: -1, _id: 1 } },
        { $project: { _id: 0, status: '$_id', itemCount: 1, totalUnits: 1 } },
      ]),
      Medication.aggregate([
        { $match: expiredMatch },
        { $group: { _id: '$category', itemsExpired: { $sum: 1 } } },
        { $sort: { itemsExpired: -1, _id: 1 } },
        { $limit: 10 },
        { $project: { _id: 0, category: '$_id', itemsExpired: 1 } },
      ]),
    ]);

    return { kind: 'summary', expiredWasteOverTime, mostExpiredItems, inventoryStatusMix, categoryWaste };
  }

  const rows = await Medication.find(q).sort({ createdAt: -1 }).limit(500).lean();
  return { kind: 'table', rows };
}

function normalizeRowsForExport(reportType, data) {
  if (data.kind === 'table') {
    return data.rows.map((r) => ({
      medicationName: r.medicationName,
      brandName: r.brandName,
      category: r.category,
      sku: r.sku,
      batchLotNumber: r.batchLotNumber,
      risk: r.risk,
      shelfId: r.shelfId,
      expiryDate: r.expiryDate ? new Date(r.expiryDate).toISOString().slice(0, 10) : '',
      currentStock: r.currentStock,
      status: r.status,
      supplierName: r.supplierName,
    }));
  }

  return [{ reportType, expiredWasteOverTime: JSON.stringify(data.expiredWasteOverTime || []), mostExpiredItems: JSON.stringify(data.mostExpiredItems || []), inventoryStatusMix: JSON.stringify(data.inventoryStatusMix || []), categoryWaste: JSON.stringify(data.categoryWaste || []) }];
}

function generatePdfBuffer({ title, meta, rows, summary }) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    doc.fontSize(18).text(title, { bold: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#555');
    Object.entries(meta || {}).forEach(([k, v]) => doc.text(`${k}: ${v}`));
    doc.fillColor('#000').moveDown();

    if (rows && rows.length) {
      doc.fontSize(12).text('Results');
      doc.moveDown(0.5);
      rows.slice(0, 500).forEach((r, idx) => {
        doc.fontSize(10).text(`${idx + 1}. ${r.medicationName || ''} | ${r.brandName || ''} | ${r.category || ''} | Stock: ${r.currentStock ?? ''} | Exp: ${r.expiryDate || ''} | ${r.status || ''}`);
      });
      if (rows.length > 500) {
        doc.moveDown(0.5);
        doc.fontSize(9).fillColor('#777').text(`(Showing first 500 rows. Total: ${rows.length})`);
        doc.fillColor('#000');
      }
    }

    if (summary) {
      const sections = [
        ['Expired waste over time', summary.expiredWasteOverTime || []],
        ['Most frequently expired items', summary.mostExpiredItems || []],
        ['Inventory status mix', summary.inventoryStatusMix || []],
        ['Category waste hotspots', summary.categoryWaste || []],
      ];

      doc.moveDown();
      doc.fontSize(12).text('Summary');
      sections.forEach(([label, items]) => {
        doc.moveDown(0.5);
        doc.fontSize(10).text(`${label}:`);
        if (!items || items.length === 0) {
          doc.fontSize(9).fillColor('#666').text('No data available');
          doc.fillColor('#000');
          return;
        }
        items.forEach((item, index) => {
          const parts = Object.entries(item).map(([k, v]) => `${k}: ${v}`).join(' | ');
          doc.fontSize(9).text(`${index + 1}. ${parts}`);
        });
      });
    }

    doc.end();
  });
}

function getLocalPublicOrigin(req) {
  const explicit = process.env.SERVER_PUBLIC_ORIGIN || process.env.APP_BASE_URL || process.env.BACKEND_PUBLIC_URL;
  if (explicit) return String(explicit).replace(/\/$/, '');

  const protoHeader = req.headers['x-forwarded-proto'];
  const hostHeader = req.headers['x-forwarded-host'] || req.get('host');
  const proto = protoHeader ? String(protoHeader).split(',')[0].trim() : req.protocol || 'http';
  const host = hostHeader ? String(hostHeader).split(',')[0].trim() : `localhost:${process.env.PORT || 5003}`;
  return `${proto}://${host}`;
}

async function saveReportFile(req, fileName, contentType, buffer) {
  if (process.env.VERCEL) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      throw new Error('Missing BLOB_READ_WRITE_TOKEN for Vercel report uploads');
    }
    const blob = await put(fileName, buffer, { access: 'public', contentType });
    return blob.url;
  }

  const filePath = path.join(LOCAL_REPORTS_DIR, fileName);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return `${getLocalPublicOrigin(req)}/files/reports/${fileName}`;
}

router.post('/generate', verifyToken, async (req, res) => {
  try {
    const { reportType, reportSubType = '', format, filters = {} } = req.body || {};
    if (!reportType || !format) return res.status(400).json({ success: false, message: 'reportType and format are required' });
    if (!['PDF', 'CSV'].includes(format)) return res.status(400).json({ success: false, message: 'format must be PDF or CSV' });

    const scope = await getScope(req);
    const data = await buildReportData({ scope, reportType, reportSubType, filters });
    const exportRows = normalizeRowsForExport(reportType, data);
    const ts = Date.now();
    const folderPath = 'reportsGenerated';
    const fileName = `${folderPath}/${safeFileName(reportType)}_${ts}.${format === 'PDF' ? 'pdf' : 'csv'}`;
    const contentType = format === 'PDF' ? 'application/pdf' : 'text/csv';

    let fileBuffer;
    if (format === 'CSV') {
      const parser = new Json2CsvParser({ withBOM: true });
      fileBuffer = Buffer.from(parser.parse(exportRows), 'utf-8');
    } else {
      fileBuffer = await generatePdfBuffer({
        title: `ShelfSafe — ${reportType}`,
        meta: {
          Created: new Date().toISOString(),
          'Report Type': reportType,
          'Report Subtype': reportSubType || 'default',
          'Generated By': scope.currentUser?.email || 'Unknown',
        },
        rows: data.kind === 'table' ? exportRows : null,
        summary: data.kind === 'summary' ? data : null,
      });
    }

    const publicUrl = await saveReportFile(req, fileName, contentType, fileBuffer);
    const reportDoc = await Report.create({
      orgId: scope.orgId || 'dummy01',
      reportType,
      reportSubType,
      filters,
      generatedBy: req.user.userId,
      format,
      fileUrl: publicUrl,
      fileName,
      mimeType: contentType,
      recordCount: data.kind === 'table' ? data.rows.length : exportRows.length,
    });

    res.status(201).json({
      success: true,
      report: {
        id: reportDoc._id,
        type: reportDoc.reportType,
        subType: reportDoc.reportSubType,
        format: reportDoc.format,
        dateCreated: formatDate(reportDoc.createdAt),
        createdAt: reportDoc.createdAt,
        createdBy: scope.currentUser?.email || 'Unknown',
        author: scope.currentUser?.name || scope.currentUser?.email || 'Unknown',
        fileUrl: reportDoc.fileUrl,
        rowCount: reportDoc.recordCount,
      },
    });
  } catch (error) {
    console.error('Report Generation Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/', verifyToken, async (req, res) => {
  try {
    const { q = '', dateFilter = 'Last 60 days', reportType = '', format = '' } = req.query;
    const scope = await getScope(req);
    const filter = { ...buildReportScope(scope) };

    if (reportType && reportType !== 'All') filter.reportType = reportType;
    if (format && format !== 'All Formats' && format !== 'All') filter.format = format;

    const { from, to } = parseDateRange(dateFilter);
    if (from) filter.createdAt = { $gte: from, $lte: to };

    let reports = await Report.find(filter).sort({ createdAt: -1 }).limit(200).lean();
    const userIds = [...new Set(reports.map((r) => String(r.generatedBy)).filter(Boolean))];
    const users = await User.find({ _id: { $in: userIds } }).select('name email').lean();
    const byId = new Map(users.map((u) => [String(u._id), u]));

    reports = reports.map((r) => {
      const u = byId.get(String(r.generatedBy));
      return {
        id: r._id,
        type: r.reportType,
        subType: r.reportSubType,
        dateCreated: formatDate(r.createdAt),
        createdAt: r.createdAt,
        createdBy: u?.email || 'User',
        author: u?.name || u?.email || 'User',
        format: r.format,
        fileUrl: r.fileUrl,
        rowCount: r.recordCount,
      };
    });

    const term = String(q || '').trim().toLowerCase();
    if (term) {
      reports = reports.filter((r) => [r.type, r.subType, r.createdBy, r.author, r.format].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)));
    }

    res.json({ success: true, data: reports });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', verifyToken, async (req, res) => {
  try {
    const scope = await getScope(req);
    const report = await Report.findOne({ _id: req.params.id, ...buildReportScope(scope) }).lean();
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });
    res.json({ success: true, data: report });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const scope = await getScope(req);
    const report = await Report.findOneAndDelete({ _id: req.params.id, ...buildReportScope(scope) });
    if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

    if (process.env.VERCEL && report.fileUrl) {
      try { await del(report.fileUrl); } catch (err) { console.warn('Blob delete warning:', err.message); }
    } else if (report.fileName) {
      const filePath = path.join(LOCAL_REPORTS_DIR, report.fileName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: 'Report deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
