import express from 'express';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { Parser as Json2CsvParser } from 'json2csv';

import Medication from '../models/Medication.js';
import Report from '../models/Report.js';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

const REPORTS_DIR = path.resolve(process.cwd(), 'uploads', 'reports');
fs.mkdirSync(REPORTS_DIR, { recursive: true });

function scopeFilter(req) {
    return req.user.orgId ? { orgId: req.user.orgId } : { addedBy: req.user.userId };
}

function parseDateRange(dateFilter = '') {
    const now = new Date();
    const to = new Date(now);

    const lower = String(dateFilter || '').toLowerCase();
    let from = null;

    const setFromDays = (days) => {
        from = new Date(now);
        from.setDate(from.getDate() - days);
    };

    if (!lower || lower === 'all' || lower === 'all time') {
        return { from: null, to };
    }

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

function monthYear(d) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

async function buildReportData({ req, reportType, reportSubType, filters }) {
    const base = scopeFilter(req);
    const now = new Date();

    // Filters from UI
    const search = String(filters.search || '').trim();
    const category = String(filters.category || '').trim();
    const status = String(filters.status || '').trim();

    const q = { ...base };

    if (search) {
        q.$or = [
            { medicationName: { $regex: search, $options: 'i' } },
            { brandName: { $regex: search, $options: 'i' } },
            { sku: { $regex: search, $options: 'i' } },
            { batchLotNumber: { $regex: search, $options: 'i' } },
        ];
    }
    if (category && category !== 'All') q.category = category;
    if (status && status !== 'All') q.status = status;

    // Date range (createdAt on Medication for “activity window”)
    const { from, to } = parseDateRange(filters.dateFilter);
    if (from) q.createdAt = { $gte: from, $lte: to };

    // Report-specific logic
    if (reportType === 'Expiry Reports') {
        const windowDays = Number(filters.expiryWindowDays || 60);
        const until = new Date(now);
        until.setDate(until.getDate() + (Number.isFinite(windowDays) ? windowDays : 60));

        if (reportSubType === 'expired') {
            q.status = 'Expired';
        } else {
            // Expiring soon bucket
            q.expiryDate = { $ne: null, $lte: until };
            q.status = { $nin: ['Removed'] };
            // Include Expiring Soon + Expired edge cases; status is auto computed
        }

        const rows = await Medication.find(q).sort({ expiryDate: 1, medicationName: 1 }).lean();
        return { kind: 'table', rows };
    }

    if (reportType === 'Stock Reports') {
        if (reportSubType === 'out_of_stock') {
            q.status = 'Out of Stock';
        } else if (reportSubType === 'low_stock') {
            q.status = 'Low Stock';
        }

        const rows = await Medication.find(q).sort({ currentStock: 1, medicationName: 1 }).lean();
        return { kind: 'table', rows };
    }

    if (reportType === 'Compliance & Safety Reports') {
        // Minimal but useful compliance output using the current simplified schema.
        // - removed_expired: meds marked Removed that were expired at time of removal (approx by expiryDate < now)
        // - default: expired + recalled + expiring soon

        if (reportSubType === 'removed_expired') {
            q.status = 'Removed';
            q.expiryDate = { $ne: null, $lt: now };
        } else {
            q.status = { $in: ['Expired', 'Recalled', 'Expiring Soon'] };
        }

        const rows = await Medication.find(q).sort({ status: 1, expiryDate: 1 }).lean();
        return { kind: 'table', rows };
    }

    if (reportType === 'Usage & Trends') {
        // Trend report from available data: group expiries by month and top expired meds.
        const trendRangeDays = Number(filters.trendWindowDays || 365);
        const fromD = new Date(now);
        fromD.setDate(fromD.getDate() - (Number.isFinite(trendRangeDays) ? trendRangeDays : 365));

        const match = {
            ...base,
            expiryDate: { $ne: null, $gte: fromD, $lte: now },
        };

        const expiredWasteOverTime = await Medication.aggregate([
            { $match: { ...match, status: 'Expired' } },
            {
                $group: {
                    _id: { y: { $year: '$expiryDate' }, m: { $month: '$expiryDate' } },
                    itemsExpired: { $sum: 1 },
                    unitsExpired: { $sum: '$currentStock' },
                },
            },
            { $sort: { '_id.y': 1, '_id.m': 1 } },
            {
                $project: {
                    _id: 0,
                    period: {
                        $concat: [
                            { $toString: '$_id.y' },
                            '-',
                            {
                                $cond: [{ $lte: ['$_id.m', 9] }, { $concat: ['0', { $toString: '$_id.m' }] }, { $toString: '$_id.m' }],
                            },
                        ],
                    },
                    itemsExpired: 1,
                    unitsExpired: 1,
                },
            },
        ]);

        const mostExpiredItems = await Medication.aggregate([
            { $match: { ...match, status: 'Expired' } },
            {
                $group: {
                    _id: '$medicationName',
                    timesExpired: { $sum: 1 },
                },
            },
            { $sort: { timesExpired: -1 } },
            { $limit: 20 },
            { $project: { _id: 0, medicationName: '$_id', timesExpired: 1 } },
        ]);

        return {
            kind: 'summary',
            expiredWasteOverTime,
            mostExpiredItems,
        };
    }

    // Fallback
    const rows = await Medication.find(q).sort({ createdAt: -1 }).limit(200).lean();
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

    // summary: flatten into sections for CSV/PDF
    return [
        {
            reportType,
            expiredWasteOverTime: JSON.stringify(data.expiredWasteOverTime || []),
            mostExpiredItems: JSON.stringify(data.mostExpiredItems || []),
        },
    ];
}

function writeCsvFile(filePath, rows) {
    const parser = new Json2CsvParser({ withBOM: true });
    const csv = parser.parse(rows);
    fs.writeFileSync(filePath, csv);
}

function writePdfFile(filePath, { title, meta, rows, summary }) {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    doc.pipe(fs.createWriteStream(filePath));

    doc.fontSize(18).text(title, { bold: true });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor('#555');
    Object.entries(meta || {}).forEach(([k, v]) => {
        doc.text(`${k}: ${v}`);
    });
    doc.fillColor('#000');
    doc.moveDown();

    if (rows && rows.length) {
        doc.fontSize(12).text('Results');
        doc.moveDown(0.5);
        rows.slice(0, 500).forEach((r, idx) => {
            doc.fontSize(10).text(
                `${idx + 1}. ${r.medicationName || ''} | ${r.brandName || ''} | ${r.category || ''} | Stock: ${r.currentStock ?? ''} | Exp: ${r.expiryDate || ''} | ${r.status || ''}`,
            );
        });
        if (rows.length > 500) {
            doc.moveDown(0.5);
            doc.fontSize(9).fillColor('#777').text(`(Showing first 500 rows. Total: ${rows.length})`);
            doc.fillColor('#000');
        }
    }

    if (summary) {
        doc.moveDown();
        doc.fontSize(12).text('Summary');
        doc.moveDown(0.5);
        doc.fontSize(10).text('Expired waste over time:');
        doc.fontSize(9).text(JSON.stringify(summary.expiredWasteOverTime || [], null, 2));
        doc.moveDown(0.5);
        doc.fontSize(10).text('Most expired items:');
        doc.fontSize(9).text(JSON.stringify(summary.mostExpiredItems || [], null, 2));
    }

    doc.end();
}

// ─── POST /api/reports/generate ───────────────────────────────────────────────
// Body:
// {
//   reportType: 'Expiry Reports' | 'Stock Reports' | 'Compliance & Safety Reports' | 'Usage & Trends',
//   reportSubType?: string,
//   format: 'PDF' | 'CSV',
//   filters?: { dateFilter, search, category, status, expiryWindowDays, trendWindowDays }
// }
router.post('/generate', verifyToken, async (req, res) => {
    try {
        const { reportType, reportSubType = '', format, filters = {} } = req.body || {};

        if (!reportType || !format) {
            return res.status(400).json({ success: false, message: 'reportType and format are required' });
        }
        if (!['PDF', 'CSV'].includes(format)) {
            return res.status(400).json({ success: false, message: 'format must be PDF or CSV' });
        }

        const data = await buildReportData({ req, reportType, reportSubType, filters });
        const exportRows = normalizeRowsForExport(reportType, data);

        const ts = Date.now();
        const baseName = safeFileName(`${reportType}_${reportSubType || 'default'}_${ts}`);
        const fileName = `${baseName}.${format === 'PDF' ? 'pdf' : 'csv'}`;
        const filePath = path.join(REPORTS_DIR, fileName);

        const meta = {
            Created: new Date().toISOString(),
            'Report Type': reportType,
            'Report Subtype': reportSubType || 'default',
            'Generated By': req.user.email,
        };

        if (format === 'CSV') {
            writeCsvFile(filePath, exportRows);
        } else {
            writePdfFile(filePath, {
                title: `ShelfSafe — ${reportType}`,
                meta,
                rows: data.kind === 'table' ? exportRows : null,
                summary: data.kind === 'summary' ? data : null,
            });
        }

        const publicUrl = `${req.protocol}://${req.get('host')}/files/reports/${encodeURIComponent(fileName)}`;

        const reportDoc = await Report.create({
            orgId: req.user.orgId || 'dummy01',
            reportType,
            reportSubType,
            filters,
            generatedBy: req.user.userId,
            format,
            fileUrl: publicUrl,
            fileName,
            mimeType: format === 'PDF' ? 'application/pdf' : 'text/csv',
            recordCount: data.kind === 'table' ? data.rows.length : exportRows.length,
        });

        res.status(201).json({
            success: true,
            report: {
                id: reportDoc._id,
                type: reportDoc.reportType,
                subType: reportDoc.reportSubType,
                format: reportDoc.format,
                dateCreated: monthYear(reportDoc.createdAt),
                createdAt: reportDoc.createdAt,
                createdBy: req.user.email,
                author: req.user.name || req.user.email,
                fileUrl: reportDoc.fileUrl,
                rowCount: reportDoc.recordCount,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── GET /api/reports ─────────────────────────────────────────────────────────
// Query:
//  q, dateFilter, reportType, format
router.get('/', verifyToken, async (req, res) => {
    try {
        const { q = '', dateFilter = 'Last 60 days', reportType = '', format = '', createdBy = '' } = req.query;
        const scope = req.user.orgId ? { orgId: req.user.orgId } : { generatedBy: req.user.userId };
        const filter = { ...scope };

        if (reportType && reportType !== 'All') filter.reportType = reportType;
        if (format && format !== 'All Formats' && format !== 'All') filter.format = format;

        const { from, to } = parseDateRange(dateFilter);
        if (from) filter.createdAt = { $gte: from, $lte: to };

        if (createdBy && createdBy !== 'All') {
            filter.generatedBy = createdBy;
        }

        let reports = await Report.find(filter).sort({ createdAt: -1 }).limit(200).lean();

        // join basic user info for author display
        const userIds = [...new Set(reports.map((r) => String(r.generatedBy)))];
        const users = await User.find({ _id: { $in: userIds } })
            .select('name email')
            .lean();
        const byId = new Map(users.map((u) => [String(u._id), u]));

        reports = reports.map((r) => {
            const u = byId.get(String(r.generatedBy));
            return {
                id: r._id,
                type: r.reportType,
                subType: r.reportSubType,
                dateCreated: monthYear(r.createdAt),
                createdAt: r.createdAt,
                createdBy: u?.name || u?.email || 'User',
                author: u?.name || u?.email || 'User',
                format: r.format,
                fileUrl: r.fileUrl,
                rowCount: r.recordCount,
            };
        });

        const term = String(q || '')
            .trim()
            .toLowerCase();
        if (term) {
            reports = reports.filter((r) =>
                [r.type, r.subType, r.createdBy, r.format].filter(Boolean).some((v) => String(v).toLowerCase().includes(term)),
            );
        }

        res.json({ success: true, data: reports });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── GET /api/reports/:id ─────────────────────────────────────────────────────
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const scope = req.user.orgId ? { orgId: req.user.orgId } : { generatedBy: req.user.userId };
        const report = await Report.findOne({ _id: req.params.id, ...scope }).lean();
        if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

        res.json({ success: true, data: report });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ─── DELETE /api/reports/:id ──────────────────────────────────────────────────
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const scope = req.user.orgId ? { orgId: req.user.orgId } : { generatedBy: req.user.userId };
        const report = await Report.findOneAndDelete({ _id: req.params.id, ...scope });
        if (!report) return res.status(404).json({ success: false, message: 'Report not found' });

        // best-effort file deletion (local storage)
        try {
            const filePath = path.join(REPORTS_DIR, report.fileName);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch (_) {}

        res.json({ success: true, message: 'Report deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
