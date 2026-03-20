import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { useDataSource } from '../context/DataSourceContext';
import { getDummyMedicationById } from '../data/dummyMedications';
import { medicationService } from '../services/medicationService';
import { EditMedicationPanel } from '../components/EditMedicationPanel';

function formatExpiry(expiryDate, expiryMonth, expiryYear) {
  if (expiryDate) {
    const d = new Date(expiryDate);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }
  }
  if (expiryMonth && expiryYear) return `${expiryMonth} ${expiryYear}`;
  return '';
}

function CameraOverlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00808d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export const MedicationDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { useDummy } = useDataSource();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [med, setMed] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    let alive = true;

    async function runLive() {
      setLoading(true);
      setError('');
      try {
        const res = await medicationService.getById(id);
        if (!alive) return;
        setMed(res?.data || null);
      } catch (e) {
        if (!alive) return;
        const fallback = location?.state?.medication || null;
        if (fallback) setMed(fallback);
        else setError(e?.message || 'Failed to load medication.');
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (useDummy) {
      setMed(getDummyMedicationById(id));
      setLoading(false);
    } else {
      runLive();
    }

    return () => { alive = false; };
  }, [id, useDummy, location?.state]);

  const view = useMemo(() => {
    if (!med) return null;
    const status = med.status || 'In Stock';
    return {
      raw: med,
      medicationName: med.medicationName || med.name || 'Medication',
      brandName: med.brandName || med.brand || 'Brand Name',
      category: med.category || '—',
      sku: med.sku || med.barcodeData || med.barcodeUpc || '—',
      batchLotNumber: med.batchLotNumber || '—',
      expiryLabel: formatExpiry(med.expiryDate, med.expiryMonth, med.expiryYear) || '—',
      currentStock: typeof med.currentStock === 'number' ? med.currentStock : Number(med.currentStock || 0),
      supplierName: med.supplierName || med.supplier || '—',
      supplierContact: med.supplierContact || '—',
      status,
      shelfId: med.shelfId || '—',
      risk: med.risk || '—',
      photoUrl: med.photoUrl || med.imageUrl || '',
      statusClass:
        status === 'Expired' || status === 'Expiring' || status === 'Expiring Soon'
          ? 'text-red-500'
          : status === 'Low Stock'
            ? 'text-amber-600'
            : 'text-emerald-600',
    };
  }, [med]);

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-3 md:gap-4">
          <button type="button" onClick={() => navigate('/inventory')} className="text-[#00808d] hover:opacity-80" aria-label="Back to inventory">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1 className="text-[26px] md:text-[56px] leading-none font-bold text-gray-900 m-0">Medication Details</h1>
        </div>
        {!loading && !error && view && (
          <button type="button" onClick={() => setEditOpen(true)} className="px-6 py-3 rounded-xl bg-[#00808d] text-white font-semibold text-lg md:text-sm hover:opacity-90">Edit Details</button>
        )}
      </div>

      {loading && <div className="rounded-[24px] bg-white p-8 text-gray-400">Loading medication…</div>}
      {!loading && error && <div className="rounded-[24px] bg-white p-8 text-red-600">{error}</div>}

      {!loading && !error && view && (
        <div className="md:px-2">
          <div className="hidden md:grid md:grid-cols-[320px_1fr] gap-6 items-start">
            <div>
              <div className="relative rounded-[24px] bg-white p-8 overflow-hidden">
                {view.photoUrl ? (
                  <img src={view.photoUrl} alt={view.medicationName} className="w-full h-[170px] object-contain" />
                ) : (
                  <div className="h-[170px] flex items-center justify-center text-gray-300"><CameraOverlayIcon /></div>
                )}
                <button type="button" onClick={() => setEditOpen(true)} className="absolute right-3 bottom-3 w-10 h-10 rounded-xl border border-gray-200 bg-white flex items-center justify-center shadow-sm"><CameraOverlayIcon /></button>
              </div>
              <div className="space-y-7 text-[18px] text-gray-800 mt-6 px-1">
                <div>Expiry Date: <span className="font-medium">{view.expiryLabel}</span></div>
                <div>Current Stock: <span className="font-medium">{view.currentStock}</span></div>
                <div>Supplier: <span className="font-medium">{view.supplierName}</span></div>
                <div>Supplier contact: <span className="font-medium">{view.supplierContact}</span></div>
                <div>Status: <span className={`font-medium ${view.statusClass}`}>{view.status}</span></div>
                <div>Shelf ID: <span className="font-medium">{view.shelfId}</span></div>
                <div>Risk: <span className="font-medium">{view.risk}</span></div>
              </div>
            </div>
            <div className="pt-10">
              <h2 className="text-[28px] font-semibold text-gray-900 mb-2">{view.medicationName}</h2>
              <div className="text-[18px] text-gray-400 italic mb-8">{view.brandName}</div>
              <div className="space-y-2 text-[20px] text-gray-800">
                <div>Category - {view.category}</div>
                <div>Barcode / SKU: {view.sku}</div>
                <div>Lot Number / Batch Number: {view.batchLotNumber}</div>
              </div>
            </div>
          </div>

          <div className="md:hidden">
            <div className="flex justify-end mb-5">
              <button type="button" onClick={() => setEditOpen(true)} className="px-6 py-3 rounded-xl bg-[#00808d] text-white font-semibold text-lg">Edit Details</button>
            </div>
            <div className="text-[20px] font-semibold text-gray-900 mb-1">{view.medicationName}</div>
            <div className="text-[18px] text-gray-400 italic mb-3">{view.brandName}</div>
            <div className="relative rounded-[20px] bg-white p-6 overflow-hidden mb-5">
              {view.photoUrl ? (
                <img src={view.photoUrl} alt={view.medicationName} className="w-full h-[180px] object-contain" />
              ) : (
                <div className="h-[180px] flex items-center justify-center text-gray-300"><CameraOverlayIcon /></div>
              )}
              <button type="button" onClick={() => setEditOpen(true)} className="absolute right-3 bottom-3 w-11 h-11 rounded-xl border border-gray-200 bg-white flex items-center justify-center shadow-sm"><CameraOverlayIcon /></button>
            </div>
            <div className="space-y-3 text-[18px] text-gray-800 mb-6">
              <div>Category - {view.category}</div>
              <div>Barcode / SKU: {view.sku}</div>
              <div>Lot Number / Batch Number: {view.batchLotNumber}</div>
            </div>
            <div className="space-y-4 text-[18px] text-gray-800">
              <div>Expiry Date: <span className="font-medium">{view.expiryLabel}</span></div>
              <div>Current Stock: <span className="font-medium">{view.currentStock}</span></div>
              <div>Supplier: <span className="font-medium">{view.supplierName}</span></div>
              <div>Supplier contact: <span className="font-medium">{view.supplierContact}</span></div>
              <div>Status: <span className={`font-medium ${view.statusClass}`}>{view.status}</span></div>
              <div>Shelf ID: <span className="font-medium">{view.shelfId}</span></div>
              <div>Risk: <span className="font-medium">{view.risk}</span></div>
            </div>
          </div>
        </div>
      )}

      {view && (
        <EditMedicationPanel
          isOpen={editOpen}
          onClose={() => setEditOpen(false)}
          medication={view.raw}
          onSave={(updated) => {
            setMed((prev) => ({ ...prev, ...updated }));
            setEditOpen(false);
          }}
        />
      )}
    </DashboardLayout>
  );
};
