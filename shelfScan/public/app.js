const imageInput = document.getElementById('imageInput');
const sourceImageUrl = document.getElementById('sourceImageUrl');
const decodedText = document.getElementById('decodedText');
const manualOverrides = document.getElementById('manualOverrides');
const runButton = document.getElementById('runButton');
const claritinButton = document.getElementById('claritinButton');
const dayquilButton = document.getElementById('dayquilButton');
const clearButton = document.getElementById('clearButton');
const result = document.getElementById('result');
const preview = document.getElementById('preview');
const summary = document.getElementById('summary');
const warnings = document.getElementById('warnings');
const startCameraButton = document.getElementById('startCameraButton');
const captureButton = document.getElementById('captureButton');
const stopCameraButton = document.getElementById('stopCameraButton');
const cameraPreview = document.getElementById('cameraPreview');
const captureCanvas = document.getElementById('captureCanvas');
const cameraStatus = document.getElementById('cameraStatus');

let cameraStream = null;
let capturedBlob = null;

const samples = {
  claritin: {
    decodedText: '010060000001053310CLA2027A011727093030120240SS-CLAR-00191HC10533',
    manualOverrides: {
      quantity: 120,
      shelfId: 'Shelf-A1'
    }
  },
  dayquil: {
    decodedText: '062600071300',
    manualOverrides: {
      quantity: 18,
      shelfId: 'Shelf-B2'
    }
  }
};

function setImagePreviewFromFile(file) {
  if (!file) {
    preview.hidden = true;
    return;
  }
  preview.src = URL.createObjectURL(file);
  preview.hidden = false;
}

async function fileToImageBitmap(file) {
  return await createImageBitmap(file);
}

async function blobToImageBitmap(blob) {
  return await createImageBitmap(blob);
}

async function detectWithBarcodeDetectorFromBitmap(bitmap) {
  if (!('BarcodeDetector' in window)) return null;

  const formatsToTry = [
    ['data_matrix', 'code_128', 'ean_13', 'upc_a', 'upc_e'],
    ['data_matrix', 'code_128'],
    ['ean_13', 'upc_a', 'upc_e'],
    []
  ];

  for (const formats of formatsToTry) {
    try {
      const detector = formats.length ? new BarcodeDetector({ formats }) : new BarcodeDetector();
      const barcodes = await detector.detect(bitmap);
      if (Array.isArray(barcodes) && barcodes.length > 0) {
        const first = barcodes[0];
        return {
          rawValue: first.rawValue || '',
          format: first.format || null
        };
      }
    } catch (error) {
      // Keep trying other format sets.
    }
  }

  return null;
}

async function tryBrowserDecode() {
  try {
    if (decodedText.value.trim()) {
      return {
        rawValue: decodedText.value.trim(),
        format: 'manual-override'
      };
    }

    if (capturedBlob) {
      const bitmap = await blobToImageBitmap(capturedBlob);
      return await detectWithBarcodeDetectorFromBitmap(bitmap);
    }

    const [file] = imageInput.files;
    if (!file) return null;
    const bitmap = await fileToImageBitmap(file);
    return await detectWithBarcodeDetectorFromBitmap(bitmap);
  } catch (error) {
    return null;
  }
}

function renderPayload(payload) {
  result.textContent = JSON.stringify(payload, null, 2);

  const med = payload.normalized?.medicationRecord;
  summary.innerHTML = `
    <strong>${med?.medicationName || 'Unknown product'}</strong><br />
    Brand: ${med?.brandName || '-'}<br />
    Barcode: ${med?.barcodeData || '-'}<br />
    Lot: ${med?.batchLotNumber || '-'}<br />
    Expiry: ${med?.expiryDate || '-'}<br />
    Quantity: ${med?.currentStock || '-'}<br />
    Status: ${med?.status || '-'}
  `;

  const warningItems = Array.isArray(payload.warnings) && payload.warnings.length
    ? payload.warnings.map((item) => `<div class="warning">• ${item}</div>`).join('')
    : 'No warnings.';

  warnings.innerHTML = warningItems;
}

function renderError(message) {
  result.textContent = message;
  summary.textContent = 'Request failed.';
  warnings.innerHTML = `<div class="warning">• ${message}</div>`;
}

