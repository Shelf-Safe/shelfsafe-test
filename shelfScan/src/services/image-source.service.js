import axios from 'axios';

export async function fetchImageBufferFromUrl(sourceImageUrl) {
  if (!sourceImageUrl) return null;

  const response = await axios.get(sourceImageUrl, {
    responseType: 'arraybuffer',
    timeout: 8000,
    maxRedirects: 3
  });

  const contentType = String(response.headers?.['content-type'] || '');
  if (contentType && !contentType.startsWith('image/')) {
    throw new Error(`Source URL did not return an image. Received content-type: ${contentType}`);
  }

  return Buffer.from(response.data);
}
