import React, { useEffect, useMemo, useState } from 'react';
import { posSyncService } from '../services/posSyncService';
import { API_ORIGIN } from '../config/api';

const backdrop = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15,23,42,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 16,
};
const panel = {
  background: '#fff',
  borderRadius: 20,
  width: '100%',
  maxWidth: 1180,
  boxShadow: '0 20px 60px rgba(0,0,0,.18)',
};

const FALLBACK_PROVIDERS = [
  { key: 'mckesson', name: 'McKesson' },
  { key: 'toshiba', name: 'Toshiba TCx' },
  { key: 'square', name: 'Square POS' },
  { key: 'ncr', name: 'NCR' },
  { key: 'lightspeed', name: 'Lightspeed' },
  { key: 'lsretail', name: 'LS Retail' },
  { key: 'oracle', name: 'Oracle Retail' },
  { key: 'propel', name: 'Propel OS' },
];

const DEMO_CREDENTIALS = {
  default: { email: 'sam', password: 'password123' },
  mckesson: { email: 'sam', password: 'password123' },
  toshiba: { email: 'sam', password: 'password123' },
  square: { email: 'sam', password: 'password123' },
  ncr: { email: 'sam', password: 'password123' },
  lightspeed: { email: 'sam', password: 'password123' },
  lsretail: { email: 'sam', password: 'password123' },
  oracle: { email: 'sam', password: 'password123' },
  propel: { email: 'sam', password: 'password123' },
};

function absoluteLogoUrl(logoUrl) {
  if (!logoUrl) return '';
  if (/^https?:\/\//i.test(logoUrl)) return logoUrl;
  return `${API_ORIGIN}${logoUrl.startsWith('/') ? '' : ''}${logoUrl}`;
}

export function PosConnectionModal({ open, onClose, onConnected }) {
  const [providers, setProviders] = useState([]);
  const [step, setStep] = useState('providers');
  const [selected, setSelected] = useState(null);
  const [email, setEmail] = useState('sam');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setStep('providers');
    setSelected(null);
    setError('');
    posSyncService
      .getProviders()
      .then((res) => {
        const incoming = (res.providers || []).map((provider) => ({
          ...provider,
          absoluteLogoUrl: absoluteLogoUrl(provider.logoUrl),
        }));
        setProviders(incoming.length ? incoming : FALLBACK_PROVIDERS);
      })
      .catch(() => setProviders(FALLBACK_PROVIDERS));
  }, [open]);

  const selectedProvider = useMemo(
    () => providers.find((p) => p.key === selected?.key) || selected,
    [providers, selected]
  );

  useEffect(() => {
    if (!selectedProvider) return;
    const creds = DEMO_CREDENTIALS[selectedProvider.key] || DEMO_CREDENTIALS.default;
    setEmail(creds.email);
    setPassword(creds.password);
  }, [selectedProvider]);

  if (!open) return null;

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!selectedProvider) return;
    setLoading(true);
    setError('');
    try {
      const result = await posSyncService.connect({
        providerKey: selectedProvider.key,
        username: email,
        password,
      });
      onConnected?.(result);
      onClose?.();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Unable to connect to POS.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={backdrop} onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <div className="pos-modal-head pos-modal-head--wide">
          <div>
            <h3 className="pos-modal-title">
              {step === 'providers' ? 'Choose a POS System' : 'Sync Inventory'}
            </h3>
            <p className="pos-modal-subtitle">
              {step === 'providers'
                ? 'Select the provider you want ShelfSafe to sync with.'
                : 'Enter your POS credentials:'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="pos-modal-close" aria-label="Close">
            ×
          </button>
        </div>

        {step === 'providers' ? (
          <div className="pos-modal-providers">
            {providers.length === 0 ? <div className="pos-modal-empty">No POS providers available right now.</div> : null}
            {providers.map((provider) => (
              <button
                key={provider.key}
                type="button"
                onClick={() => {
                  setSelected(provider);
                  setStep('login');
                }}
                className="pos-modal-provider-card"
              >
                <div className="pos-modal-provider-logo">
                  {provider.absoluteLogoUrl ? (
                    <img src={provider.absoluteLogoUrl} alt={provider.name} />
                  ) : (
                    <div className="pos-modal-provider-name">{provider.name}</div>
                  )}
                </div>
                <div className="pos-modal-provider-label">{provider.name}</div>
                <div className="pos-modal-provider-mock">Mock integration</div>
              </button>
            ))}
          </div>
        ) : (
          <form onSubmit={handleConnect} className="pos-modal-form pos-modal-form--simple">
            <div className="pos-modal-selected-provider">{selectedProvider?.name}</div>
            <div className="pos-modal-simple-fields">
              <div>
                <label className="pos-modal-label">Email</label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pos-modal-input pos-modal-input--large"
                />
              </div>
              <div>
                <label className="pos-modal-label">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pos-modal-input pos-modal-input--large"
                />
              </div>
              {error ? <div className="pos-modal-error">{error}</div> : null}
            </div>
            <div className="pos-modal-actions">
              <button type="button" onClick={() => setStep('providers')} className="pos-modal-cancel-btn">Cancel</button>
              <button type="submit" disabled={loading} className="pos-modal-sync-btn">
                {loading ? 'Syncing...' : 'Sync Inventory'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
