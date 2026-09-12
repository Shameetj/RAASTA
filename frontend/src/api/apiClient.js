/**
 * RAASTA Mobile API Client
 * Primary Target: POST http://26.110.10.242:8000/api/routes/calculate
 * Resilient Local Fallback: http://localhost:8000/api
 */

const PRIMARY_URL = import.meta.env.VITE_API_URL || 'http://26.110.10.242:8000/api';
const LOCAL_FALLBACK_URL = 'http://localhost:8000/api';
const SERVER_ERROR_MESSAGE = 'Unable to connect to RAASTA server. Please try again.';

async function resilientFetch(endpoint, options = {}, timeoutMs = 3500) {
  // 1. Primary Target (e.g. Dev2 at http://26.110.10.242:8000/api)
  try {
    const res = await fetch(`${PRIMARY_URL}${endpoint}`, {
      ...options,
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn(`[RAASTA API] Primary server (${PRIMARY_URL}) unreachable, checking local fallback...`);
  }

  // 2. Local Fallback (http://localhost:8000/api)
  if (PRIMARY_URL !== LOCAL_FALLBACK_URL) {
    try {
      const resLocal = await fetch(`${LOCAL_FALLBACK_URL}${endpoint}`, {
        ...options,
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (resLocal.ok) {
        return await resLocal.json();
      }
    } catch (errLocal) {
      console.warn(`[RAASTA API] Local fallback server (${LOCAL_FALLBACK_URL}) unreachable.`);
    }
  }

  throw new Error(SERVER_ERROR_MESSAGE);
}

export async function fetchLocations() {
  return await resilientFetch('/locations', {
    headers: { 'Accept': 'application/json' }
  });
}

export async function fetchBlockages() {
  return await resilientFetch('/blockages', {
    headers: { 'Accept': 'application/json' }
  });
}

export async function calculateRoute({ start, destination, profile }) {
  const startLat = typeof start === 'object' ? Number(start.latitude ?? start.lat) : Number(start);
  const startLng = typeof start === 'object' ? Number(start.longitude ?? start.lng) : Number(start);
  const destLat = typeof destination === 'object' ? Number(destination.latitude ?? destination.lat) : Number(destination);
  const destLng = typeof destination === 'object' ? Number(destination.longitude ?? destination.lng) : Number(destination);

  const payload = {
    start: {
      latitude: startLat,
      longitude: startLng
    },
    destination: {
      latitude: destLat,
      longitude: destLng
    },
    profile: profile === 'deaf' ? 'deaf' : 'wheelchair'
  };

  return await resilientFetch('/routes/calculate', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  }, 5000);
}

export async function reportBlockage(blockageData) {
  const lat = blockageData.latitude !== undefined 
    ? Number(blockageData.latitude)
    : (blockageData.coordinates?.lat !== undefined ? Number(blockageData.coordinates.lat) : Number(blockageData.lat ?? 15.4900));

  const lng = blockageData.longitude !== undefined
    ? Number(blockageData.longitude)
    : (blockageData.coordinates?.lng !== undefined ? Number(blockageData.coordinates.lng) : Number(blockageData.lng ?? 73.8270));

  const payload = {
    type: (blockageData.type || blockageData.category || 'stairs').toLowerCase(),
    title: blockageData.title || 'Integration Test Stairs',
    description: blockageData.description || 'Stairs blocking accessible path',
    latitude: !isNaN(lat) ? lat : 15.4900,
    longitude: !isNaN(lng) ? lng : 73.8270,
    severity: (blockageData.severity || 'high').toLowerCase()
  };

  return await resilientFetch('/blockages', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  }, 5000);
}

export async function resetDemoData() {
  return await resilientFetch('/demo/reset', { 
    method: 'POST' 
  }, 3000);
}
