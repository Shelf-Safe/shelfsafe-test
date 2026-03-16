import React from 'react';

const inputCls =
  'w-full rounded-md border border-[#d9d9d9] bg-white px-3 py-2 text-sm text-[#1e1e1e] outline-none transition focus:border-[#00808d]';

const Field = ({ label, children }) => (
  <div>
    <label className="mb-1 block text-sm text-[#1e1e1e]">{label}</label>
    {children}
  </div>
);

function AccountSection({ profileData, onChange, onSave, onCancel, saving }) {
  return (
    <div className="ps-account-wrap">
      <div className="ps-account-header mb-6 flex items-start justify-between gap-4">
        <h2 className="text-[18px] font-bold text-[#1e1e1e]">Profile Details</h2>

        <div className="ps-account-actions flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[#00808d] bg-white px-3 py-2 text-sm font-medium text-[#00808d] transition hover:bg-[#f4fbfc]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-md bg-[#00808d] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#006d77]"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div className="ps-account-profile mb-6 flex items-center gap-4">
        <div className="ps-account-avatar flex h-20 w-20 items-center justify-center rounded-full bg-[#d9d9d9] text-2xl font-bold text-[#1e1e1e]">
          {profileData.name ? profileData.name.charAt(0).toUpperCase() : 'U'}
        </div>

        <div>
          <p className="ps-account-name text-[20px] font-bold text-[#1e1e1e]">
            {profileData.name || 'User'}
          </p>
          <p className="ps-account-role text-[16px] text-[#4f5250]">
            {profileData.userRole || 'Lead Pharmacist'}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {[
          { label: 'Full Name', name: 'name' },
          { label: 'Employee ID', name: 'employeeId' },
          { label: 'User Role', name: 'userRole' },
          { label: 'Pharmacy/Organization Name', name: 'pharmacyOrganization' },
          { label: 'Email', name: 'email', disabled: true },
          { label: 'Phone # (Optional)', name: 'phone' },
        ].map(({ label, name, disabled }) => (
          <Field key={name} label={label}>
            <input
              className={inputCls}
              name={name}
              type={name === 'email' ? 'email' : 'text'}
              value={profileData[name]}
              onChange={disabled ? undefined : onChange}
              disabled={disabled}
              readOnly={disabled}
            />
          </Field>
        ))}
      </div>

      <div className="mt-8">
        <p className="mb-2 text-sm font-bold text-[#1e1e1e]">Preferences</p>
        <ul className="flex flex-col gap-1 text-sm text-[#4f5250]">
          <li>• English (Canada)</li>
          <li>• PST (UTC-08:00)</li>
          <li>• Date Format : YYYY-MM-DD</li>
        </ul>
      </div>
    </div>
  );
}

export default AccountSection;