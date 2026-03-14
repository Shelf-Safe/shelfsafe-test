import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /><circle cx="8" cy="9" r="1" />
    </svg>
  );
}

function TrashIcon({ color = '#ef4444' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" /><path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
const btnBase = {
  padding: '11px 24px', borderRadius: '8px', fontSize: '15px',
  fontWeight: '600', cursor: 'pointer', transition: 'opacity 0.15s',
};
const btnOutline = {
  ...btnBase, background: '#fff', border: '1.5px solid #d1d5db', color: '#374151',
};
const btnTeal = {
  ...btnBase, background: '#00808d', border: 'none', color: '#fff',
};
const btnTealDisabled = {
  ...btnTeal, background: '#d1d5db', color: '#9ca3af', cursor: 'not-allowed',
};
function MethodPicker({ method, setMethod }) {
  const options = [
    {
      id: 'bulk',
      label: 'Import in bulk',
      sub: 'Upload a Excel file to add multiple medications at once.',
    },
    {
      id: 'manual',
      label: 'Add manually',
      sub: '',
    },
    {
      id: 'barcode',
      label: 'Scan a medication barcode using your device camera',
      sub: '',
    },
  ];

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6 leading-relaxed">
        Choose how you'd like to add your medications.{' '}
        You can upload multiple items at once, add them manually, or use your camera to scan.
      </p>
      <div className="flex flex-col gap-4">
        {options.map((o) => (
          <label
            key={o.id}
            className="flex items-start gap-3 cursor-pointer"
            onClick={() => setMethod(o.id)}
          >
            
            <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center"
              style={{ borderColor: method === o.id ? '#00808d' : '#d1d5db' }}>
              {method === o.id && (
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#00808d' }} />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{o.label}</p>
              {o.sub && <p className="text-xs text-gray-500 mt-0.5">{o.sub}</p>}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
function BulkImport({ file, setFile }) {
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
    e.target.value = '';
  };

  const fmt = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-1">Import in bulk</h3>
      <p className="text-sm text-gray-500 mb-5">Upload a Excel file to add multiple medications at once.</p>

      
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="w-full flex items-center gap-3 px-4 py-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer mb-3"
      >
        <PaperclipIcon />
        <span className="text-sm text-gray-400">Select a .xls file here</span>
      </button>
      <input ref={inputRef} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={handleFileChange} />

      
      {file && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 bg-white">
          <div className="flex-shrink-0 text-gray-400">
            <FileIcon />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{file.name}</p>
            <p className="text-xs text-gray-400">{fmt(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => setFile(null)}
            className="flex-shrink-0 p-1 hover:bg-red-50 rounded-lg transition-colors"
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
}
function BarcodeScan({ barcodePhoto, setBarcodePhoto, onAddManually }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Camera permission blocked or not available.");
    }
  };

  const stopCamera = () => {
    stream?.getTracks()?.forEach(t => t.stop());
    setStream(null);
  };

  return (
    <div>
      <h3 className="text-xl font-bold text-gray-900 mb-1">Scan a barcode</h3>
      <p className="text-sm text-gray-500 mb-6">Scan a medication barcode using your device camera.</p>

      <div className="flex justify-center mb-4">
        <button
          type="button"
          onClick={startCamera}
          className="px-8 py-3 rounded-xl text-white font-semibold text-base"
          style={{ backgroundColor: '#00808d' }}
        >
          Enable camera
        </button>
      </div>

      
      <video
        ref={videoRef}
        className="w-full rounded-xl border border-gray-200"
        style={{ maxHeight: 260 }}
        playsInline
        muted
      />

      {stream && (
        <div className="flex justify-center mt-3">
          <button type="button" onClick={stopCamera} style={btnOutline}>
            Stop camera
          </button>
        </div>
      )}

      {!barcodePhoto && (
        <p className="text-sm text-center text-gray-500 mt-4">
          {"Can't scan? "}
          <button type="button" onClick={onAddManually}
            className="font-semibold"
            style={{ color: '#00808d', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Add manually
          </button>
        </p>
      )}
    </div>
  );
}

export const AddMedicationModal = ({
  isOpen,
  onClose,
  onBulkSave,
  onBarcodeSave,
  isMobile = false,
}) => {
  const navigate = useNavigate();

  const [step, setStep] = useState('picker'); 
  const [method, setMethod] = useState('bulk');
  const [file, setFile] = useState(null);
  const [barcodePhoto, setBarcodePhoto] = useState(null);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep('picker');
    setMethod('bulk');
    setFile(null);
    setBarcodePhoto(null);
    setSaving(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleNext = () => {
    if (method === 'manual') {
      handleClose();
      navigate('/inventory/add');
    } else {
      setStep(method);
    }
  };

  const handleBack = () => setStep('picker');

  const canSave =
    (step === 'bulk' && !!file) ||
    (step === 'barcode' && !!barcodePhoto);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (step === 'bulk' && file && onBulkSave) {
        await onBulkSave(file);
      } else if (step === 'barcode' && barcodePhoto && onBarcodeSave) {
        await onBarcodeSave(barcodePhoto.file);
      }
    } finally {
      setSaving(false);
      handleClose();
    }
  };

  if (!isOpen) return null;
  const panelStyle = isMobile
    ? {
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.45)',
      }
    : {
        position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 200,
        width: '100%', maxWidth: '400px',
        backgroundColor: '#fff', boxShadow: '-4px 0 40px rgba(0,0,0,0.12)',
        display: 'flex', flexDirection: 'column',
      };

  const innerStyle = isMobile
    ? {
        background: '#fff', borderRadius: '20px 20px 0 0',
        width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
      }
    : {
        flex: 1, display: 'flex', flexDirection: 'column', height: '100%',
      };

  return (
    <>
      
      {!isMobile && (
        <div
          onClick={handleClose}
          style={{
            position: 'fixed', top: 0, bottom: 0, right: 0, left: '218px', zIndex: 199,
            backgroundColor: 'rgba(0,0,0,0.35)',
          }}
        />
      )}

      <div style={panelStyle} onClick={isMobile ? (e) => { if (e.target === e.currentTarget) handleClose(); } : undefined}>
        <div style={innerStyle}>
          
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
            {step !== 'picker' ? (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors bg-none border-none cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            ) : (
              <div />
            )}
            <h2 className="text-base font-bold text-gray-900">Add Medication</h2>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-700 transition-colors bg-none border-none cursor-pointer p-0.5"
            >
              <XIcon />
            </button>
          </div>

          
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {step === 'picker' && (
              <MethodPicker method={method} setMethod={setMethod} />
            )}
            {step === 'bulk' && (
              <BulkImport file={file} setFile={setFile} />
            )}
            {step === 'barcode' && (
              <BarcodeScan
                barcodePhoto={barcodePhoto}
                setBarcodePhoto={setBarcodePhoto}
                onAddManually={() => {
                  handleClose();
                  navigate('/inventory/add');
                }}
              />
            )}
          </div>

          
          <div className="px-6 py-5 border-t border-gray-100 flex items-center justify-between gap-3">
            <button type="button" onClick={handleClose} style={btnOutline}>
              Cancel
            </button>
            {step === 'picker' ? (
              <button type="button" onClick={handleNext} style={btnTeal}>
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave || saving}
                style={canSave && !saving ? btnTeal : btnTealDisabled}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
