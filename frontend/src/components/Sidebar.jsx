import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import logoBig from '../assets/shelfsafe-big.svg';
import { useAuth } from '../context/AuthContext';

const TEAL = '#00808d';

/* ─── Nav icons ─────────────────────────────────────────────────────────────── */
function IconDashboard({ active, size = 18, forceTeal }) {
  const c = (forceTeal || active) ? TEAL : '#6b7280';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function IconInventory({ active, size = 18, forceTeal }) {
  const c = (forceTeal || active) ? TEAL : '#6b7280';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4.03 3 9 3s9-1.34 9-3" />
    </svg>
  );
}

function IconReports({ active, size = 18, forceTeal }) {
  const c = (forceTeal || active) ? TEAL : '#6b7280';
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

const navItems = [
  { to: '/dashboard', label: 'Dashboard', Icon: IconDashboard },
  { to: '/inventory',  label: 'Inventory',  Icon: IconInventory  },
  { to: '/reports',    label: 'Reports',    Icon: IconReports    },
];

/* ─── NavContent ────────────────────────────────────────────────────────────── */
function NavContent({ onClose, mobileActiveClass, iconSize, iconAlwaysTeal }) {
  const activeClass = mobileActiveClass ?? 'bg-[#f0fdfc] text-[#00808d] font-semibold';
  const inactiveClass = 'text-gray-600 hover:bg-gray-50';
  const mobileInactiveClass = 'text-gray-800';
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <img src={logoBig} alt="ShelfSafe" className="w-auto select-none" style={{ height: '67px' }} draggable={false} />
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 pt-4 flex flex-col gap-0.5" aria-label="Main navigation">
        {navItems.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors no-underline ${
                isActive ? activeClass : iconAlwaysTeal ? mobileInactiveClass : inactiveClass
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon active={isActive} size={iconSize} forceTeal={iconAlwaysTeal} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/* ─── Sidebar ───────────────────────────────────────────────────────────────── */
export const Sidebar = ({ mobileHeaderRight }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleMobileLogout = () => {
    setMobileOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* ── Desktop sidebar ────────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col"
        style={{
          width: '218px',
          minHeight: '100vh',
          backgroundColor: '#fff',
          borderRight: '1px solid #e5e7eb',
          flexShrink: 0,
        }}
        aria-label="Sidebar"
      >
        <NavContent onClose={() => {}} />
      </aside>

      {/* ── Mobile top bar ─────────────────────────────────────────────────── */}
      {/* Hamburger left · Avatar right — matches Figma mobile header exactly */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white px-4 py-3">
        {/* Hamburger */}
        <button
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle navigation menu"
          className="p-1 rounded-md text-[#00808d] hover:bg-gray-100"
        >
          {mobileOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>

        {/* Avatar chip passed from DashboardLayout */}
        {mobileHeaderRight && (
          <div>{mobileHeaderRight}</div>
        )}
      </div>

      {/* ── Mobile nav overlay ─────────────────────────────────────────────── */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile drawer ──────────────────────────────────────────────────── */}
      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 z-50 flex flex-col transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{
          width: '80%',
          backgroundColor: '#fff',
          borderRight: '1px solid #e5e7eb',
          borderRadius: '45px',
        }}
        aria-label="Mobile navigation"
      >
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <NavContent
            onClose={() => setMobileOpen(false)}
            mobileActiveClass="bg-[#f0fdfc] text-[#00808d] font-semibold"
            iconSize={24}
            iconAlwaysTeal
          />
        </div>
        <div className="flex-shrink-0 p-4 pt-0 flex justify-center">
          <button
            type="button"
            onClick={handleMobileLogout}
            className="w-[80%] py-2.5 px-4 rounded-lg bg-[#00808d] text-white font-medium text-sm"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};
