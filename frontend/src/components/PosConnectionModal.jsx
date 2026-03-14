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
  maxWidth: 860,
  boxShadow: '0 20px 60px rgba(0,0,0,.18)',
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
  const [username, setUsername] = useState('sam');
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
      .then((res) =>
        setProviders(
          (res.providers || []).map((provider) => ({
            ...provider,
            absoluteLogoUrl: absoluteLogoUrl(provider.logoUrl),
          }))
        )
      )
      .catch(() => setProviders([]));
  }, [open]);

  const selectedProvider = useMemo(
    () => providers.find((p) => p.key === selected?.key) || selected,
    [providers, selected]
  );

  if (!open) return null;

  const handleConnect = async (e) => {
    e.preventDefault();
    if (!selectedProvider) return;
    setLoading(true);
    setError('');
    try {
      const result = await posSyncService.connect({
        providerKey: selectedProvider.key,
        username,
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
        <div className="pos-modal-head">
          <div>
            <h3 className="pos-modal-title">
              {step === 'providers' ? 'Choose a POS System' : 'Connect POS'}
            </h3>
            <p className="pos-modal-subtitle">
              {step === 'providers'
                ? 'Select the provider you want ShelfSafe to sync with.'
                : 'Sign in to continue syncing inventory.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="pos-modal-close" aria-label="Close">
            ×
          </button>
        </div>

        {step === 'providers' ? (
          <div className="pos-modal-providers">
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
          <form onSubmit={handleConnect} className="pos-modal-form">
            <button
              type="button"
              onClick={() => setStep('providers')}
              className="pos-modal-back"
            >
              ← Back to providers
            </button>
            <div className="pos-modal-form-inner">
              <div className="pos-modal-form-card">
                <div className="pos-modal-form-logo">
                  {selectedProvider?.absoluteLogoUrl ? (
                    <img
                      src={selectedProvider.absoluteLogoUrl}
                      alt={selectedProvider.name}
                    />
                  ) : (
                    <div className="pos-modal-provider-name large">
                      {selectedProvider?.name}
                    </div>
                  )}
                </div>
                <div className="pos-modal-fields">
                  <div>
                    <label className="pos-modal-label">Username</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pos-modal-input"
                    />
                  </div>
                  <div>
                    <label className="pos-modal-label">Password</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pos-modal-input"
                    />
                  </div>
                  {error ? <div className="pos-modal-error">{error}</div> : null}
                  <button type="submit" disabled={loading} className="pos-modal-submit">
                    {loading ? 'Connecting...' : 'Connect & Sync Inventory'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
