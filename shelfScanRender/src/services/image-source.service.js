import axios from 'axios';

export async function fetchImageBufferFromUrl(sourceImageUrl) {
  if (!sourceImageUrl) return null;

  const response = await axios.get(sourceImageUrl, {
    responseType: 'arraybuffer',
    timeout: 5000,
    maxRedirects: 3,
    headers: {
      Accept: 'image/*,*/*;q=0.8',
      'User-Agent': 'ShelfSafeScanAPI/1.0'
    }
  });

  const contentType = String(response.headers?.['content-type'] || '');
  if (contentType && !contentType.startsWith('image/')) {
    throw new Error(`Source URL did not return an image. Received content-type: ${contentType}`);
  }

  return Buffer.from(response.data);
}
