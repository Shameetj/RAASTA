/**
 * Geo & Coordinate Utilities for RAASTA
 * Handles standardizing backend coordinates (GeoJSON, [lat, lng], [lng, lat], objects)
 * into Leaflet-compatible [lat, lng] format.
 */

/**
 * Normalizes a single coordinate into a Leaflet [lat, lng] array.
 * @param {Array|Object} coord 
 * @returns {[number, number]|null}
 */
export function normalizeCoordinate(coord) {
  if (!coord) return null;

  // 1. Array format: [a, b]
  if (Array.isArray(coord) && coord.length >= 2) {
    const val1 = parseFloat(coord[0]);
    const val2 = parseFloat(coord[1]);
    if (isNaN(val1) || isNaN(val2)) return null;

    // Detect GeoJSON [longitude, latitude] where longitude is > 90 or < -90
    // Latitudes are strictly bounded in [-90, +90]
    if (val1 > 90 || val1 < -90) {
      return [val2, val1]; // Flip to [lat, lng]
    }
    if (val2 > 90 || val2 < -90) {
      return [val1, val2]; // Already [lat, lng]
    }

    // Regional heuristic for India (lat ~ 8 to 38, lng ~ 68 to 98)
    if (val1 >= 50 && val1 <= 100 && val2 >= 0 && val2 <= 45) {
      return [val2, val1]; // GeoJSON [lng, lat] -> [lat, lng]
    }
    if (val1 >= 0 && val1 <= 45 && val2 >= 50 && val2 <= 100) {
      return [val1, val2]; // Already [lat, lng]
    }

    return [val1, val2];
  }

  // 2. Object format: { lat, lng } or { latitude, longitude } or { lat, lon }
  if (typeof coord === 'object') {
    const lat = parseFloat(coord.lat ?? coord.latitude);
    const lng = parseFloat(coord.lng ?? coord.longitude ?? coord.lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      return [lat, lng];
    }
  }

  return null;
}

/**
 * Normalizes a list of coordinates into [[lat, lng], ...]
 * @param {Array} coordsList
 * @returns {Array<[number, number]>}
 */
export function normalizeCoordinatesList(coordsList) {
  if (!Array.isArray(coordsList)) return [];
  return coordsList.map(normalizeCoordinate).filter(Boolean);
}

/**
 * Extracts and normalizes coordinate lists from backend route objects.
 * Supports:
 * - Direct coordinate array: [ [lat, lng], ... ]
 * - Nested route.coordinates: [ ... ]
 * - Nested route.geometry.coordinates / geojson.coordinates
 * - Nested route.path / points / waypoints
 * - Nested objects: accessible_route, route, direct_route, alternative_route, safe_route, routes[0]
 * 
 * @param {Object|Array} routeObj 
 * @returns {Array<[number, number]>}
 */
export function extractBackendRouteCoordinates(routeObj) {
  if (!routeObj) return [];

  // 1. Direct array of points
  if (Array.isArray(routeObj)) {
    return normalizeCoordinatesList(routeObj);
  }

  // 2. GeoJSON LineString geometry
  if (routeObj.geometry && Array.isArray(routeObj.geometry.coordinates)) {
    return normalizeCoordinatesList(routeObj.geometry.coordinates);
  }
  if (routeObj.geojson?.coordinates && Array.isArray(routeObj.geojson.coordinates)) {
    return normalizeCoordinatesList(routeObj.geojson.coordinates);
  }

  // 3. coordinates array
  if (Array.isArray(routeObj.coordinates)) {
    return normalizeCoordinatesList(routeObj.coordinates);
  }

  // 4. path / points / waypoints array
  if (Array.isArray(routeObj.path)) {
    return normalizeCoordinatesList(routeObj.path);
  }
  if (Array.isArray(routeObj.points)) {
    return normalizeCoordinatesList(routeObj.points);
  }
  if (Array.isArray(routeObj.waypoints)) {
    return normalizeCoordinatesList(routeObj.waypoints);
  }

  // 5. Nested route inside accessible_route, route, direct_route, alternative_route, safe_route, data, routes
  if (routeObj.accessible_route) {
    const coords = extractBackendRouteCoordinates(routeObj.accessible_route);
    if (coords && coords.length > 0) return coords;
  }
  if (routeObj.route) {
    const coords = extractBackendRouteCoordinates(routeObj.route);
    if (coords && coords.length > 0) return coords;
  }
  if (routeObj.direct_route) {
    const coords = extractBackendRouteCoordinates(routeObj.direct_route);
    if (coords && coords.length > 0) return coords;
  }
  if (routeObj.alternative_route) {
    const coords = extractBackendRouteCoordinates(routeObj.alternative_route);
    if (coords && coords.length > 0) return coords;
  }
  if (routeObj.safe_route) {
    const coords = extractBackendRouteCoordinates(routeObj.safe_route);
    if (coords && coords.length > 0) return coords;
  }
  if (routeObj.data) {
    const coords = extractBackendRouteCoordinates(routeObj.data);
    if (coords && coords.length > 0) return coords;
  }
  if (Array.isArray(routeObj.routes) && routeObj.routes.length > 0) {
    const coords = extractBackendRouteCoordinates(routeObj.routes[0]);
    if (coords && coords.length > 0) return coords;
  }

  return [];
}

