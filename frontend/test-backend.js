/**
 * RAASTA Backend Connection & API Integration Tester
 * Tests GET /api/blockages and POST /api/routes/calculate
 * 
 * Usage:
 *   node test-backend.js
 *   node test-backend.js http://<DEV1-RADMIN-VPN-IP>:8000/api
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Resolve API URL from CLI arg, .env file, or default
function resolveApiUrl() {
  if (process.argv[2]) {
    return process.argv[2].replace(/\/+$/, '');
  }

  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/VITE_API_URL\s*=\s*(.+)/);
    if (match && match[1]) {
      return match[1].trim().replace(/['"\r\n]/g, '').replace(/\/+$/, '');
    }
  }

  return 'http://localhost:8000/api';
}

const BASE_URL = resolveApiUrl();

console.log('\n======================================================');
console.log('  RAASTA Backend Connection Diagnostic Tool');
console.log('======================================================');
console.log(` Target API Endpoint: \x1b[36m${BASE_URL}\x1b[0m\n`);

async function runTests() {
  let passedCount = 0;
  let totalCount = 0;

  // ----------------------------------------------------
  // TEST 1: GET /api/blockages
  // ----------------------------------------------------
  totalCount++;
  console.log('------------------------------------------------------');
  console.log(`[TEST 1] Testing GET ${BASE_URL}/blockages ...`);
  try {
    const startT = performance.now();
    const res = await fetch(`${BASE_URL}/blockages`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(4000)
    });
    const latency = Math.round(performance.now() - startT);

    if (res.ok) {
      const data = await res.json();
      console.log(`\x1b[32m✔ SUCCESS (${res.status} OK)\x1b[0m in ${latency}ms`);
      console.log(`  Received Blockages (${Array.isArray(data) ? data.length : 'Object'} items):`);
      console.log('\x1b[90m' + JSON.stringify(data, null, 2) + '\x1b[0m');
      passedCount++;
    } else {
      console.log(`\x1b[31m✖ FAILED (HTTP ${res.status} ${res.statusText})\x1b[0m`);
      const body = await res.text();
      console.log('  Response body:', body);
    }
  } catch (err) {
    console.log(`\x1b[31m✖ CONNECTION ERROR\x1b[0m: ${err.message}`);
    console.log('  \x1b[33mTip:\x1b[0m Verify backend is running on Dev1 machine / Radmin VPN and update frontend/.env:');
    console.log('       VITE_API_URL=http://<DEV1-RADMIN-VPN-IP>:8000/api');
  }

  // ----------------------------------------------------
  // TEST 2: POST /api/routes/calculate
  // ----------------------------------------------------
  totalCount++;
  console.log('\n------------------------------------------------------');
  console.log(`[TEST 2] Testing POST ${BASE_URL}/routes/calculate (Dev2 Route Engine) ...`);
  const routePayload = {
    start: {
      latitude: 28.6328,
      longitude: 77.2197
    },
    destination: {
      latitude: 28.6345,
      longitude: 77.2185
    },
    profile: 'wheelchair'
  };

  try {
    const startT = performance.now();
    const res = await fetch(`${BASE_URL}/routes/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(routePayload),
      signal: AbortSignal.timeout(5000)
    });
    const latency = Math.round(performance.now() - startT);

    if (res.ok) {
      const data = await res.json();
      console.log(`\x1b[32m✔ SUCCESS (${res.status} OK)\x1b[0m in ${latency}ms`);
      console.log('  Received Route Calculation Response:');
      console.log('\x1b[90m' + JSON.stringify(data, null, 2) + '\x1b[0m');
      if (data.route?.coordinates) {
        console.log(`  \x1b[32m✔ Route Points:\x1b[0m ${data.route.coordinates.length} waypoints`);
      }
      if (data.route?.distance_meters) {
        console.log(`  \x1b[32m✔ Distance:\x1b[0m ${data.route.distance_meters}m | Duration: ${data.route.duration_seconds}s`);
      }
      if (data.rerouted !== undefined) {
        console.log(`  \x1b[32m✔ Rerouted around Blockage:\x1b[0m ${data.rerouted}`);
      }
      passedCount++;
    } else if (res.status === 404) {
      console.log(`\x1b[33m⏳ PENDING DEV2 DEPLOYMENT (HTTP 404 Not Found)\x1b[0m in ${latency}ms`);
      console.log('  The /routes/calculate endpoint is not yet exposed by Dev2.');
    } else {
      console.log(`\x1b[31m✖ FAILED (HTTP ${res.status} ${res.statusText})\x1b[0m`);
      const body = await res.text();
      console.log('  Response body:', body);
    }
  } catch (err) {
    console.log(`\x1b[31m✖ CONNECTION ERROR\x1b[0m: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 3: POST /api/blockages (Barrier Reporting)
  // ----------------------------------------------------
  totalCount++;
  console.log('\n------------------------------------------------------');
  console.log(`[TEST 3] Testing POST ${BASE_URL}/blockages (Report Barrier) ...`);
  const reportPayload = {
    title: 'Damaged Tactile Paving on Crosswalk',
    type: 'broken_ramp',
    severity: 'medium',
    latitude: 28.6335,
    longitude: 77.2190,
    description: 'Cracked tactile yellow pavers causing wheelchair wheel lock.'
  };

  try {
    const startT = performance.now();
    const res = await fetch(`${BASE_URL}/blockages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(reportPayload),
      signal: AbortSignal.timeout(4000)
    });
    const latency = Math.round(performance.now() - startT);

    if (res.ok || res.status === 201) {
      const data = await res.json();
      console.log(`\x1b[32m✔ SUCCESS (${res.status})\x1b[0m in ${latency}ms`);
      console.log('  Submitted Barrier Response:');
      console.log('\x1b[90m' + JSON.stringify(data, null, 2) + '\x1b[0m');
      passedCount++;
    } else {
      console.log(`\x1b[31m✖ FAILED (HTTP ${res.status} ${res.statusText})\x1b[0m`);
    }
  } catch (err) {
    console.log(`\x1b[31m✖ CONNECTION ERROR\x1b[0m: ${err.message}`);
  }

  console.log('\n======================================================');
  console.log(` Summary: ${passedCount}/${totalCount} Endpoints Verified Active`);
  console.log('======================================================\n');
}

runTests();
