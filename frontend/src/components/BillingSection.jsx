import React from 'react';
import { FiRefreshCw, FiEdit2, FiTrash2 } from 'react-icons/fi';

const PanelHeader = ({
  title,
  onCancel,
  onSave,
  saveLabel = 'Save Changes',
  saving = false,
}) => (
  <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
    <h2 className="pt-1 text-[22px] font-bold text-[#1e1e1e] lg:text-[22px]">
      {title}
    </h2>
    <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md border border-[#d2d2d2] bg-white px-4 py-[7px] text-sm font-medium text-[#1e1e1e] transition hover:bg-[#f5f5f5]"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        className="rounded-md bg-[#00808d] px-4 py-[7px] text-sm font-medium text-white transition hover:bg-[#006d77]"
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

function BillingSection({ onCancel }) {
  return (
    <div className="w-full">
     <PanelHeader title="Billing" onCancel={onCancel} onSave={() => {}} />

      <p className="mb-3 text-[16px] font-bold text-[#1e1e1e]">Professional Plan</p>
      <div className="mb-7 w-full rounded-2xl border border-[#e6e6e6] bg-white px-4 py-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-[#4f5250]">
            <FiRefreshCw size={18} color="#00808d" />
            Renewal Date: August, 2027
          </span>
          <span className="text-[18px] font-bold text-[#1e1e1e]">$65/monthly</span>
        </div>

        <div className="h-8 bg-[#efefef] px-4 py-[6px]">
          <div className="h-full w-[86%] bg-[#d9d9d9]" />
        </div>
      </div>

      <p className="mb-3 text-[16px] font-bold text-[#1e1e1e]">Payment Method</p>
      <div className="mb-7 w-full rounded-2xl border border-[#e6e6e6] bg-white px-4 py-4">
        <div className="mb-3 flex items-center justify-end gap-5">
          <button type="button">
            <FiEdit2 size={18} color="#00808d" />
          </button>
          <button type="button">
            <FiTrash2 size={18} color="#00808d" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-8 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded border border-[#e6e6e6] bg-white">
            <div className="flex">
              <div className="h-4 w-4 rounded-full bg-red-500 opacity-90" />
              <div className="-ml-2 h-4 w-4 rounded-full bg-yellow-400 opacity-90" />
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-[#1e1e1e]">
              MasterCard <span className="mx-1 text-[#636363]">● ● ● ●</span>
              <span className="mx-1 text-[#636363]">● ● ● ●</span>
              <span className="mx-1 text-[#636363]">● ● ● ●</span> 5494
            </p>

            <div className="mt-3 flex gap-8 text-sm text-[#4f5250]">
              <span>Exp: 5/2028</span>
              <span>Steven Rothschild</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-[16px] font-bold text-[#1e1e1e]">Invoices</p>
        <button type="button" className="text-[16px] font-bold text-[#1e1e1e]">
          View Billing History
        </button>
      </div>

      <div className="w-full overflow-x-auto rounded-2xl border border-[#e6e6e6] bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#e6e6e6]">
              {['Date', 'Invoice#', 'Amount', 'Download'].map((h) => (
                <th
                  key={h}
                  className="px-6 py-4 text-left font-semibold text-[#636363]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {INVOICES.map((row, i) => (
              <tr key={i} className={i > 0 ? 'border-t border-[#e6e6e6]' : ''}>
                <td className="px-6 py-4 text-[#4f5250]">{row.date}</td>
                <td className="px-6 py-4 text-[#4f5250]">{row.invoice}</td>
                <td className="px-6 py-4 text-[#4f5250]">{row.amount}</td>
                <td className="px-6 py-4 text-[#4f5250]">{row.download}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BillingSection;