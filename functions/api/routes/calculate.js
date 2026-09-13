/**
 * Cloudflare Pages Function: Route Proxy to Dev1 Backend
 * Authoritative Path: React -> Dev1 -> Dev2 -> OSRM -> React
 */

export async function onRequestPost(context) {
    // DEBUG: request trace start
  console.log('[RAASTA DEBUG] CF REQUEST START');
  const startTime = Date.now();
  let body;
  try {
    body = await context.request.json();
    console.log('[RAASTA DEBUG] CF REQUEST BODY:', body);
  } catch (err) {
    console.error('[RAASTA DEBUG] CF ERROR', err);
    return new Response(JSON.stringify({ success: false, message: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const dev1Url = context.env?.DEV1_URL || 'https://raasta-dev1.onrender.com';
  console.log('[RAASTA DEBUG] CF FORWARDING TO DEV1', dev1Url);

  let res;
  try {
    res = await fetch(`${dev1Url}/api/routes/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    console.log('[RAASTA DEBUG] CF DEV1 RESPONSE STATUS:', res.status);
  } catch (err) {
    console.error('[RAASTA DEBUG] CF ERROR', err);
    return new Response(JSON.stringify({ success: false, message: 'Backend request failed' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  let data;
  try {
    data = await res.json();
    console.log('[RAASTA DEBUG] CF DEV1 RESPONSE BODY:', data);
  } catch (err) {
    console.error('[RAASTA DEBUG] CF ERROR', err);
    return new Response(JSON.stringify({ success: false, message: 'Invalid backend response' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const duration = Date.now() - startTime;
  console.log('[RAASTA DEBUG] CF TOTAL DURATION:', duration);

  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

// OPTIONS handler for CORS preflight
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  });
}
