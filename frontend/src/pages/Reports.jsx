import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';
import { API_ORIGIN } from '../config/api';

// ─── UserChip ─────────────────────────────────────────────────────────────────
function UserChip({ user }) {
  const navigate = useNavigate();
  const initials = user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'S';
  return (
    <button onClick={() => navigate('/profile')} className="flex items-center gap-2 p-0 bg-transparent border-none cursor-pointer hover:opacity-80" aria-label="Profile">
      <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#374151' }}>{initials}</span>
      </div>
      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{user?.name?.split(' ')[0] || 'Steven'}</span>
    </button>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconClock = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00808d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
  </svg>
);
const IconCheckSquare = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00808d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);
const IconBox = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00808d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);
const IconTrendUp = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00808d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
  </svg>
);
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);
const IconChevronDown = ({ size = 14, color = '#374151' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);
const IconSave = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00808d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
  </svg>
);
const IconPrint = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00808d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 6 2 18 2 18 9" /><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="8" />
  </svg>
);
const IconShare = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00808d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
  </svg>
);
const IconX = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

// ─── Constants ────────────────────────────────────────────────────────────────
const REPORT_TYPES = [
  'Compliance & Safety Reports',
  'Stock Reports',
  'Usage & Trends',
  'Expiry Reports',
];

const FORMATS = ['PDF', 'CSV'];

const REPORT_SUBTYPES = {
  'Expiry Reports': [
    { value: 'expired_only', label: 'Expired only' },
    { value: 'expiring_soon', label: 'Expiring soon (next 30 days)' },
    { value: 'all_expiry_items', label: 'All items with expiry dates' },
  ],
  'Stock Reports': [
    { value: 'stock_risk', label: 'Stock risk overview' },
    { value: 'low_stock', label: 'Low stock only' },
    { value: 'out_of_stock', label: 'Out of stock only' },
    { value: 'restock_priority', label: 'Restock priority list' },
  ],
  'Compliance & Safety Reports': [
    { value: 'non_compliant_items', label: 'Non-compliant items' },
    { value: 'removed_expired_audit', label: 'Removed / expired audit' },
    { value: 'recalled_and_expired', label: 'Recalled + expired items' },
  ],
  'Usage & Trends': [
    { value: 'waste_trend_summary', label: 'Waste trend summary' },
    { value: 'most_expired_items', label: 'Most frequently expired items' },
  ],
};

const DEFAULT_REPORT_SUBTYPE = {
  'Expiry Reports': 'expired_only',
  'Stock Reports': 'stock_risk',
  'Compliance & Safety Reports': 'non_compliant_items',
  'Usage & Trends': 'waste_trend_summary',
};

const DATE_FILTERS = ['Last 30 days', 'Last 60 days', 'Last 90 days', 'Last 6 months', 'Last year'];
const FORMAT_FILTERS = ['All Formats', 'PDF', 'CSV'];

const API_BASE = API_ORIGIN;

const normalizeReportUrl = (fileUrl) => {
  if (!fileUrl) return '';
  return /^https?:\/\//i.test(fileUrl) ? fileUrl : `${API_ORIGIN}${fileUrl.startsWith('/') ? '' : '/'}${fileUrl}`;
};

const openReportUrl = (fileUrl) => {
  const normalizedUrl = normalizeReportUrl(fileUrl);
  if (!normalizedUrl) return;
  window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
};

const copyReportUrl = async (fileUrl) => {
  const normalizedUrl = normalizeReportUrl(fileUrl);
  if (!normalizedUrl) return;
  try {
    await navigator.clipboard.writeText(normalizedUrl);
    alert('Link copied to clipboard!');
  } catch (_) {}
};

const buildEmailShareUrl = (fileUrl, reportTitle = 'ShelfSafe report') => {
  const normalizedUrl = normalizeReportUrl(fileUrl);
  const subject = encodeURIComponent(`${reportTitle} from ShelfSafe`);
  const body = encodeURIComponent(`Hi,%0D%0A%0D%0AHere is the report link:%0D%0A${normalizedUrl}`);
  return `mailto:?subject=${subject}&body=${body}`;
};

const buildWhatsAppShareUrl = (fileUrl, reportTitle = 'ShelfSafe report') => {
  const normalizedUrl = normalizeReportUrl(fileUrl);
  return `https://wa.me/?text=${encodeURIComponent(`${reportTitle} - ${normalizedUrl}`)}`;
};