/**
 * Calculates Haversine distance in meters between two lat/lng points.
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculates the minimum distance in meters from a point to a polyline route.
 * @param {[number, number]} point - [lat, lng]
 * @param {Array<[number, number]>} polyline - array of [lat, lng]
 * @returns {number} Minimum distance in meters
 */
export function pointToPolylineDistance(point, polyline) {
  if (!point || !Array.isArray(polyline) || polyline.length === 0) {
    return Infinity;
  }
  const [pLat, pLng] = point;
  let minDistance = Infinity;

  for (const vertex of polyline) {
    if (Array.isArray(vertex) && vertex.length >= 2) {
      const dist = calculateHaversineDistance(pLat, pLng, vertex[0], vertex[1]);
      if (dist < minDistance) {
        minDistance = dist;
      }
    }
  }
  return minDistance;
}

/**
 * Evaluates whether a live incident is accessibility-relevant to the active route.
 * - Checks obstacle type (road_closure, construction, road_work, accident).
 *   Excludes traffic / jams which are non-physical traffic info.
 * - Computes distance using full geometry (Point, LineString, MultiLineString) when present.
 * - Requires distance <= thresholdMeters (default 45m).
 * 
 * @param {Object} incident 
 * @param {Array<[number, number]>} routeCoords 
 * @param {number} thresholdMeters 
 * @returns {boolean}
 */
export function isIncidentRouteRelevant(incident, routeCoords, thresholdMeters = 45) {
  if (!incident || !Array.isArray(routeCoords) || routeCoords.length < 2) {
    return false;
  }

  // 1. Filter incident types: Only physical accessibility barriers affect wheelchair routes
  const rawType = (incident.type || '').toLowerCase();
  const blockingTypes = ['road_closure', 'construction', 'road_work', 'accident'];
  const isBlockingType = blockingTypes.includes(rawType) || (incident.severity === 'high' && rawType !== 'traffic');

  if (!isBlockingType) {
    return false;
  }

  // 2. Extract all coordinates from incident geometry (full path / all points)
  const coordsToCheck = [];

  if (incident.geometry?.coordinates) {
    const gType = incident.geometry.type;
    const gCoords = incident.geometry.coordinates;

    if (gType === 'Point' && Array.isArray(gCoords) && gCoords.length >= 2) {
      coordsToCheck.push([gCoords[1], gCoords[0]]);
    } else if (gType === 'LineString' && Array.isArray(gCoords)) {
      gCoords.forEach(pt => {
        if (Array.isArray(pt) && pt.length >= 2) coordsToCheck.push([pt[1], pt[0]]);
      });
    } else if (gType === 'MultiLineString' && Array.isArray(gCoords)) {
      gCoords.forEach(line => {
        if (Array.isArray(line)) {
          line.forEach(pt => {
            if (Array.isArray(pt) && pt.length >= 2) coordsToCheck.push([pt[1], pt[0]]);
          });
        }
      });
    }
  }

  // Fallback to top-level latitude & longitude if geometry was missing or empty
  if (coordsToCheck.length === 0) {
    const lat = Number(incident.latitude ?? incident.lat);
    const lng = Number(incident.longitude ?? incident.lng ?? incident.lon);
    if (!isNaN(lat) && !isNaN(lng)) {
      coordsToCheck.push([lat, lng]);
    }
  }

  if (coordsToCheck.length === 0) {
    return false;
  }

  // 3. Minimum distance from any point in the incident to any coordinate in the route
  for (const pt of coordsToCheck) {
    const dist = pointToPolylineDistance(pt, routeCoords);
    if (dist <= thresholdMeters) {
      return true;
    }
  }

  return false;
}
