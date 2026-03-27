import React, { useEffect, useMemo, useRef, useState } from 'react';
import { posSyncService } from '../services/posSyncService';
import { API_ORIGIN } from '../config/api';
import { useVoice } from '../voice/VoiceContext';
import { subscribeVoiceAppEvent } from '../voice/eventBus';

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
  const { setActiveContext } = useVoice();
  const [providers, setProviders] = useState([]);
  const [step, setStep] = useState('providers');
  const [selected, setSelected] = useState(null);
  const [email, setEmail] = useState('sam');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shouldAutoSubmit, setShouldAutoSubmit] = useState(false);
  const latestConnectRef = useRef(null);
  const submitButtonRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setActiveContext(null);
      return;
    }
    setActiveContext('pos-modal');
    return () => setActiveContext(null);
  }, [open, setActiveContext]);

  const selectedProvider = useMemo(
    () => providers.find((p) => p.key === selected?.key) || selected,
    [providers, selected]
  );

  useEffect(() => {
    if (!open) return undefined;

    return subscribeVoiceAppEvent((detail) => {
      if (detail.type === 'POS_SELECT_PROVIDER') {
        const provider = providers.find((item) => item.key === detail.providerKey);
        if (provider) {
          setSelected(provider);
          setStep('login');
          setShouldAutoSubmit(Boolean(detail.autoSubmit));
        }
      }

      if (detail.type === 'POS_SET_EMAIL') {
        setEmail(detail.value || '');
      }

      if (detail.type === 'POS_SET_PASSWORD') {
        setPassword(detail.value || '');
      }

      if (detail.type === 'POS_CLOSE') {
        onClose?.();
      }

      if (detail.type === 'POS_SUBMIT' && step === 'login' && selectedProvider && !loading) {
        handleConnect({ preventDefault() {} });
      }
    });
  }, [open, providers, step, selectedProvider, loading, onClose]);

  useEffect(() => {
    if (!open) return;
    setStep('providers');
    setSelected(null);
    setError('');
    setShouldAutoSubmit(false);
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

  useEffect(() => {
    if (!selectedProvider) return;
    const creds = DEMO_CREDENTIALS[selectedProvider.key] || DEMO_CREDENTIALS.default;
    setEmail(creds.email);
    setPassword(creds.password);
  }, [selectedProvider]);

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

  useEffect(() => {
    latestConnectRef.current = handleConnect;
  });

  useEffect(() => {
    if (!open || !shouldAutoSubmit || step !== 'login' || !selectedProvider || loading) return;
    const timer = window.setTimeout(() => {
      const button = submitButtonRef.current;
      if (button && typeof button.click === 'function') {
        button.click();
      } else {
        latestConnectRef.current?.({ preventDefault() {} });
      }
      setShouldAutoSubmit(false);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [open, shouldAutoSubmit, step, selectedProvider, loading]);

  if (!open) return null;

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
                  setShouldAutoSubmit(false);
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
              <button
                type="submit"
                disabled={loading}
                className="pos-modal-sync-btn"
                ref={submitButtonRef}
                data-voice-action="pos-sync-inventory"
              >
                {loading ? 'Syncing...' : 'Sync Inventory'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
