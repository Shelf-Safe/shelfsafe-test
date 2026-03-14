import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { DashboardLayout } from '../components/DashboardLayout';

// ─── UserChip ─────────────────────────────────────────────────────────────────
function UserChip({ user }) {
  const navigate = useNavigate();
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'S';

  return (
    <button
      onClick={() => navigate('/profile')}
      className="flex items-center gap-2 p-0 bg-transparent border-none cursor-pointer hover:opacity-80"
      aria-label="Profile"
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          backgroundColor: '#d1d5db',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: '700', color: '#374151' }}>
          {initials}
        </span>
      </div>
      <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>
        {user?.name?.split(' ')[0] || 'Steven'}
      </span>
    </button>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const IconClock = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00808d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const IconCheckSquare = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00808d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </svg>
);

const IconBox = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00808d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <line x1="10" y1="9" x2="8" y2="9" />
  </svg>
);

const IconTrendUp = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#00808d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

// ─── Constants ────────────────────────────────────────────────────────────────
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

export const Reports = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout pageTitle="Reports" headerRight={<UserChip user={user} />}>
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>
            Reports
          </h1>
          <p className="text-sm leading-relaxed text-gray-500">
            Generate and review reports to enhance compliance, facilitate restocking, and minimize waste.
          </p>
        </div>

        <button className="flex-shrink-0 px-5 py-2.5 bg-[#00808d] text-white text-sm font-semibold rounded-lg mt-1">
          Generate Report
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-5 mb-8 md:grid-cols-2">
        {INFO_CARDS.map(({ title, Icon, bullets }) => (
          <div
            key={title}
            className="p-5 text-left bg-white border border-gray-200 rounded-xl"
          >
            <div className="flex items-center gap-2.5 mb-3">
              <Icon />
              <h3 className="text-base font-bold text-gray-900">{title}</h3>
            </div>

            <ul className="space-y-1.5 pl-1">
              {bullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-2 text-sm leading-relaxed text-gray-700">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-gray-500 flex-shrink-0" />
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="overflow-hidden bg-white border border-gray-200 rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                {['Report Type', 'Date created', 'Created By', 'Format', 'Author', 'Action'].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-3 text-xs font-semibold text-left text-gray-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={6} className="px-5 py-10 text-sm text-center text-gray-400">
                  No reports available yet.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};