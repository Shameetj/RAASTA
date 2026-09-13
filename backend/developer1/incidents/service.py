"""
RAASTA Developer 1: Live Road Incident Service
Queries TomTom Traffic Incident Details API v5 with bbox calculation,
caching, category normalization, and graceful error handling.
"""

import os
import math
import time
import urllib.request
import urllib.error
import json
from typing import List, Dict, Any, Optional

# In-memory short-lived cache: (bbox_key) -> (timestamp, data)
_INCIDENT_CACHE: Dict[str, tuple] = {}
CACHE_TTL_SECONDS = 60


def calculate_bounding_box(lat: float, lon: float, radius_meters: float = 5000.0) -> str:
    """
    Convert lat, lon, and radius (meters) into TomTom's bbox format:
    minLon,minLat,maxLon,maxLat
    """
    # 1 deg latitude is approximately 111,000 meters
    delta_lat = radius_meters / 111000.0
    # 1 deg longitude varies with latitude
    cos_lat = math.cos(math.radians(lat))
    delta_lon = radius_meters / (111000.0 * max(abs(cos_lat), 0.0001))

    min_lat = lat - delta_lat
    max_lat = lat + delta_lat
    min_lon = lon - delta_lon
    max_lon = lon + delta_lon

    return f"{min_lon:.6f},{min_lat:.6f},{max_lon:.6f},{max_lat:.6f}"


def map_tomtom_category(icon_category: Optional[int], event_descriptions: List[str], delay_magnitude: Optional[int]) -> tuple:
    """
    Maps TomTom incident iconCategory and events to RAASTA standard category and severity.
    Returns (mapped_type, severity)

    Categories:
    - road_closure (high)
    - road_work (medium / high)
    - accident (high / medium)
    - construction (medium / high)
    - traffic (low / medium)  -- distinct from physical obstructions
    - hazard (medium)
    """
    # Check text hints in event descriptions
    full_text = " ".join(event_descriptions).lower()
    
    if "road closed" in full_text or "closure" in full_text:
        return "road_closure", "high"
    if "construction" in full_text:
        return "construction", "high" if delay_magnitude in (2, 3) else "medium"
    if "accident" in full_text or "crash" in full_text:
        return "accident", "high" if delay_magnitude in (2, 3) else "medium"
    if "road works" in full_text or "work" in full_text:
        return "road_work", "high" if delay_magnitude in (2, 3) else "medium"

    # TomTom iconCategory codes:
    # 1: Accident
    # 2: Fog, 3: Dangerous conditions, 4: Rain, 5: Ice, 10: Wind, 11: Flooding
    # 6: Jam / Congestion
    # 7: Lane closed
    # 8: Road closed
    # 9: Road works
    # 14: Broken down vehicle
    if icon_category == 8:
        return "road_closure", "high"
    elif icon_category == 9:
        return "road_work", "high" if delay_magnitude in (2, 3) else "medium"
    elif icon_category == 1:
        return "accident", "high" if delay_magnitude in (2, 3) else "medium"
    elif icon_category == 7:
        return "road_work", "medium"
    elif icon_category in (6, 14):
        # Traffic jam is traffic info, not a physical wheelchair blockage
        return "traffic", "medium" if delay_magnitude in (2, 3) else "low"
    elif icon_category in (2, 3, 4, 5, 10, 11):
        return "hazard", "medium"
    
    return "hazard", "medium"


def extract_incident_coordinates(geometry: Dict[str, Any]) -> tuple:
    """
    Extracts representative (latitude, longitude) from GeoJSON geometry.
    """
    geom_type = geometry.get("type", "")
    coords = geometry.get("coordinates")

    if not coords:
        return None, None

    if geom_type == "Point" and len(coords) >= 2:
        return coords[1], coords[0]
    elif geom_type in ("LineString", "MultiPoint") and len(coords) > 0:
        first = coords[0]
        if isinstance(first, (list, tuple)) and len(first) >= 2:
            return first[1], first[0]
    elif geom_type == "MultiLineString" and len(coords) > 0 and len(coords[0]) > 0:
        first = coords[0][0]
        if isinstance(first, (list, tuple)) and len(first) >= 2:
            return first[1], first[0]

    return None, None


def get_live_incidents(lat: float, lon: float, radius: float = 5000.0) -> List[Dict[str, Any]]:
    """
    Fetches live road traffic incidents from TomTom Traffic Incident API.
    Returns normalized RAASTA incidents list.
    Fails safely and gracefully if API key is missing or service is unreachable.
    """
    api_key = os.getenv("TOMTOM_API_KEY", "").strip()

    if not api_key:
        # Graceful no-op: TomTom API key not configured
        return []

    bbox = calculate_bounding_box(lat, lon, radius)
    cache_key = f"{round(lat, 2)}_{round(lon, 2)}_{int(radius)}"

    # Check cache
    now = time.time()
    if cache_key in _INCIDENT_CACHE:
        cached_time, cached_data = _INCIDENT_CACHE[cache_key]
        if now - cached_time < CACHE_TTL_SECONDS:
            return cached_data

    url = (
        f"https://api.tomtom.com/traffic/services/5/incidentDetails"
        f"?key={api_key}&bbox={bbox}&language=en-GB"
    )

    try:
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "RAASTA-Accessibility-Service/1.0",
                "Accept": "application/json"
            }
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status != 200:
                return []
            data = json.loads(response.read().decode("utf-8"))

        raw_incidents = data.get("incidents", [])
        normalized_incidents = []

        for item in raw_incidents:
            props = item.get("properties", {})
            geom = item.get("geometry", {})

            inc_lat, inc_lon = extract_incident_coordinates(geom)
            if inc_lat is None or inc_lon is None:
                continue

            # Event descriptions
            events = props.get("events", [])
            event_descs = [e.get("description", "") for e in events if e.get("description")]
            icon_cat = props.get("iconCategory")
            magnitude = props.get("magnitudeOfDelay")

            mapped_type, severity = map_tomtom_category(icon_cat, event_descs, magnitude)

            # Title & Description
            title_text = event_descs[0].title() if event_descs else mapped_type.replace("_", " ").title()
            
            from_loc = props.get("from", "")
            to_loc = props.get("to", "")
            loc_detail = f" between {from_loc} and {to_loc}" if from_loc and to_loc else (f" near {from_loc}" if from_loc else "")
            
            description = (
                f"{title_text}{loc_detail}."
                if loc_detail else
                f"{title_text} reported live."
            )

            inc_id = props.get("id") or f"tt-{inc_lat:.5f}-{inc_lon:.5f}"

            normalized_incidents.append({
                "id": str(inc_id),
                "type": mapped_type,
                "title": title_text,
                "description": description,
                "latitude": float(inc_lat),
                "longitude": float(inc_lon),
                "severity": severity,
                "source": "tomtom",
                "is_live": True,
                "created_at": props.get("startTime"),
                "updated_at": props.get("endTime")
            })

        _INCIDENT_CACHE[cache_key] = (now, normalized_incidents)
        return normalized_incidents

    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, Exception) as exc:
        print(f"[TomTom Incident Service Warning]: {exc}")
        return []
