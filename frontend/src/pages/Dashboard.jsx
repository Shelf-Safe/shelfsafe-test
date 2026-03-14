import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { medicationService } from '../services/medicationService';
import { computeDonutData, computeBarData, DonutChart, BarChart } from '../components/DashboardCharts';

function getPriority(m) {
  if (m.status === 'Out of Stock' || m.status === 'Expiring Soon') return 'High';
  if (m.status === 'Low Stock' || m.risk === 'Medium') return 'Mid';
  return 'Low';
}

function mapMedication(m) {
  const id = m._id ? String(m._id) : m.id;
  const expiryDate = m.expiryDate ? new Date(m.expiryDate) : null;
  const expiryMonth = m.expiryMonth || (expiryDate ? expiryDate.toLocaleString('default', { month: 'short' }) : '');
  const expiryYear = m.expiryYear || (expiryDate ? expiryDate.getFullYear() : '');
  return {
    id,
    medicationName: m.medicationName || '',
    sku: m.sku || m.barcodeData || '',
    batchLotNumber: m.batchLotNumber || '',
    expiryMonth,
    expiryYear,
    expiryDate: expiryDate ? expiryDate.getTime() : 0,
    currentStock: m.currentStock ?? 0,
    status: m.status || 'In Stock',
    risk: m.risk || 'Low',
  };
}

function SortIcon({ className }) {
  return (
    <span className={className} aria-hidden="true">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6l4-4 4 4" />
      <path d="M4 10l4 4 4-4" />
      </svg>
    </span>
  );
}

