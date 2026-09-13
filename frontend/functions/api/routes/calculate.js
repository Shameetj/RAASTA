/**
 * Cloudflare Pages Function: Route Proxy to Dev1 Backend
 * Authoritative Path: React -> Dev1 -> Dev2 -> OSRM -> React
 */

export async function onRequestPost(context) {
  try {
    console.log('[RAASTA DEBUG] Cloudflare function /api/routes/calculate received');
    const startTime = Date.now();
    const body = await context.request.json();
    console.log('[RAASTA DEBUG] Request body:', body);
    const dev1Url = context.env?.DEV1_URL || 'https://raasta-dev1.onrender.com';
    console.log('[RAASTA DEBUG] Forwarding request to Dev1 at', dev1Url);

    const dev1Start = Date.now();
    const res = await fetch(`${dev1Url}/api/routes/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });
    const dev1Duration = Date.now() - dev1Start;
    console.log('[RAASTA DEBUG] Dev1 response status:', res.status, 'duration ms:', dev1Duration);
    const data = await res.json();
    console.log('[RAASTA DEBUG] Dev1 response JSON:', data);
    console.log('[RAASTA DEBUG] Total Cloudflare duration (ms):', Date.now() - startTime);
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err) {
    console.error('[RAASTA DEBUG] Cloudflare function error:', err);
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
