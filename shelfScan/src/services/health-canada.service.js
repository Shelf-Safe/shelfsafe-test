import axios from 'axios';
import { env } from '../config/env.js';

const client = axios.create({
  baseURL: env.healthCanadaApiBase,
  timeout: 15000
});

export async function fetchDrugProductById(healthCanadaDrugProductId) {
  if (!healthCanadaDrugProductId) {
    return null;
  }

  const response = await client.get('/drugproduct/', {
    params: {
      id: healthCanadaDrugProductId,
      lang: 'en',
      type: 'json'
    }
  });

  const data = response.data;

  if (Array.isArray(data)) {
    return data[0] || null;
  }

  if (data && typeof data === 'object') {
    return data;
  }

  return null;
}
