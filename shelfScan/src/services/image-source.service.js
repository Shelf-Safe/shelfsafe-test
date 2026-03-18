import axios from 'axios';

export async function fetchImageBufferFromUrl(url) {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 15000,
    maxRedirects: 5
  });

  return {
    buffer: Buffer.from(response.data),
    contentType: response.headers['content-type'] || 'application/octet-stream'
  };
}
