/**
 * RAASTA Mobile API Client
 * Primary Target: Dev1 backend
 *
 * Dev1 forwards route calculations to Dev2.
 * Accessible rerouting can take several seconds because
 * Dev2 may need to query OSRM multiple times.
 */

// Primary API base: Relative /api connects to local backend via Vite proxy
// and connects to Cloudflare Pages edge functions on cloud deployments.
const ENV_URL =
  import.meta.env.VITE_API_URL && !import.meta.env.VITE_API_URL.includes('onrender.com')
    ? import.meta.env.VITE_API_URL
    : null;

const CANDIDATE_URLS = [
  '/api',
  ...(ENV_URL && ENV_URL !== '/api' ? [ENV_URL] : [])
];

const SERVER_ERROR_MESSAGE =
  'Unable to connect to RAASTA server. Please try again.';

async function resilientFetch(
  endpoint,
  options = {},
  timeoutMs = 3000
) {
  let lastError = null;

  for (const baseUrl of CANDIDATE_URLS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(`${baseUrl}${endpoint}`, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }

      console.warn(`[RAASTA API] ${baseUrl} returned HTTP ${res.status}`);
    } catch (err) {
      console.warn(`[RAASTA API] ${baseUrl} unavailable:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error(SERVER_ERROR_MESSAGE);
}

export async function fetchLocations() {
  return await resilientFetch(
    '/locations',
    { headers: { Accept: 'application/json' } },
    10000
  );
}

export async function fetchBlockages() {
  try {
    return await resilientFetch(
      '/blockages',
      { headers: { Accept: 'application/json' } },
      5000
    );
  } catch (err) {
    console.warn('[RAASTA API] Backend offline, loading local blockages:', err);
    try {
      const stored = localStorage.getItem('raasta_local_blockages');
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return [];
  }
}

export async function fetchLiveIncidents({ lat, lon, radius = 5000, limit = 15 } = {}) {
  if (lat == null || lon == null || isNaN(Number(lat)) || isNaN(Number(lon))) {
    // Do not silently query demo coordinates when real location is unavailable
    return [];
  }

  const queryLat = Number(lat);
  const queryLon = Number(lon);
  const queryRadius = Number(radius) || 5000;
  const queryLimit = Math.max(3, Math.min(Number(limit) || 15, 25));

  try {
    const data = await resilientFetch(
      `/live-incidents?lat=${queryLat}&lon=${queryLon}&radius=${queryRadius}&limit=${queryLimit}`,
      { headers: { Accept: 'application/json' } },
      4000
    );
    return data?.incidents || [];
  } catch (err) {
    console.warn('[RAASTA API] Failed to fetch live incidents:', err?.message || err);
    return [];
  }
}

export async function calculateRoute({ start, destination, profile, blockages = [] }) {
  const startLat =
    typeof start === 'object'
      ? Number(start.latitude ?? start.lat)
      : Number(start);

  const startLng =
    typeof start === 'object'
      ? Number(start.longitude ?? start.lng)
      : Number(start);

  const destLat =
    typeof destination === 'object'
      ? Number(destination.latitude ?? destination.lat)
      : Number(destination);

  const destLng =
    typeof destination === 'object'
      ? Number(destination.longitude ?? destination.lng)
      : Number(destination);

  if (isNaN(startLat) || isNaN(startLng) || isNaN(destLat) || isNaN(destLng)) {
    throw new Error('Current location unavailable. Please enable location access.');
  }

  const payload = {
    start: {
      latitude: startLat,
      longitude: startLng
    },
    destination: {
      latitude: destLat,
      longitude: destLng
    },
    profile: profile === 'deaf' ? 'deaf' : 'wheelchair',
    blockages
  };

  // Debug logging start
  console.log('[RAASTA DEBUG] FRONTEND ROUTE REQUEST START');
  console.log('[RAASTA DEBUG] FRONTEND REQUEST URL: /routes/calculate');
  console.log('[RAASTA DEBUG] FRONTEND REQUEST PAYLOAD:', payload);
  const routeStartTime = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  let response;
  let result;
  try {
    response = await fetch('/routes/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    console.log('[RAASTA DEBUG] FRONTEND RESPONSE RECEIVED');
    console.log('[RAASTA DEBUG] FRONTEND RESPONSE STATUS:', response.status);
    const responseTime = Date.now() - routeStartTime;
    console.log('[RAASTA DEBUG] FRONTEND RESPONSE TIME:', responseTime, 'ms');
    result = await response.json();
    console.log('[RAASTA DEBUG] FRONTEND RESPONSE BODY:', result);
    console.log('[RAASTA DEBUG] FRONTEND ROUTE REQUEST SUCCESS');
  } catch (err) {
    console.error('[RAASTA DEBUG] FRONTEND ROUTE REQUEST ERROR', err);
    console.log('[RAASTA DEBUG] FRONTEND ROUTE REQUEST FINISHED');
    clearTimeout(timeoutId);
    throw err;
  } finally {
    clearTimeout(timeoutId);
    console.log('[RAASTA DEBUG] FRONTEND ROUTE REQUEST FINISHED');
  }
  // End of debug logging
  return result;
}

export async function reportBlockage(blockageData) {
  const lat =
    blockageData.latitude !== undefined
      ? Number(blockageData.latitude)
      : blockageData.coordinates?.lat !== undefined
        ? Number(blockageData.coordinates.lat)
        : Number(blockageData.lat);

  const lng =
    blockageData.longitude !== undefined
      ? Number(blockageData.longitude)
      : blockageData.coordinates?.lng !== undefined
        ? Number(blockageData.coordinates.lng)
        : Number(blockageData.lng);

  if (isNaN(lat) || isNaN(lng) || lat == null || lng == null) {
    throw new Error('Current location unavailable. Please enable location access.');
  }

  const payload = {
    type: (blockageData.type || blockageData.category || 'stairs').toLowerCase(),
    title: blockageData.title || 'Obstacle Report',
    description: blockageData.description || 'Obstacle blocking accessible path',
    latitude: lat,
    longitude: lng,
    severity: (() => {
      const severity = (blockageData.severity || 'high').toLowerCase();
      if (severity === 'critical') return 'high';
      if (!['low', 'medium', 'high'].includes(severity)) return 'high';
      return severity;
    })()
  };

  try {
    return await resilientFetch(
      '/blockages',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      },
      6000
    );
  } catch (err) {
    console.warn('[RAASTA API] Backend offline, saving blockage locally:', err);
    const localId = `local-${Date.now()}`;
    const newBlockage = {
      id: localId,
      ...payload
    };
    try {
      const stored = localStorage.getItem('raasta_local_blockages');
      const list = stored ? JSON.parse(stored) : [];
      list.unshift(newBlockage);
      localStorage.setItem('raasta_local_blockages', JSON.stringify(list));
    } catch (e) {}
    return {
      success: true,
      id: localId,
      blockage: newBlockage,
      offline: true,
      message: 'Saved locally. Not submitted to the RAASTA server.'
    };
  }
}

export async function resetDemoData() {
  try {
    return await resilientFetch('/demo/reset', { method: 'POST' }, 5000);
  } catch (e) {
    localStorage.removeItem('raasta_local_blockages');
    return { success: true };
  }
}

export async function deleteBlockage(blockageId) {
  if (!blockageId) {
    throw new Error('Blockage ID is required');
  }

  try {
    return await resilientFetch(`/blockages/${blockageId}`, {
      method: 'DELETE',
      headers: { Accept: 'application/json' }
    }, 5000);
  } catch (err) {
    console.warn('[RAASTA API] Backend offline, removing blockage locally:', err);
    try {
      const stored = localStorage.getItem('raasta_local_blockages');
      if (stored) {
        const list = JSON.parse(stored).filter(b => String(b.id) !== String(blockageId));
        localStorage.setItem('raasta_local_blockages', JSON.stringify(list));
      }
    } catch (e) {}
    return { success: true, deleted: blockageId, offline: true };
  }
}
