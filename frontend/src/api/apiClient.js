/**
 * RAASTA Mobile API Client
 * Real Backend Connection & Strict Error Handling
 */

const BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const SERVER_ERROR_MESSAGE = 'Unable to connect to RAASTA server. Please try again.';

export async function fetchLocations() {
  try {
    const res = await fetch(`${BASE_URL}/locations`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error('[API Error] GET /locations failed:', err);
    throw new Error(SERVER_ERROR_MESSAGE);
  }
}

export async function fetchBlockages() {
  try {
    const res = await fetch(`${BASE_URL}/blockages`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error('[API Error] GET /blockages failed:', err);
    throw new Error(SERVER_ERROR_MESSAGE);
  }
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

  try {
    const res = await fetch(`${BASE_URL}/routes/calculate`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error('[API Error] POST /routes/calculate failed:', err);
    throw new Error(SERVER_ERROR_MESSAGE);
  }
}

export async function reportBlockage(blockageData) {
  try {
    const res = await fetch(`${BASE_URL}/blockages`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(blockageData),
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error('[API Error] POST /blockages failed:', err);
    throw new Error(SERVER_ERROR_MESSAGE);
  }
}

export async function resetDemoData() {
  try {
    const res = await fetch(`${BASE_URL}/demo/reset`, { 
      method: 'POST', 
      signal: AbortSignal.timeout(3000) 
    });
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  } catch (err) {
    console.error('[API Error] POST /demo/reset failed:', err);
    throw new Error(SERVER_ERROR_MESSAGE);
  }
}
