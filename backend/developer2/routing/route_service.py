import sys
from pathlib import Path

# Allow imports from sibling folders
developer2_path = Path(__file__).resolve().parent.parent

sys.path.append(str(developer2_path / "pathfinding"))
sys.path.append(str(developer2_path / "accessibility"))
sys.path.append(str(developer2_path / "routing"))

from dijkstra import dijkstra
from collision import detect_route_blockages
from detour import find_alternative_route
from alerts import create_blockage_alert
from blockage_client import (
    get_blockages_for_route,
    get_active_blockages,
)

from accessible_route import calculate_accessible_route
from routing_provider import OSRMError


def get_route_coordinates(graph, path):
    """
    Convert a list of node IDs into GPS coordinates.
    """

    coordinates = []

    for node_id in path:
        node = graph.nodes[node_id]

        coordinates.append(
            (
                node["lat"],
                node["lng"],
            )
        )

    return coordinates


def calculate_route(
    graph,
    start,
    destination,
    active_blockages=None,
    wheelchair=True,
):
    """
    Calculate a route and automatically reroute around
    detected accessibility blockages.
    """

    # Step 1: Find the initial route
    initial_route = dijkstra(
        graph,
        start,
        destination,
        wheelchair=wheelchair,
    )

    if initial_route is None:
        return {
            "success": False,
            "message": "No route found.",
            "route": None,
            "alerts": [],
        }

    # Step 2: Convert route nodes to GPS coordinates
    route_coordinates = get_route_coordinates(
        graph,
        initial_route["path"],
    )

    if active_blockages is None:
        active_blockages = get_blockages_for_route(
            route_coordinates
        )

    # Step 3: Check the route for active blockages
    detected_blockages = detect_route_blockages(
        route_coordinates,
        active_blockages,
    )

    # Step 4: If there are no blockages, return the original route
    if not detected_blockages:
        return {
            "success": True,
            "message": "Route is clear.",
            "route": initial_route,
            "alerts": [],
            "blockages": [],
        }

    # Step 5: Create alerts
    alerts = []

    for blockage in detected_blockages:
        alert = create_blockage_alert(blockage)
        alerts.append(alert)

    # Step 6: Find an alternative route
    alternative_route = find_alternative_route(
        graph,
        start,
        destination,
        detected_blockages,
    )

    # Step 7: If no alternative route exists
    if alternative_route is None:
        return {
            "success": False,
            "message": "A blockage was detected, but no accessible alternative route was found.",
            "route": initial_route,
            "alerts": alerts,
            "blockages": detected_blockages,
        }

    # Step 8: Return the rerouted result
    return {
        "success": True,
        "message": "Blockage detected. Alternative accessible route found.",
        "route": alternative_route,
        "alerts": alerts,
        "blockages": detected_blockages,
    }


def calculate_route_from_coordinates(
    start_latitude: float,
    start_longitude: float,
    destination_latitude: float,
    destination_longitude: float,
    active_blockages: list[dict] | None = None,
    profile: str = "wheelchair",
) -> dict:
    """
    Public Dev1 -> Dev2 routing interface.

    Uses real latitude/longitude coordinates and OSRM.

    Wheelchair:
        Detect physical accessibility blockages and reroute
        using clear OSRM alternatives.

    Deaf:
        Use the normal walking route without wheelchair-specific
        physical blockage rerouting.
    """

    # Validate profile
    if profile not in {"wheelchair", "deaf"}:
        return {
            "success": False,
            "message": (
                "Invalid profile. Expected 'wheelchair' or 'deaf'."
            ),
            "profile": profile,
            "route": None,
            "alerts": [],
            "blockages": [],
            "rerouted": False,
        }

    # If Dev1 did not provide blockages, fetch active blockages.
    if active_blockages is None:
        try:
            active_blockages = get_active_blockages()
        except Exception as exc:
            return {
                "success": False,
                "message": (
                    f"Failed to retrieve active blockages: {exc}"
                ),
                "profile": profile,
                "route": None,
                "alerts": [],
                "blockages": [],
                "rerouted": False,
            }

    try:
        result = calculate_accessible_route(
            start_latitude=start_latitude,
            start_longitude=start_longitude,
            destination_latitude=destination_latitude,
            destination_longitude=destination_longitude,
            active_blockages=active_blockages,
            profile=profile,
        )

    except OSRMError as exc:
        return {
            "success": False,
            "message": str(exc),
            "profile": profile,
            "route": None,
            "alerts": [],
            "blockages": [],
            "rerouted": False,
        }

    except Exception as exc:
        return {
            "success": False,
            "message": f"Routing request failed: {exc}",
            "profile": profile,
            "route": None,
            "alerts": [],
            "blockages": [],
            "rerouted": False,
        }

    # Ensure the public response always contains these fields.
    result["profile"] = profile
    result.setdefault("alerts", [])
    result.setdefault("blockages", [])
    result.setdefault("rerouted", False)

    return result