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
  const setFromDays = (days) => { from = new Date(now); from.setDate(from.getDate() - days); };
  if (!lower || lower === 'all' || lower === 'all time') return { from: null, to };
  if (lower.includes('30')) setFromDays(30);
  else if (lower.includes('60')) setFromDays(60);
  else if (lower.includes('90')) setFromDays(90);
  else if (lower.includes('6')) setFromDays(183);
  else if (lower.includes('year')) setFromDays(365);
  else setFromDays(60);
  return { from, to };
}

function safeFileName(name) { return String(name).replace(/[^a-z0-9\-_\.]/gi, '_'); }
function formatDate(d) { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
function day(date) { const d = new Date(date); d.setHours(0,0,0,0); return d; }
function daysUntil(expiryDate) { return Math.ceil((day(expiryDate) - day(new Date())) / 86400000); }

function deriveStatus(m) {
  const today = day(new Date());
  const soon = new Date(today); soon.setDate(soon.getDate() + 30);
  const exp = m.expiryDate ? day(m.expiryDate) : null;
  if (m.status === 'Removed' || m.status === 'Recalled') return m.status;
  if (exp && exp < today) return 'Expired';
  if (exp && exp <= soon) return 'Expiring Soon';
  const stock = Number(m.currentStock || 0);
  if (stock <= 0) return 'Out of Stock';
  if (stock <= 10) return 'Low Stock';
  return 'In Stock';
}

async function getCurrentUser(req) { return User.findById(req.user.userId).select('name email orgId').lean(); }
async function getScope(req) {
  const currentUser = await getCurrentUser(req);
  const orgId = req.user.orgId || currentUser?.orgId || 'dummy01';
  return { orgId, userId: req.user.userId, currentUser };
}
function buildMedicationScope(scope) { return scope.orgId ? { $or: [{ orgId: scope.orgId }, { addedBy: scope.userId }] } : { addedBy: scope.userId }; }
function buildReportScope(scope) { return scope.orgId ? { $or: [{ orgId: scope.orgId }, { generatedBy: scope.userId }] } : { generatedBy: scope.userId }; }

function matchesSearch(m, search) {
  if (!search) return true;
  const q = String(search).trim().toLowerCase();
  return [m.medicationName, m.brandName, m.sku, m.batchLotNumber, m.category, m.supplierName]
    .filter(Boolean).some((v) => String(v).toLowerCase().includes(q));
}

function applyCommonFilters(rows, filters = {}) {
  const category = String(filters.category || '').trim();
  const status = String(filters.status || '').trim();
  const search = String(filters.search || '').trim();
  return rows.filter((m) => {
    const derived = deriveStatus(m);
    const statusOk = !status || status === 'All' || derived === status;
    const categoryOk = !category || category === 'All' || m.category === category;
    return statusOk && categoryOk && matchesSearch(m, search);
  });
}

async function fetchScopedMedications(scope) {
  const rows = await Medication.find(buildMedicationScope(scope)).lean();
  return rows.map((m) => ({ ...m, derivedStatus: deriveStatus(m), daysUntilExpiry: m.expiryDate ? daysUntil(m.expiryDate) : null }));
}

async function buildReportData({ scope, reportType, reportSubType, filters }) {
  const now = day(new Date());
  let rows = applyCommonFilters(await fetchScopedMedications(scope), filters);

  if (reportType === 'Expiry Reports') {
    const subtype = reportSubType || 'expired_only';
    if (subtype === 'expired_only') rows = rows.filter((m) => m.derivedStatus === 'Expired');
    else if (subtype === 'expiring_soon') rows = rows.filter((m) => m.expiryDate && m.daysUntilExpiry !== null && m.daysUntilExpiry >= 0 && m.daysUntilExpiry <= Number(filters.expiryWindowDays || 30));
    else rows = rows.filter((m) => !!m.expiryDate);
    rows.sort((a,b) => new Date(a.expiryDate || '9999-12-31') - new Date(b.expiryDate || '9999-12-31') || String(a.medicationName).localeCompare(String(b.medicationName)));
    return { kind: 'table', rows };
  }

  if (reportType === 'Stock Reports') {
    const subtype = reportSubType || 'stock_risk';
    rows = rows.filter((m) => m.derivedStatus !== 'Expired' && m.derivedStatus !== 'Removed' && m.derivedStatus !== 'Recalled');
    if (subtype === 'out_of_stock') rows = rows.filter((m) => Number(m.currentStock || 0) <= 0);
    else if (subtype === 'low_stock') rows = rows.filter((m) => Number(m.currentStock || 0) > 0 && Number(m.currentStock || 0) <= 10);
    else rows = rows.filter((m) => Number(m.currentStock || 0) <= 10);
    rows.sort((a,b) => Number(a.currentStock || 0) - Number(b.currentStock || 0) || String(a.medicationName).localeCompare(String(b.medicationName)));
    return { kind: 'table', rows };
  }

  if (reportType === 'Compliance & Safety Reports') {
    const subtype = reportSubType || 'non_compliant_items';
    if (subtype === 'removed_expired_audit') rows = rows.filter((m) => ['Removed', 'Expired'].includes(m.derivedStatus));
    else if (subtype === 'recalled_and_expired') rows = rows.filter((m) => ['Recalled', 'Expired'].includes(m.derivedStatus));
    else rows = rows.filter((m) => ['Expired', 'Recalled', 'Removed'].includes(m.derivedStatus) || (m.expiryDate && m.daysUntilExpiry >= 0 && m.daysUntilExpiry <= 30));
    rows.sort((a,b) => String(a.derivedStatus).localeCompare(String(b.derivedStatus)) || new Date(a.expiryDate || '9999-12-31') - new Date(b.expiryDate || '9999-12-31'));
    return { kind: 'table', rows };
  }

  if (reportType === 'Usage & Trends') {
    const rangeDays = Number(filters.trendWindowDays || 365);
    const from = new Date(now); from.setDate(from.getDate() - rangeDays);
    const expiredRows = rows.filter((m) => m.expiryDate && day(m.expiryDate) >= from && m.derivedStatus === 'Expired');

    const periodMap = new Map();
    expiredRows.forEach((m) => {
      const d = new Date(m.expiryDate);
      const period = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      const prior = periodMap.get(period) || { period, itemsExpired: 0, unitsExpired: 0 };
      prior.itemsExpired += 1; prior.unitsExpired += Number(m.currentStock || 0); periodMap.set(period, prior);
    });

    const expiredCountMap = new Map();
    expiredRows.forEach((m) => expiredCountMap.set(m.medicationName, (expiredCountMap.get(m.medicationName) || 0) + 1));

    const statusMap = new Map();
    rows.forEach((m) => {
      const key = m.derivedStatus;
      const prior = statusMap.get(key) || { status: key, itemCount: 0, totalUnits: 0 };
      prior.itemCount += 1; prior.totalUnits += Number(m.currentStock || 0); statusMap.set(key, prior);
    });

    const categoryMap = new Map();
    expiredRows.forEach((m) => {
      const key = m.category || 'Uncategorized';
      const prior = categoryMap.get(key) || { category: key, itemsExpired: 0 };
      prior.itemsExpired += 1; categoryMap.set(key, prior);
    });

    return {
      kind: 'summary',
      expiredWasteOverTime: Array.from(periodMap.values()).sort((a,b) => a.period.localeCompare(b.period)),
      mostExpiredItems: Array.from(expiredCountMap.entries()).map(([medicationName, timesExpired]) => ({ medicationName, timesExpired })).sort((a,b)=>b.timesExpired-a.timesExpired || a.medicationName.localeCompare(b.medicationName)).slice(0,15),
      inventoryStatusMix: Array.from(statusMap.values()).sort((a,b)=>b.itemCount-a.itemCount || a.status.localeCompare(b.status)),
      categoryWaste: Array.from(categoryMap.values()).sort((a,b)=>b.itemsExpired-a.itemsExpired || a.category.localeCompare(b.category)).slice(0,10),
    };
  }

  return { kind: 'table', rows };
}

function normalizeRowsForExport(data) {
  return data.rows.map((r) => ({
    medicationName: r.medicationName,
    brandName: r.brandName,
    category: r.category,
    sku: r.sku,
    batchLotNumber: r.batchLotNumber,
    risk: r.risk,
    shelfId: r.shelfId,
    expiryDate: r.expiryDate ? new Date(r.expiryDate).toISOString().slice(0,10) : '',
    currentStock: r.currentStock,
    status: r.derivedStatus || r.status,
    supplierName: r.supplierName,
  }));
}

function drawHeader(doc, title, meta) {
  doc.rect(40, 32, 515, 52).fill('#0f766e');
  doc.fillColor('white').fontSize(22).text(title, 55, 48);
  doc.fillColor('#111827');
  let y = 100;
  Object.entries(meta || {}).forEach(([k, v]) => { doc.font('Helvetica-Bold').fontSize(10).text(`${k}:`, 50, y, { continued: true }); doc.font('Helvetica').text(` ${v || '-'}`); y += 14; });
  return y + 8;
}

function ensurePage(doc, y, needed = 20) {
  if (y + needed <= 760) return y;
  doc.addPage();
  return 50;
}

function generatePdfBuffer({ title, meta, rows, summary }) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers = [];
    doc.on('data', (chunk) => buffers.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(buffers)));

    let y = drawHeader(doc, title, meta);

    if (rows && rows.length) {
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#111827').text('Results', 50, y);
      y += 22;
      const headers = [
        ['Medication', 50, 130], ['Category', 190, 80], ['Expiry', 275, 70], ['Stock', 350, 45], ['Status', 400, 90],
      ];
      const drawTableHeader = () => {
        doc.rect(50, y, 500, 20).fill('#e6fffb');
        doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(9);
        headers.forEach(([label, x]) => doc.text(label, x, y + 6));
        y += 24;
      };
      drawTableHeader();
      doc.font('Helvetica').fontSize(9);
      rows.slice(0, 500).forEach((r, idx) => {
        y = ensurePage(doc, y, 26);
        if (y === 50) drawTableHeader();
        if (idx % 2 === 0) doc.rect(50, y - 2, 500, 22).fill('#f9fafb');
        doc.fillColor('#111827');
        doc.text(String(r.medicationName || ''), 50, y, { width: 130, ellipsis: true });
        doc.text(String(r.category || ''), 190, y, { width: 80, ellipsis: true });
        doc.text(r.expiryDate ? new Date(r.expiryDate).toISOString().slice(0,10) : '-', 275, y, { width: 70 });
        doc.text(String(r.currentStock ?? '-'), 350, y, { width: 45 });
        doc.text(String(r.status || r.derivedStatus || ''), 400, y, { width: 90, ellipsis: true });
        y += 22;
      });
      if (rows.length > 500) {
        y += 6;
        doc.fontSize(9).fillColor('#6b7280').text(`Showing first 500 rows. Total rows: ${rows.length}`, 50, y);
      }
    }

    if (summary) {
      const sections = [
        ['Expired waste over time', summary.expiredWasteOverTime || []],
        ['Most frequently expired items', summary.mostExpiredItems || []],
        ['Inventory status mix', summary.inventoryStatusMix || []],
        ['Category waste hotspots', summary.categoryWaste || []],
      ];
      y = ensurePage(doc, y + 24, 50);
      doc.font('Helvetica-Bold').fontSize(13).fillColor('#111827').text('Summary', 50, y);
      y += 24;
      sections.forEach(([label, items]) => {
        y = ensurePage(doc, y, 40);
        doc.font('Helvetica-Bold').fontSize(11).text(label, 50, y); y += 16;
        if (!items.length) { doc.font('Helvetica').fontSize(9).fillColor('#6b7280').text('No data available', 50, y); y += 18; return; }
        items.forEach((item) => { y = ensurePage(doc, y, 16); doc.font('Helvetica').fontSize(9).fillColor('#111827').text(Object.entries(item).map(([k,v]) => `${k}: ${v}`).join('   |   '), 60, y, { width: 470 }); y += 14; });
        y += 10;
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
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new Error('Missing BLOB_READ_WRITE_TOKEN for Vercel report uploads');
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
    const exportRows = data.kind === 'table' ? normalizeRowsForExport(data) : [];
    const ts = Date.now();
    const fileName = `reportsGenerated/${safeFileName(reportType)}_${ts}.${format === 'PDF' ? 'pdf' : 'csv'}`;
    const contentType = format === 'PDF' ? 'application/pdf' : 'text/csv';

    let fileBuffer;
    if (format === 'CSV') {
      const parser = new Json2CsvParser({ withBOM: true });
      fileBuffer = Buffer.from(parser.parse(data.kind === 'table' ? exportRows : [data]), 'utf-8');
    } else {
      fileBuffer = await generatePdfBuffer({
        title: `ShelfSafe — ${reportType}`,
        meta: {
          Created: new Date().toISOString(),
          'Report Type': reportType,
          'Report Focus': reportSubType || 'default',
          'Generated By': scope.currentUser?.email || 'Unknown',
          Rows: data.kind === 'table' ? exportRows.length : '-',
        },
        rows: data.kind === 'table' ? exportRows : null,
        summary: data.kind === 'summary' ? data : null,
      });
    }

    const publicUrl = await saveReportFile(req, fileName, contentType, fileBuffer);
    const reportDoc = await Report.create({
      orgId: scope.orgId || 'dummy01', reportType, reportSubType, filters,
      generatedBy: req.user.userId, format, fileUrl: publicUrl, fileName, mimeType: contentType,
      recordCount: data.kind === 'table' ? exportRows.length : 1,
    });

    res.status(201).json({ success: true, report: {
      id: reportDoc._id, type: reportDoc.reportType, subType: reportDoc.reportSubType, format: reportDoc.format,
      dateCreated: formatDate(reportDoc.createdAt), createdAt: reportDoc.createdAt,
      createdBy: scope.currentUser?.email || 'Unknown', author: scope.currentUser?.name || scope.currentUser?.email || 'Unknown',
      fileUrl: reportDoc.fileUrl, rowCount: reportDoc.recordCount,
    }});
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
      return { id: r._id, type: r.reportType, subType: r.reportSubType, dateCreated: formatDate(r.createdAt), createdAt: r.createdAt, createdBy: u?.email || 'User', author: u?.name || u?.email || 'User', format: r.format, fileUrl: r.fileUrl, rowCount: r.recordCount };
    });
    const term = String(q || '').trim().toLowerCase();
    if (term) reports = reports.filter((r) => [r.type, r.subType, r.createdBy, r.author, r.format].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)));
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
