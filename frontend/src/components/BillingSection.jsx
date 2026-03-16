import React from 'react';
import { FiRefreshCw, FiEdit2, FiTrash2 } from 'react-icons/fi';

const PanelHeader = ({
  title,
  onCancel,
  onSave,
  saveLabel = 'Save Changes',
  saving = false,
}) => (
  <div className="mb-8 flex items-center justify-between">
    <h2 className="text-[18px] font-bold text-[#1e1e1e]">{title}</h2>
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-[#00808d] bg-white px-4 py-2 text-sm font-medium text-[#00808d] transition hover:bg-[#f4fbfc]"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        className="rounded-md bg-[#00808d] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#006d77]"
      >
        {saving ? 'Saving...' : saveLabel}
      </button>
    </div>
  </div>
);

const INVOICES = [
  { date: 'Nov 20, 2025', invoice: '#867508', amount: '$455', download: 'PDF' },
  { date: 'Sept 15, 2025', invoice: '#844125', amount: '$57', download: 'Word Docs' },
  { date: 'Paracetamol 500mg', invoice: '#648154', amount: '$25.80', download: 'CSV...' },
];

function BillingSection() {
  return (
    <div>
      <PanelHeader title="Billing" onCancel={() => {}} onSave={() => {}} />

      <p className="mb-3 text-sm font-bold text-[#1e1e1e]">Professional Plan</p>
      <div className="mb-6 rounded-xl border border-[#e6e6e6] bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-[#4f5250]">
            <FiRefreshCw size={18} color="#00808d" />
            Renewal Date: August, 2027
          </span>
          <span className="text-lg font-bold text-[#1e1e1e]">$65/monthly</span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-[#e6e6e6]">
          <div className="h-full w-3/4 rounded-full bg-[#d2d2d2]" />
        </div>
      </div>

      <p className="mb-3 text-sm font-bold text-[#1e1e1e]">Payment Method</p>
      <div className="mb-6 rounded-xl border border-[#e6e6e6] bg-white p-4">
        <div className="mb-3 flex items-center justify-end gap-3">
          <button type="button">
            <FiEdit2 size={18} color="#00808d" />
          </button>
          <button type="button">
            <FiTrash2 size={18} color="#00808d" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex h-7 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-[#e6e6e6] bg-white">
            <div className="flex">
              <div className="h-4 w-4 rounded-full bg-red-500 opacity-90" />
              <div className="-ml-2 h-4 w-4 rounded-full bg-yellow-400 opacity-90" />
            </div>
          </div>
          <p className="text-sm font-semibold text-[#1e1e1e]">
            MasterCard <span className="text-[#a6a6a6]">•••• •••• ••••</span> 5494
          </p>
        </div>

        <div className="mt-2 flex gap-6 text-sm text-[#4f5250]">
          <span>Exp: 5/2028</span>
          <span>Steven Rothschild</span>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-[#1e1e1e]">Invoices</p>
        <button type="button" className="text-sm font-bold text-[#1e1e1e]">
          View Billing History
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#e6e6e6] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e6e6e6]">
              {['Date', 'Invoice#', 'Amount', 'Download'].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-left font-semibold text-[#636363]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((row, i) => (
              <tr key={i} className={i > 0 ? 'border-t border-[#e6e6e6]' : ''}>
                <td className="px-4 py-3 text-[#4f5250]">{row.date}</td>
                <td className="px-4 py-3 text-[#4f5250]">{row.invoice}</td>
                <td className="px-4 py-3 text-[#4f5250]">{row.amount}</td>
                <td className="px-4 py-3 text-[#4f5250]">{row.download}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BillingSection;