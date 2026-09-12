/**
 * RAASTA Mobile API Client
 * Connects to Backend API (`http://localhost:8000/api`) with resilient offline fallback
 */

const BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export async function fetchLocations() {
  try {
    const res = await fetch(`${BASE_URL}/locations`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[API] Using offline fallback for locations');
  }
  return null; // Signals fallback to local data
}

export async function fetchBlockages() {
  try {
    const res = await fetch(`${BASE_URL}/blockages`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[API] Using offline fallback for blockages');
  }
  return null;
}

export async function calculateRoute({ start, destination, profile }) {
  try {
    const res = await fetch(`${BASE_URL}/routes/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ start, destination, profile }),
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[API] Using offline fallback for route calculation');
  }
  return null;
}

export async function reportBlockage(blockageData) {
  try {
    const res = await fetch(`${BASE_URL}/blockages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blockageData),
      signal: AbortSignal.timeout(2000)
    });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[API] Using local state for barrier report');
  }
  return { success: true, id: `barr-${Date.now()}`, ...blockageData };
}

export async function resetDemoData() {
  try {
    const res = await fetch(`${BASE_URL}/demo/reset`, { method: 'POST', signal: AbortSignal.timeout(1500) });
    if (res.ok) return await res.json();
  } catch (err) {
    console.warn('[API] Local reset active');
  }
  return { success: true };
}
