/**
 * Cloudflare Pages Function: Live Incidents Proxy to Authoritative Dev1 Backend
 */

export async function onRequestGet(context) {
  try {
    const url = new URL(context.request.url);
    const lat = url.searchParams.get('lat');
    const lon = url.searchParams.get('lon');
    const radius = url.searchParams.get('radius') || '5000';
    const limit = url.searchParams.get('limit') || '15';

    if (!lat || !lon) {
      return new Response(JSON.stringify({
        incidents: [],
        count: 0,
        status: 'no_location',
        message: 'Coordinates required for live incidents query'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const dev1Url = context.env?.DEV1_URL || 'https://raasta-dev1.onrender.com';
    const res = await fetch(`${dev1Url}/api/live-incidents?lat=${lat}&lon=${lon}&radius=${radius}&limit=${limit}`);
    
    if (res.ok) {
      const data = await res.json();
      return new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    return new Response(JSON.stringify({
      incidents: [],
      count: 0,
      status: 'unavailable'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      incidents: [],
      count: 0,
      status: 'error',
      message: err.message
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept'
    }
  });
}
