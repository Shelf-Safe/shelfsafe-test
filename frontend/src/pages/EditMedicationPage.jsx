import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import { useDataSource } from '../context/DataSourceContext';
import { getDummyMedicationById } from '../data/dummyMedications';
import { medicationService } from '../services/medicationService';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => String(CURRENT_YEAR + i));

const RISK_OPTIONS     = ['Low', 'Medium', 'High', 'Critical'];
const SHELF_OPTIONS    = ['A1','A2','A3','B1','B2','B3','C1','C2','C3','Refrigerated','Controlled'];
const CATEGORY_OPTIONS = ['Analgesic','Antibiotic','Antihypertensive','Antihistamine','Antidiabetic','Cardiovascular','Gastrointestinal','Neurological','Oncology','Other'];

const inputCls  = 'w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-800 outline-none focus:border-[#00808d] focus:ring-1 focus:ring-[#00808d] transition-colors';
const selectCls = `${inputCls} cursor-pointer appearance-none`;
const labelCls  = 'block text-sm font-medium text-gray-700 mb-1.5';

function SelectWrapper({ children }) {
  return (
    <div className="relative">
      {children}
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#00808d]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
    </div>
  );
}

export const EditMedicationPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const { useDummy } = useDataSource();

  const photoInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    medicationName: '',
    brandName: '',
    risk: '',
    shelfId: '',
    expiryMonth: MONTHS[new Date().getMonth()],
    expiryYear: String(CURRENT_YEAR),
    currentStock: '',
    supplierName: '',
    supplierContact: '',
    status: '',
    category: '',
    sku: '',
    barcodeData: '',
    batchLotNumber: '',
  });

  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoMode, setPhotoMode] = useState('upload'); // upload | camera
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  // Load medication
  useEffect(() => {
    let alive = true;

    async function runLive() {
      setLoading(true);
      setError('');
      try {
        const res = await medicationService.getById(id);
        const med = res?.data || {};
        if (!alive) return;

        setForm((p) => ({
          ...p,
          medicationName: med.medicationName || '',
          brandName: med.brandName || '',
          risk: med.risk || '',
          shelfId: med.shelfId || '',
          expiryMonth: med.expiryMonth || p.expiryMonth,
          expiryYear: med.expiryYear || p.expiryYear,
          currentStock: (typeof med.currentStock === 'number' ? String(med.currentStock) : (med.currentStock || '')),
          supplierName: med.supplierName || '',
          supplierContact: med.supplierContact || '',
          status: med.status || '',
          category: med.category || '',
          sku: med.sku || '',
          barcodeData: med.barcodeData || '',
          batchLotNumber: med.batchLotNumber || '',
        }));

        const url = med.photoUrl || '';
        setPhotoPreview(url || null);
        setPhotoFile(null);
      } catch (e) {
        if (!alive) return;
        const med = location?.state?.medication || null;
        if (med) {
          setForm((p) => ({
            ...p,
            medicationName: med.medicationName || '',
            brandName: med.brandName || '',
            risk: med.risk || '',
            shelfId: med.shelfId || '',
            expiryMonth: med.expiryMonth || p.expiryMonth,
            expiryYear: med.expiryYear || p.expiryYear,
            currentStock: (typeof med.currentStock === 'number' ? String(med.currentStock) : (med.currentStock || '')),
            supplierName: med.supplierName || '',
            supplierContact: med.supplierContact || '',
            status: med.status || '',
            category: med.category || '',
            sku: med.sku || '',
            barcodeData: med.barcodeData || '',
            batchLotNumber: med.batchLotNumber || '',
          }));
          setPhotoPreview(med.photoUrl || null);
          setPhotoFile(null);
          setError('');
        } else {
          setError(e?.message || 'Failed to load medication.');
        }
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    }

    function runDummy() {
      setLoading(true);
      setError('');
      const med = getDummyMedicationById(id);
      if (!med) {
        setError('Dummy medication not found.');
        setLoading(false);
        return;
      }

      setForm((p) => ({
        ...p,
        medicationName: med.medicationName || '',
        brandName: med.brandName || '',
        risk: med.risk || '',
        shelfId: med.shelfId || '',
        expiryMonth: med.expiryMonth || p.expiryMonth,
        expiryYear: med.expiryYear || p.expiryYear,
        currentStock: (typeof med.currentStock === 'number' ? String(med.currentStock) : (med.currentStock || '')),
        supplierName: med.supplierName || '',
        supplierContact: med.supplierContact || '',
        status: med.status || '',
        category: med.category || '',
        sku: med.sku || '',
        barcodeData: med.barcodeData || '',
        batchLotNumber: med.batchLotNumber || '',
      }));

      setPhotoPreview(med.photoUrl || null);
      setPhotoFile(null);
      setLoading(false);
    }

    if (!id) return () => { alive = false; };

    if (useDummy) runDummy();
    else runLive();

    return () => { alive = false; };
  }, [id, useDummy, location?.state]);

  const handlePhotoChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPhotoFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(f);
    e.target.value = '';
  };

  const stopCamera = () => {
    try {
      streamRef.current?.getTracks?.().forEach((t) => t.stop());
    } catch {}
    streamRef.current = null;
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera is not supported in this browser.');
      return;
    }
    try {
      // Camera access only works on HTTPS (or localhost). On HTTP deployments it will be blocked by the browser.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError('Camera permission denied or unavailable. If you are not on HTTPS, camera will not work.');
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
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, w, h);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `medication-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
      stopCamera();
      setPhotoMode('upload');
    }, 'image/jpeg', 0.9);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.medicationName.trim()) {
      setError('Medication name is required.');
      return;
    }
    setError('');
    setSaving(true);

    // In Dummy mode we don't hit the API. We simply return to details page.
    if (useDummy) {
      navigate(`/inventory/${id}`);
      setSaving(false);
      return;
    }

    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (photoFile) fd.append('photo', photoFile);

      await medicationService.update(id, fd);
      navigate(`/inventory/${id}`);
    } catch (err) {
      setError(err.message || 'Failed to update medication.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => () => stopCamera(), []);

  return (
    <DashboardLayout pageTitle="">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(`/inventory/${id}`)}
            className="text-gray-500 hover:text-gray-800 transition-colors"
            aria-label="Back to details"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Edit Medication</h1>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 text-sm text-gray-600">
          Loading...
        </div>
      ) : (
        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-200 p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Photo */}
            <div className="lg:col-span-1">
              <div className="text-sm font-semibold text-gray-800 mb-3">Photo</div>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Medication"
                    className="w-full h-56 object-cover rounded-lg border border-gray-200 bg-white"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-56 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-sm text-gray-500">
                    No image
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPhotoMode('upload')}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold border ${photoMode === 'upload' ? 'border-[#00808d] text-[#00808d] bg-[#f0fafa]' : 'border-gray-200 text-gray-700 bg-white'}`}
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setPhotoMode('camera')}
                    className={`px-3 py-2 rounded-lg text-sm font-semibold border ${photoMode === 'camera' ? 'border-[#00808d] text-[#00808d] bg-[#f0fafa]' : 'border-gray-200 text-gray-700 bg-white'}`}
                  >
                    Camera
                  </button>
                </div>

                {photoMode === 'upload' && (
                  <div className="mt-4">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#00808d' }}
                    >
                      Choose File
                    </button>
                    <div className="mt-2 text-xs text-gray-500">
                      Tip: On mobile, "Choose File" usually offers Camera or Photo Library.
                    </div>
                  </div>
                )}

                {photoMode === 'camera' && (
                  <div className="mt-4">
                    {cameraError && <div className="mb-2 text-xs text-red-600">{cameraError}</div>}

                    {!cameraActive ? (
                      <button
                        type="button"
                        onClick={startCamera}
                        className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                        style={{ backgroundColor: '#00808d' }}
                      >
                        Start Camera
                      </button>
                    ) : (
                      <>
                        <video ref={videoRef} className="w-full h-56 object-cover rounded-lg border border-gray-200 bg-black" playsInline />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: '#00808d' }}
                          >
                            Capture
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50"
                          >
                            Stop
                          </button>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Note: Browser camera requires HTTPS (or localhost).
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Fields */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Medication Name</label>
                  <input className={inputCls} value={form.medicationName} onChange={(e) => set('medicationName', e.target.value)} placeholder="e.g., Paracetamol Tablets IP 500mg" />
                </div>
                <div>
                  <label className={labelCls}>Brand</label>
                  <input className={inputCls} value={form.brandName} onChange={(e) => set('brandName', e.target.value)} placeholder="e.g., Tylenol" />
                </div>

                <div>
                  <label className={labelCls}>SKU</label>
                  <input className={inputCls} value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="e.g., TYL-500-50CT" />
                </div>
                <div>
                  <label className={labelCls}>Barcode</label>
                  <input className={inputCls} value={form.barcodeData} onChange={(e) => set('barcodeData', e.target.value)} placeholder="e.g., 1234567890" />
                </div>

                <div>
                  <label className={labelCls}>Lot / Batch Number</label>
                  <input className={inputCls} value={form.batchLotNumber} onChange={(e) => set('batchLotNumber', e.target.value)} placeholder="e.g., LOT202601" />
                </div>
                <div>
                  <label className={labelCls}>Current Stock</label>
                  <input className={inputCls} value={form.currentStock} onChange={(e) => set('currentStock', e.target.value)} placeholder="e.g., 120" />
                </div>

                <div>
                  <label className={labelCls}>Category</label>
                  <SelectWrapper>
                    <select className={selectCls} value={form.category} onChange={(e) => set('category', e.target.value)}>
                      <option value="">Select</option>
                      {CATEGORY_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </SelectWrapper>
                </div>

                <div>
                  <label className={labelCls}>Risk</label>
                  <SelectWrapper>
                    <select className={selectCls} value={form.risk} onChange={(e) => set('risk', e.target.value)}>
                      <option value="">Select</option>
                      {RISK_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </SelectWrapper>
                </div>

                <div>
                  <label className={labelCls}>Shelf ID</label>
                  <SelectWrapper>
                    <select className={selectCls} value={form.shelfId} onChange={(e) => set('shelfId', e.target.value)}>
                      <option value="">Select</option>
                      {SHELF_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </SelectWrapper>
                </div>

                <div>
                  <label className={labelCls}>Status</label>
                  <input className={inputCls} value={form.status} onChange={(e) => set('status', e.target.value)} placeholder="e.g., In Stock" />
                </div>

                <div>
                  <label className={labelCls}>Expiry Month</label>
                  <SelectWrapper>
                    <select className={selectCls} value={form.expiryMonth} onChange={(e) => set('expiryMonth', e.target.value)}>
                      {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </SelectWrapper>
                </div>

                <div>
                  <label className={labelCls}>Expiry Year</label>
                  <SelectWrapper>
                    <select className={selectCls} value={form.expiryYear} onChange={(e) => set('expiryYear', e.target.value)}>
                      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </SelectWrapper>
                </div>

                <div>
                  <label className={labelCls}>Supplier</label>
                  <input className={inputCls} value={form.supplierName} onChange={(e) => set('supplierName', e.target.value)} placeholder="e.g., LD Supply" />
                </div>
                <div>
                  <label className={labelCls}>Supplier Contact</label>
                  <input className={inputCls} value={form.supplierContact} onChange={(e) => set('supplierContact', e.target.value)} placeholder="e.g., +1-555-0101 or email" />
                </div>
              </div>

              <div className="mt-6 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => navigate(`/inventory/${id}`)}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold border border-gray-200 text-gray-700 bg-white hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                  style={{ backgroundColor: '#00808d' }}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}
    </DashboardLayout>
  );
};
