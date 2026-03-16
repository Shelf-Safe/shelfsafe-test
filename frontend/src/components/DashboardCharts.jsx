import React from 'react';

/* Chart palette */
const CHART_RED = '#C00F0C';
const CHART_BLUE = '#003A56';
const CHART_TEAL = '#00808D';

/* ─── Chart data helpers (from medication list) ─────────────────────────────── */
export function getDaysLeft(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exp = new Date(expiryDate);
  exp.setHours(0, 0, 0, 0);
  return Math.floor((exp - today) / (24 * 60 * 60 * 1000));
}

export function computeDonutData(list) {
  let notExpiring = 0, attention = 0, critical = 0;
  list.forEach((m) => {
    const days = getDaysLeft(m.expiryDate);
    if (days == null) return;
    if (days > 120) notExpiring += 1;
    else if (days > 60) attention += 1;
    else critical += 1;
  });
  return [
    { label: 'Not expiring soon\n(120+ days left)', value: Math.max(notExpiring, 0), color: CHART_TEAL },
    { label: 'Attention needed\n(90 days left)', value: Math.max(attention, 0), color: CHART_BLUE },
    { label: 'Critical\n(60 days left)', value: Math.max(critical, 0), color: CHART_RED },
  ];
}

export function computeBarData(list) {
  const buckets = { expired: 0, 30: 0, 60: 0, 90: 0, 120: 0, '120+': 0 };
  list.forEach((m) => {
    const days = getDaysLeft(m.expiryDate);
    if (days == null) return;
    if (days < 0) buckets.expired += 1;
    else if (days <= 30) buckets['30'] += 1;
    else if (days <= 60) buckets['60'] += 1;
    else if (days <= 90) buckets['90'] += 1;
    else if (days <= 120) buckets['120'] += 1;
    else buckets['120+'] += 1;
  });
  return [
    { label: 'Expired', value: buckets.expired, color: CHART_RED },
    { label: '30', value: buckets['30'], color: CHART_RED },
    { label: '60', value: buckets['60'], color: CHART_BLUE },
    { label: '90', value: buckets['90'], color: CHART_BLUE },
    { label: '120', value: buckets['120'], color: CHART_TEAL },
    { label: '120+', value: buckets['120+'], color: CHART_TEAL },
  ];
}

function computeHealthScore(donutData) {
  const total = donutData.reduce((s, d) => s + d.value, 0);
  if (total === 0) return 0;
  const critical = donutData.find((d) => d.color === CHART_RED)?.value ?? 0;
  const attention = donutData.find((d) => d.color === CHART_BLUE)?.value ?? 0;
  const good = donutData.find((d) => d.color === CHART_TEAL)?.value ?? 0;
  const score = Math.round(100 * (good / total) - 10 * (attention / total) - 30 * (critical / total));
  return Math.max(0, Math.min(100, score));
}

const DEFAULT_DONUT = [
  { label: 'Not expiring soon\n(120+ days left)', value: 0, color: CHART_TEAL },
  { label: 'Attention needed\n(90 days left)', value: 0, color: CHART_BLUE },
  { label: 'Critical\n(60 days left)', value: 0, color: CHART_RED },
];

const DEFAULT_BAR = [
  { label: 'Expired', value: 0, color: CHART_RED },
  { label: '30', value: 0, color: CHART_RED },
  { label: '60', value: 0, color: CHART_BLUE },
  { label: '90', value: 0, color: CHART_BLUE },
  { label: '120', value: 0, color: CHART_TEAL },
  { label: '120+', value: 0, color: CHART_TEAL },
];


const DONUT_INNER = 28;
const DONUT_WIDTH = 34;

