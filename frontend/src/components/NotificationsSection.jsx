import React from 'react';

const inputCls =
  'w-full rounded-xl border border-[#d9d9d9] bg-white px-4 py-3 text-sm text-[#1e1e1e] outline-none transition focus:border-[#00808d] disabled:bg-[#f5f5f5] disabled:text-[#a6a6a6]';

const Checkbox = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`mt-[2px] flex h-[22px] w-[22px] flex-shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors ${
      checked ? 'border-[#00808d] bg-[#00808d]' : 'border-[#bfbfbf] bg-white'
    }`}
  >
    {checked && (
      <svg width="10" height="8" viewBox="0 0 12 10" fill="none">
        <polyline
          points="1.5 5 4.5 8.5 10.5 1.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    )}
  </button>
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
    <div className="ps-notif-wrap">
      <div className="ps-notif-header mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="ps-notif-title text-[22px] font-bold text-[#1e1e1e] lg:text-[22px] lg:pt-1">
          Notifications Preferences
        </h2>

        <div className="ps-notif-actions flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-[#00808d] bg-white px-4 py-[7px] text-sm font-medium text-[#00808d] transition hover:bg-[#f5f5f5]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-md bg-[#00808d] px-4 py-[7px] text-sm font-medium text-white transition hover:bg-[#006d77]"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      <p className="ps-notif-subtitle mb-8 text-sm leading-6 text-[#4f5250]">
        Choose how you'd like to receive notifications about important updates.
      </p>

      <div className="w-full min-h-[330px] rounded-[20px] border border-[#ececec] bg-white px-8 py-10 pr-[8px]">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={notifications.phoneEnabled}
            onChange={(v) => onToggle('phoneEnabled', v)}
          />
          <div className="flex-1">
            <div className="mb-1 text-[16px] font-bold text-[#1e1e1e]">
              Enable Phone Notifications
            </div>
            <p className="mb-4 text-sm leading-6 text-[#4f5250]">
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
        </div>

        <div className="my-6 border-t border-[#ececec]" />

        <div className="flex items-start gap-3">
          <Checkbox
            checked={notifications.emailEnabled}
            onChange={(v) => onToggle('emailEnabled', v)}
          />
          <div className="flex-1">
            <div className="mb-1 text-[16px] font-bold text-[#1e1e1e]">
              Enable Email Notifications
            </div>
            <p className="mb-4 text-sm leading-6 text-[#4f5250]">
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
    </div>
  );
}

export default NotificationsSection;