const INFO_CARDS = [
  {
    title: 'Expiry Reports',
    Icon: IconClock,
    bullets: [
      'Items expiring soon (30/60/90 days)',
      'Expired items report',
      'Medications at high risk nearing expiration.',
    ],
  },
  {
    title: 'Compliance & Safety Reports',
    Icon: IconCheckSquare,
    bullets: [
      'Removed expired items (historical data)',
      'Summary of the inventory audit',
      'Overdue reviews and missed checks',
    ],
  },
  {
    title: 'Stock Reports',
    Icon: IconBox,
    bullets: [
      'Low-stock items',
      'Out-of-stock items',
      'Most frequently restocked items',
    ],
  },
  {
    title: 'Usage & Trends',
    Icon: IconTrendUp,
    bullets: [
      'Trends in expired waste over time',
      'Stock turnover rate',
      'Most frequently expired items',
    ],
  },
];

// ─── Custom dropdown ──────────────────────────────────────────────────────────
function Dropdown({ value, onChange, options, placeholder = 'All', className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full gap-2 px-3 py-2 text-sm font-medium text-gray-700 transition-colors bg-white border border-gray-200 rounded-lg hover:border-gray-300"
      >
        <span
          className={`block min-w-0 flex-1 overflow-hidden text-left text-ellipsis whitespace-nowrap ${
            value ? 'text-gray-800' : 'text-gray-400'
          }`}
          title={value || placeholder}
        >
          {value || placeholder}
        </span>

        <span className="flex-shrink-0">
          <IconChevronDown size={13} color="#6b7280" />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 z-50 min-w-full mt-1 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-lg top-full">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-gray-50 ${
                value === opt ? 'text-[#00808d] font-semibold bg-[#f0fdfc]' : 'text-gray-700'
              }`}
              title={opt}
            >
              <span className="block overflow-hidden text-ellipsis whitespace-nowrap">
                {opt}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Generate Reports Panel ─────────────────���─────────────────────────────────
function GenerateReportPanel({ onClose, onGenerate, initialType = '' }) {
  const [reportType, setReportType] = useState(initialType);
  const [reportSubType, setReportSubType] = useState(initialType ? DEFAULT_REPORT_SUBTYPE[initialType] || '' : '');
  const [format, setFormat]         = useState('');
  const [typeOpen, setTypeOpen]     = useState(false);
  const typeRef = useRef(null);
  const subtypeOptions = reportType ? REPORT_SUBTYPES[reportType] || [] : [];

  useEffect(() => {
    const handler = (e) => { if (typeRef.current && !typeRef.current.contains(e.target)) setTypeOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const canGenerate = reportType && format && (!subtypeOptions.length || reportSubType);

  return (
    <>
      {/* Backdrop — only covers the content area, not the sidebar */}
      <div
        className="fixed top-0 bottom-0 right-0 z-40 hidden bg-black/30 md:block"
        style={{ left: '218px' }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 h-full w-full max-w-[480px] bg-white z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Generate Reports</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close panel"
          >
            <IconX />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6 space-y-6 overflow-y-auto">
          {/* Report Type */}
          <div>
            <label className="block mb-2 text-sm font-medium text-gray-800">
              Select a Report Type
            </label>
            <div ref={typeRef} className="relative">
              <button
                type="button"
                onClick={() => setTypeOpen(o => !o)}
                className="flex items-center justify-between w-full px-4 py-3 text-sm text-gray-700 transition-colors bg-white border border-gray-200 rounded-lg hover:border-gray-300"
              >
                <span className={reportType ? 'text-gray-800 font-medium' : 'text-gray-400'}>
                  {reportType || 'Type'}
                </span>
                <IconChevronDown size={14} color="#00808d" />
              </button>
              {typeOpen && (
                <div className="absolute left-0 right-0 z-10 mt-1 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-lg top-full">
                  {REPORT_TYPES.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setReportType(t); setReportSubType(DEFAULT_REPORT_SUBTYPE[t] || ''); setTypeOpen(false); }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-gray-50 ${reportType === t ? 'text-[#00808d] font-semibold bg-[#f0fdfc]' : 'text-gray-700'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>


          {subtypeOptions.length ? (
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-800">
                Report Focus
              </label>
              <Dropdown
                value={(subtypeOptions.find((item) => item.value === reportSubType) || {}).label || ''}
                onChange={(label) => {
                  const match = subtypeOptions.find((item) => item.label === label);
                  setReportSubType(match ? match.value : '');
                }}
                options={subtypeOptions.map((item) => item.label)}
                placeholder="Choose report focus"
                className="w-full"
              />
            </div>
          ) : null}

          {/* Report Format */}
          <div>
            <p className="mb-3 text-sm font-medium text-gray-800">Report Format</p>
            <div className="space-y-3">
              {FORMATS.map(f => (
                <label
                  key={f}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <div
                    onClick={() => setFormat(f)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer ${format === f ? 'border-[#00808d]' : 'border-[#00808d]'}`}
                  >
                    {format === f && (
                      <div className="w-2.5 h-2.5 rounded-full bg-[#00808d]" />
                    )}
                  </div>
                  <span
                    onClick={() => setFormat(f)}
                    className="text-sm font-medium text-gray-700"
                  >
                    {f}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-[#00808d] hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => canGenerate && onGenerate({ type: reportType, subType: reportSubType, format })}
            disabled={!canGenerate}
            className={`px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors ${canGenerate ? 'bg-[#00808d] hover:bg-[#006d79]' : 'bg-gray-300 cursor-not-allowed'}`}
          >
            Generate Report
          </button>
        </div>
      </div>
    </>
  );
}


