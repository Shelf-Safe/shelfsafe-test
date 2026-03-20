import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { medicationService } from '../services/medicationService';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const YEARS = Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() + i));
const RISK_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];
const SHELF_OPTIONS = ['A1','A2','A3','B1','B2','B3','C1','C2','C3','Refrigerated','Controlled'];
const CATEGORY_OPTIONS = ['Analgesic','Antibiotic','Antihypertensive','Antihistamine','Antidiabetic','Cardiovascular','Gastrointestinal','Neurological','Oncology','Other'];
const STATUS_OPTIONS = ['In Stock', 'Low Stock', 'Out of Stock', 'Expired', 'Expiring'];

const inputCls = 'w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-base md:text-sm text-gray-800 outline-none focus:border-[#00808d] focus:ring-1 focus:ring-[#00808d]';
const labelCls = 'block text-[18px] md:text-sm font-medium text-gray-800 mb-2';

function SelectWrap({ value, onChange, options }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} appearance-none pr-10`}>
        <option value="" />
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#00808d]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9" /></svg>
      </div>
    </div>
  );
}

function UploadCard({ preview, onFileChange, onOpenCamera, activeCamera, videoRef, capturePhoto, stopCamera, photoInputRef, canvasRef, cameraError }) {
  return (
    <div>
      <label className={labelCls}>Upload Photo</label>
      <div className="rounded-[20px] border border-gray-200 bg-white p-4 h-[230px] flex items-center justify-center relative overflow-hidden">
        {activeCamera ? (
          <>
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted autoPlay />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-3 z-10">
              <button type="button" onClick={capturePhoto} className="px-4 py-2 rounded-xl bg-[#00808d] text-white font-semibold text-sm">Capture</button>
              <button type="button" onClick={stopCamera} className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm">Cancel</button>
            </div>
          </>
        ) : preview ? (
          <img src={preview} alt="Medication preview" className="w-full h-full object-contain rounded-2xl" />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 text-gray-400">
            <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            <p className="text-sm text-gray-400 text-center px-4">{cameraError || 'Upload or capture a medication photo'}</p>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <div className="flex gap-3 mt-3">
        <button type="button" onClick={() => photoInputRef.current?.click()} className="px-4 py-2 rounded-xl border border-[#00808d] text-[#00808d] bg-white text-sm font-semibold">Upload</button>
        <button type="button" onClick={onOpenCamera} className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-gray-600 text-sm font-semibold">Camera</button>
      </div>
      <input ref={photoInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />
    </div>
  );
}

export const AddMedicationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const photoInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const objectUrlRef = useRef(null);

  const [form, setForm] = useState({
    medicationName: '', brandName: '', risk: '', shelfId: '', expiryMonth: MONTHS[new Date().getMonth()], expiryYear: String(new Date().getFullYear()), currentStock: '', supplierName: '', supplierContact: '', status: '', category: '',
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const p = location?.state?.prefill;
    if (p) {
      setForm((prev) => ({ ...prev, medicationName: p.medicationName || prev.medicationName, brandName: p.brandName || prev.brandName }));
      if (p.photoUrl) setPhotoPreview(p.photoUrl);
    }
  }, [location?.state]);

  useEffect(() => {
    if (location?.state?.openCamera) {
      const id = setTimeout(() => { startCamera(); }, 120);
      return () => clearTimeout(id);
    }
  }, [location?.state]);

  useEffect(() => {
    return () => {
      try { streamRef.current?.getTracks?.().forEach((t) => t.stop()); } catch {}
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!cameraActive) return;
    if (!videoRef.current) return;
    if (!streamRef.current) return;

    const video = videoRef.current;

    if (video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current;
    }

    const playVideo = async () => {
      try {
        await video.play();
      } catch {}
    };

    if (video.readyState >= 1) {
      playVideo();
    } else {
      video.onloadedmetadata = () => {
        playVideo();
      };
    }

    return () => {
      if (video) {
        video.onloadedmetadata = null;
      }
    };
  }, [cameraActive]);

  const handlePhotoChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    setPhotoFile(f);
    const nextUrl = URL.createObjectURL(f);
    objectUrlRef.current = nextUrl;
    setPhotoPreview(nextUrl);
    e.target.value = '';
  };

  const stopCamera = () => {
    try { streamRef.current?.getTracks?.().forEach((t) => t.stop()); } catch {}
    if (videoRef.current) videoRef.current.srcObject = null;
    streamRef.current = null;
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError('');
    setError('');

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported in this browser.');
      return;
    }

    try {
      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        streamRef.current = stream;
      }

      setCameraActive(true);
    } catch {
      setCameraActive(false);
      setCameraError('Camera permission denied or unavailable.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    canvas.getContext('2d').drawImage(video, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return;

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      const file = new File([blob], `medication-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      const nextUrl = URL.createObjectURL(file);
      objectUrlRef.current = nextUrl;

      setPhotoFile(file);
      setPhotoPreview(nextUrl);
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!form.medicationName.trim()) return setError('Medication name is required.');
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photoFile) fd.append('photo', photoFile);
      const response = await medicationService.create(fd);
      const created = response?.data;
      if (created?._id) navigate(`/inventory/${created._id}`, { state: { medication: created } });
      else navigate('/inventory');
    } catch (err) {
      setError(err.message || 'Failed to save medication.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div className="flex items-center gap-3 md:gap-4">
          <button type="button" onClick={() => navigate('/inventory')} className="text-[#00808d] hover:opacity-80" aria-label="Back to inventory">
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <h1 className="text-[28px] md:text-[56px] leading-none font-bold text-gray-900">Add Medication</h1>
        </div>
        <div className="flex gap-3">
          <button type="button" onClick={() => navigate('/inventory')} className="px-6 py-3 rounded-xl border border-[#00808d] text-[#00808d] bg-white font-semibold text-lg md:text-sm">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving} className="px-6 py-3 rounded-xl bg-[#00808d] text-white font-semibold text-lg md:text-sm disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-[1fr_326px] gap-8 items-start">
        <div className="space-y-5 order-1">
          <div>
            <label className={labelCls}>Medication Name</label>
            <input className={inputCls} value={form.medicationName} onChange={(e) => set('medicationName', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Brand Name</label>
            <input className={inputCls} value={form.brandName} onChange={(e) => set('brandName', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={labelCls}>Risk</label><SelectWrap value={form.risk} onChange={(v) => set('risk', v)} options={RISK_OPTIONS} /></div>
            <div><label className={labelCls}>Shelf ID</label><SelectWrap value={form.shelfId} onChange={(v) => set('shelfId', v)} options={SHELF_OPTIONS} /></div>
          </div>
          <div>
            <label className={labelCls}>Expiry Date</label>
            <div className="grid grid-cols-2 gap-4">
              <SelectWrap value={form.expiryMonth} onChange={(v) => set('expiryMonth', v)} options={MONTHS} />
              <SelectWrap value={form.expiryYear} onChange={(v) => set('expiryYear', v)} options={YEARS} />
            </div>
          </div>
          <div><label className={labelCls}>Current Stock</label><input className={inputCls} type="number" min="0" value={form.currentStock} onChange={(e) => set('currentStock', e.target.value)} /></div>
          <div><label className={labelCls}>Supplier Name</label><input className={inputCls} value={form.supplierName} onChange={(e) => set('supplierName', e.target.value)} /></div>
          <div><label className={labelCls}>Supplier Contact</label><input className={inputCls} value={form.supplierContact} onChange={(e) => set('supplierContact', e.target.value)} /></div>
          <div><label className={labelCls}>Status</label><SelectWrap value={form.status} onChange={(v) => set('status', v)} options={STATUS_OPTIONS} /></div>
          <div><label className={labelCls}>Category</label><SelectWrap value={form.category} onChange={(v) => set('category', v)} options={CATEGORY_OPTIONS} /></div>
        </div>

        <div className="order-2 md:order-2">
          <UploadCard preview={photoPreview} onFileChange={handlePhotoChange} onOpenCamera={startCamera} activeCamera={cameraActive} videoRef={videoRef} capturePhoto={capturePhoto} stopCamera={stopCamera} photoInputRef={photoInputRef} canvasRef={canvasRef} cameraError={cameraError} />
        </div>
      </form>
    </DashboardLayout>
  );
};
