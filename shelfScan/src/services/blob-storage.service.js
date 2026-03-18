import { put } from '@vercel/blob';
import path from 'node:path';
import { env } from '../config/env.js';

function sanitizeFilename(name = 'scan-image') {
  const ext = path.extname(name) || '.jpg';
  const base = path.basename(name, ext).replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'scan-image';
  return `${base}${ext.toLowerCase()}`;
}

export function canUseBlobUploads() {
  return Boolean(env.blobReadWriteToken && env.uploadScansToBlob);
}

export async function uploadScanToBlob({ buffer, filename, contentType }) {
  if (!canUseBlobUploads()) {
    return null;
  }

  const safeName = sanitizeFilename(filename);
  const pathname = `${env.scanBlobFolder}/${Date.now()}-${safeName}`;

  const blob = await put(pathname, buffer, {
    access: 'public',
    addRandomSuffix: true,
    contentType: contentType || 'application/octet-stream',
    token: env.blobReadWriteToken
  });

  return {
    url: blob.url,
    pathname: blob.pathname,
    contentType: blob.contentType,
    contentDisposition: blob.contentDisposition
  };
}
