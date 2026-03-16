import React from 'react';
import { FiMail } from 'react-icons/fi';

const inputCls =
  'w-full rounded-md border border-[#d9d9d9] bg-white px-3 py-2 text-sm text-[#1e1e1e] outline-none transition focus:border-[#00808d]';

const Field = ({ label, children }) => (
  <div>
    <label className="mb-1 block text-sm text-[#1e1e1e]">{label}</label>
    {children}
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={() => onChange(!checked)}
    className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${
      checked ? 'bg-[#00808d]' : 'bg-[#d2d2d2]'
    }`}
  >
    <span
      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
        checked ? 'left-5' : 'left-0.5'
      }`}
    />
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

const Messages = ({ success, error }) => (
  <>
    {success && <p className="mb-4 text-sm text-green-600">{success}</p>}
    {error && <p className="mb-4 text-sm text-red-600">{error}</p>}
  </>
);

function SecuritySection({
  securityData,
  onChange,
  onToggle2FA,
  onSave,
  onCancel,
  saving,
  onSendReset,
  resetSending,
  resetMsg,
  resetErr,
}) {
  return (
    <div>
      <PanelHeader
        title="Security"
        onCancel={onCancel}
        onSave={onSave}
        saving={saving}
      />

      <div className="flex flex-col gap-4">
        <Field label="Password">
          <input
            type="password"
            className={inputCls}
            name="password"
            value={securityData.password}
            onChange={onChange}
          />
        </Field>

        <Field label="Confirm Password">
          <input
            type="password"
            className={inputCls}
            name="confirmPassword"
            value={securityData.confirmPassword}
            onChange={onChange}
          />
        </Field>

        <div className="flex items-center justify-end gap-3 pt-1">
          <span className="text-sm text-[#4f5250]">
            Enable two-factor authentication
          </span>
          <Toggle checked={securityData.twoFactorEnabled} onChange={onToggle2FA} />
        </div>
      </div>

      <div className="mt-14">
        <p className="mb-2 text-sm font-bold text-[#1e1e1e]">
          Forgot Your Password?
        </p>
        <p className="mb-5 max-w-[610px] text-sm leading-6 text-[#4f5250]">
          Don&apos;t worry, we will help you to reset. Enter your email or phone
          number to receive a one-time password reset link.
        </p>

        <Field label="Enter your email/phone number">
          <input
            className={inputCls}
            name="resetContact"
            value={securityData.resetContact}
            onChange={onChange}
          />
        </Field>

        <Messages success={resetMsg} error={resetErr} />

        <button
          type="button"
          onClick={onSendReset}
          disabled={resetSending || !securityData.resetContact.trim()}
          className={`mt-5 rounded-md px-4 py-2 text-sm font-medium transition ${
            securityData.resetContact.trim()
              ? 'bg-[#00808d] text-white hover:bg-[#006d77]'
              : 'cursor-not-allowed bg-[#e6e6e6] text-[#a6a6a6]'
          }`}
        >
          {resetSending ? 'Sending...' : 'Send Reset Link'}
        </button>
      </div>

      <div className="mt-20 flex justify-center">
        <button
          type="button"
          className="flex items-center gap-2 text-sm font-medium text-[#1e1e1e]"
        >
          <FiMail size={22} color="#00808d" />
          Contact our support
        </button>
      </div>
    </div>
  );
}

export default SecuritySection;