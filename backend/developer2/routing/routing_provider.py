import os

import requests


DEFAULT_OSRM_BASE_URL = "https://router.project-osrm.org"


class OSRMError(Exception):
    """Raised when the OSRM routing request fails."""
    pass


def get_osrm_base_url():
    """
    Get the OSRM server URL.

    The URL can be configured with the OSRM_BASE_URL
    environment variable.
    """

    return os.getenv(
        "OSRM_BASE_URL",
        DEFAULT_OSRM_BASE_URL,
    ).rstrip("/")


def get_route(
    start_latitude: float,
    start_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
    alternatives: bool = True,
    waypoint: tuple[float, float] | None = None,
):
    """
    Get a real-world walking route from OSRM.

    Coordinates are supplied as latitude/longitude.
    OSRM expects longitude/latitude.

    If waypoint is provided, the route is:

        start -> waypoint -> destination
    """

    coordinates = [
        f"{start_longitude},{start_latitude}",
    ]

    if waypoint is not None:
        waypoint_latitude, waypoint_longitude = waypoint

        coordinates.append(
            f"{waypoint_longitude},{waypoint_latitude}"
        )

    coordinates.append(
        f"{destination_longitude},{destination_latitude}"
    )

    coordinate_string = ";".join(coordinates)

    url = (
        f"{get_osrm_base_url()}"
        f"/route/v1/foot/{coordinate_string}"
    )

    params = {
        "alternatives": "true" if alternatives else "false",
        "steps": "true",
        "geometries": "geojson",
        "overview": "full",
    }

    try:
        response = requests.get(
            url,
            params=params,
            timeout=10,
        )

        response.raise_for_status()

    except requests.RequestException as exc:
        raise OSRMError(
            f"OSRM request failed: {exc}"
        ) from exc

    try:
        data = response.json()

    except ValueError as exc:
        raise OSRMError(
            "OSRM returned invalid JSON."
        ) from exc

    if data.get("code") != "Ok":
        raise OSRMError(
            data.get(
                "message",
                "OSRM route calculation failed.",
            )
        )

    return data


def format_osrm_instruction(step: dict) -> str:
    """
    Format a clean human-readable turn instruction from real OSRM step data.
    """
    maneuver = step.get("maneuver") or {}
    m_type = maneuver.get("type", "")
    modifier = maneuver.get("modifier", "")
    name = (step.get("name") or "").strip()

    if m_type == "depart":
        if name:
            return f"Head {modifier} on {name}".strip() if modifier else f"Head on {name}"
        return f"Depart {modifier}".strip().capitalize() if modifier else "Depart on route"
    elif m_type == "arrive":
        return "Arrive at destination"
    elif m_type == "turn":
        if name:
            return f"Turn {modifier} onto {name}".strip() if modifier else f"Turn onto {name}"
        return f"Turn {modifier}".strip().capitalize() if modifier else "Turn"
    elif m_type in ("end of road", "end_of_road"):
        if name:
            return f"Turn {modifier} at end of road onto {name}".strip() if modifier else f"Turn at end of road onto {name}"
        return f"Turn {modifier} at end of road".strip().capitalize() if modifier else "Turn at end of road"
    elif m_type == "fork":
        if name:
            return f"Keep {modifier} at the fork onto {name}".strip() if modifier else f"Take the fork onto {name}"
        return f"Keep {modifier} at the fork".strip().capitalize() if modifier else "Take the fork"
    elif m_type == "roundabout":
        if name:
            return f"Take the roundabout onto {name}"
        return "Take the roundabout"
    elif m_type == "continue":
        if name:
            return f"Continue {modifier} on {name}".strip() if modifier else f"Continue on {name}"
        return f"Continue {modifier}".strip().capitalize() if modifier else "Continue straight"
    else:
        clean_type = m_type.replace("_", " ").capitalize()
        action = f"{clean_type} {modifier}".strip() if modifier else clean_type
        if name:
            return f"{action} onto {name}"
        return action if action else "Continue on route"


