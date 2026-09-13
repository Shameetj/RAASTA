/**
 * Cloudflare Pages Function: Route Proxy to Dev1 Backend
 * Authoritative Path: React -> Dev1 -> Dev2 -> OSRM -> React
 */

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    const dev1Url = context.env?.DEV1_URL || 'https://raasta-dev1.onrender.com';

    const res = await fetch(`${dev1Url}/api/routes/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({
      success: false,
      message: 'RAASTA accessibility routing engine unavailable. Real route calculation required.'
    }), {
      status: 503,
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
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept'
    }
  });
}
