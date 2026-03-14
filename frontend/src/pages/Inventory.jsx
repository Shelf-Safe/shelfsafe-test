import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDataSource } from '../context/DataSourceContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { AddMedicationModal } from '../components/AddMedicationModal';
import { medicationService } from '../services/medicationService';
import { DUMMY_MEDICATIONS } from '../data/dummyMedications';

const ITEMS_PER_PAGE = 13;

const Icon = ({ children, ...p }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>{children}</svg>
);
const SearchIcon = () => <Icon width="15" height="15" stroke="#9ca3af"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Icon>;
const ChevronDown = () => <Icon width="12" height="12" stroke="#6b7280"><polyline points="6 9 12 15 18 9" /></Icon>;
const ChevronLeft = () => <Icon width="14" height="14"><polyline points="15 18 9 12 15 6" /></Icon>;
const ChevronRight = () => <Icon width="14" height="14"><polyline points="9 18 15 12 9 6" /></Icon>;

function Pagination({ page, totalPages, onChange }) {
  const btn = (active) => `w-7 h-7 flex items-center justify-center rounded-lg text-sm font-medium border-none ${active ? 'text-white' : 'text-gray-500 hover:bg-gray-100'}`;
  return (
    <div className="flex items-center justify-center gap-1 py-3 px-4 border-t border-gray-100">
      <button className={btn(false)} onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1}><ChevronLeft /></button>
      {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 7).map((p) => (
        <button key={p} className={btn(p === page)} style={p === page ? { backgroundColor: '#00808d' } : {}} onClick={() => onChange(p)}>{p}</button>
      ))}
      <button className={btn(false)} onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages}><ChevronRight /></button>
    </div>
  );
}

function UserChip({ user }) {
  const navigate = useNavigate();
  const initials = user?.name ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'S';
  return (
    <button onClick={() => navigate('/profile')} className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0">
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{initials}</span>
      </div>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{user?.name?.split(' ')[0] || 'Steven'}</span>
    </button>
  );
}

export const Inventory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { useDummy } = useDataSource();
  const [medications, setMedications] = useState(DUMMY_MEDICATIONS);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const normalizeMedication = (m) => {
    const id = m?._id?.$oid || m?._id || m?.id || m?.sku || '';
    return {
      ...m,
      _id: id,
      id,
      routeId: id,
      medicationName: m.medicationName || m.name || '',
      sku: m.sku || m.barcodeUpc || '',
      batchLotNumber: m.batchLotNumber || m.lotNumber || '',
      category: m.category || '',
      supplierName: m.supplierName || m.supplier || '',
      status: m.status || 'In Stock',
      currentStock: m.currentStock ?? m.totalQuantityOnHand ?? m.quantityOnHand ?? 0,
      expiryDate: m.expiryDate || '',
      photoUrl: m.photoUrl || m.imageUrl || '',
    };
  };

  useEffect(() => {
    if (useDummy) return setMedications(DUMMY_MEDICATIONS);
    medicationService.getAll({ limit: 'all' })
      .then((res) => setMedications((res?.data || []).map(normalizeMedication)))
      .catch(() => setMedications([]));
  }, [useDummy]);

  const categories = useMemo(() => [...new Set(medications.map((m) => m.category).filter(Boolean))], [medications]);

  const filtered = medications.filter((m) => {
    const q = search.toLowerCase();
    return (
      (!q || (m.medicationName || '').toLowerCase().includes(q) || (m.sku || '').toLowerCase().includes(q) || (m.batchLotNumber || '').toLowerCase().includes(q)) &&
      (!filterStatus || m.status === filterStatus) &&
      (!filterCategory || m.category === filterCategory)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);
  const reset = () => setPage(1);
  const thCls = 'py-3 px-4 text-left text-xs font-semibold text-gray-500 bg-white border-b border-gray-100 whitespace-nowrap';

  return (
    <DashboardLayout headerRight={<UserChip user={user} />}>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 style={{ fontSize: 32, fontWeight: 700, color: '#111827', margin: 0 }}>Inventory</h1>
        <button onClick={() => setModalOpen(true)} className="px-5 py-2 rounded-lg text-sm font-semibold text-white" style={{ backgroundColor: '#00808d' }}>
          Add Medication
        </button>
      </div>

      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        <div className="relative" style={{ minWidth: 160, maxWidth: 240, flex: 1 }}>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><SearchIcon /></span>
          <input
            type="text"
            placeholder="Paracetamol 500mg"
            value={search}
            onChange={(e) => { setSearch(e.target.value); reset(); }}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#00808d]"
          />
        </div>

        <div className="relative">
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); reset(); }} className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 outline-none cursor-pointer">
            <option value="">Status</option>
            <option>In Stock</option>
            <option>Low Stock</option>
            <option>Expiring Soon</option>
            <option>Out of Stock</option>
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"><ChevronDown /></div>
        </div>

        <div className="relative">
          <select value={filterCategory} onChange={(e) => { setFilterCategory(e.target.value); reset(); }} className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 outline-none cursor-pointer">
            <option value="">Category</option>
            {categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"><ChevronDown /></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>{['Medication Name', 'SKU / Barcode', 'Batch / Lot Number', 'Expiry Date', 'Current Stock', 'Category', 'Supplier', 'Status'].map((h) => <th key={h} className={thCls}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {!slice.length ? (
                <tr><td colSpan={8} className="py-14 text-center text-sm text-gray-400">No medications found.</td></tr>
              ) : slice.map((med, idx) => (
                <tr
                  key={med.routeId || med.id || idx}
                  onClick={() => navigate(`/inventory/${encodeURIComponent(med.routeId || med.id)}`, { state: { medication: med } })}
                  className={`transition-colors hover:bg-[#f0fafa] cursor-pointer ${idx ? 'border-t border-gray-100' : ''}`}
                >
                  <td className="py-3 px-4 text-sm font-medium text-gray-800 whitespace-nowrap">{med.medicationName}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{med.sku}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{med.batchLotNumber}</td>
                  <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{med.expiryDate ? new Date(med.expiryDate).toLocaleDateString() : '—'}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{med.currentStock}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{med.category}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{med.supplierName}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{med.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
      </div>

      <AddMedicationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onBulkSave={async (file) => {
          try {
            const r = await medicationService.bulkImport(file);
            const items = (r?.data?.items || []).map(normalizeMedication);
            if (items.length) setMedications((p) => [...items, ...p]);
          } catch {}
        }}
        onBarcodeSave={async (photoFile, barcode, format) => {
          try {
            const r = await medicationService.uploadBarcode(photoFile, barcode, format);
            setModalOpen(false);
            navigate('/inventory/add', {
              state: { prefill: { sku: r?.data?.barcode || barcode || '', barcodeData: r?.data?.barcode || barcode || '', photoUrl: r?.data?.photoUrl || '' } }
            });
          } catch {}
        }}
      />
    </DashboardLayout>
  );
}