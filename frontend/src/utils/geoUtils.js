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

    // Regional heuristic for Delhi / India (lat ~ 28.x, lng ~ 77.x)
    if (val1 > 50 && val2 < 40) {
      return [val2, val1]; // GeoJSON [lng, lat] -> [lat, lng]
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
 * - Nested route.path: [ ... ]
 * - Nested route.points / waypoints: [ ... ]
 * - GeoJSON geometry: { type: 'LineString', coordinates: [ [lng, lat], ... ] }
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

  // 5. Nested route inside routeObj.route
  if (routeObj.route) {
    return extractBackendRouteCoordinates(routeObj.route);
  }

  return [];
}
