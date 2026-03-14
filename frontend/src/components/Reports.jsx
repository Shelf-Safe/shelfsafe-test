import React, { useState, useMemo } from 'react';

const defaultMedications = [];

export const Reports = ({ medications = defaultMedications }) => {
  const [reportType, setReportType] = useState('inventory');

  const reportTypes = [
    { id: 'inventory', label: 'Inventory Summary', icon: '📦' },
    { id: 'expiry', label: 'Expiring Soon', icon: '⏰' },
    { id: 'usage', label: 'Usage Trends', icon: '📈' },
    { id: 'compliance', label: 'Compliance', icon: '✓' },
  ];

  const inventoryReport = useMemo(() => {
    const total = medications.length;
    if (!total) return { totalMedications: 0, inStock: 0, lowStock: 0, outOfStock: 0 };
    const inStock = medications.filter((m) => m.status === 'In Stock').length;
    const lowStock = medications.filter((m) => m.status === 'Low Stock').length;
    const outOfStock = medications.filter((m) => m.status === 'Out of Stock').length;
    const expiring = medications.filter((m) => m.status === 'Expiring Soon').length;
    return {
      totalMedications: total,
      inStock: Math.round((inStock / total) * 100),
      lowStock: Math.round((lowStock / total) * 100),
      outOfStock: Math.round((outOfStock / total) * 100),
      expiringSoon: expiring,
    };
  }, [medications]);

  const expiryReport = useMemo(() => {
    return medications
      .filter((m) => m.status === 'Expiring Soon' || m.status === 'Low Stock')
      .slice(0, 15)
      .map((m) => ({
        medication: m.medicationName,
        expiry: m.expiryDate ? new Date(m.expiryDate).toISOString().slice(0, 10) : `${m.expiryMonth} ${m.expiryYear}`,
        daysLeft: m.expiryDate ? Math.ceil((new Date(m.expiryDate) - new Date()) / (1000 * 60 * 60 * 24)) : 0,
        status: m.status === 'Expiring Soon' ? 'expiring-soon' : 'ok',
      }));
  }, [medications]);

  const usageReport = [
    { date: '2025-02-01', medications: 12, trend: '+5%' },
    { date: '2025-02-02', medications: 18, trend: '+20%' },
    { date: '2025-02-03', medications: 22, trend: '+22%' },
    { date: '2025-02-04', medications: 19, trend: '-14%' },
  ];

  return (
    <div className="dashboard-section">
      <h2>Reports</h2>

      <div className="report-tabs">
        {reportTypes.map((type) => (
          <button
            key={type.id}
            type="button"
            className={`report-tab ${reportType === type.id ? 'active' : ''}`}
            onClick={() => setReportType(type.id)}
          >
            <span className="report-icon">{type.icon}</span>
            {type.label}
          </button>
        ))}
      </div>

      <div className="report-content">
        {reportType === 'inventory' && (
          <div className="report-grid">
            <div className="report-card">
              <h3>Total Medications</h3>
              <p className="report-number">{inventoryReport.totalMedications}</p>
            </div>
            <div className="report-card">
              <h3>In Stock</h3>
              <p className="report-number report-number-success">{inventoryReport.inStock}%</p>
            </div>
            <div className="report-card">
              <h3>Low Stock</h3>
              <p className="report-number report-number-warning">{inventoryReport.lowStock}%</p>
            </div>
            <div className="report-card">
              <h3>Out of Stock</h3>
              <p className="report-number report-number-danger">{inventoryReport.outOfStock}%</p>
            </div>
            <div className="report-card">
              <h3>Expiring Soon</h3>
              <p className="report-number">{inventoryReport.expiringSoon}</p>
            </div>
          </div>
        )}

        {reportType === 'expiry' && (
          <div className="report-table-block">
            <h3>Medications expiring soon</h3>
            {expiryReport.length === 0 ? (
              <p className="report-empty">No items expiring soon.</p>
            ) : (
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Medication</th>
                    <th>Expiry</th>
                    <th>Days left</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {expiryReport.map((item, index) => (
                    <tr key={index}>
                      <td>{item.medication}</td>
                      <td>{item.expiry}</td>
                      <td>{item.daysLeft}</td>
                      <td>
                        <span className={`inventory-status inventory-status-${item.status}`}>
                          {item.status === 'expiring-soon' ? 'Expiring Soon' : 'OK'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {reportType === 'usage' && (
          <div className="report-table-block">
            <h3>Usage trends (sample)</h3>
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Medications used</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                {usageReport.map((item, index) => (
                  <tr key={index}>
                    <td>{item.date}</td>
                    <td>{item.medications}</td>
                    <td className="report-trend-up">{item.trend}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {reportType === 'compliance' && (
          <div className="compliance-block">
            <h3>Compliance & safety</h3>
            <ul className="compliance-list">
              <li className="compliance-item compliance-ok">All medications properly stored</li>
              <li className="compliance-item compliance-ok">Expiry dates monitored</li>
              <li className="compliance-item compliance-warn">Review low-stock items</li>
              <li className="compliance-item compliance-ok">Documentation up to date</li>
            </ul>
          </div>
        )}
      </div>

      <button type="button" className="btn btn-primary report-download-btn">
        Download report
      </button>
    </div>
  );
};
