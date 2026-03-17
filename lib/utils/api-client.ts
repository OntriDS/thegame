/**
 * TheGame M2M API Client
 * Securely communicates with Pixelbrain and other Digital Universe services.
 */

const PIXELBRAIN_URL = process.env.NEXT_PUBLIC_PIXELBRAIN_URL || 'https://pixelbrain-app.vercel.app';

export async function callPixelbrain(endpoint: string, options: RequestInit = {}) {
  const apiKey = process.env.PIXELBRAIN_M2M_KEY;
  
  if (!apiKey) {
    console.warn('[M2M] PIXELBRAIN_M2M_KEY not configured');
  }

  const response = await fetch(`${PIXELBRAIN_URL}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'x-m2m-app': 'thegame'
    }
  });

  return response;
}
