import { put } from '@vercel/blob';

function safeName(name = 'file') {
  return String(name)
    .replace(/\\/g, '/')
    .split('/')
    .pop()
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .slice(0, 120) || 'file';
}

/**
 * Upload a buffer to Vercel Blob and return a public URL.
 * Requires env: BLOB_READ_WRITE_TOKEN
 */
export async function uploadBufferToBlob({ buffer, filename, contentType, prefix = 'uploads' }) {
  if (!buffer) throw new Error('Missing buffer');

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "Vercel Blob: No token found. Set BLOB_READ_WRITE_TOKEN in backend/.env (local) or Vercel env vars (prod)."
    );
  }

  const ts = Date.now();
  const clean = safeName(filename);
  const pathname = `${prefix}/${ts}-${clean}`;

  const { url } = await put(pathname, buffer, {
    access: 'public',
    contentType: contentType || 'application/octet-stream',
    token,
  });

  return url;
}