export function DonutChart({ data }) {
  const donutData = data && data.length ? data : DEFAULT_DONUT;
  const total = donutData.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 80, cy = 80;
  const r = DONUT_INNER + DONUT_WIDTH / 2;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;
  const slices = donutData.map((d) => {
    const pct = d.value / total;
    const offset = circumference * (1 - cumulative);
    const dash = circumference * pct;
    cumulative += pct;
    return { ...d, pct, offset, dash };
  });
  const healthScore = computeHealthScore(donutData);

  return (
    <div className="dash-chart-inner">
      <div className="dash-chart-donut-wrap">
        <svg className="dash-chart-donut-svg" width={160} height={160} viewBox="0 0 160 160">
          {slices.map((s, i) => {
            const sliceMod = s.color === CHART_TEAL ? 'teal' : s.color === CHART_BLUE ? 'attention' : 'critical';
            return (
              <circle
                className={`dash-chart-donut-slice dash-chart-donut-slice--${sliceMod}`}
                key={s.color}
                cx={cx}
                cy={cy}
                r={r}
                style={{
                  strokeDasharray: `${s.dash} ${circumference - s.dash}`,
                  strokeDashoffset: s.offset,
                }}
              />
            );
          })}
        </svg>
        <div className="dash-chart-donut-center">
          <span className="dash-chart-donut-center-label">Overall</span>
          <span className="dash-chart-donut-center-value">{healthScore}</span>
        </div>
      </div>
      <div className="dash-chart-legend-list">
        {donutData.map((d, i) => (
          <div key={i} className="dash-chart-legend-item">
            <span className="dash-chart-legend-dot" style={{ backgroundColor: d.color }} />
            <div>
              {d.label.split('\n').map((line, j) => (
                <p key={j} className={j === 0 ? 'dash-chart-legend-line1' : 'dash-chart-legend-line2'}>{line}</p>
              ))}
              <p className="dash-chart-legend-value">{d.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}


export function BarChart({ data }) {
  const [hoveredIndex, setHoveredIndex] = React.useState(null);
  const barData = data && data.length ? data : DEFAULT_BAR;
  const maxVal = Math.max(1, ...barData.map((b) => b.value));
  const chartH = 160;
  const barW = 50.571;
  const barGap = 48;
  const chartW = (barData.length + 1) * barGap + barData.length * barW;
  const gap = barGap;
  const ySteps = [0, Math.ceil(maxVal / 4), Math.ceil(maxVal / 2), Math.ceil((3 * maxVal) / 4), maxVal].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <div className="dash-chart-bar-wrap">
      <div className="dash-chart-bar-y-axis">
        <span className="dash-chart-bar-y-days">Days</span>
        {ySteps.map((v) => (
          <span key={v}>{v}</span>
        ))}
      </div>
      <div className="dash-chart-bar-svg-wrap">
        <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`}>
          <defs>
            <filter id="dash-bar-tooltip-shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx={0} dy={2} stdDeviation={4} floodColor="#000" floodOpacity={0.1} />
            </filter>
          </defs>
          {ySteps.map((v, i) => (
            <line key={i} x1={0} y1={chartH - (v / maxVal) * chartH} x2={chartW} y2={chartH - (v / maxVal) * chartH} stroke="#D9D9D9" strokeWidth={1.5} />
          ))}
          {barData.map((b, i) => {
            const x = gap + i * (barW + gap);
            const bh = Math.max(0, (b.value / maxVal) * chartH);
            const y = chartH - bh;
            const trackRx = 6;
            const fillInset = 6;
            const fillW = barW - 2 * fillInset;
            const fillX = x + fillInset;
            const fillRx = bh >= chartH ? trackRx - 1 : Math.min(trackRx - 1, bh / 2);
            return (
              <g
                key={i}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect x={x} y={0} width={barW} height={chartH} fill="transparent" pointerEvents="all" />
                <rect x={x} y={0} width={barW} height={chartH} fill="#F4F4F4" rx={trackRx} ry={trackRx} pointerEvents="none" />
                <rect x={fillX} y={y} width={fillW} height={bh} fill={b.color} rx={fillRx} ry={fillRx} pointerEvents="none" />
              </g>
            );
          })}
          {hoveredIndex != null && (() => {
            const b = barData[hoveredIndex];
            const x = gap + hoveredIndex * (barW + gap);
            const bh = Math.max(0, (b.value / maxVal) * chartH);
            const y = chartH - bh;
            const tipW = 52;
            const tipH = 34;
            const tipGap = 10;
            const tipX = x + barW + tipGap;
            const tipY = Math.max(4, Math.min(chartH - tipH - 4, y + bh / 2 - tipH / 2));
            return (
              <g className="dash-bar-tooltip" filter="url(#dash-bar-tooltip-shadow)" pointerEvents="none">
                <rect x={tipX} y={tipY} width={tipW} height={tipH} rx={8} ry={8} fill="#fff" stroke="#e5e7eb" strokeWidth={1} />
                <path d={`M ${tipX} ${tipY + tipH / 2 - 7} L ${tipX} ${tipY + tipH / 2 + 7} L ${tipX - 9} ${tipY + tipH / 2} Z`} fill="#fff" stroke="#e5e7eb" strokeWidth={1} strokeLinejoin="round" />
                <text x={tipX + tipW / 2} y={tipY + tipH / 2 + 5} textAnchor="middle" fill="#111827" fontWeight="700" fontSize={16} fontFamily="sans-serif">
                  {b.value.toLocaleString()}
                </text>
              </g>
            );
          })()}
        </svg>
        <div className="dash-chart-bar-x-wrap">
          <span style={{ width: gap }} aria-hidden="true" />
          {barData.map((b, i) => (
            <React.Fragment key={i}>
              <span className="dash-chart-bar-x-label" style={{ width: barW }}>{b.label}</span>
              {i < barData.length - 1 ? <span style={{ width: gap }} aria-hidden="true" /> : null}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