function ShareMenu({ row }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const shareTitle = `${row?.type || 'ShelfSafe report'} (${row?.format || 'PDF'})`;
  const normalizedUrl = normalizeReportUrl(row?.fileUrl);

  return (
    <div ref={ref} className="relative">
      <button
        className="transition-opacity hover:opacity-70"
        title="Share"
        aria-label="Share report"
        onClick={() => setOpen((value) => !value)}
      >
        <IconShare />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 w-48 mt-2 overflow-hidden bg-white border border-gray-200 rounded-lg shadow-lg top-full">
          <button
            type="button"
            className="w-full px-4 py-2 text-sm text-left text-gray-700 transition-colors hover:bg-gray-50"
            onClick={() => {
              window.open(buildEmailShareUrl(normalizedUrl, shareTitle), '_blank', 'noopener,noreferrer');
              setOpen(false);
            }}
          >
            Share via Gmail / Email
          </button>
          <button
            type="button"
            className="w-full px-4 py-2 text-sm text-left text-gray-700 transition-colors hover:bg-gray-50"
            onClick={() => {
              window.open(buildWhatsAppShareUrl(normalizedUrl, shareTitle), '_blank', 'noopener,noreferrer');
              setOpen(false);
            }}
          >
            Share via WhatsApp
          </button>
          <button
            type="button"
            className="w-full px-4 py-2 text-sm text-left text-gray-700 transition-colors hover:bg-gray-50"
            onClick={async () => {
              await copyReportUrl(normalizedUrl);
              setOpen(false);
            }}
          >
            Copy share link
          </button>
          {typeof navigator !== 'undefined' && navigator.share ? (
            <button
              type="button"
              className="w-full px-4 py-2 text-sm text-left text-gray-700 transition-colors hover:bg-gray-50"
              onClick={async () => {
                try {
                  await navigator.share({ title: shareTitle, text: shareTitle, url: normalizedUrl });
                } catch (_) {}
                setOpen(false);
              }}
            >
              More share options
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

// ─── Main Reports Page ────────────────────────────────────────────────────────
export const Reports = () => {
  const { user } = useAuth();
  const [panelOpen, setPanelOpen]         = useState(false);
  const [panelInitialType, setPanelInitialType] = useState('');
  const [reportHistory, setReportHistory] = useState([]);
  const [search, setSearch]               = useState('');
  const [filterDate, setFilterDate]       = useState('Last 60 days');
  const [filterType, setFilterType]       = useState('');
  const [filterFormat, setFilterFormat]   = useState('');
  const [filterCreatedBy, setFilterCreatedBy] = useState('');
  const [createdByOptions, setCreatedByOptions] = useState(['All']);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  const openPanel = (type = '') => {
    setPanelInitialType(type);
    setPanelOpen(true);
  };

  const authHeader = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (filterDate) params.set('dateFilter', filterDate);
      if (filterType) params.set('reportType', filterType);
      if (filterFormat) params.set('format', filterFormat);
      if (filterCreatedBy && filterCreatedBy !== 'All') params.set('createdBy', filterCreatedBy);

      const res = await fetch(`${API_BASE}/api/reports?${params.toString()}`, {
        headers: { 'Content-Type': 'application/json', ...authHeader() },
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to load reports');

      setReportHistory(json.data || []);

      const uniq = Array.from(new Set((json.data || []).map(r => r.createdBy).filter(Boolean)));
      setCreatedByOptions(['All', ...uniq]);
    } catch (e) {
      setError(e.message);
      setReportHistory([]);
      setCreatedByOptions(['All']);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterDate, filterType, filterFormat, filterCreatedBy]);

  const handleGenerate = async ({ type, subType, format }) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${API_BASE}/api/reports/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader() },
        body: JSON.stringify({
          reportType: type,
          reportSubType: subType,
          format,
          filters: {
            dateFilter: filterDate,
            search,
            expiryWindowDays: subType === 'expiring_soon' ? 30 : undefined,
            trendWindowDays: type === 'Usage & Trends' ? 365 : undefined,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'Failed to generate report');

      setPanelOpen(false);
      await fetchReports();
      if (json.report?.fileUrl) openReportUrl(json.report.fileUrl);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout pageTitle="Reports" headerRight={<UserChip user={user} />}>
      {/* Header row: title + button same line */}
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>Reports</h1>
          <p className="text-sm leading-relaxed text-gray-500">
            Generate and review reports to enhance compliance, facilitate restocking, and minimize waste.
          </p>
        </div>
        <button
          onClick={() => openPanel()}
          className="flex-shrink-0 px-5 py-2.5 bg-[#00808d] hover:bg-[#006d79] text-white text-sm font-semibold rounded-lg transition-colors mt-1"
        >
          Generate Report
        </button>
      </div>

      {/* Info Cards — 2×2 grid, each clickable to open Generate Report panel with type pre-filled */}
      <div className="grid grid-cols-1 gap-4 mt-5 mb-8 md:grid-cols-2">
        {INFO_CARDS.map(({ title, Icon, bullets }) => (
          <button
            key={title}
            type="button"
            onClick={() => openPanel(title)}
            className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-[#00808d] hover:shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00808d] focus:ring-offset-1"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <Icon />
              <h3 className="text-base font-bold text-gray-900">{title}</h3>
            </div>
            <ul className="space-y-1.5 pl-1">
              {bullets.map(b => (
                <li key={b} className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-500 flex-shrink-0" />
                  {b}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>

      {/* Filter bar — single row: search then 4 dropdowns */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder=""
            className="pl-4 pr-9 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:border-[#00808d] transition-colors"
            style={{ width: 200 }}
            aria-label="Search reports"
          />
          <span className="absolute -translate-y-1/2 pointer-events-none right-3 top-1/2">
            <IconSearch />
          </span>
        </div>

        <Dropdown
          value={filterDate}
          onChange={setFilterDate}
          options={DATE_FILTERS}
          placeholder="Last 60 days"
          className="w-36"
        />
        <Dropdown
          value={filterType}
          onChange={v => setFilterType(v === filterType ? '' : v)}
          options={REPORT_TYPES}
          placeholder="Report Type"
          className="w-49"
        />
        <Dropdown
          value={filterFormat}
          onChange={setFilterFormat}
          options={FORMAT_FILTERS}
          placeholder="Format"
          className="w-36"
        />
        <Dropdown
          value={filterCreatedBy}
          onChange={setFilterCreatedBy}
          options={createdByOptions}
          placeholder="Created By"
          className="w-44"
        />
      </div>

      {error ? (
        <div className="mb-3 text-sm text-red-600">{error}</div>
      ) : null}

      {/* Reports table */}
      <div className="overflow-hidden bg-white border border-gray-200 rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                {['Report Type', 'Date created', 'Created By', 'Format', 'Author', 'Action'].map(h => (
                  <th
                    key={h}
                    className="px-5 py-3 text-xs font-semibold text-left text-gray-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-sm text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              ) : reportHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-sm text-center text-gray-400">
                    No reports found.
                  </td>
                </tr>
              ) : (
                reportHistory.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`hover:bg-gray-50 transition-colors ${i > 0 ? 'border-t border-gray-100' : ''}`}
                  >
                    <td className="px-5 py-3.5 text-sm text-gray-700">{row.type}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{row.dateCreated}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{row.createdBy}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{row.format}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{row.author}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <button
                          className="transition-opacity hover:opacity-70"
                          title="Download"
                          aria-label="Download report"
                          onClick={() => openReportUrl(row.fileUrl)}
                        >
                          <IconSave />
                        </button>
                        <button
                          className="transition-opacity hover:opacity-70"
                          title="Print"
                          aria-label="Print report"
                          onClick={() => {
                            const normalizedUrl = normalizeReportUrl(row.fileUrl);
                            if (!normalizedUrl) return;
                            const w = window.open(normalizedUrl, '_blank', 'noopener,noreferrer');
                            if (w) w.onload = () => w.print();
                          }}
                        >
                          <IconPrint />
                        </button>
                        <ShareMenu row={row} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Report Panel */}
      {panelOpen && (
        <GenerateReportPanel
          onClose={() => setPanelOpen(false)}
          onGenerate={handleGenerate}
          initialType={panelInitialType}
        />
      )}
    </DashboardLayout>
  );
};
