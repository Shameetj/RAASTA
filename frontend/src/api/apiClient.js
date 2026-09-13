/**
 * RAASTA Mobile API Client
 * Primary Target: Dev1 backend
 * http://26.110.10.242:8000/api
 *
 * Dev1 forwards route calculations to Dev2.
 * Accessible rerouting can take several seconds because
 * Dev2 may need to query OSRM multiple times.
 */

const PRIMARY_URL = import.meta.env.VITE_API_URL || 'https://gear-holders-obituaries-fonts.trycloudflare.com/api';

const LOCAL_FALLBACK_URL =
  '/api';

const SERVER_ERROR_MESSAGE =
  'Unable to connect to RAASTA server. Please try again.';


async function resilientFetch(
  endpoint,
  options = {},
  timeoutMs = 10000
) {
  // ---------------------------------------------------------
  // 1. Primary Dev1 server
  // ---------------------------------------------------------

  try {
    const res = await fetch(
      `${PRIMARY_URL}${endpoint}`,
      {
        ...options,
        signal: AbortSignal.timeout(timeoutMs)
      }
    );

    if (res.ok) {
      return await res.json();
    }

    console.warn(
      `[RAASTA API] Primary server returned HTTP ${res.status}.`
    );
  } catch (err) {
    console.warn(
      `[RAASTA API] Primary server (${PRIMARY_URL}) unavailable:`,
      err
    );
  }

  // ---------------------------------------------------------
  // 2. Local fallback
  // ---------------------------------------------------------

  if (PRIMARY_URL !== LOCAL_FALLBACK_URL) {
    try {
      const resLocal = await fetch(
        `${LOCAL_FALLBACK_URL}${endpoint}`,
        {
          ...options,
          signal: AbortSignal.timeout(timeoutMs)
        }
      );

      if (resLocal.ok) {
        return await resLocal.json();
      }

      console.warn(
        `[RAASTA API] Local fallback returned HTTP ${resLocal.status}.`
      );
    } catch (errLocal) {
      console.warn(
        `[RAASTA API] Local fallback server (${LOCAL_FALLBACK_URL}) unavailable:`,
        errLocal
      );
    }
  }

  throw new Error(SERVER_ERROR_MESSAGE);
}


// -----------------------------------------------------------
// Locations
// -----------------------------------------------------------

export async function fetchLocations() {
  return await resilientFetch(
    '/locations',
    {
      headers: {
        'Accept': 'application/json'
      }
    },
    10000
  );
}


// -----------------------------------------------------------
// Blockages
// -----------------------------------------------------------

export async function fetchBlockages() {
  return await resilientFetch(
    '/blockages',
    {
      headers: {
        'Accept': 'application/json'
      }
    },
    10000
  );
}


// -----------------------------------------------------------
// Route calculation
//
// IMPORTANT:
// Accessible rerouting can take around 30+ seconds because
// Dev1 calls Dev2 and Dev2 may perform multiple OSRM requests.
//
// Therefore this request gets a 60-second timeout.
// -----------------------------------------------------------

export async function calculateRoute({
  start,
  destination,
  profile
}) {
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
    profile:
      profile === 'deaf'
        ? 'deaf'
        : 'wheelchair'
  };

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
    60000
  );
}


// -----------------------------------------------------------
// Report blockage
// -----------------------------------------------------------

export async function reportBlockage(
  blockageData
) {
  const lat =
    blockageData.latitude !== undefined
      ? Number(blockageData.latitude)
      : (
        blockageData.coordinates?.lat !== undefined
          ? Number(blockageData.coordinates.lat)
          : Number(
            blockageData.lat ?? 15.4900
          )
      );

  const lng =
    blockageData.longitude !== undefined
      ? Number(blockageData.longitude)
      : (
        blockageData.coordinates?.lng !== undefined
          ? Number(blockageData.coordinates.lng)
          : Number(
            blockageData.lng ?? 73.8270
          )
      );

  const payload = {
    type: (
      blockageData.type ||
      blockageData.category ||
      'stairs'
    ).toLowerCase(),

    title:
      blockageData.title ||
      'Integration Test Stairs',

    description:
      blockageData.description ||
      'Stairs blocking accessible path',

    latitude:
      !isNaN(lat)
        ? lat
        : 15.4900,

    longitude:
      !isNaN(lng)
        ? lng
        : 73.8270,

    severity: (() => {
      const severity = (
        blockageData.severity ||
        'high'
      ).toLowerCase();

      // Dev1 accepts only: low, medium, high.
      // The UI also has a CRITICAL option, so map it to high.
      if (severity === 'critical') {
        return 'high';
      }

      if (
        severity !== 'low' &&
        severity !== 'medium' &&
        severity !== 'high'
      ) {
        return 'high';
      }

      return severity;
    })()
  };

  return await resilientFetch(
    '/blockages',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    },
    10000
  );
}


// -----------------------------------------------------------
// Reset demo data
// -----------------------------------------------------------

export async function resetDemoData() {
  return await resilientFetch(
    '/demo/reset',
    {
      method: 'POST'
    },
    10000
  );
}

export async function deleteBlockage(blockageId) {
  if (!blockageId) {
    throw new Error('Blockage ID is required');
  }

  return await resilientFetch(`/blockages/${blockageId}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json'
    }
  });
}