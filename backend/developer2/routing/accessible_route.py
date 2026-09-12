import math
import sys
from pathlib import Path

developer2_path = Path(__file__).resolve().parent.parent

sys.path.append(str(developer2_path / "pathfinding"))

from haversine import calculate_haversine_distance

from routing_provider import (
    get_routes,
    get_route_via_waypoints,
)


def point_to_route_distance(
    latitude,
    longitude,
    route_coordinates,
):
    """
    Return the minimum distance from a blockage point
    to any coordinate in the route.
    """

    minimum_distance = float("inf")

    for route_latitude, route_longitude in route_coordinates:
        distance = calculate_haversine_distance(
            (latitude, longitude),
            (route_latitude, route_longitude),
        )

        if distance < minimum_distance:
            minimum_distance = distance

    return minimum_distance


def find_blockages_on_route(
    route_coordinates,
    blockages,
    threshold_meters=30,
):
    """
    Find active blockages close to the route.
    """

    detected = []

    for blockage in blockages:
        distance = point_to_route_distance(
            blockage["latitude"],
            blockage["longitude"],
            route_coordinates,
        )

        if distance <= threshold_meters:
            detected_blockage = dict(blockage)

            detected_blockage[
                "distance_to_route_meters"
            ] = round(distance, 2)

            detected.append(detected_blockage)

    return detected


def generate_detour_waypoints(
    blockage_latitude,
    blockage_longitude,
    radius_meters=80,
):
    """
    Generate candidate GPS waypoints around a blockage.
    """

    latitude_offset = radius_meters / 111320

    longitude_scale = max(
        math.cos(math.radians(blockage_latitude)),
        0.1,
    )

    longitude_offset = (
        radius_meters
        / (111320 * longitude_scale)
    )

    offsets = [
        (latitude_offset, 0),
        (-latitude_offset, 0),
        (0, longitude_offset),
        (0, -longitude_offset),
        (latitude_offset, longitude_offset),
        (latitude_offset, -longitude_offset),
        (-latitude_offset, longitude_offset),
        (-latitude_offset, -longitude_offset),
    ]

    waypoints = []

    for latitude_delta, longitude_delta in offsets:
        waypoints.append(
            (
                blockage_latitude + latitude_delta,
                blockage_longitude + longitude_delta,
            )
        )

    return waypoints

def find_waypoint_detour(
    start_latitude,
    start_longitude,
    destination_latitude,
    destination_longitude,
    detected_blockages,
    active_blockages,
):
    """
    Generate real OSRM detours around detected blockages.

    Tries multiple waypoint combinations at increasing distances
    from the blockage and accepts only routes that are clear of
    all active blockages.
    """

    candidates = []

    # Try progressively larger detours.
    for radius in (100, 150, 200, 250, 300, 400):

        for blockage in detected_blockages:

            lat = blockage["latitude"]
            lon = blockage["longitude"]

            waypoints = generate_detour_waypoints(
                lat,
                lon,
                radius_meters=radius,
            )

            # Try different ways of going around the blockage.
            waypoint_pairs = [
                # Left side
                (1, 5),

                # Right side
                (0, 4),

                # Top side
                (2, 6),

                # Bottom side
                (3, 7),

                # Diagonal combinations
                (0, 5),
                (1, 4),
                (2, 7),
                (3, 6),
            ]

            for first_index, second_index in waypoint_pairs:

                first_waypoint = waypoints[first_index]
                second_waypoint = waypoints[second_index]

                try:
                    route = get_route_via_waypoints(
                        start_latitude=start_latitude,
                        start_longitude=start_longitude,
                        waypoints=[
                            first_waypoint,
                            second_waypoint,
                        ],
                        destination_latitude=destination_latitude,
                        destination_longitude=destination_longitude,
                    )

                except Exception:
                    continue

                # Check the ACTUAL OSRM geometry.
                route_blockages = find_blockages_on_route(
                    route["coordinates"],
                    active_blockages,
                )

                # Reject route if it still intersects a blockage.
                if route_blockages:
                    continue

                candidates.append(route)

        # If we found clear routes at this radius,
        # don't make unnecessarily large detours.
        if candidates:
            break

    if not candidates:
        return None

    # Choose the shortest clear route.
    return min(
        candidates,
        key=lambda route: route["distance_meters"],
    )

def calculate_accessible_route(
    start_latitude: float,
    start_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
    active_blockages: list[dict],
    profile: str = "wheelchair",
) -> dict:
    """
    Calculate a real GPS route through OSRM.

    Wheelchair:
        Detect physical accessibility blockages and reroute.

    Deaf:
        Use the normal walking route without
        wheelchair-specific physical blockage rerouting.
    """

    routes = get_routes(
        start_latitude=start_latitude,
        start_longitude=start_longitude,
        destination_latitude=destination_latitude,
        destination_longitude=destination_longitude,
    )

    primary_route = routes[0]

    # Deaf / Hard of Hearing
    if profile == "deaf":
        return {
            "success": True,
            "message": "Route is clear.",
            "profile": profile,
            "route": primary_route,
            "alerts": [],
            "blockages": [],
            "rerouted": False,
        }

    # Wheelchair accessibility detection
    detected_blockages = find_blockages_on_route(
        primary_route["coordinates"],
        active_blockages,
    )

    # No blockage
    if not detected_blockages:
        return {
            "success": True,
            "message": "Route is clear.",
            "profile": profile,
            "route": primary_route,
            "alerts": [],
            "blockages": [],
            "rerouted": False,
        }

    # Create blockage alerts
    alerts = []

    for blockage in detected_blockages:
        alerts.append({
            "alert": True,
            "severity": blockage.get(
                "severity",
                "high",
            ),
            "type": blockage.get(
                "type",
                "unknown",
            ),
            "title": blockage.get(
                "title",
                "Accessibility blockage detected",
            ),
            "message": (
                "Accessibility blockage detected. "
                "Finding an alternative route."
            ),
            "blockage_id": blockage.get("id"),
        })

    # First try OSRM-provided alternatives.
    clear_alternatives = []

    for alternative in routes[1:]:
        alternative_blockages = find_blockages_on_route(
            alternative["coordinates"],
            active_blockages,
        )

        if not alternative_blockages:
            clear_alternatives.append(alternative)

    if clear_alternatives:
        alternative = min(
            clear_alternatives,
            key=lambda route: route["distance_meters"],
        )

        return {
            "success": True,
            "message": (
                "Blockage detected. "
                "Alternative accessible route found."
            ),
            "profile": profile,
            "route": alternative,
            "alerts": alerts,
            "blockages": detected_blockages,
            "rerouted": True,
        }

    # Generate a real OSRM waypoint detour.
    detour_route = find_waypoint_detour(
        start_latitude=start_latitude,
        start_longitude=start_longitude,
        destination_latitude=destination_latitude,
        destination_longitude=destination_longitude,
        detected_blockages=detected_blockages,
        active_blockages=active_blockages,
    )

    if detour_route is not None:
        return {
            "success": True,
            "message": (
                "Blockage detected. "
                "Alternative accessible route found."
            ),
            "profile": profile,
            "route": detour_route,
            "alerts": alerts,
            "blockages": detected_blockages,
            "rerouted": True,
        }

    # No safe alternative
    return {
        "success": False,
        "message": (
            "A blockage was detected, "
            "but no clear alternative route was found."
        ),
        "profile": profile,
        "route": primary_route,
        "alerts": alerts,
        "blockages": detected_blockages,
        "rerouted": False,
    }