import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

function safeFilename(name = 'scan-image') {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-');
}

export async function writeBufferToTmp({ buffer, filename }) {
  if (!buffer) {
    return null;
  }

  const dir = path.join(os.tmpdir(), 'shelfsafe-scan-api', 'barcodes');
  await fs.mkdir(dir, { recursive: true });
  const finalPath = path.join(dir, `${Date.now()}-${safeFilename(filename || 'scan-image.jpg')}`);
  await fs.writeFile(finalPath, buffer);

  return {
    path: finalPath,
    dir
  };
}
