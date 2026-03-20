import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function XIcon() {
  return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}
function PaperclipIcon() {
  return <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1f2937" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" /></svg>;
}
function FileIcon() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="13" y2="17" /><line x1="8" y1="9" x2="10" y2="9" /></svg>;
}
function TrashIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="#dc2626" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4l1-2Zm1 7h2v8h-2v-8Zm4 0h2v8h-2v-8ZM7 10h2v8H7v-8Zm-1 11h12a2 2 0 0 0 2-2V8H4v11a2 2 0 0 0 2 2Z"/></svg>;
}
function RadioCircle({ checked }) {
  return <span className={`w-7 h-7 rounded-full border-[3px] ${checked ? 'border-[#00808d] bg-[#00808d]/10' : 'border-[#00808d] bg-white'} inline-flex items-center justify-center flex-shrink-0`}>{checked && <span className="w-3 h-3 rounded-full bg-[#00808d]" />}</span>;
}

const outlineBtn = 'px-6 py-3 rounded-xl border border-[#00808d] bg-white text-[#00808d] font-semibold text-lg md:text-sm';
const fillBtn = 'px-6 py-3 rounded-xl bg-[#00808d] text-white font-semibold text-lg md:text-sm disabled:opacity-60';
const optionRow = 'w-full flex items-start gap-4 text-left py-3';

function BulkImport({ file, setFile, inputRef, fmt }) {
  return (
    <>
      <h3 className="text-[26px] md:text-[24px] font-bold text-gray-900 mb-2">Import in bulk</h3>
      <p className="text-[18px] md:text-[16px] text-gray-800 leading-relaxed mb-6">Upload a Excel file to add multiple medications at once.</p>
      <button type="button" onClick={() => inputRef.current?.click()} className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-5 py-7 flex items-center gap-5 text-left mb-5">
        <PaperclipIcon />
        <span className="text-gray-400 text-[18px] md:text-sm">Select a .xls file here</span>
      </button>
      <input ref={inputRef} type="file" accept=".xls,.xlsx,.csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); e.target.value = ''; }} />
      {file && (
        <div className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-4 flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-xl bg-gray-50 flex items-center justify-center"><FileIcon /></div>
          <div className="flex-1 min-w-0">
            <div className="text-[18px] md:text-[16px] font-semibold text-gray-800 truncate">{file.name}</div>
            <div className="text-[16px] md:text-sm text-gray-400">{fmt(file.size)}</div>
          </div>
          <button type="button" onClick={() => setFile(null)} className="p-2 hover:bg-red-50 rounded-lg"><TrashIcon /></button>
        </div>
      )}
    </>
  );
}

