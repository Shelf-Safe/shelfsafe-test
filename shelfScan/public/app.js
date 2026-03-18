const imageInput = document.getElementById('imageInput');
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

imageInput.addEventListener('change', () => {
  const [file] = imageInput.files;
  capturedBlob = null;
  captureCanvas.hidden = true;
  setImagePreviewFromFile(file);
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
  if (!cameraStream) {
    return;
  }

  const width = cameraPreview.videoWidth || 1280;
  const height = cameraPreview.videoHeight || 720;
  captureCanvas.width = width;
  captureCanvas.height = height;
  const ctx = captureCanvas.getContext('2d');
  ctx.drawImage(cameraPreview, 0, 0, width, height);
  captureCanvas.hidden = false;
  preview.hidden = true;

  capturedBlob = await new Promise((resolve) => captureCanvas.toBlob(resolve, 'image/jpeg', 0.95));
  cameraStatus.textContent = 'Frame captured. Resolve scan to send this image to the API.';
}

startCameraButton.addEventListener('click', startCamera);
captureButton.addEventListener('click', captureFrame);
stopCameraButton.addEventListener('click', stopCamera);

claritinButton.addEventListener('click', () => {
  decodedText.value = samples.claritin.decodedText;
  manualOverrides.value = JSON.stringify(samples.claritin.manualOverrides, null, 2);
});

dayquilButton.addEventListener('click', () => {
  decodedText.value = samples.dayquil.decodedText;
  manualOverrides.value = JSON.stringify(samples.dayquil.manualOverrides, null, 2);
});

clearButton.addEventListener('click', () => {
  imageInput.value = '';
  decodedText.value = '';
  manualOverrides.value = '{\n  "quantity": 18,\n  "shelfId": "Shelf-B2"\n}';
  preview.hidden = true;
  captureCanvas.hidden = true;
  capturedBlob = null;
  result.textContent = 'No response yet.';
  summary.textContent = 'Run a scan to see the parsed product, lot, and UI record.';
  warnings.textContent = 'No warnings yet.';
});

runButton.addEventListener('click', async () => {
  try {
    runButton.disabled = true;
    runButton.textContent = 'Resolving...';

    const formData = new FormData();
    const [file] = imageInput.files;

    if (capturedBlob) {
      formData.append('image', capturedBlob, 'camera-capture.jpg');
    } else if (file) {
      formData.append('image', file);
    }

    if (decodedText.value.trim()) {
      formData.append('decodedText', decodedText.value.trim());
    }

    if (manualOverrides.value.trim()) {
      formData.append('manualOverrides', manualOverrides.value.trim());
    }

    const response = await fetch('/api/scan/resolve', {
      method: 'POST',
      body: formData
    });

    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.message || 'Request failed.');
    }

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
  } catch (error) {
    result.textContent = error.message;
    summary.textContent = 'Request failed.';
    warnings.innerHTML = `<div class="warning">• ${error.message}</div>`;
  } finally {
    runButton.disabled = false;
    runButton.textContent = 'Resolve scan';
  }
});