def convert_osrm_route(route: dict) -> dict:
    """
    Convert one OSRM route into the RAASTA route format.
    """

    geometry = route["geometry"]

    coordinates = geometry["coordinates"]

    # OSRM returns [longitude, latitude].
    # RAASTA returns [latitude, longitude].
    coordinates = [
        [
            coordinate[1],
            coordinate[0],
        ]
        for coordinate in coordinates
    ]

    turn_by_turn = []
    for leg in route.get("legs", []):
        for step in leg.get("steps", []):
            maneuver = step.get("maneuver") or {}
            loc = maneuver.get("location") or [0, 0]
            turn_by_turn.append(
                {
                    "instruction": format_osrm_instruction(step),
                    "distance_meters": round(float(step.get("distance", 0.0)), 1),
                    "duration_seconds": round(float(step.get("duration", 0.0)), 1),
                    "coordinates": {
                        "lat": loc[1],
                        "lng": loc[0],
                    },
                    "maneuver_type": maneuver.get("type", ""),
                    "modifier": maneuver.get("modifier", ""),
                }
            )

    return {
        "coordinates": coordinates,
        "distance": route["distance"],
        "duration": route["duration"],
        "distance_meters": route["distance"],
        "duration_seconds": route["duration"],
        "turn_by_turn": turn_by_turn,
    }


def get_routes(
    start_latitude: float,
    start_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
):
    """
    Get the primary OSRM route plus any alternatives.
    """

    data = get_route(
        start_latitude=start_latitude,
        start_longitude=start_longitude,
        destination_latitude=destination_latitude,
        destination_longitude=destination_longitude,
        alternatives=True,
    )

    routes = []

    for route in data.get("routes", []):
        routes.append(
            convert_osrm_route(route)
        )

    if not routes:
        raise OSRMError(
            "OSRM returned no routes."
        )

    return routes


def get_route_via_waypoint(
    start_latitude: float,
    start_longitude: float,
    waypoint_latitude: float,
    waypoint_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
):
    """
    Get a real OSRM route forced through a detour waypoint.
    """

    data = get_route(
        start_latitude=start_latitude,
        start_longitude=start_longitude,
        destination_latitude=destination_latitude,
        destination_longitude=destination_longitude,
        alternatives=False,
        waypoint=(
            waypoint_latitude,
            waypoint_longitude,
        ),
    )

    routes = data.get("routes", [])

    if not routes:
        raise OSRMError(
            "OSRM returned no waypoint route."
        )

    return convert_osrm_route(
        routes[0]
    )

def get_route_via_waypoints(
    start_latitude,
    start_longitude,
    waypoints,
    destination_latitude,
    destination_longitude,
):
    """
    Get a real OSRM route through multiple waypoints.

    waypoints:
        List of (latitude, longitude) tuples.

    Route:
        start -> waypoint 1 -> waypoint 2 -> ... -> destination
    """

    coordinates = [
        f"{start_longitude},{start_latitude}",
    ]

    for waypoint_latitude, waypoint_longitude in waypoints:
        coordinates.append(
            f"{waypoint_longitude},{waypoint_latitude}"
        )

    coordinates.append(
        f"{destination_longitude},{destination_latitude}"
    )

    coordinate_string = ";".join(coordinates)

    url = (
        f"{get_osrm_base_url()}"
        f"/route/v1/foot/{coordinate_string}"
    )

    params = {
        "alternatives": "false",
        "steps": "true",
        "geometries": "geojson",
        "overview": "full",
    }

    try:
        response = requests.get(
            url,
            params=params,
            timeout=10,
        )

        response.raise_for_status()

    except requests.RequestException as exc:
        raise OSRMError(
            f"OSRM request failed: {exc}"
        ) from exc

    try:
        data = response.json()

    except ValueError as exc:
        raise OSRMError(
            "OSRM returned invalid JSON."
        ) from exc

    if data.get("code") != "Ok":
        raise OSRMError(
            data.get(
                "message",
                "OSRM route calculation failed.",
            )
        )

    routes = data.get("routes", [])

    if not routes:
        raise OSRMError(
            "OSRM returned no waypoint route."
        )

    return convert_osrm_route(routes[0])