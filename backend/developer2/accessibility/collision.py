import sys
from pathlib import Path

sys.path.append(
    str(Path(__file__).resolve().parent.parent / "pathfinding")
)

from haversine import calculate_haversine_distance


DEFAULT_BLOCKAGE_THRESHOLD = 30


def detect_route_blockages(
    route_coordinates,
    active_blockages,
    threshold=DEFAULT_BLOCKAGE_THRESHOLD,
):
    """
    Detect active blockages that are close to the route.

    route_coordinates:
        List of (latitude, longitude)

    active_blockages:
        List of blockage dictionaries received from Developer 1.
    """

    detected_blockages = []

    for blockage in active_blockages:

        if not blockage.get("is_active", True):
            continue

        blockage_coordinates = (
            blockage["latitude"],
            blockage["longitude"],
        )

        for route_point in route_coordinates:

            distance = calculate_haversine_distance(
                route_point,
                blockage_coordinates,
            )

            if distance <= threshold:

                detected_blockages.append({
                    "id": blockage["id"],
                    "type": blockage["type"],
                    "title": blockage["title"],
                    "description": blockage.get("description"),
                    "latitude": blockage["latitude"],
                    "longitude": blockage["longitude"],
                    "severity": blockage["severity"],
                    "distance_to_route_meters": round(distance, 2),
                })

                break

    return detected_blockages