function BarcodeScan({ barcodePhoto, setBarcodePhoto, onAddManually }) {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => () => {
    stream?.getTracks?.().forEach((t) => t.stop());
  }, [stream]);

  useEffect(() => {
    if (!stream || !videoRef.current) return;
    const video = videoRef.current;
    video.srcObject = stream;
    const playVideo = async () => {
      try { await video.play(); } catch { setCameraError('Camera opened, but preview could not start. Please try again.'); }
    };
    if (video.readyState >= 1) playVideo();
    else video.onloadedmetadata = () => { playVideo(); };
    return () => {
      if (video) {
        video.onloadedmetadata = null;
        if (video.srcObject === stream) video.srcObject = null;
      }
    };
  }, [stream]);

  const stopTracks = (currentStream) => currentStream?.getTracks?.().forEach((t) => t.stop());
  const stopCamera = () => {
    stopTracks(stream);
    setStream(null);
    if (videoRef.current) videoRef.current.srcObject = null;
  };
  const startCamera = async () => {
    setCameraError('');
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Camera is not supported in this browser.');
        return;
      }
      if (stream) {
        if (videoRef.current && videoRef.current.srcObject !== stream) videoRef.current.srcObject = stream;
        if (videoRef.current) await videoRef.current.play().catch(() => {});
        return;
      }
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      stopTracks(stream);
      setStream(s);
    } catch (err) {
      console.error('Camera error:', err);
      setCameraError('Camera permission blocked or camera not available on this device.');
    }
  };
  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setBarcodePhoto({ file: selectedFile, previewUrl: URL.createObjectURL(selectedFile), source: 'upload', name: selectedFile.name });
    e.target.value = '';
  };
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const width = video.videoWidth; const height = video.videoHeight;
    if (!width || !height) { setCameraError('Camera is on, but the frame is not ready yet. Try again in a second.'); return; }
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const capturedFile = new File([blob], `barcode-scan-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setBarcodePhoto({ file: capturedFile, previewUrl: URL.createObjectURL(blob), source: 'camera', name: capturedFile.name });
      stopCamera();
    }, 'image/jpeg', 0.92);
  };
  const clearSelectedPhoto = () => {
    if (barcodePhoto?.previewUrl) { try { URL.revokeObjectURL(barcodePhoto.previewUrl); } catch {} }
    setBarcodePhoto(null);
  };

  return (
    <div>
      <h3 className="text-[26px] md:text-[24px] font-bold text-gray-900 mb-2">Scan a barcode</h3>
      <p className="text-[18px] md:text-[16px] text-gray-800 leading-relaxed mb-2">Use your camera to take a picture or upload a barcode image from your device.</p>
      <p className="text-sm text-gray-400 mb-5">This is helpful on laptops where the live camera may not scan reliably.</p>

      <div className="flex flex-col gap-3 mb-4">
        <button type="button" onClick={startCamera} className="w-full px-8 py-3 rounded-xl text-white font-semibold text-base" style={{ backgroundColor: '#00808d' }}>Enable camera</button>
        <button type="button" onClick={() => fileInputRef.current?.click()} className={outlineBtn}>Upload from device</button>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
      </div>

      {cameraError && <p className="text-xs text-red-500 mb-3">{cameraError}</p>}
      {stream ? (
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-black mb-3"><video ref={videoRef} className="w-full" style={{ maxHeight: 260 }} playsInline muted /></div>
      ) : barcodePhoto?.previewUrl ? (
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50 mb-3"><img src={barcodePhoto.previewUrl} alt="Selected barcode" className="w-full object-contain" style={{ maxHeight: 260 }} /></div>
      ) : (
        <div className="w-full rounded-xl border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-center px-4 py-10 mb-3" style={{ minHeight: 220 }}>
          <p className="text-sm text-gray-500 leading-relaxed">No barcode image selected yet.<br />Turn on the camera and capture a photo, or upload one from your device.</p>
        </div>
      )}

      {barcodePhoto?.name && (
        <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-gray-200 bg-white mb-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">{barcodePhoto.name}</p>
            <p className="text-xs text-gray-500">Source: {barcodePhoto.source === 'camera' ? 'Camera photo' : 'Uploaded image'}</p>
          </div>
          <button type="button" onClick={clearSelectedPhoto} className="flex-shrink-0 p-1 hover:bg-red-50 rounded-lg transition-colors"><TrashIcon /></button>
        </div>
      )}

      {stream && <div className="flex justify-center gap-3 mt-3 mb-3"><button type="button" onClick={capturePhoto} className={fillBtn}>Capture photo</button><button type="button" onClick={stopCamera} className={outlineBtn}>Stop camera</button></div>}
      {!barcodePhoto && <p className="text-sm text-center text-gray-500 mt-4">Can't scan? <button type="button" onClick={onAddManually} className="font-semibold text-[#00808d]">Add manually</button></p>}
    </div>
  );
}

export const AddMedicationModal = ({ isOpen, onClose, onBulkSave, onBarcodeSave }) => {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);
  const [step, setStep] = useState('picker');
  const [method, setMethod] = useState('bulk');
  const [file, setFile] = useState(null);
  const [barcodePhoto, setBarcodePhoto] = useState(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    let raf = 0;
    const handleResize = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setIsMobile(window.innerWidth < 768)); };
    window.addEventListener('resize', handleResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', handleResize); };
  }, []);

  const reset = () => {
    setStep('picker'); setMethod('bulk'); setFile(null); setBarcodePhoto(null); setSaving(false);
  };
  useEffect(() => { if (!isOpen) reset(); }, [isOpen]);
  const handleClose = () => { reset(); onClose?.(); };
  const handleNext = () => {
    if (method === 'manual') { handleClose(); navigate('/inventory/add'); }
    else setStep(method);
  };
  const canSave = (step === 'bulk' && !!file) || (step === 'barcode' && !!barcodePhoto?.file);
  const handleSave = async () => {
    setSaving(true);
    try {
      if (step === 'bulk' && file && onBulkSave) await onBulkSave(file);
      else if (step === 'barcode' && barcodePhoto?.file && onBarcodeSave) await onBarcodeSave(barcodePhoto.file);
      handleClose();
    } finally { setSaving(false); }
  };

  const desktopInsetLeft = 218;
  const overlayStyle = useMemo(() => (isMobile ? {} : { left: `${desktopInsetLeft}px` }), [isMobile]);
  if (!isOpen) return null;

  const fmt = (bytes) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const panel = (
    <div className={`${isMobile ? 'w-[86vw] max-w-[650px] rounded-[40px] max-h-[92vh]' : 'w-full max-w-[470px] h-full'} bg-white flex flex-col shadow-2xl`}>
      <div className="flex items-center justify-between px-6 md:px-8 py-5 border-b border-gray-100">
        {step !== 'picker' ? <button type="button" onClick={() => setStep('picker')} className="text-gray-500 hover:text-gray-800"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg></button> : <div className="w-6" />}
        <h2 className="text-[28px] md:text-[24px] font-bold text-gray-900">Add Medication</h2>
        <button type="button" onClick={handleClose} className="text-[#00808d] hover:opacity-80"><XIcon /></button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6">
        {step === 'picker' && (
          <>
            <p className="text-[18px] md:text-[16px] text-gray-800 leading-relaxed mb-8">Choose how you’d like to add your medications. You can upload multiple items at once, add them manually, or use your camera to scan.</p>
            <button type="button" className={optionRow} onClick={() => setMethod('bulk')}><RadioCircle checked={method === 'bulk'} /><div><div className="text-[18px] md:text-[16px] font-medium text-gray-900">Import in bulk</div><div className="text-[15px] md:text-sm text-gray-500 mt-1">Upload a Excel file to add multiple medications at once.</div></div></button>
            <button type="button" className={optionRow} onClick={() => setMethod('manual')}><RadioCircle checked={method === 'manual'} /><div className="text-[18px] md:text-[16px] font-medium text-gray-900">Add manually</div></button>
            <button type="button" className={optionRow} onClick={() => setMethod('barcode')}><RadioCircle checked={method === 'barcode'} /><div className="text-[18px] md:text-[16px] font-medium text-gray-900">Scan a medication barcode using your device camera</div></button>
          </>
        )}
        {step === 'bulk' && <BulkImport file={file} setFile={setFile} inputRef={inputRef} fmt={fmt} />}
        {step === 'barcode' && <BarcodeScan barcodePhoto={barcodePhoto} setBarcodePhoto={setBarcodePhoto} onAddManually={() => { handleClose(); navigate('/inventory/add'); }} />}
      </div>

      <div className="px-6 md:px-8 py-5 border-t border-gray-100 flex items-center justify-center md:justify-end gap-4">
        <button type="button" onClick={step === 'picker' ? handleClose : () => setStep('picker')} className={outlineBtn}>Cancel</button>
        {step === 'picker' ? <button type="button" onClick={handleNext} className={fillBtn}>Next</button> : <button type="button" onClick={handleSave} disabled={!canSave || saving} className={fillBtn}>{saving ? 'Scanning...' : step === 'barcode' ? 'Scan' : 'Save'}</button>}
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-y-0 right-0 z-[199] bg-black/35" style={overlayStyle} onClick={handleClose} />
      <div className={`fixed inset-y-0 right-0 z-[200] ${isMobile ? 'left-0 flex items-center justify-center p-3' : 'flex justify-end'}`} style={overlayStyle}>
        {panel}
      </div>
    </>
  );
};
