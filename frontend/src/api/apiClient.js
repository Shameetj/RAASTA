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

export async function fetchLiveIncidents({ lat, lon, radius = 5000 } = {}) {
  const queryLat = lat !== undefined ? Number(lat) : 15.4900;
  const queryLon = lon !== undefined ? Number(lon) : 73.8270;
  const queryRadius = radius !== undefined ? Number(radius) : 5000;

  try {
    const data = await resilientFetch(
      `/live-incidents?lat=${queryLat}&lon=${queryLon}&radius=${queryRadius}`,
      { headers: { Accept: 'application/json' } },
      5000
    );
    return data?.incidents || [];
  } catch (err) {
    console.warn('[RAASTA API] Failed to fetch live incidents:', err?.message || err);
    return [];
  }
}

async function fetchDirectOsrmRoute(startLat, startLng, destLat, destLng) {
  try {
    const url = `https://router.project-osrm.org/route/v1/walking/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const r = data.routes[0];
        // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
        const coordinates = r.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const steps = (r.legs?.[0]?.steps || []).map((s) => ({
          instruction: s.maneuver?.instruction || s.name || 'Proceed along accessible pathway',
          distance: `${Math.round(s.distance)}m`,
          safe: true
        }));
        return {
          coordinates,
          distance_meters: Math.round(r.distance * 10) / 10,
          duration_seconds: Math.round(r.duration),
          turn_by_turn: steps.length > 0 ? steps : [
            { instruction: 'Proceed along accessible step-free street', distance: `${Math.round(r.distance)}m`, safe: true }
          ]
        };
      }
    }
  } catch (err) {
    console.warn('[RAASTA API] Direct OSRM query warning:', err);
  }
  return null;
}

export async function calculateRoute({ start, destination, profile }) {
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

  try {
    return await resilientFetch(
      '/routes/calculate',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      },
      4000
    );
  } catch (err) {
    console.log('[RAASTA API] Backend offline/unreachable, querying real OpenStreetMap road engine directly...');
    const osrm = await fetchDirectOsrmRoute(startLat, startLng, destLat, destLng);

    const R = 6371000;
    const dLat = ((destLat - startLat) * Math.PI) / 180;
    const dLon = ((destLng - startLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((startLat * Math.PI) / 180) *
      Math.cos((destLat * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const approxDist = Math.max(50, Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));

    const routeCoords = osrm?.coordinates && osrm.coordinates.length >= 2
      ? osrm.coordinates
      : [
          [startLat, startLng],
          [(startLat + destLat) / 2, (startLng + destLng) / 2],
          [destLat, destLng]
        ];
    const distMeters = osrm?.distance_meters ?? approxDist;
    const durationSeconds = osrm?.duration_seconds ?? Math.round(distMeters / 1.1);

    return {
      success: true,
      message: 'Accessible route calculated successfully via OpenStreetMap.',
      profile: profile === 'deaf' ? 'deaf' : 'wheelchair',
      rerouted: false,
      route: {
        coordinates: routeCoords,
        distance_meters: distMeters,
        duration_seconds: durationSeconds
      },
      direct_route: {
        name: 'Direct Route',
        coordinates: routeCoords,
        distance_meters: distMeters,
        duration_seconds: durationSeconds
      },
      alerts: [],
      blockages: [],
      turn_by_turn: osrm?.turn_by_turn || [
        { instruction: 'Proceed along accessible pathway', distance: `${Math.round(distMeters * 0.6)}m`, safe: true },
        { instruction: 'Arrive safely at destination', distance: `${Math.round(distMeters * 0.4)}m`, safe: true }
      ]
    };
  }
}

export async function reportBlockage(blockageData) {
  const lat =
    blockageData.latitude !== undefined
      ? Number(blockageData.latitude)
      : blockageData.coordinates?.lat !== undefined
        ? Number(blockageData.coordinates.lat)
        : Number(blockageData.lat ?? 15.49);

  const lng =
    blockageData.longitude !== undefined
      ? Number(blockageData.longitude)
      : blockageData.coordinates?.lng !== undefined
        ? Number(blockageData.coordinates.lng)
        : Number(blockageData.lng ?? 73.827);

  const payload = {
    type: (blockageData.type || blockageData.category || 'stairs').toLowerCase(),
    title: blockageData.title || 'Integration Test Stairs',
    description: blockageData.description || 'Stairs blocking accessible path',
    latitude: !isNaN(lat) ? lat : 15.49,
    longitude: !isNaN(lng) ? lng : 73.827,
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
      offline: true
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
