import express from 'express';
import { verifyToken } from '../middleware/auth.js';
import Medication from '../models/Medication.js';
import PosConnection from '../models/PosConnection.js';

const router = express.Router();

const providers = [
  { key: 'mckesson', name: 'McKesson', logoUrl: '/pos-logos/mckesson.png' },
  { key: 'toshiba', name: 'Toshiba TCx', logoUrl: '/pos-logos/toshiba.png' },
  { key: 'square', name: 'Square POS', logoUrl: '/pos-logos/square.png' },
  { key: 'ncr', name: 'NCR', logoUrl: '/pos-logos/ncr.png' },
  { key: 'lightspeed', name: 'Lightspeed', logoUrl: '/pos-logos/lightspeed.png' },
  { key: 'lsretail', name: 'LS Retail', logoUrl: '/pos-logos/lsRetail.png' },
  { key: 'oracle', name: 'Oracle Retail', logoUrl: '/pos-logos/OracelRetail.png' },
  { key: 'propel', name: 'Propel OS', logoUrl: '/pos-logos/PropelOS.png' },
];

const POS_API_BASE_URL = process.env.POS_API_BASE_URL || 'http://localhost:4010';

async function posRequest(endpoint, options = {}) {
  const response = await fetch(`${POS_API_BASE_URL}${endpoint}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `POS request failed: ${response.status}`);
  return data;
}

async function loginToPos(username, password) {
  const payload = await posRequest('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  return payload.token;
}

function orgIdFor(req) {
  return req.user?.orgId || 'dummy01';
}

function toDateOrNull(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function computeStatus(currentStock, expiryDate, incomingStatus = '') {
  const today = new Date();
  const thirty = new Date();
  thirty.setDate(today.getDate() + 30);
  if (expiryDate && expiryDate < today) return 'Expired';
  if (currentStock === 0) return 'Out of Stock';
  if (currentStock <= 10) return 'Low Stock';
  if (expiryDate && expiryDate <= thirty) return 'Expiring Soon';
  return incomingStatus || 'In Stock';
}

function normalizeMedicationRecord(req, item) {
  const orgId = orgIdFor(req);
  const expiryDate = toDateOrNull(item.expiryDate);
  const currentStock = Number(item.currentStock ?? item.quantityOnHand ?? item.totalQuantityOnHand ?? 0);
  return {
    orgId,
    addedBy: req.user?.userId,
    medicationName: item.medicationName || item.name || item.genericName || 'Unknown Medication',
    brandName: item.brandName || item.brand || '',
    sku: item.sku || item.barcodeUpc || '',
    batchLotNumber: item.batchLotNumber || item.lotNumber || '',
    risk: item.risk || '',
    shelfId: item.shelfId || item.shelf || '',
    expiryMonth: item.expiryMonth || (expiryDate ? String(expiryDate.getUTCMonth() + 1).padStart(2, '0') : ''),
    expiryYear: item.expiryYear || (expiryDate ? String(expiryDate.getUTCFullYear()) : ''),
    expiryDate,
    currentStock,
    supplierName: item.supplierName || item.primarySupplierName || item.supplier || '',
    supplierContact: item.supplierContact || item.contact || '',
    status: computeStatus(currentStock, expiryDate, item.status),
    category: item.category || '',
    barcodeData: item.barcodeData || item.barcodeUpc || '',
    photoUrl: item.photoUrl || item.imageUrl || '',
  };
}

async function upsertMedications(req, items = []) {
  if (!Array.isArray(items) || items.length === 0) return 0;
  const ops = [];
  const seen = new Set();
  for (const item of items) {
    const doc = normalizeMedicationRecord(req, item);
    const filter = doc.sku
      ? { orgId: doc.orgId, sku: doc.sku }
      : doc.barcodeData
        ? { orgId: doc.orgId, barcodeData: doc.barcodeData }
        : { orgId: doc.orgId, medicationName: doc.medicationName, batchLotNumber: doc.batchLotNumber };
    const dedupeKey = JSON.stringify(filter);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    ops.push({
      updateOne: {
        filter,
        update: { $set: doc },
        upsert: true,
      },
    });
  }
  if (!ops.length) return 0;
  await Medication.bulkWrite(ops, { ordered: false });
  return ops.length;
}

router.get('/providers', verifyToken, (_req, res) => {
  res.json({ success: true, providers });
});

router.get('/connection', verifyToken, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Invalid user.' });
  const connection = await PosConnection.findOne({
    orgId: orgIdFor(req),
    userId,
    isConnected: true,
  }).lean();
  res.json({ success: true, connection });
});

router.post('/connect', verifyToken, async (req, res) => {
  try {
    const { providerKey, username, password } = req.body || {};
    const provider = providers.find((p) => p.key === providerKey);
    if (!provider) return res.status(400).json({ success: false, message: 'Unknown POS provider.' });

    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Invalid user.' });

    const orgId = orgIdFor(req);

    let importedFromPos = 0;
    let nextCursor = 0;
    let changedItems = [];

    try {
      const token = await loginToPos(username || 'sam', password || 'password123');

      let bootstrap = null;
      try {
        bootstrap = await posRequest('/api/bootstrap/full-dataset', {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (_e) {
        // fallback to inventory
      }

      if (bootstrap?.collections?.medications?.length) {
        const meds = bootstrap.collections.medications;
        importedFromPos = await upsertMedications(req, meds);
        nextCursor = Number(bootstrap.sync?.cursor ?? bootstrap.inventoryCount ?? 0);
        changedItems = meds.map((m) => ({
          medicationName: m.medicationName || m.name || m.genericName,
          sku: m.sku || m.barcodeData,
          currentStock: Number(m.currentStock ?? m.quantityOnHand ?? 0),
          status: m.status || 'In Stock',
        }));
      } else {
        const inv = await posRequest('/api/inventory?limit=500', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const items = inv.items || [];
        importedFromPos = await upsertMedications(req, items);
        nextCursor = Number(inv.inventoryVersion ?? inv.totalItems ?? items.length ?? 0);
        changedItems = items.map((m) => ({
          medicationName: m.medicationName || m.name || m.genericName,
          sku: m.sku || m.barcodeData,
          currentStock: Number(m.currentStock ?? m.quantityOnHand ?? 0),
          status: m.status || 'In Stock',
        }));
      }
    } catch (posError) {
      return res.status(500).json({
        success: false,
        message: posError.message || 'Unable to reach POS simulator. Is it running on ' + POS_API_BASE_URL + '?',
      });
    }

    const connection = await PosConnection.findOneAndUpdate(
      { orgId, userId },
      {
        $set: {
          providerKey: provider.key,
          providerName: provider.name,
          username: username || '',
          password: password || '',
          posCursor: nextCursor,
          connectedAt: new Date(),
          lastSyncedAt: new Date(),
          isConnected: true,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({
      success: true,
      connection,
      summary: { totalImported: importedFromPos, medications: importedFromPos },
      imported: importedFromPos,
      changedItems,
      mode: 'connect',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to connect POS.' });
  }
});

router.post('/sync', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Invalid user.' });

    const connection = await PosConnection.findOne({
      orgId: orgIdFor(req),
      userId,
      isConnected: true,
    });
    if (!connection) return res.status(400).json({ success: false, message: 'No POS connection found.' });

    let importedFromPos = 0;
    let nextCursor = connection.posCursor || 0;
    let changedItems = [];

    try {
      const token = await loginToPos(connection.username || 'sam', connection.password || 'password123');

      try {
        await posRequest('/api/simulator/force-change', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (_e) {
        // optional
      }

      const cursor = connection.posCursor || 0;
      let delta = null;
      try {
        delta = await posRequest(`/api/sync/changes?cursor=${cursor}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (_e) {
        // fallback to full inventory
      }

      if (delta?.changes?.length) {
        const medChanges = delta.changes.filter((c) => c.collection === 'medications');
        const docs = medChanges.map((c) => c.document || c.fullDocument).filter(Boolean);
        if (docs.length) {
          importedFromPos = await upsertMedications(req, docs);
          changedItems = docs.map((m) => ({
            medicationName: m.medicationName || m.name || m.genericName,
            sku: m.sku || m.barcodeData,
            currentStock: Number(m.currentStock ?? m.quantityOnHand ?? 0),
            status: m.status || 'In Stock',
          }));
        }
        nextCursor = Number(delta.nextCursor ?? delta.cursor ?? cursor);
      } else {
        const inv = await posRequest('/api/inventory?limit=500', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const items = inv.items || [];
        importedFromPos = await upsertMedications(req, items);
        nextCursor = Number(inv.inventoryVersion ?? inv.totalItems ?? items.length ?? 0);
        changedItems = items.map((m) => ({
          medicationName: m.medicationName || m.name || m.genericName,
          sku: m.sku || m.barcodeData,
          currentStock: Number(m.currentStock ?? m.quantityOnHand ?? 0),
          status: m.status || 'In Stock',
        }));
      }
    } catch (posError) {
      return res.status(500).json({
        success: false,
        message: posError.message || 'Unable to sync with POS. Is the simulator running?',
      });
    }

    connection.posCursor = nextCursor;
    connection.lastSyncedAt = new Date();
    await connection.save();

    res.json({
      success: true,
      connection,
      summary: { totalImported: importedFromPos, medications: importedFromPos },
      imported: importedFromPos,
      changed: importedFromPos,
      changedItems,
      mode: 'sync',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Unable to sync POS.' });
  }
});

router.post('/disconnect', verifyToken, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Invalid user.' });
  await PosConnection.findOneAndUpdate(
    { orgId: orgIdFor(req), userId },
    { $set: { isConnected: false, password: '', posCursor: 0 } }
  );
  res.json({ success: true, message: 'POS disconnected.' });
});

export default router;