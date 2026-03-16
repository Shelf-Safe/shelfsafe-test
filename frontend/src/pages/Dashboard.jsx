import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { PosConnectionModal } from '../components/PosConnectionModal';
import { medicationService } from '../services/medicationService';
import { posSyncService } from '../services/posSyncService';
import { computeDonutData, computeBarData, DonutChart, BarChart } from '../components/DashboardCharts';

function totalFromSummary(summary) {
  if (!summary || typeof summary !== 'object') return 0;
  return Number(summary.totalImported) || Object.values(summary).reduce((s, v) => s + (Number(v) || 0), 0);
}

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

function makeActionKey(m) {
  return [
    m.id || '',
    m.sku || '',
    m.batchLotNumber || '',
    m.expiryDate || '',
  ].join('|');
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

function formatLastSync(date) {
  if (!date) return 'Not synced yet';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return 'Not synced yet';
  return d.toLocaleString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

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
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [posConnection, setPosConnection] = useState(null);
  const [showPosModal, setShowPosModal] = useState(false);
  const [lastSyncChangedItems, setLastSyncChangedItems] = useState([]);
  const [dismissedActionKeys, setDismissedActionKeys] = useState([]);

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const loadDashboard = React.useCallback((options = {}) => {
    const { silent } = options;
    if (!silent) setLoading(true);
    const fetchConnection = posSyncService.getConnection().catch(() => ({ connection: null }));
    return Promise.all([medicationService.getAll({ limit: 10000, page: 1 }), fetchConnection])
      .then(([res, connectionRes]) => {
        const connection = connectionRes?.connection || null;
        setPosConnection(connection);
        if (connection?.lastSyncedAt) setLastSync(new Date(connection.lastSyncedAt));

        if (!res.success) return;
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
        if (!connection?.lastSyncedAt) setLastSync(new Date());
        return list.length;
      })
      .catch((err) => {
        if (!silent) setError(err.message || 'Failed to load dashboard');
        throw err;
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleSyncClick = async () => {
    if (!posConnection) {
      setShowPosModal(true);
      return;
    }
    setSyncing(true);
    setSyncMessage('Syncing latest inventory changes...');
    try {
      const result = await posSyncService.sync();
      setPosConnection(result.connection || posConnection);
      const imported = result.imported ?? result.summary?.totalImported ?? totalFromSummary(result.summary);
      setSyncMessage(`Sync complete. ${imported} item${imported !== 1 ? 's' : ''} updated.`);
      setLastSyncChangedItems(Array.isArray(result.changedItems) ? result.changedItems : []);
      await loadDashboard({ silent: true });
    } catch (err) {
      setSyncMessage(err?.response?.data?.message || err?.message || 'Unable to sync inventory.');
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await posSyncService.disconnect();
      setPosConnection(null);
      setSyncMessage('POS connection removed.');
      setLastSyncChangedItems([]);
      await loadDashboard({ silent: true });
    } catch (err) {
      setSyncMessage(err?.message || 'Unable to disconnect.');
    }
  };

  const handlePosConnected = async (result) => {
    setPosConnection(result?.connection || null);
    const imported = result?.imported ?? result?.summary?.totalImported ?? totalFromSummary(result?.summary);
    setSyncMessage(
      `Connected to ${result?.connection?.providerName || 'POS'} and synced ${imported} item${imported !== 1 ? 's' : ''}.`
    );
    setLastSyncChangedItems(Array.isArray(result?.changedItems) ? result.changedItems : []);
    setShowPosModal(false);
    await loadDashboard({ silent: true });
  };

  const baseFiltered = search.trim()
    ? actionItems.filter((m) =>
        m.medicationName.toLowerCase().includes(search.toLowerCase()) ||
        (m.sku && m.sku.includes(search))
      )
    : actionItems;

  const filtered = baseFiltered.filter((m) => !dismissedActionKeys.includes(makeActionKey(m)));

  const priorityOrder = { High: 3, Mid: 2, Low: 1 };
  const sortedFiltered = (() => {
    const base = [...filtered];
    if (!sortBy) {
      // Default: show synced items at top, and within each group keep High > Mid > Low.
      const decorated = base.map((m) => {
        const p = getPriority(m);
        const pr = priorityOrder[p] ?? 0;
        const isSynced = lastSyncChangedItems.some(
          (c) =>
            (c.medicationName && c.medicationName === m.medicationName) ||
            (c.sku && c.sku === m.sku)
        );
        return { m, pr, isSynced };
      });
      decorated.sort((a, b) => {
        if (a.isSynced !== b.isSynced) return a.isSynced ? -1 : 1;
        return (b.pr || 0) - (a.pr || 0);
      });
      return decorated.map((d) => d.m);
    }
    return base.sort((a, b) => {
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
  })();

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
      <PosConnectionModal
        open={showPosModal}
        onClose={() => setShowPosModal(false)}
        onConnected={handlePosConnected}
      />
      <div className="dash">
        <div className="dash-header">
          <h1 className="dash-title">Dashboard</h1>
          <div className="dash-header-actions">
            <div className="dash-header-buttons">
              <Link to="/inventory/add" className="btn btn-outline">Add Medication</Link>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSyncClick}
                disabled={syncing}
                aria-busy={syncing}
              >
                {syncing ? 'Syncing...' : posConnection ? 'Sync Inventory' : 'Connect POS & Sync'}
              </button>
            </div>
            <div className="dash-header-sync">
              <span className="dash-header-sync-label">Last Sync</span>
              <span className="dash-header-sync-time">{formatLastSync(lastSync)}</span>
            </div>
            <select className="dash-header-date" aria-label="Date range">
              <option>Today</option>
            </select>
          </div>
        </div>

        <div className="dash-pos-section">
          <div className="dash-pos-section-inner">
            <div>
              <div className="dash-pos-title">POS Connection</div>
              <div className="dash-pos-desc">
                {posConnection
                  ? `Connected to ${posConnection.providerName} as ${posConnection.username}.`
                  : 'No POS connected yet. Connect a provider to demo first-time inventory sync.'}
              </div>
              {syncMessage ? <div className="dash-pos-message">{syncMessage}</div> : null}
            </div>
            <div className="dash-pos-buttons">
              {posConnection ? (
                <>
                  <button type="button" className="btn btn-outline" onClick={() => setShowPosModal(true)}>
                    Change POS
                  </button>
                  <button type="button" className="btn dash-btn-disconnect" onClick={handleDisconnect}>
                    Disconnect
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-outline" onClick={() => setShowPosModal(true)}>
                  Choose POS
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="dash-cards">
          <div className="dash-card">
            <div className="dash-card-label"><span className="dash-card-label-a">Expiring</span><span className="dash-card-label-b">Medications</span></div>
            <div className="dash-card-num">{expiring}</div>
          </div>
          <div className="dash-card">
            <div className="dash-card-label"><span className="dash-card-label-a">Expired</span><span className="dash-card-label-b">Medications</span></div>
            <div className="dash-card-num">{expired}</div>
          </div>
          <div className="dash-card">
            <div className="dash-card-label"><span className="dash-card-label-a">High-Risk</span><span className="dash-card-label-b">Medications</span></div>
            <div className="dash-card-num">{highRisk}</div>
          </div>
          <div className="dash-card">
            <div className="dash-card-label"><span className="dash-card-label-a">Low Stock</span><span className="dash-card-label-b">Items</span></div>
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
                            const key = makeActionKey(m);
                            setDismissedActionKeys((prev) =>
                              prev.includes(key) ? prev : [...prev, key]
                            );
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
