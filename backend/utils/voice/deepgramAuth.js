export async function createDeepgramAccessToken({ ttlSeconds = 300 } = {}) {
  const apiKey = String(process.env.DEEPGRAM_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('Deepgram API key is missing on the backend.');
  }

  const normalizedTtl = Math.max(30, Math.min(3600, Number(ttlSeconds) || 300));
  const response = await fetch('https://api.deepgram.com/v1/auth/grant', {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ttl_seconds: normalizedTtl }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Deepgram token grant failed (${response.status}): ${errorText || 'No response body.'}`);
  }

  const json = await response.json();
  const accessToken = String(json?.access_token || '').trim();
  if (!accessToken) {
    throw new Error('Deepgram did not return an access token.');
  }

  return {
    accessToken,
    expiresIn: Number(json?.expires_in) || normalizedTtl,
    credentialType: 'temporary_token',
    credentialScheme: 'bearer',
  };
}
