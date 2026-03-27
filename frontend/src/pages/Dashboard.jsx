import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { PosConnectionModal } from '../components/PosConnectionModal';
import { medicationService } from '../services/medicationService';
import { posSyncService } from '../services/posSyncService';
import { computeDonutData, computeBarData, DonutChart, BarChart } from '../components/DashboardCharts';
import { subscribeVoiceAppEvent } from '../voice/eventBus';
import { useVoicePageSchema, useVoicePageState } from '../voice/cache/useVoicePageRegistration';
import { DASHBOARD_VOICE_SCHEMA } from '../voice/cache/pageSchemas';

const DASHBOARD_CACHE_KEY = 'shelfsafe_dashboard_cache';
const INVENTORY_CACHE_KEY = 'shelfsafe_inventory_cache';

function serializeDashboardCache(payload) {
  try {
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({ ...payload, cachedAt: Date.now() }));
  } catch {}
}

function readDashboardCache() {
  try {
    const raw = localStorage.getItem(DASHBOARD_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readInventoryCache() {
  try {
    const raw = localStorage.getItem(INVENTORY_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

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


function buildDashboardState(list, currentLastSync = null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysOut = new Date(today);
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

  const expiring = list.filter((m) => m.expiryDate && new Date(m.expiryDate) <= thirtyDaysOut && new Date(m.expiryDate) >= today).length;
  const expired = list.filter((m) => m.expiryDate && new Date(m.expiryDate) < today).length;
  const highRisk = list.filter((m) => m.risk === 'Medium' || m.risk === 'High' || m.risk === 'Critical').length;
  const lowStock = list.filter((m) => m.status === 'Low Stock' || m.status === 'Out of Stock').length;

  const withPriority = list.map((m) => {
    let p = 0;
    if (m.status === 'Out of Stock' || m.status === 'Expiring Soon') p = 3;
    else if (m.status === 'Low Stock' || m.risk === 'Medium') p = 2;
    else p = 1;
    return { m, p };
  });

  const actionItems = withPriority.sort((a, b) => b.p - a.p).slice(0, 20).map(({ m }) => mapMedication(m));
  return {
    stats: { expiring, expired, highRisk, lowStock },
    actionItems,
    donutData: computeDonutData(list),
    barData: computeBarData(list),
    lastSync: currentLastSync || null,
  };
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
  const [priorityFilter, setPriorityFilter] = useState('');
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [posConnection, setPosConnection] = useState(null);
  const [showPosModal, setShowPosModal] = useState(false);
  const [lastSyncChangedItems, setLastSyncChangedItems] = useState([]);
  const [dismissedActionKeys, setDismissedActionKeys] = useState([]);
  const syncButtonRef = useRef(null);
  const changePosButtonRef = useRef(null);
  const disconnectButtonRef = useRef(null);
  const searchInputRef = useRef(null);

  const applyCachedDashboard = React.useCallback(() => {
    const dashboardCache = readDashboardCache();
    if (dashboardCache?.stats && dashboardCache?.actionItems && dashboardCache?.donutData && dashboardCache?.barData) {
      setStats(dashboardCache.stats);
      setActionItems(dashboardCache.actionItems);
      setDonutData(dashboardCache.donutData);
      setBarData(dashboardCache.barData);
      if (dashboardCache.lastSync) setLastSync(new Date(dashboardCache.lastSync));
      setLoading(false);
      return true;
    }

    const inventoryCache = readInventoryCache();
    if (inventoryCache.length) {
      const payload = buildDashboardState(inventoryCache, null);
      setStats(payload.stats);
      setActionItems(payload.actionItems);
      setDonutData(payload.donutData);
      setBarData(payload.barData);
      setLoading(false);
      return true;
    }
    return false;
  }, []);

  const handleSort = (column, forcedDirection = '', nextPriorityFilter = '') => {
    if (column === 'priority') {
      setPriorityFilter(nextPriorityFilter || '');
    } else {
      setPriorityFilter('');
    }

    if (forcedDirection === 'asc' || forcedDirection === 'desc') {
      setSortBy(column);
      setSortDir(forcedDirection);
      return;
    }

    if (sortBy === column) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortDir('asc');
    }
  };

  const clearDashboardSearch = () => {
    setSearch('');
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus?.();
    });
  };

  const applyDashboardSearch = (value) => {
    setSearch(value || '');
    window.requestAnimationFrame(() => {
      searchInputRef.current?.focus?.();
    });
  };

  const clearDashboardSort = () => {
    setSortBy(null);
    setSortDir('asc');
    setPriorityFilter('');
  };

  const clickDashboardButton = (buttonRef, fallbackSelector = '') => {
    const refButton = buttonRef?.current || null;
    let button = refButton;

    if (!button && fallbackSelector) {
      button = document.querySelector(fallbackSelector);
    }

    if (!button) {
      console.log('[Voice] Dashboard button not found for selector:', fallbackSelector);
      return false;
    }

    if (button.disabled) {
      console.log('[Voice] Dashboard button is disabled:', fallbackSelector || button.textContent);
      return false;
    }

    button.scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    button.focus?.();

    const eventOptions = { bubbles: true, cancelable: true, view: window };

    try {
      button.dispatchEvent(new PointerEvent('pointerdown', eventOptions));
    } catch {}
    try {
      button.dispatchEvent(new MouseEvent('mousedown', eventOptions));
    } catch {}
    try {
      button.dispatchEvent(new PointerEvent('pointerup', eventOptions));
    } catch {}
    try {
      button.dispatchEvent(new MouseEvent('mouseup', eventOptions));
    } catch {}
    try {
      button.dispatchEvent(new MouseEvent('click', eventOptions));
    } catch {}

    try {
      if (typeof button.click === 'function') {
        button.click();
      }
    } catch {}

    return true;
  };

  const normalizeVoiceNeedle = (value = '') => String(value || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  const scoreDashboardItemMatch = (needle, item) => {
    const query = normalizeVoiceNeedle(needle);
    if (!query) return 0;
    const medicationName = normalizeVoiceNeedle(item?.medicationName || '');
    const sku = normalizeVoiceNeedle(item?.sku || '');
    const queryCompact = query.replace(/\s+/g, '');
    const nameCompact = medicationName.replace(/\s+/g, '');
    const skuCompact = sku.replace(/\s+/g, '');
    if (medicationName.includes(query) || sku.includes(query)) return 100;
    if (nameCompact.includes(queryCompact) || skuCompact.includes(queryCompact)) return 95;
    const queryTokens = query.split(' ').filter(Boolean);
    const nameTokens = medicationName.split(' ').filter(Boolean);
    let score = 0;
    for (const token of queryTokens) {
      if (nameTokens.includes(token)) score += 18;
      else if (nameTokens.some((nameToken) => nameToken.startsWith(token) || token.startsWith(nameToken))) score += 12;
      else if (nameCompact.includes(token) || token.includes(nameCompact.slice(0, Math.min(4, nameCompact.length)))) score += 8;
    }
    if (queryCompact && nameCompact.startsWith(queryCompact.slice(0, Math.min(3, queryCompact.length)))) score += 10;
    return score;
  };

  const findDashboardItem = (value, sourceItems = actionItems) => {
    const needle = normalizeVoiceNeedle(value);
    if (!needle) return null;

    let best = null;
    let bestScore = 0;
    for (let i = 0; i < sourceItems.length; i += 1) {
      const item = sourceItems[i];
      const score = scoreDashboardItemMatch(needle, item);
      if (score > bestScore) {
        best = item;
        bestScore = score;
      }
    }

    return bestScore >= 18 ? best : null;
  };

  const findDashboardRowActionButton = (value, actionName) => {
    const needle = normalizeVoiceNeedle(value);
    if (!needle) return null;

    const rowButtons = Array.from(document.querySelectorAll(`[data-voice-item-action="${actionName}"]`));
    let best = null;
    let bestScore = 0;
    rowButtons.forEach((button) => {
      const row = {
        medicationName: String(button.getAttribute('data-voice-row-name') || ''),
        sku: String(button.getAttribute('data-voice-row-sku') || ''),
      };
      const score = scoreDashboardItemMatch(needle, row);
      if (score > bestScore) {
        best = button;
        bestScore = score;
      }
    });
    return bestScore >= 18 ? best : null;
  };

  const openDashboardItem = (value) => {
    const item = findDashboardItem(value, sortedFiltered) || findDashboardItem(value, actionItems);
    if (!item) return false;
    navigate(`/inventory/${item.id}`);
    return true;
  };

  const clickItemActionButton = (item, actionName, rawValue = '') => {
    if (actionName === 'edit') {
      return openDashboardItem(rawValue || item?.medicationName || '');
    }

    const rowButton = findDashboardRowActionButton(rawValue || item?.medicationName || '', actionName);
    if (rowButton) {
      rowButton.click();
      return true;
    }

    if (!item) return false;
    const selector = `[data-voice-item-id="${item.id}"][data-voice-item-action="${actionName}"]`;
    return clickDashboardButton(null, selector);
  };

  const attemptDashboardItemAction = (value, actionName) => {
    const immediateVisibleItem = findDashboardItem(value, sortedFiltered);
    if (clickItemActionButton(immediateVisibleItem, actionName, value)) return true;

    const immediateKnownItem = findDashboardItem(value, actionItems);
    if (immediateKnownItem) {
      applyDashboardSearch(value);
      window.setTimeout(() => {
        clickItemActionButton(immediateKnownItem, actionName, value);
      }, 180);
      return true;
    }

    applyDashboardSearch(value);
    window.setTimeout(() => {
      const delayedVisibleItem = findDashboardItem(value, sortedFiltered);
      clickItemActionButton(delayedVisibleItem, actionName, value);
    }, 180);
    return false;
  };

  const editDashboardItem = (value) => attemptDashboardItemAction(value, 'edit');

  const deleteDashboardItem = (value) => attemptDashboardItemAction(value, 'delete');

  const loadDashboard = React.useCallback((options = {}) => {
    const { silent } = options;
    if (!silent) setLoading(true);
    setError(null);
    const fetchConnection = posSyncService.getConnection().catch(() => ({ connection: null }));
    return Promise.all([medicationService.getAll({ limit: 2000, page: 1 }), fetchConnection])
      .then(([res, connectionRes]) => {
        const connection = connectionRes?.connection || null;
        setPosConnection(connection);
        if (connection?.lastSyncedAt) setLastSync(new Date(connection.lastSyncedAt));

        if (!res.success) return;
        const list = res.data || [];
        const effectiveLastSync = connection?.lastSyncedAt ? new Date(connection.lastSyncedAt) : new Date();
        if (!connection?.lastSyncedAt) setLastSync(effectiveLastSync);
        const payload = buildDashboardState(list, effectiveLastSync);
        setStats(payload.stats);
        setActionItems(payload.actionItems);
        setDonutData(payload.donutData);
        setBarData(payload.barData);
        serializeDashboardCache(payload);
        return list.length;
      })
      .catch((err) => {
        if (!silent && !readDashboardCache() && readInventoryCache().length === 0) {
          setError(err.message || 'Failed to load dashboard');
        }
        return null;
      })
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    const hydrated = applyCachedDashboard();
    loadDashboard({ silent: hydrated });
  }, [applyCachedDashboard, loadDashboard]);

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

  const filtered = baseFiltered
    .filter((m) => !dismissedActionKeys.includes(makeActionKey(m)))
    .filter((m) => (priorityFilter ? getPriority(m).toLowerCase() === priorityFilter.toLowerCase() : true));

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

  const dashboardVoiceRef = useRef({});
  dashboardVoiceRef.current = {
    clickDashboardButton,
    syncButtonRef,
    changePosButtonRef,
    disconnectButtonRef,
    syncing,
    handleSyncClick,
    applyDashboardSearch,
    clearDashboardSearch,
    handleSort,
    clearDashboardSort,
    openDashboardItem,
    editDashboardItem,
    deleteDashboardItem,
  };

  useEffect(() => {
    return subscribeVoiceAppEvent((detail) => {
      const v = dashboardVoiceRef.current;
      switch (detail.type) {
        case 'DASHBOARD_SYNC': {
          const pressed = v.clickDashboardButton(v.syncButtonRef, '[data-voice-action="dashboard-sync"]');
          if (!pressed && !v.syncing) {
            v.handleSyncClick();
          }
          break;
        }
        case 'DASHBOARD_OPEN_POS':
          v.clickDashboardButton(v.changePosButtonRef);
          break;
        case 'DASHBOARD_DISCONNECT_POS':
          v.clickDashboardButton(v.disconnectButtonRef);
          break;
        case 'DASHBOARD_SEARCH':
          v.applyDashboardSearch(detail.value || '');
          break;
        case 'DASHBOARD_CLEAR_SEARCH':
          v.clearDashboardSearch();
          break;
        case 'DASHBOARD_SORT_PRIORITY':
          v.handleSort('priority', detail.sortDirection || '', detail.priorityValue || '');
          break;
        case 'DASHBOARD_SORT_EXPIRY':
          v.handleSort('expiry', detail.sortDirection || '');
          break;
        case 'DASHBOARD_CLEAR_SORT':
          v.clearDashboardSort();
          break;
        case 'DASHBOARD_OPEN_ITEM':
          v.openDashboardItem(detail.value || '');
          break;
        case 'DASHBOARD_EDIT_ITEM':
          v.editDashboardItem(detail.value || '');
          break;
        case 'DASHBOARD_DELETE_ITEM':
          v.deleteDashboardItem(detail.value || '');
          break;
        default:
          break;
      }
    });
  }, []);

  const knownMedicationNames = useMemo(() => {
    const names = readInventoryCache()
      .map((item) => item?.medicationName || item?.name || '')
      .filter(Boolean);
    return Array.from(new Set(names));
  }, [actionItems]);

  const voiceState = useMemo(() => ({
    visibleMedications: actionItems.map((item) => item.medicationName).filter(Boolean),
    knownMedicationNames,
    alertNames: actionItems.slice(0, 10).map((item) => item.medicationName).filter(Boolean),
    selectedPosProvider: posConnection?.providerName || null,
    posModalOpen: !!showPosModal,
    syncAvailable: !syncing,
    notificationsOpen: false,
    searchVisible: true,
    resultCount: sortedFiltered.length,
    selectedFilters: {
      priority: priorityFilter || null,
      search: search || '',
    },
    pageNumber: 1,
  }), [actionItems, knownMedicationNames, posConnection, showPosModal, syncing, priorityFilter, search, sortedFiltered.length]);

  useVoicePageSchema('dashboard', DASHBOARD_VOICE_SCHEMA);
  useVoicePageState('dashboard', voiceState);

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
              <Link to="/inventory?add=1" className="btn btn-outline">Add Medication</Link>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSyncClick}
                ref={syncButtonRef}
                disabled={syncing}
                aria-busy={syncing}
                data-voice-action="dashboard-sync"
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
                  <button type="button" className="btn btn-outline" onClick={() => setShowPosModal(true)} ref={changePosButtonRef} data-voice-action="dashboard-change-pos">
                    Change POS
                  </button>
                  <button type="button" className="btn dash-btn-disconnect" onClick={handleDisconnect} ref={disconnectButtonRef} data-voice-action="dashboard-disconnect-pos">
                    Disconnect
                  </button>
                </>
              ) : (
                <button type="button" className="btn btn-outline" onClick={() => setShowPosModal(true)} ref={changePosButtonRef} data-voice-action="dashboard-change-pos">
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
                ref={searchInputRef}
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
                    data-voice-row-id={m.id}
                    data-voice-row-name={m.medicationName}
                    data-voice-row-sku={m.sku}
                  >
                    <td className="dash-td-name">{m.medicationName}</td>
                    <td>{m.sku}</td>
                    <td>{m.batchLotNumber}</td>
                    <td>{m.expiryMonth} {m.expiryYear}</td>
                    <td>{m.currentStock}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="dash-action-btns">
                        <Link
                          to={`/inventory/${m.id}`}
                          className="dash-btn-icon"
                          aria-label="Edit details"
                          data-voice-item-id={m.id}
                          data-voice-item-action="edit"
                          data-voice-row-name={m.medicationName}
                          data-voice-row-sku={m.sku}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00808d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Link>
                        <button
                          type="button"
                          className="dash-btn-icon"
                          aria-label="Delete"
                          data-voice-item-id={m.id}
                          data-voice-item-action="delete"
                          data-voice-row-name={m.medicationName}
                          data-voice-row-sku={m.sku}
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
