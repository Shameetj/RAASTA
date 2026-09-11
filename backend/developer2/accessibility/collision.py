import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent / "pathfinding"))

from haversine import calculate_haversine_distance


DEFAULT_BLOCKAGE_THRESHOLD = 30


def is_route_blocked(
    route_coordinates,
    blockage_coordinates,
    threshold=DEFAULT_BLOCKAGE_THRESHOLD,
):
    """
    Check whether a blockage is close enough to a route
    to be considered a route blockage.

    route_coordinates:
        List of (latitude, longitude) points.

    blockage_coordinates:
        (latitude, longitude) of the reported blockage.

    threshold:
        Maximum distance in meters for considering the
        route affected by the blockage.
    """

    for route_point in route_coordinates:
        distance = calculate_haversine_distance(
            route_point,
            blockage_coordinates,
        )

        if distance <= threshold:
            return True

    return False