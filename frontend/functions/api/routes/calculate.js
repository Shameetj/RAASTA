/**
 * Cloudflare Pages Function: Route Proxy to Dev1 / Dev2 Backend
 * Authoritative Path: React -> CF Pages -> Dev1 (with instant fallback to Dev2) -> React
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

  const dev1Url = context.env?.DEV1_URL || 'https://raasta-dev1.onrender.com';
  const dev2Url = context.env?.DEV2_URL || 'https://raasta-dev2.onrender.com';

  // 1. Try Dev1 backend first with an 8-second timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${dev1Url}/api/routes/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
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
  } catch (dev1Err) {
    console.warn('[RAASTA CF] Dev1 unreachable or timed out, routing directly to Dev2:', dev1Err.message);
  }

  // 2. Resilient fallback directly to Dev2 routing engine
  try {
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 25000);

    const dev2Payload = {
      start: body.start,
      destination: body.destination,
      profile: body.profile || 'wheelchair',
      active_blockages: Array.isArray(body.blockages) ? body.blockages : (body.active_blockages || [])
    };

    const res2 = await fetch(`${dev2Url}/route`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dev2Payload),
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
  } catch (dev2Err) {
    console.error('[RAASTA CF] Dev2 routing fallback error:', dev2Err);
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
