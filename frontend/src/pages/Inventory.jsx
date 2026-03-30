import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDataSource } from '../context/DataSourceContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { AddMedicationModal } from '../components/AddMedicationModal';
import { medicationService } from '../services/medicationService';
import { DUMMY_MEDICATIONS } from '../data/dummyMedications';
import { subscribeVoiceAppEvent } from '../voice/eventBus';
import { useVoicePageSchema, useVoicePageState } from '../voice/cache/useVoicePageRegistration';
import { INVENTORY_VOICE_SCHEMA } from '../voice/cache/pageSchemas';

const ITEMS_PER_PAGE = 13;
const CACHE_KEY = 'shelfsafe_inventory_cache';

function SearchIcon({ color = '#00808d' }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}
function ChevronDown() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00808d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>;
}
function ChevronLeft() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>;
}
function ChevronRight() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>;
}

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

function CategoryDropdown({ categories = [], selected, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (cat) => {
    onChange(selected.includes(cat) ? selected.filter((c) => c !== cat) : [...selected, cat]);
  };

  const label = selected.length === 0 ? 'Category' : selected.length === 1 ? selected[0] : `${selected.length} selected`;

  return (
    <div ref={ref} className="relative min-w-[160px]">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-gray-200 bg-white text-left text-base md:text-sm text-gray-500 hover:border-gray-300">
        <span className={selected.length ? 'text-gray-800 truncate' : 'truncate'}>{label}</span>
        <ChevronDown />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-50 min-w-full rounded-xl border border-gray-200 bg-white shadow-lg p-3">
          <p className="text-sm font-semibold text-gray-500 mb-3">Select the category:</p>
          <div className="space-y-3">
            {categories.map((cat) => (
              <label key={cat} className="flex items-center gap-3 cursor-pointer text-gray-700 text-base md:text-sm">
                <input type="checkbox" checked={selected.includes(cat)} onChange={() => toggle(cat)} className="w-5 h-5 accent-[#00808d]" />
                <span>{cat}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

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

  return (
    <div className="flex items-center justify-center gap-1 px-4 py-4 border-t border-gray-100">
      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100" disabled={page === 1} onClick={() => onChange(Math.max(1, page - 1))}><ChevronLeft /></button>
      {pages.map((p, idx) => p === '...' ? <span key={`ellipsis-${idx}`} className="w-8 text-center text-gray-400">…</span> : (
        <button key={`page-${p}`} onClick={() => onChange(p)} className={`w-8 h-8 rounded-lg text-sm font-semibold ${p === page ? 'text-white bg-[#00808d]' : 'text-gray-500 hover:bg-gray-100'}`}>{p}</button>
      ))}
      <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100" disabled={page === totalPages} onClick={() => onChange(Math.min(totalPages, page + 1))}><ChevronRight /></button>
    </div>
  );
}

function SkeletonRows() {
  return Array.from({ length: 8 }).map((_, i) => (
    <tr key={i} className={i > 0 ? 'border-t border-gray-100' : ''}>
      {Array.from({ length: 8 }).map((__, j) => (
        <td key={j} className="px-4 py-4"><div className="h-4 rounded bg-gray-100 animate-pulse" /></td>
      ))}
    </tr>
  ));
}

function deriveStatus(m) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const soon = new Date(today);
  soon.setDate(soon.getDate() + 30);
  const exp = m?.expiryDate ? new Date(m.expiryDate) : null;
  if (m?.status === 'Removed' || m?.status === 'Recalled') return m.status;
  if (exp && !Number.isNaN(exp.getTime())) {
    exp.setHours(0, 0, 0, 0);
    if (exp < today) return 'Expired';
    if (exp <= soon) return 'Expiring';
  }
  const stock = Number(m?.currentStock || 0);
  if (stock <= 0) return 'Out of Stock';
  if (stock <= 10) return 'Low Stock';
  return 'In Stock';
}

function normalizeMedication(m) {
  const rawMongoId = m?._id ? String(m._id) : (m?.id ? String(m.id) : '');
  const routeId = rawMongoId || String(m?.id || '');
  const expiryDateRaw = m.expiryDate || '';
  let expiryDate = '';
  try {
    if (expiryDateRaw) {
      const d = new Date(expiryDateRaw);
      expiryDate = Number.isNaN(d.getTime()) ? String(expiryDateRaw) : d.toISOString();
    } else if (m.expiryMonth && m.expiryYear) {
      expiryDate = `${m.expiryMonth} ${m.expiryYear}`;
    }
  } catch {
    expiryDate = String(expiryDateRaw || '');
  }
  const currentStock = typeof m.currentStock === 'number' ? m.currentStock : Number(m.currentStock || m.totalQuantityOnHand || m.quantityOnHand || 0);
  const normalized = {
    ...m,
    _id: rawMongoId,
    id: rawMongoId,
    routeId,
    medicationName: m.medicationName || m.name || '',
    sku: m.sku || m.barcodeData || m.barcodeUpc || '',
    batchLotNumber: m.batchLotNumber || '',
    category: m.category || '',
    supplierName: m.supplierName || m.supplier || '',
    currentStock,
    expiryDate,
    photoUrl: m.photoUrl || m.imageUrl || '',
    shelfId: m.shelfId || '',
    risk: m.risk || 'Low',
    brandName: m.brandName || m.brand || '',
  };
  return { ...normalized, status: deriveStatus(normalized) };
}

export const Inventory = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { useDummy } = useDataSource();

  const [medications, setMedications] = useState([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterExpiry, setFilterExpiry] = useState('');
  const [filterCategories, setFilterCategories] = useState([]);
  const [onlyExpired, setOnlyExpired] = useState(false);
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('add') === '1') setModalOpen(true);
  }, [location.search]);

  const inventoryView = useMemo(() => {
    const v = new URLSearchParams(location.search).get('view');
    if (v === 'expiring' || v === 'expired' || v === 'high-risk' || v === 'low-stock') return v;
    return null;
  }, [location.search]);

  useEffect(() => {
    if (inventoryView) setPage(1);
  }, [inventoryView]);

  useEffect(() => {
    let mounted = true;

    const cache = !useDummy ? localStorage.getItem(CACHE_KEY) : null;
    if (cache) {
      try {
        const parsed = JSON.parse(cache);
        if (Array.isArray(parsed) && parsed.length && mounted) {
          setMedications(parsed.map(normalizeMedication));
          setLoadingInventory(false);
          setRefreshing(true);
        }
      } catch { }
    }

    async function loadInventory() {
      setLoadingInventory(!cache);
      try {
        if (useDummy) {
          if (!mounted) return;
          setMedications(DUMMY_MEDICATIONS.map(normalizeMedication));
        } else {
          const res = await medicationService.getAll({ limit: 'all' });
          if (!mounted) return;
          const items = (res?.data || []).map(normalizeMedication);
          setMedications(items);
          localStorage.setItem(CACHE_KEY, JSON.stringify(res?.data || []));
        }
      } catch {
        if (mounted && !cache) setMedications([]);
      } finally {
        if (mounted) {
          setLoadingInventory(false);
          setRefreshing(false);
        }
      }
    }

    loadInventory();
    return () => { mounted = false; };
  }, [useDummy]);

  const categories = useMemo(() => {
    const set = new Set();
    medications.forEach((m) => m.category && set.add(m.category));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [medications]);

  const expiryOptions = useMemo(() => {
    const set = new Set();
    medications.forEach((m) => {
      const d = m.expiryDate ? new Date(m.expiryDate) : null;
      if (d && !Number.isNaN(d.getTime())) {
        set.add(d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }));
      }
    });
    return Array.from(set);
  }, [medications]);

  const filtered = medications.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.medicationName.toLowerCase().includes(q) || String(m.sku || '').includes(search) || String(m.batchLotNumber || '').toLowerCase().includes(q);
    const matchStatus = !filterStatus || m.status === filterStatus;
    const expLabel = m.expiryDate ? (() => {
      const d = new Date(m.expiryDate);
      return Number.isNaN(d.getTime()) ? String(m.expiryDate) : d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    })() : '';
    const matchExpiry = !filterExpiry || expLabel === filterExpiry;
    const matchCategory = filterCategories.length === 0 || filterCategories.includes(m.category);
    const matchExpired = !onlyExpired || m.status === 'Expired';

    if (inventoryView === 'expiring') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const soon = new Date(today);
      soon.setDate(soon.getDate() + 30);
      const exp = m.expiryDate ? new Date(m.expiryDate) : null;
      if (!exp || Number.isNaN(exp.getTime())) return false;
      exp.setHours(0, 0, 0, 0);
      if (exp < today || exp > soon) return false;
    }
    if (inventoryView === 'expired' && m.status !== 'Expired') return false;
    if (inventoryView === 'high-risk') {
      const r = m.risk || 'Low';
      if (!['Medium', 'High', 'Critical'].includes(r)) return false;
    }
    if (inventoryView === 'low-stock' && m.status !== 'Low Stock' && m.status !== 'Out of Stock') return false;

    return matchSearch && matchStatus && matchExpiry && matchCategory && matchExpired;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const slice = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const resetPage = () => setPage(1);

  const voiceState = useMemo(() => ({
    visibleMedications: slice.map((item) => item.medicationName).filter(Boolean),
    knownMedicationNames: medications.map((item) => item.medicationName).filter(Boolean),
    selectedFilters: {
      status: filterStatus || null,
      expiry: filterExpiry || null,
      categories: filterCategories,
      onlyExpired,
    },
    searchVisible: true,
    resultCount: filtered.length,
    currentPage: safePage,
    totalPages,
  }), [slice, medications, filterStatus, filterExpiry, filterCategories, onlyExpired, filtered.length, safePage, totalPages]);

  useVoicePageSchema('inventory', INVENTORY_VOICE_SCHEMA);
  useVoicePageState('inventory', voiceState);

  const inventoryVoiceRef = useRef({});
  inventoryVoiceRef.current = {
    setModalOpen,
    setOnlyExpired,
    setPage,
    setSearch,
    setFilterStatus,
    totalPages,
  };

  useEffect(() => {
    return subscribeVoiceAppEvent((detail) => {
      const v = inventoryVoiceRef.current;
      switch (detail.type) {
        case 'INVENTORY_OPEN_ADD':
          v.setModalOpen(true);
          break;
        case 'INVENTORY_SHOW_EXPIRED':
          v.setOnlyExpired(true);
          v.setPage(1);
          break;
        case 'INVENTORY_CLEAR_EXPIRED':
          v.setOnlyExpired(false);
          v.setPage(1);
          break;
        case 'INVENTORY_CLEAR_SEARCH':
          v.setSearch('');
          v.setPage(1);
          break;
        case 'INVENTORY_NEXT_PAGE':
          v.setPage((prev) => Math.min(v.totalPages, prev + 1));
          break;
        case 'INVENTORY_PREV_PAGE':
          v.setPage((prev) => Math.max(1, prev - 1));
          break;
        case 'INVENTORY_FILTER_LOW_STOCK':
          v.setFilterStatus('Low Stock');
          v.setOnlyExpired(false);
          v.setPage(1);
          break;
        case 'INVENTORY_FILTER_EXPIRING':
          v.setFilterStatus('Expiring');
          v.setOnlyExpired(false);
          v.setPage(1);
          break;
        case 'INVENTORY_FILTER_EXPIRED_STATUS':
          v.setFilterStatus('Expired');
          v.setOnlyExpired(false);
          v.setPage(1);
          break;
        case 'INVENTORY_FILTER_OUT_OF_STOCK':
          v.setFilterStatus('Out of Stock');
          v.setOnlyExpired(false);
          v.setPage(1);
          break;
        case 'INVENTORY_FILTER_IN_STOCK':
          v.setFilterStatus('In Stock');
          v.setOnlyExpired(false);
          v.setPage(1);
          break;
        case 'INVENTORY_SEARCH':
          v.setSearch(detail.value || '');
          v.setPage(1);
          break;
        default:
          break;
      }
    });
  }, []);

  const tableRowAction = (med) => {
    const targetId = med.routeId || med._id || med.id;
    if (!targetId) return;
    navigate(`/inventory/${encodeURIComponent(targetId)}`, { state: { medication: med } });
  };

  return (
    <DashboardLayout headerRight={<UserChip user={user} />}>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <h1 className="text-[52px] md:text-[35px] leading-none font-bold text-gray-900 m-0">Inventory</h1>
        <button onClick={() => setModalOpen(true)} className="px-6 py-3 rounded-xl text-white font-semibold text-[18px] md:text-sm bg-[#00808d] hover:opacity-90">Add Medication</button>
      </div>

      <div className="bg-white/80 rounded-[24px] border border-gray-100 p-4 md:p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:hidden mb-5">
          <div className="relative">
            <input value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }} placeholder="Paracetamol 500mg" className="w-full rounded-xl border border-gray-200 pl-6 pr-14 py-4 text-[18px] text-gray-700 placeholder:text-gray-400" />
            <span className="absolute right-5 top-1/2 -translate-y-1/2"><SearchIcon /></span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="relative">
              <select value={filterExpiry} onChange={(e) => { setFilterExpiry(e.target.value); resetPage(); }} className="w-full appearance-none rounded-xl border border-gray-200 px-4 py-3 text-[18px] text-gray-600 bg-white">
                <option value="">Expiry Date</option>
                {expiryOptions.map((opt) => <option key={opt}>{opt}</option>)}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><ChevronDown /></div>
            </div>
            <CategoryDropdown categories={categories} selected={filterCategories} onChange={(v) => { setFilterCategories(v); resetPage(); }} />
            <div className="relative col-span-1">
              <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); resetPage(); }} className="w-full appearance-none rounded-xl border border-gray-200 px-4 py-3 text-[18px] text-gray-600 bg-white">
                <option value="">Status</option>
                <option>In Stock</option><option>Low Stock</option><option>Expiring</option><option>Expired</option><option>Out of Stock</option>
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><ChevronDown /></div>
            </div>
            <label className="col-span-1 flex items-center gap-3 px-1 text-[18px] text-gray-800">
              <span>Only expired</span>
              <button type="button" role="switch" aria-checked={onlyExpired} onClick={() => { setOnlyExpired((v) => !v); resetPage(); }} className={`relative w-14 h-8 rounded-full ${onlyExpired ? 'bg-[#00808d]' : 'bg-gray-300'}`}>
                <span className={`absolute top-1 left-1 w-6 h-6 rounded-full bg-white shadow ${onlyExpired ? 'translate-x-6' : ''} transition-transform`} />
              </button>
            </label>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-4 mb-4 flex-wrap">
          <div className="relative w-[260px]">
            <input value={search} onChange={(e) => { setSearch(e.target.value); resetPage(); }} placeholder="Paracetamol 500mg" className="w-full rounded-xl border border-gray-200 pl-12 pr-4 py-3 text-sm text-gray-700 placeholder:text-gray-400" />
            <span className="absolute left-4 top-1/2 -translate-y-1/2"><SearchIcon color="#9ca3af" /></span>
          </div>
          <div className="relative min-w-[150px]">
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); resetPage(); }} className="w-full appearance-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-500 bg-white">
              <option value="">Status</option>
              <option>In Stock</option><option>Low Stock</option><option>Expiring</option><option>Expired</option><option>Out of Stock</option>
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><ChevronDown /></div>
          </div>
          <div className="relative min-w-[150px]">
            <select value={filterExpiry} onChange={(e) => { setFilterExpiry(e.target.value); resetPage(); }} className="w-full appearance-none rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-500 bg-white">
              <option value="">Expiry Date</option>
              {expiryOptions.map((opt) => <option key={opt}>{opt}</option>)}
            </select>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2"><ChevronDown /></div>
          </div>
          <CategoryDropdown categories={categories} selected={filterCategories} onChange={(v) => { setFilterCategories(v); resetPage(); }} />
          <label className="flex items-center gap-3 text-sm text-gray-700 font-medium ml-2">
            <span>Only expired</span>
            <button type="button" role="switch" aria-checked={onlyExpired} onClick={() => { setOnlyExpired((v) => !v); resetPage(); }} className={`relative w-12 h-7 rounded-full ${onlyExpired ? 'bg-[#00808d]' : 'bg-gray-300'}`}>
              <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow ${onlyExpired ? 'translate-x-5' : ''} transition-transform`} />
            </button>
          </label>
          {refreshing && <span className="text-xs text-gray-400 ml-auto">Refreshing…</span>}
        </div>

        <div className="md:hidden rounded-2xl overflow-hidden border border-gray-100">
          <div className="grid grid-cols-2 bg-white text-[20px] font-semibold text-gray-500 px-6 py-4 border-b border-gray-200">
            <div>Medication Name</div>
            <div>SKU / Barcode</div>
          </div>
          {loadingInventory && medications.length === 0 ? (
            Array.from({ length: 7 }).map((_, idx) => (
              <div key={idx} className="grid grid-cols-2 gap-4 px-6 py-5 border-b border-gray-100 bg-white">
                <div className="h-7 rounded bg-gray-100 animate-pulse" />
                <div className="h-7 rounded bg-gray-100 animate-pulse" />
              </div>
            ))
          ) : slice.length === 0 ? (
            <div className="px-6 py-8 bg-white text-gray-400">No medications found.</div>
          ) : slice.map((med) => (
            <button key={med.routeId || med.id} onClick={() => tableRowAction(med)} className="w-full grid grid-cols-2 gap-4 px-6 py-5 border-b border-gray-100 bg-white text-left">
              <div className="text-[18px] text-gray-700 leading-tight">{med.medicationName}</div>
              <div className="text-[18px] text-gray-500 break-all">{med.sku}</div>
            </button>
          ))}
        </div>

        <div className="hidden md:block rounded-2xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr>
                  {['Medication Name', 'SKU / Barcode', 'Batch / Lot Number', 'Expiry Date', 'Current Stock', 'Category', 'Supplier', 'Status'].map((head) => (
                    <th key={head} className="py-4 px-4 text-left text-xs font-semibold text-gray-500 border-b border-gray-100 whitespace-nowrap">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingInventory && medications.length === 0 ? <SkeletonRows /> : slice.length === 0 ? (
                  <tr><td colSpan={8} className="py-14 text-center text-sm text-gray-400">No medications found.</td></tr>
                ) : slice.map((med, idx) => {
                  const d = med.expiryDate ? new Date(med.expiryDate) : null;
                  const expiryLabel = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : '—';
                  return (
                    <tr key={med.routeId || med.id || idx} onClick={() => tableRowAction(med)} className={`cursor-pointer hover:bg-[#f8fdfd] ${idx > 0 ? 'border-t border-gray-100' : ''}`}>
                      <td className="py-4 px-4 text-sm font-medium text-gray-800 whitespace-nowrap">{med.medicationName}</td>
                      <td className="py-4 px-4 text-sm text-gray-500 whitespace-nowrap">{med.sku}</td>
                      <td className="py-4 px-4 text-sm text-gray-500 whitespace-nowrap">{med.batchLotNumber}</td>
                      <td className="py-4 px-4 text-sm text-gray-500 whitespace-nowrap">{expiryLabel}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">{med.currentStock}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">{med.category}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">{med.supplierName}</td>
                      <td className="py-4 px-4 text-sm"><span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${med.status === 'Expired' || med.status === 'Expiring' ? 'text-red-600 bg-red-50' : med.status === 'Low Stock' ? 'text-amber-700 bg-amber-50' : med.status === 'In Stock' ? 'text-emerald-700 bg-emerald-50' : 'text-gray-600 bg-gray-100'}`}>{med.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={safePage} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>

      <AddMedicationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onBulkSave={async (file) => {
          try {
            const r = await medicationService.bulkImport(file);
            const items = Array.isArray(r?.data) ? r.data : (r?.data?.items || []);
            if (items.length) {
              const normalized = items.map(normalizeMedication);
              setMedications((prev) => [...normalized, ...prev]);
              if (!useDummy) localStorage.setItem(CACHE_KEY, JSON.stringify([...items, ...medications]));
            }
            setModalOpen(false);
          } catch (error) {
            alert(error.message || 'Bulk import failed.');
            throw error;
          }
        }}
        onBarcodeSave={async (photoFile) => {
          try {
            const r = await medicationService.scanCreate({ photoFile });
            const created = r?.data;
            if (!created?._id) throw new Error('Medication was created, but no id was returned.');
            setModalOpen(false);
            navigate(`/inventory/${encodeURIComponent(created._id)}`, { state: { medication: created } });
          } catch (error) {
            console.error('Failed to scan and create medication:', error);
            alert(error.message || 'Failed to scan and create medication.');
            throw error;
          }
        }}
      />
    </DashboardLayout>
  );
};
