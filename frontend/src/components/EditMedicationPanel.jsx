import React, { useState, useEffect } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const YEARS = Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() + i));

const CATEGORIES = ['Analgesic','Antibiotic','Antidiabetic','Antihypertensive','Antihistamine','Antiviral','Vitamin','Other'];
const STATUSES   = ['In Stock','Low Stock','Out of Stock','Expiring Soon','Recalled'];
const RISKS      = ['Low','Medium','High','Critical'];

// ─── Icons ────────────────────────────────────────────────────────────────────
function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00808d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ─── Shared field components ──────────────────────────────────────────────────
function FieldLabel({ children }) {
  return <label className="block text-sm font-normal text-gray-800 mb-1.5">{children}</label>;
}

function TextInput({ value, onChange, placeholder = '', type = 'text' }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 outline-none focus:border-[#00808d] focus:ring-1 focus:ring-[#00808d] transition-colors"
    />
  );
}

function SelectInput({ value, onChange, options, placeholder = '' }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none px-3 py-2.5 pr-8 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 outline-none focus:border-[#00808d] focus:ring-1 focus:ring-[#00808d] transition-colors cursor-pointer"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
        <ChevronDown />
      </div>
    </div>
  );
}

// ─── Panel ────────────────────────────────────────────────────────────────────
export const EditMedicationPanel = ({ isOpen, onClose, medication, onSave }) => {
  const [form, setForm] = useState({
    medicationName: '',
    brandName: '',
    category: '',
    expiryMonth: '',
    expiryYear: '',
    currentStock: '',
    supplierName: '',
    supplierContact: '',
    status: '',
    risk: '',
    shelfId: '',
  });
  const [saving, setSaving] = useState(false);

  // Sync form when medication prop changes or panel opens
  useEffect(() => {
    if (medication) {
      setForm({
        medicationName:  medication.medicationName  || '',
        brandName:       medication.brandName       || '',
        category:        medication.category        || '',
        expiryMonth:     medication.expiryMonth     || '',
        expiryYear:      medication.expiryYear      || '',
        currentStock:    String(medication.currentStock ?? ''),
        supplierName:    medication.supplierName    || '',
        supplierContact: medication.supplierContact || '',
        status:          medication.status          || '',
        risk:            medication.risk            || '',
        shelfId:         medication.shelfId         || '',
      });
    }
  }, [medication, isOpen]);

  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build FormData for API
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));

      // In a real app: await medicationService.update(medication.id, fd);
      // For now, pass updated data directly to parent
      onSave({ ...form, currentStock: parseInt(form.currentStock, 10) || 0 });
    } finally {
      setSaving(false);
    }
  };

  // ── Overlay + panel ──
  return (
    <>
      {/* Backdrop — only covers the content area, not the sidebar */}
        {isOpen && (
          <div
            className="fixed top-0 bottom-0 right-0 bg-black/30 z-40 transition-opacity hidden md:block"
            style={{ left: '218px' }}
            onClick={onClose}
            aria-hidden="true"
          />
        )}

      {/* Slide-in panel */}
      <div
        className={`fixed top-0 right-0 h-full bg-white shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out
          w-full sm:w-[420px] md:w-[480px]
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        role="dialog"
        aria-modal="true"
        aria-label="Edit medication details"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <h2 className="text-xl font-bold text-gray-900">Edit medication details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            aria-label="Close"
          >
            <XIcon />
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-4">
          {/* Medication Name */}
          <div>
            <FieldLabel>Medication Name</FieldLabel>
            <TextInput value={form.medicationName} onChange={set('medicationName')} />
          </div>

          {/* Brand Name */}
          <div>
            <FieldLabel>Brand Name</FieldLabel>
            <TextInput value={form.brandName} onChange={set('brandName')} />
          </div>

          {/* Category */}
          <div>
            <FieldLabel>Category</FieldLabel>
            <SelectInput
              value={form.category}
              onChange={set('category')}
              options={CATEGORIES}
              placeholder=""
            />
          </div>

          {/* Expiry Date — month + year side by side */}
          <div>
            <FieldLabel>Expiry Date</FieldLabel>
            <div className="flex gap-2">
              <div className="flex-1">
                <SelectInput
                  value={form.expiryMonth}
                  onChange={set('expiryMonth')}
                  options={MONTHS}
                  placeholder="Month"
                />
              </div>
              <div className="flex-1">
                <SelectInput
                  value={form.expiryYear}
                  onChange={set('expiryYear')}
                  options={YEARS}
                  placeholder="Year"
                />
              </div>
            </div>
          </div>

          {/* Current Stock */}
          <div>
            <FieldLabel>Current Stock</FieldLabel>
            <TextInput value={form.currentStock} onChange={set('currentStock')} type="number" />
          </div>

          {/* Supplier Name */}
          <div>
            <FieldLabel>Supplier Name</FieldLabel>
            <TextInput value={form.supplierName} onChange={set('supplierName')} />
          </div>

          {/* Supplier Contact */}
          <div>
            <FieldLabel>Supplier Contact</FieldLabel>
            <TextInput value={form.supplierContact} onChange={set('supplierContact')} />
          </div>

          {/* Status */}
          <div>
            <FieldLabel>Status</FieldLabel>
            <SelectInput
              value={form.status}
              onChange={set('status')}
              options={STATUSES}
              placeholder=""
            />
          </div>

          {/* Risk + Shelf ID side by side */}
          <div className="flex gap-3">
            <div className="flex-1">
              <FieldLabel>Risk</FieldLabel>
              <SelectInput
                value={form.risk}
                onChange={set('risk')}
                options={RISKS}
                placeholder=""
              />
            </div>
            <div className="flex-1">
              <FieldLabel>Shelf ID</FieldLabel>
              <TextInput value={form.shelfId} onChange={set('shelfId')} />
            </div>
          </div>
        </div>

        {/* Footer: Cancel + Save */}
        <div className="shrink-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-white">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-lg border border-[#00808d] text-sm font-medium text-[#00808d] bg-white hover:bg-[#00808d]/5 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.medicationName.trim()}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: '#00808d' }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
};