imageInput.addEventListener('change', async () => {
  const [file] = imageInput.files;
  capturedBlob = null;
  captureCanvas.hidden = true;
  setImagePreviewFromFile(file);

  if (decodedText.value.trim()) return;
  cameraStatus.textContent = 'Trying browser-side decode...';
  const decoded = await tryBrowserDecode();
  if (decoded?.rawValue) {
    decodedText.value = decoded.rawValue;
    cameraStatus.textContent = `Browser decoder found ${decoded.format || 'a code'}.`;
  } else {
    cameraStatus.textContent = 'No browser-side decode yet. The API will try server decoding.';
  }
});

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraStatus.textContent = 'This browser does not support direct camera access.';
    return;
  }

  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' } },
      audio: false
    });

    cameraPreview.srcObject = cameraStream;
    cameraPreview.hidden = false;
    captureButton.disabled = false;
    stopCameraButton.disabled = false;
    cameraStatus.textContent = 'Camera ready. Point it at a barcode or GS1 code, then capture.';
  } catch (error) {
    cameraStatus.textContent = `Unable to open camera: ${error.message}`;
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }

  cameraPreview.srcObject = null;
  cameraPreview.hidden = true;
  captureButton.disabled = true;
  stopCameraButton.disabled = true;
  cameraStatus.textContent = 'Camera stopped.';
}

async function captureFrame() {
  if (!cameraStream) return;

  const width = cameraPreview.videoWidth || 1280;
  const height = cameraPreview.videoHeight || 720;
  captureCanvas.width = width;
  captureCanvas.height = height;
  const ctx = captureCanvas.getContext('2d');
  ctx.drawImage(cameraPreview, 0, 0, width, height);
  captureCanvas.hidden = false;
  preview.hidden = true;

  capturedBlob = await new Promise((resolve) => captureCanvas.toBlob(resolve, 'image/jpeg', 0.95));
  cameraStatus.textContent = 'Frame captured. Trying browser-side decode...';

  const decoded = await tryBrowserDecode();
  if (decoded?.rawValue) {
    decodedText.value = decoded.rawValue;
    cameraStatus.textContent = `Browser decoder found ${decoded.format || 'a code'}. Ready to resolve.`;
  } else {
    cameraStatus.textContent = 'Frame captured. Browser decode did not succeed; the API will try server decoding.';
  }
}

startCameraButton.addEventListener('click', startCamera);
captureButton.addEventListener('click', captureFrame);
stopCameraButton.addEventListener('click', stopCamera);

claritinButton.addEventListener('click', () => {
  decodedText.value = samples.claritin.decodedText;
  manualOverrides.value = JSON.stringify(samples.claritin.manualOverrides, null, 2);
  cameraStatus.textContent = 'Claritin GS1 sample loaded.';
});

dayquilButton.addEventListener('click', () => {
  decodedText.value = samples.dayquil.decodedText;
  manualOverrides.value = JSON.stringify(samples.dayquil.manualOverrides, null, 2);
  cameraStatus.textContent = 'DayQuil barcode sample loaded.';
});

clearButton.addEventListener('click', () => {
  imageInput.value = '';
  decodedText.value = '';
  sourceImageUrl.value = '';
  manualOverrides.value = '{\n  "quantity": 18,\n  "shelfId": "Shelf-B2"\n}';
  preview.hidden = true;
  captureCanvas.hidden = true;
  capturedBlob = null;
  result.textContent = 'No response yet.';
  summary.textContent = 'Run a scan to see the parsed product, lot, and UI record.';
  warnings.textContent = 'No warnings yet.';
  cameraStatus.textContent = 'Cleared.';
});

runButton.addEventListener('click', async () => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    runButton.disabled = true;
    runButton.textContent = 'Resolving...';

    const browserDecoded = await tryBrowserDecode();
    if (browserDecoded?.rawValue && !decodedText.value.trim()) {
      decodedText.value = browserDecoded.rawValue;
      cameraStatus.textContent = `Using browser-decoded ${browserDecoded.format || 'code'} for the API request.`;
    }

    const hasDecodedText = Boolean(decodedText.value.trim());
    const hasSourceImageUrl = Boolean(sourceImageUrl.value.trim());
    let response;

    if (hasDecodedText || hasSourceImageUrl) {
      response = await fetch('/api/scan/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decodedText: decodedText.value.trim(),
          manualOverrides: manualOverrides.value.trim(),
          sourceImageUrl: hasDecodedText ? null : (sourceImageUrl.value.trim() || null)
        }),
        signal: controller.signal
      });
    } else {
      const formData = new FormData();
      const [file] = imageInput.files;

      if (capturedBlob) {
        formData.append('image', capturedBlob, 'camera-capture.jpg');
      } else if (file) {
        formData.append('image', file);
      }

      if (sourceImageUrl.value.trim()) {
        formData.append('sourceImageUrl', sourceImageUrl.value.trim());
      }

      if (manualOverrides.value.trim()) {
        formData.append('manualOverrides', manualOverrides.value.trim());
      }

      response = await fetch('/api/scan/resolve', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
    }

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message || 'Request failed.');
    }

    renderPayload(payload);
  } catch (error) {
    const message = error.name === 'AbortError'
      ? 'The request took too long. On Vercel, server image decoding is limited. Use decoded text, the sample buttons, or a known Blob URL that matches seed data.'
      : error.message;
    renderError(message);
  } finally {
    clearTimeout(timeoutId);
    runButton.disabled = false;
    runButton.textContent = 'Resolve scan';
  }
});
