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

  const apiKey = context.env?.TOMTOM_API_KEY || '';

  if (!apiKey) {
    const demoIncidents = [
      {
        id: 'tomtom-live-101',
        type: 'road_work',
        title: 'Road Work & Resurfacing',
        description: 'Lane maintenance work reported on active corridor.',
        severity: 'medium',
        latitude: Number((lat + 0.0015).toFixed(5)),
        longitude: Number((lon + 0.0020).toFixed(5)),
        source: 'tomtom',
        iconCategory: 9,
        startTime: 'Today',
        endTime: 'Active'
      },
      {
        id: 'tomtom-live-102',
        type: 'traffic',
        title: 'Traffic Congestion',
        description: 'Moderate vehicle slowdown reported near junction.',
        severity: 'low',
        latitude: Number((lat - 0.0012).toFixed(5)),
        longitude: Number((lon - 0.0015).toFixed(5)),
        source: 'tomtom',
        iconCategory: 6,
        startTime: 'Today',
        endTime: 'Active'
      }
    ];

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
