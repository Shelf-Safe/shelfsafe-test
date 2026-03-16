import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDataSource } from '../context/DataSourceContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { AddMedicationModal } from '../components/AddMedicationModal';
import { medicationService } from '../services/medicationService';
import { DUMMY_MEDICATIONS } from '../data/dummyMedications';

const ITEMS_PER_PAGE = 13;

/* ─── Icons ──────────────────────────────────────────────────────────────────*/
function SearchIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}
function ChevronDown() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>;
}
function ChevronLeft() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
function ChevronRight() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;
}
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}

/* ─── Category multi-select dropdown ────────────────────────────────────────*/
function CategoryDropdown({ categories = [], selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (cat) => {
    onChange(
      selected.includes(cat) ? selected.filter((c) => c !== cat) : [...selected, cat]
    );
  };

  const label = selected.length === 0 ? 'Category' : selected.length === 1 ? selected[0] : `${selected.length} selected`;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 pl-3 pr-2.5 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 hover:border-gray-300 transition-colors"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{label}</span>
        <ChevronDown />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
            backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)', minWidth: '180px', padding: '8px 0',
          }}
          role="listbox"
          aria-multiselectable="true"
          aria-label="Select categories"
        >
          <p style={{ margin: '4px 12px 6px', fontSize: '11px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Select the category:
          </p>
          {categories.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">No categories</div>
          ) : categories.map((cat) => (
            <label
              key={cat}
              className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer"
              style={{ fontSize: '13px', color: '#374151' }}
            >
              <input
                type="checkbox"
                checked={selected.includes(cat)}
                onChange={() => toggle(cat)}
                className="w-4 h-4 rounded border-gray-300 accent-[#00808d]"
                aria-label={cat}
              />
              {cat}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Pagination ─────────────────────────────────────────────────────────────*/
function Pagination({ page, totalPages, onChange }) {
  const pages = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('...');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  const btnCls = (active) =>
    `w-7 h-7 flex items-center justify-center rounded-lg text-sm font-medium transition-colors cursor-pointer border-none ${active ? 'text-white' : 'text-gray-500 bg-transparent hover:bg-gray-100'}`;

  return (
    <div className="flex items-center justify-center gap-1 py-3 px-4 border-t border-gray-100">
      <button className={btnCls(false)} onClick={() => onChange(Math.max(1, page - 1))} disabled={page === 1} aria-label="Previous"><ChevronLeft /></button>
      {pages.map((p, i) =>
        p === '...' ? (
          <span key={`e${i}`} className="w-7 h-7 flex items-center justify-center text-sm text-gray-400">...</span>
        ) : (
          <button key={p} className={btnCls(p === page)} style={p === page ? { backgroundColor: '#00808d' } : {}} onClick={() => onChange(p)} aria-label={`Page ${p}`} aria-current={p === page ? 'page' : undefined}>{p}</button>
        )
      )}
      <button className={btnCls(false)} onClick={() => onChange(Math.min(totalPages, page + 1))} disabled={page === totalPages} aria-label="Next"><ChevronRight /></button>
    </div>
  );
}

/* ─── UserChip ───────────────────────────────────────────────────────────────*/
function UserChip({ user }) {
  const navigate = useNavigate();
  const initials = user?.name ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() : 'S';
  return (
    <button onClick={() => navigate('/profile')} className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0 hover:opacity-80" aria-label="Profile">
      <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#374151' }}>{initials}</span>
      </div>
      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{user?.name?.split(' ')[0] || 'Steven'}</span>
    </button>
  );
}

/* ─── Inventory page ─────────────────────────────────────────────────────────*/
export const Inventory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { useDummy } = useDataSource();

  const [medications, setMedications] = useState(DUMMY_MEDICATIONS);
  const [search, setSearch]           = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterExpiry, setFilterExpiry] = useState('');
  const [filterCategories, setFilterCategories] = useState([]);
  const [onlyExpired, setOnlyExpired] = useState(false);
  const [page, setPage]               = useState(1);
  const [modalOpen, setModalOpen]     = useState(false);

  // Normalize API records (Mongo uses _id and Date strings)
  const normalizeMedication = (m) => {
    const pick = (...vals) => vals.find((v) => {
      if (v === 0) return true;
      return v !== undefined && v !== null && String(v).trim() !== '';
    });

    const rawMongoId =
      pick(
        m?._id?.$oid,
        typeof m?._id === 'string' ? m._id : '',
        typeof m?.id === 'string' ? m.id : '',
        typeof m?.routeId === 'string' ? m.routeId : '',
        typeof m?.legacyId === 'string' ? m.legacyId : '',
      ) || '';

    const routeId =
      pick(
        rawMongoId,
        m?.sku,
        m?.barcodeData,
        m?.batchLotNumber,
        m?.lotNumber,
        m?.barcodeUpc,
      ) || '';

    const medicationName = m.medicationName || m.name || '';
    const sku = m.sku || m.barcodeUpc || '';
    const batchLotNumber = m.batchLotNumber || m.lotNumber || '';
    const category = m.category || '';
    const supplierName = m.supplierName || m.supplier || '';
    const status = m.status || 'In Stock';
    const currentStock =
      typeof m.currentStock === 'number'
        ? m.currentStock
        : typeof m.totalQuantityOnHand === 'number'
          ? m.totalQuantityOnHand
          : typeof m.quantityOnHand === 'number'
            ? m.quantityOnHand
            : 0;

    const expiryDateRaw = m.expiryDate || '';
    let expiryDate = '';
    try {
      if (expiryDateRaw) {
        const d = new Date(expiryDateRaw);
        expiryDate = isNaN(d.getTime()) ? String(expiryDateRaw) : d.toISOString();
      } else if (m.expiryMonth && m.expiryYear) {
        expiryDate = `${m.expiryMonth} ${m.expiryYear}`;
      }
    } catch {
      expiryDate = String(expiryDateRaw || '');
    }

    return {
      ...m,
      _id: rawMongoId,
      id: rawMongoId,
      routeId,
      medicationName,
      sku,
      batchLotNumber,
      category,
      supplierName,
      status,
      currentStock,
      expiryDate,
      photoUrl: m.photoUrl || m.imageUrl || '',
    };
  };

  // Swap data source
  useEffect(() => {
    if (useDummy) {
      setMedications(DUMMY_MEDICATIONS);
    } else {
      medicationService.getAll({ limit: 'all' }).then((res) => {
        if (res?.data) setMedications(res.data.map(normalizeMedication));
      }).catch(() => setMedications([]));
    }
  }, [useDummy]);

  // Categories for dropdown (derived from data)
  const categories = React.useMemo(() => {
    const set = new Set();
    for (const m of medications) {
      const c = (m?.category ?? '').toString().trim();
      if (c) set.add(c);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [medications]);

  // Filter
  const filtered = medications.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q || (m.medicationName || '').toLowerCase().includes(q) || (m.sku || '').includes(q) || (m.batchLotNumber || '').toLowerCase().includes(q);
    const matchStatus = !filterStatus || m.status === filterStatus;
    const matchExpiry = !filterExpiry || m.expiryDate === filterExpiry;
    const matchCat    = filterCategories.length === 0 || filterCategories.includes(m.category);
    const matchExpiredOnly = !onlyExpired || m.status === 'Expiring Soon';
    return matchSearch && matchStatus && matchExpiry && matchCat && matchExpiredOnly;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(page, totalPages);
  const slice      = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const reset = () => setPage(1);

  const thCls = 'py-3 px-4 text-left text-xs font-semibold text-gray-500 bg-white border-b border-gray-100 whitespace-nowrap';

  return (
    <DashboardLayout headerRight={<UserChip user={user} />}>
      {/* Page header */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#111827', margin: 0 }}>Inventory</h1>
        <button
          onClick={() => setModalOpen(true)}
          className="px-5 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity whitespace-nowrap"
          style={{ backgroundColor: '#00808d' }}
        >
          Add Medication
        </button>
      </div>

      {/* Filter bar — no label, just controls inline */}
      <div className="flex items-center gap-2.5 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative" style={{ minWidth: '160px', maxWidth: '240px', flex: 1 }}>
          <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"><SearchIcon /></span>
          <input
            type="text"
            placeholder="Paracetamol 500mg"
            value={search}
            onChange={(e) => { setSearch(e.target.value); reset(); }}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-[#00808d]"
            aria-label="Search medications"
          />
        </div>

        {/* Status */}
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); reset(); }}
            className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 outline-none cursor-pointer focus:border-[#00808d]"
            aria-label="Filter by status"
          >
            <option value="">Status</option>
            <option>In Stock</option>
            <option>Low Stock</option>
            <option>Expiring Soon</option>
            <option>Out of Stock</option>
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"><ChevronDown /></div>
        </div>

        {/* Expiry Date */}
        <div className="relative">
          <select
            value={filterExpiry}
            onChange={(e) => { setFilterExpiry(e.target.value); reset(); }}
            className="appearance-none pl-3 pr-8 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-400 outline-none cursor-pointer focus:border-[#00808d]"
            aria-label="Filter by expiry"
          >
            <option value="">Expiry Date</option>
            <option>Jan 2026</option>
            <option>Mar 2026</option>
            <option>Sep 2026</option>
            <option>Feb 2027</option>
            <option>Dec 2027</option>
          </select>
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2"><ChevronDown /></div>
        </div>

        {/* Category multi-select */}
        <CategoryDropdown categories={categories} selected={filterCategories} onChange={(v) => { setFilterCategories(v); reset(); }} />

        {/* Only expired toggle */}
        <label className="flex items-center gap-2 cursor-pointer ml-1">
          <span style={{ fontSize: '13px', color: '#374151', fontWeight: 500 }}>Only expired</span>
          <button
            type="button"
            role="switch"
            aria-checked={onlyExpired}
            onClick={() => { setOnlyExpired((v) => !v); reset(); }}
            style={{
              width: 38, height: 21, borderRadius: 999, border: 'none', cursor: 'pointer', position: 'relative',
              backgroundColor: onlyExpired ? '#00808d' : '#d1d5db', transition: 'background-color 0.2s', padding: 0,
            }}
            aria-label="Show only expired medications"
          >
            <span style={{
              position: 'absolute', top: 2.5, left: onlyExpired ? 19 : 3,
              width: 16, height: 16, borderRadius: '50%', backgroundColor: '#fff',
              transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </label>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={thCls}>Medication Name</th>
                <th className={thCls}>SKU / Barcode</th>
                <th className={thCls}>Batch / Lot Number</th>
                <th className={thCls}>
                  Expiry Date
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ display:'inline',marginLeft:3,verticalAlign:'middle' }}><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                </th>
                <th className={thCls}>Current Stock</th>
                <th className={thCls}>Category</th>
                <th className={thCls}>Supplier</th>
                <th className={thCls}>Status</th>
              </tr>
            </thead>
            <tbody>
              {slice.length === 0 ? (
                <tr><td colSpan={8} className="py-14 text-center text-sm text-gray-400">No medications found.</td></tr>
              ) : (
                slice.map((med, idx) => (
                  <tr
                    key={med.routeId || med.id || med._id || idx}
                    onClick={() => {
                      const targetId = med.routeId || med._id || med.id || '';
                      if (!targetId) {
                        console.warn('Medication row missing route id:', med);
                        return;
                      }
                      navigate(`/inventory/${encodeURIComponent(targetId)}`, { state: { medication: med } });
                    }}
                    className={`transition-colors hover:bg-[#f0fafa] cursor-pointer ${idx > 0 ? 'border-t border-gray-100' : ''}`}
                  >
                    <td className="py-3 px-4 text-sm font-medium text-gray-800 whitespace-nowrap">{med.medicationName}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{med.sku}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">{med.batchLotNumber}</td>
                    <td className="py-3 px-4 text-sm text-gray-600 whitespace-nowrap">
                      {(() => {
                        if (!med.expiryDate) return '—';
                        const d = new Date(med.expiryDate);
                        return isNaN(d.getTime())
                          ? String(med.expiryDate)
                          : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
                      })()}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{med.currentStock?.toLocaleString()}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{med.category}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{med.supplierName}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{med.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={safePage} totalPages={totalPages} onChange={(p) => setPage(p)} />
      </div>

      {/* Add Medication slide-in */}
      <AddMedicationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onBulkSave={async (file) => {
          try {
            const r = await medicationService.bulkImport(file);
            const items = r?.data?.items || [];
            if (items.length) setMedications((p) => [...items.map(normalizeMedication), ...p]);
          } catch {}
        }}
        onBarcodeSave={async (photoFile, barcode, format) => {
          try {
            const r = await medicationService.uploadBarcode(photoFile, barcode, format);
            const photoUrl = r?.data?.photoUrl || '';
            const code = r?.data?.barcode || barcode || '';
            setModalOpen(false);
            navigate('/inventory/add', {
              state: {
                prefill: {
                  sku: code,
                  barcodeData: code,
                  photoUrl,
                },
              },
            });
          } catch {}
        }}
      />
    </DashboardLayout>
  );
};
