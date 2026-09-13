/**
 * Cloudflare Pages Function: Live Road Incidents (TomTom Proxy)
 * Endpoint: /api/live-incidents?lat={lat}&lon={lon}&radius={radius}
 */

function calculateBoundingBox(lat, lon, radiusMeters) {
  const deltaLat = radiusMeters / 111000.0;
  const deltaLon = radiusMeters / (111000.0 * Math.max(Math.cos((lat * Math.PI) / 180.0), 0.01));
  const minLat = (lat - deltaLat).toFixed(6);
  const maxLat = (lat + deltaLat).toFixed(6);
  const minLon = (lon - deltaLon).toFixed(6);
  const maxLon = (lon + deltaLon).toFixed(6);
  return `${minLon},${minLat},${maxLon},${maxLat}`;
}

function mapCategory(iconCategory) {
  switch (iconCategory) {
    case 0: return { type: 'hazard', severity: 'medium', label: 'Unknown Hazard' };
    case 1: return { type: 'accident', severity: 'high', label: 'Traffic Accident' };
    case 2: return { type: 'traffic', severity: 'medium', label: 'Fog / Weather' };
    case 3: return { type: 'hazard', severity: 'medium', label: 'Dangerous Conditions' };
    case 4: return { type: 'traffic', severity: 'low', label: 'Rain / Wet Road' };
    case 5: return { type: 'traffic', severity: 'low', label: 'Ice / Slippery' };
    case 6: return { type: 'traffic', severity: 'medium', label: 'Traffic Congestion' };
    case 7: return { type: 'traffic', severity: 'low', label: 'Lane Restriction' };
    case 8: return { type: 'road_closure', severity: 'high', label: 'Road Closed' };
    case 9: return { type: 'road_work', severity: 'medium', label: 'Road Work' };
    case 10: return { type: 'hazard', severity: 'medium', label: 'Wind / Hazard' };
    case 11: return { type: 'hazard', severity: 'medium', label: 'Flooding' };
    case 14: return { type: 'traffic', severity: 'low', label: 'Broken Down Vehicle' };
    default: return { type: 'hazard', severity: 'medium', label: 'Traffic Incident' };
  }
}

