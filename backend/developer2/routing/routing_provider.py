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

    return {
        "coordinates": coordinates,
        "distance": route["distance"],
        "duration": route["duration"],
        "distance_meters": route["distance"],
        "duration_seconds": route["duration"],
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