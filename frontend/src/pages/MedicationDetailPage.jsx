import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { useDataSource } from '../context/DataSourceContext';
import { getDummyMedicationById } from '../data/dummyMedications';
import { medicationService } from '../services/medicationService';

const pill = (text) => (
  <span
    className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
    style={{ background: '#f0fafa', color: '#00808d' }}
  >
    {text}
  </span>
);

function formatExpiry(expiryDate, expiryMonth, expiryYear) {
  if (expiryDate) {
    const d = new Date(expiryDate);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    }
  }
  if (expiryMonth && expiryYear) return `${expiryMonth} ${expiryYear}`;
  return '';
}

export const MedicationDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { useDummy } = useDataSource();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [med, setMed] = useState(null);

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
        if (fallback) {
          setMed(fallback);
          setError('');
        } else {
          setError(e?.message || 'Failed to load medication.');
        }
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    function runDummy() {
      setLoading(true);
      setError('');
      const found = getDummyMedicationById(id);
      setMed(found);
      setLoading(false);
    }

    if (!id) return () => { alive = false; };

    if (useDummy) runDummy();
    else runLive();

    return () => {
      alive = false;
    };
  }, [id, useDummy, location?.state]);

  const view = useMemo(() => {
    if (!med) return null;
    return {
      medicationName: med.medicationName || med.name || 'Medication',
      brandName: med.brandName || med.brand || '',
      category: med.category || '',
      sku: med.sku || med.barcodeUpc || '',
      batchLotNumber: med.batchLotNumber || '',
      expiryLabel: formatExpiry(med.expiryDate, med.expiryMonth, med.expiryYear),
      currentStock: typeof med.currentStock === 'number' ? med.currentStock : 0,
      supplierName: med.supplierName || '',
      supplierContact: med.supplierContact || '',
      status: med.status || 'In Stock',
      shelfId: med.shelfId || '',
      risk: med.risk || '',
      photoUrl: med.photoUrl || '',
    };
  }, [med]);

  return (
    <DashboardLayout pageTitle="Medication Details">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/inventory')}
            className="text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="Back to inventory"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div>
            <div className="text-sm text-gray-400">Medication Details</div>
            <h1 className="text-2xl font-bold text-gray-900">Medication Details</h1>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/inventory/${id}/edit`)}
          className="px-5 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#00808d' }}
        >
          Edit Details
        </button>
      </div>

      {loading && (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-sm text-gray-500">
          Loading...
        </div>
      )}

      {!loading && error && (
        <div className="bg-white rounded-2xl border border-red-200 p-6 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && view && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          {/* Header section */}
          <div className="flex items-start gap-6 pb-6 border-b border-gray-100">
            <div className="w-36 h-36 rounded-2xl border border-gray-100 bg-[#f5f5f5] overflow-hidden flex items-center justify-center">
              {view.photoUrl ? (
                <img
                  src={view.photoUrl}
                  alt={view.medicationName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              ) : (
                <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#b3b3b3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              )}
            </div>

            <div className="flex-1">
              <div className="text-xl font-bold text-gray-900 mb-1">{view.medicationName}</div>
              {view.brandName && <div className="text-sm text-gray-400 italic mb-3">{view.brandName}</div>}

              <div className="flex flex-col gap-1 text-sm text-gray-700">
                <div>Category - {view.category || '—'}</div>
                <div>Barcode / SKU: {view.sku || '—'}</div>
                <div>Lot Number / Batch Number: {view.batchLotNumber || '—'}</div>
              </div>
            </div>
          </div>

          {/* Details list */}
          <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-10 text-sm">
            <div><span className="text-gray-500">Expiry Date:</span> <span className="text-gray-900 font-medium">{view.expiryLabel || '—'}</span></div>
            <div><span className="text-gray-500">Current Stock:</span> <span className="text-gray-900 font-medium">{view.currentStock?.toLocaleString()}</span></div>
            <div><span className="text-gray-500">Supplier:</span> <span className="text-gray-900 font-medium">{view.supplierName || '—'}</span></div>
            <div><span className="text-gray-500">Supplier contact:</span> <span className="text-gray-900 font-medium">{view.supplierContact || '—'}</span></div>
            <div>
              <span className="text-gray-500">Status:</span>{' '}
              {view.status === 'Expiring Soon' ? (
                <span className="font-semibold" style={{ color: '#f97316' }}>Expiring Soon</span>
              ) : (
                <span className="text-gray-900 font-medium">{view.status}</span>
              )}
            </div>
            <div><span className="text-gray-500">Shelf ID:</span> <span className="text-gray-900 font-medium">{view.shelfId || '—'}</span></div>
            <div><span className="text-gray-500">Risk:</span> <span className="text-gray-900 font-medium">{view.risk || '—'}</span></div>
            <div>{view.category ? pill(view.category) : null}</div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};