const PRIORITY_STYLE = {
  low:  { bg: '#dcfce7', color: '#166534' },
  mid:  { bg: '#fef9c3', color: '#854d0e' },
  high: { bg: '#fce4e4', color: '#b91c1c' },
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({ expiring: 0, expired: 0, highRisk: 0, lowStock: 0 });
  const [actionItems, setActionItems] = useState([]);
  const [donutData, setDonutData] = useState([]);
  const [barData, setBarData] = useState([]);
  const [sortBy, setSortBy] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  useEffect(() => {
    let cancelled = false;
    medicationService
      .getAll({ limit: 100 })
      .then((res) => {
        if (cancelled || !res.success) return;
        const list = res.data || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const thirtyDaysOut = new Date(today);
        thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

        const expiring = list.filter(
          (m) => m.expiryDate && new Date(m.expiryDate) <= thirtyDaysOut && new Date(m.expiryDate) >= today
        ).length;
        const expired = list.filter(
          (m) => m.expiryDate && new Date(m.expiryDate) < today
        ).length;
        const highRisk = list.filter(
          (m) => m.risk === 'Medium' || m.risk === 'High' || m.risk === 'Critical'
        ).length;
        const lowStock = list.filter(
          (m) => m.status === 'Low Stock' || m.status === 'Out of Stock'
        ).length;

        const withPriority = list.map((m) => {
          let p = 0;
          if (m.status === 'Out of Stock' || m.status === 'Expiring Soon') p = 3;
          else if (m.status === 'Low Stock' || m.risk === 'Medium') p = 2;
          else p = 1;
          return { m, p };
        });
        const sorted = withPriority.sort((a, b) => b.p - a.p).slice(0, 20);

        setStats({ expiring, expired, highRisk, lowStock });
        setActionItems(sorted.map(({ m }) => mapMedication(m)));
        setDonutData(computeDonutData(list));
        setBarData(computeBarData(list));
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load dashboard');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const filtered = search.trim()
    ? actionItems.filter((m) =>
        m.medicationName.toLowerCase().includes(search.toLowerCase()) ||
        (m.sku && m.sku.includes(search))
      )
    : actionItems;

  const priorityOrder = { High: 3, Mid: 2, Low: 1 };
  const sortedFiltered = [...filtered].sort((a, b) => {
    if (!sortBy) return 0;
    if (sortBy === 'expiry') {
      const diff = (a.expiryDate || 0) - (b.expiryDate || 0);
      return sortDir === 'asc' ? diff : -diff;
    }
    if (sortBy === 'priority') {
      const diff = (priorityOrder[getPriority(b)] ?? 0) - (priorityOrder[getPriority(a)] ?? 0);
      return sortDir === 'asc' ? diff : -diff;
    }
    return 0;
  });

  const { expiring, expired, highRisk, lowStock } = stats;

  if (loading) {
    return (
      <DashboardLayout>
        <div className="dash">
          <p className="dash-loading">Loading dashboard…</p>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="dash">
          <p className="dash-error">{error}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="dash">
        <div className="dash-header">
          <h1 className="dash-title">Dashboard</h1>
          <div className="dash-header-actions">
            <div className="dash-header-buttons">
              <Link to="/inventory/add" className="btn btn-outline">Add Medication</Link>
              <button type="button" className="btn btn-primary">Sync Inventory</button>
            </div>
            <div className="dash-header-sync">
              <span className="dash-header-sync-label">Last Sync</span>
              <span className="dash-header-sync-time">29 Jan 2026 - 8:45 am</span>
            </div>
            <select className="dash-header-date" aria-label="Date range">
              <option>Today</option>
            </select>
          </div>
        </div>

        <div className="dash-cards">
          <div className="dash-card">
            <div className="dash-card-label">Expiring Medications</div>
            <div className="dash-card-num">{expiring}</div>
          </div>
          <div className="dash-card">
            <div className="dash-card-label">Expired Medications</div>
            <div className="dash-card-num">{expired}</div>
          </div>
          <div className="dash-card">
            <div className="dash-card-label">High-Risk Medications</div>
            <div className="dash-card-num">{highRisk}</div>
          </div>
          <div className="dash-card">
            <div className="dash-card-label">Low Stock Items</div>
            <div className="dash-card-num">{lowStock}</div>
          </div>
        </div>

        <div className="dash-charts">
          <div className="dash-chart-box">
            <h2 className="dash-chart-title">Inventory Health Score</h2>
            <DonutChart data={donutData} />
          </div>
          <div className="dash-chart-box">
            <h2 className="dash-chart-title">Expiry Risk Distribution</h2>
            <div className="dash-chart-bar-outer">
              <span className="dash-chart-bar-y-label">Number of Medications</span>
              <BarChart data={barData} />
            </div>
          </div>
        </div>

        <div className="dash-action">
          <div className="dash-action-head">
            <h2 className="dash-action-title">Action Required</h2>
            <div className="dash-search-wrap">
              <input
                type="text"
                className="dash-search"
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search medications"
              />
              <span className="dash-search-icon-right" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
            </div>
          </div>
          <div className="dash-table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Medication Name</th>
                  <th>SKU / Barcode</th>
                  <th>Batch / Lot Number</th>
                  <th
                    className="dash-th-sortable"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSort('expiry')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('expiry'); } }}
                    aria-sort={sortBy === 'expiry' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    Expiry Date
                    <SortIcon className="dash-th-sort" />
                  </th>
                  <th>Current Stock</th>
                  <th>Action</th>
                  <th
                    className="dash-th-sortable"
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSort('priority')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSort('priority'); } }}
                    aria-sort={sortBy === 'priority' ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
                  >
                    Priority / Urgency
                    <SortIcon className="dash-th-sort" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedFiltered.map((m) => {
                  const priority = getPriority(m).toLowerCase();
                  const ps = PRIORITY_STYLE[priority] || PRIORITY_STYLE.low;
                  return (
                  <tr
                    key={m.id}
                    className="dash-table-row"
                    onClick={() => navigate(`/inventory/${m.id}`)}
                  >
                    <td className="dash-td-name">{m.medicationName}</td>
                    <td>{m.sku}</td>
                    <td>{m.batchLotNumber}</td>
                    <td>{m.expiryMonth} {m.expiryYear}</td>
                    <td>{m.currentStock}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="dash-action-btns">
                        <Link to={`/inventory/${m.id}/edit`} className="dash-btn-icon" aria-label="Edit">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00808d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          className="dash-btn-icon"
                          aria-label="Delete"
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              await medicationService.remove(m.id);
                              setActionItems((prev) => prev.filter((item) => item.id !== m.id));
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                            <path d="M10 11v6M14 11v6" />
                            <path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="dash-td-priority">
                      <span
                        className="dash-priority-pill"
                        style={{ backgroundColor: ps.bg, color: ps.color }}
                      >
                        {getPriority(m).toUpperCase()}
                      </span>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
