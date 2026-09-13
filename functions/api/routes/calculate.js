/**
 * Cloudflare Pages Function: Route Proxy to Dev2 / Dev1 Backend
 * Authoritative Path: React -> CF Pages -> Dev2 Routing Engine -> React
 */

export async function onRequestPost(context) {
  const startTime = Date.now();
  let body;
  try {
    body = await context.request.json();
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const dev2Url = context.env?.DEV2_URL || 'https://raasta-dev2.onrender.com';
  const dev1Url = context.env?.DEV1_URL || 'https://raasta-dev1.onrender.com';

  const dev2Payload = {
    start: body.start,
    destination: body.destination,
    profile: body.profile || 'wheelchair',
    active_blockages: Array.isArray(body.blockages) ? body.blockages : (body.active_blockages || [])
  };

  // 1. Primary path: Direct to Developer 2 Routing Engine (Lightning-fast ~600ms)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(`${dev2Url}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dev2Payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success) {
        return new Response(JSON.stringify(data), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
    }
  } catch (dev2Err) {
    console.warn('[RAASTA CF] Dev2 primary route failed:', dev2Err.message);
  }

  // 2. Secondary fallback: Dev1 route endpoint
  try {
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 12000);

    const res2 = await fetch(`${dev1Url}/api/routes/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller2.signal
    });
    clearTimeout(timeoutId2);

    if (res2.ok) {
      const data2 = await res2.json();
      return new Response(JSON.stringify(data2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  } catch (dev1Err) {
    console.error('[RAASTA CF] Dev1 fallback error:', dev1Err.message);
  }

  return new Response(JSON.stringify({
    success: false,
    message: 'RAASTA accessibility routing engine unavailable. Please try again in a moment.'
  }), {
    status: 503,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
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