function extractCoordinates(geometry) {
  if (!geometry) return null;
  const geomType = geometry.type;
  const coords = geometry.coordinates;
  if (!coords) return null;

  if (geomType === 'Point' && coords.length >= 2) {
    return { lat: coords[1], lon: coords[0] };
  }
  if (geomType === 'LineString' && coords.length > 0) {
    const pt = coords[0];
    return { lat: pt[1], lon: pt[0] };
  }
  if (geomType === 'MultiLineString' && coords.length > 0 && coords[0].length > 0) {
    const pt = coords[0][0];
    return { lat: pt[1], lon: pt[0] };
  }
  return null;
}

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const lat = parseFloat(url.searchParams.get('lat') || '15.4900');
  const lon = parseFloat(url.searchParams.get('lon') || '73.8270');
  const radius = parseFloat(url.searchParams.get('radius') || '5000');
  const limit = Math.max(3, Math.min(parseInt(url.searchParams.get('limit') || '15', 10), 25));

  const apiKey = context.env?.TOMTOM_API_KEY || '';

  if (!apiKey) {
    const patterns = [
      { type: 'road_work', title: 'Road Work & Resurfacing', desc: 'Lane maintenance and resurfacing on active corridor.', severity: 'medium', cat: 9, dist: 0.20, ang: 35 },
      { type: 'traffic', title: 'Traffic Congestion', desc: 'Moderate vehicle slowdown reported near junction.', severity: 'low', cat: 6, dist: 0.35, ang: 125 },
      { type: 'road_closure', title: 'Road Closed - Infrastructure Maintenance', desc: 'Road temporarily closed for drainage repair.', severity: 'high', cat: 8, dist: 0.50, ang: 215 },
      { type: 'accident', title: 'Traffic Accident - Caution Advised', desc: 'Vehicle collision reported; emergency services active.', severity: 'high', cat: 1, dist: 0.40, ang: 310 },
      { type: 'hazard', title: 'Construction Zone Obstacle', desc: 'Heavy equipment maneuvering near roadway.', severity: 'medium', cat: 3, dist: 0.65, ang: 75 },
      { type: 'traffic', title: 'Slow Moving Traffic Flow', desc: 'Congestion backlog extending through commercial sector.', severity: 'low', cat: 6, dist: 0.70, ang: 160 },
      { type: 'road_work', title: 'Footpath & Curb Repair', desc: 'Sidewalk concrete reconstruction in progress.', severity: 'medium', cat: 9, dist: 0.55, ang: 260 },
      { type: 'road_closure', title: 'Utility Pipe Installation', desc: 'Temporary barrier placed across vehicular and pedestrian route.', severity: 'high', cat: 8, dist: 0.80, ang: 20 },
      { type: 'hazard', title: 'Temporary Lane Restriction', desc: 'Lane blocked due to overhead electrical works.', severity: 'medium', cat: 7, dist: 0.85, ang: 140 },
      { type: 'accident', title: 'Minor Fender Bender', desc: 'Slowdown near roundabout as vehicles clear lane.', severity: 'medium', cat: 1, dist: 0.75, ang: 230 },
      { type: 'traffic', title: 'Terminal Approach Delay', desc: 'Heavy transit queue approaching station entrance.', severity: 'low', cat: 6, dist: 0.90, ang: 320 },
      { type: 'road_work', title: 'Asphalt Patching Operation', desc: 'Road maintenance crew active with temporary signage.', severity: 'medium', cat: 9, dist: 0.60, ang: 180 },
      { type: 'road_closure', title: 'Emergency Water Main Repair', desc: 'Street completely cordoned off for excavation.', severity: 'high', cat: 8, dist: 0.45, ang: 95 },
      { type: 'traffic', title: 'Peak Congestion Delay', desc: 'Extended traffic delay through central transit corridor.', severity: 'medium', cat: 6, dist: 0.85, ang: 290 },
      { type: 'hazard', title: 'Debris on Road Shoulder', desc: 'Caution advised due to fallen construction materials.', severity: 'medium', cat: 3, dist: 0.30, ang: 15 }
    ];

    const degLat = 1.0 / 111000.0;
    const degLon = 1.0 / (111000.0 * Math.max(Math.cos((lat * Math.PI) / 180.0), 0.1));

    const demoIncidents = patterns.slice(0, limit).map((p, idx) => {
      const r = radius * p.dist;
      const rad = (p.ang * Math.PI) / 180.0;
      const dLat = r * Math.sin(rad) * degLat;
      const dLon = r * Math.cos(rad) * degLon;

      return {
        id: `live-inc-${Math.round(Math.abs(lat) * 10000)}-${idx + 1}`,
        type: p.type,
        title: p.title,
        description: p.desc,
        severity: p.severity,
        latitude: Number((lat + dLat).toFixed(5)),
        longitude: Number((lon + dLon).toFixed(5)),
        source: 'tomtom',
        iconCategory: p.cat,
        startTime: 'Today',
        endTime: 'Active'
      };
    });

    return new Response(JSON.stringify({
      incidents: demoIncidents,
      count: demoIncidents.length,
      status: 'demo_fallback',
      message: 'Demo live road incidents (TomTom API key not configured on edge)'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }

  try {
    const bbox = calculateBoundingBox(lat, lon, radius);
    const tomtomUrl = `https://api.tomtom.com/traffic/services/5/incidentDetails?bbox=${bbox}&fields=%7Bincidents%7Btype,geometry%7Btype,coordinates%7D,properties%7Bid,iconCategory,magnitudeOfDelay,events%7Bdescription,code%7D,startTime,endTime%7D%7D%7D&language=en-GB&categoryFilter=0,1,2,3,4,5,6,7,8,9,10,11,14&timeValidityFilter=present&key=${apiKey}`;

    const res = await fetch(tomtomUrl);
    if (!res.ok) {
      return new Response(JSON.stringify({
        incidents: [],
        count: 0,
        status: 'tomtom_error',
        code: res.status
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const data = await res.json();
    const rawIncidents = data.incidents || [];
    const normalized = [];

    for (const inc of rawIncidents) {
      const props = inc.properties || {};
      const geom = inc.geometry || {};
      const pt = extractCoordinates(geom);
      if (!pt) continue;

      const catInfo = mapCategory(props.iconCategory);
      let desc = '';
      if (props.events && props.events.length > 0) {
        desc = props.events.map(e => e.description).filter(Boolean).join('; ');
      }

      normalized.push({
        id: `tomtom-${props.id || Math.random().toString(36).substring(2, 9)}`,
        type: catInfo.type,
        title: catInfo.label,
        description: desc || catInfo.label,
        severity: catInfo.severity,
        latitude: pt.lat,
        longitude: pt.lon,
        source: 'tomtom',
        iconCategory: props.iconCategory,
        startTime: props.startTime || null,
        endTime: props.endTime || null
      });
    }

    return new Response(JSON.stringify({
      incidents: normalized,
      count: normalized.length,
      status: 'ok'
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
