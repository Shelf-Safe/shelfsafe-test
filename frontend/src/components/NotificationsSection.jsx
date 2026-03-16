import React from 'react';

const inputCls =
  'w-full rounded-md border border-[#d9d9d9] bg-white px-3 py-2 text-sm text-[#1e1e1e] outline-none transition focus:border-[#00808d]';

const Checkbox = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`flex h-5 w-5 items-center justify-center rounded border transition-colors ${
      checked ? 'border-[#00808d] bg-[#00808d]' : 'border-[#bfbfbf] bg-white'
    }`}
  >
    {checked && (
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <polyline
          points="2 6 5 9 10 3"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )}
  </button>
);

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

function NotificationsSection({
  notifications,
  onChange,
  onToggle,
  onSave,
  onCancel,
  saving,
}) {
  return (
    <div>
      <PanelHeader
        title="Notifications Preferences"
        onCancel={onCancel}
        onSave={onSave}
        saving={saving}
      />

      <p className="mb-6 text-sm text-[#4f5250]">
        Choose how you&apos;d like to receive notifications about important
        updates.
      </p>

      <div className="rounded-xl border border-[#e6e6e6] bg-white p-5">
        <div>
          <div className="mb-2 flex items-center gap-3">
            <Checkbox
              checked={notifications.phoneEnabled}
              onChange={(v) => onToggle('phoneEnabled', v)}
            />
            <span className="text-sm font-bold text-[#1e1e1e]">
              Enable Phone Notifications
            </span>
          </div>
          <p className="mb-3 ml-8 text-sm text-[#4f5250]">
            Get notified by SMS for critical updates.
          </p>
          <input
            className={inputCls}
            placeholder="Enter your phone number"
            name="phoneNumber"
            value={notifications.phoneNumber}
            onChange={onChange}
            disabled={!notifications.phoneEnabled}
          />
        </div>

        <hr className="my-5 border-[#e6e6e6]" />

        <div>
          <div className="mb-2 flex items-center gap-3">
            <Checkbox
              checked={notifications.emailEnabled}
              onChange={(v) => onToggle('emailEnabled', v)}
            />
            <span className="text-sm font-bold text-[#1e1e1e]">
              Enable Email Notifications
            </span>
          </div>
          <p className="mb-3 ml-8 text-sm text-[#4f5250]">
            Get notified by email for important updates.
          </p>
          <input
            className={inputCls}
            type="email"
            name="emailAddress"
            value={notifications.emailAddress}
            onChange={onChange}
            disabled={!notifications.emailEnabled}
          />
        </div>
      </div>
    </div>
  );
}

export default NotificationsSection;