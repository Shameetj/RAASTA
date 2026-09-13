import os
import requests


DEFAULT_BACKEND_URL = os.getenv("DEV1_API_URL", "http://127.0.0.1:8000")


def get_active_blockages(
    base_url=DEFAULT_BACKEND_URL,
):
    """
    Get all active blockages from Developer 1's API.
    """

    response = requests.get(
        f"{base_url}/api/blockages"
    )

    response.raise_for_status()

    return response.json()


def get_nearby_blockages(
    latitude,
    longitude,
    radius=0.001,
    base_url=DEFAULT_BACKEND_URL,
):
    """
    Get active blockages near a location.

    Dev1's radius is currently expressed as
    latitude/longitude degrees, not meters.
    """

    response = requests.get(
        f"{base_url}/api/blockages",
        params={
            "lat": latitude,
            "lon": longitude,
            "radius": radius,
        },
    )

    response.raise_for_status()

    return response.json()


def get_blockages_by_type(
    blockage_type,
    base_url=DEFAULT_BACKEND_URL,
):
    """
    Get active blockages of a specific type.
    """

    response = requests.get(
        f"{base_url}/api/blockages",
        params={
            "type": blockage_type,
        },
    )

    response.raise_for_status()

    return response.json()

def get_blockages_for_route(
    route_coordinates,
    radius=0.001,
    base_url=DEFAULT_BACKEND_URL,
):
    """
    Get active blockages near the points of a route.

    Duplicate blockages are removed using their ID.
    """

    blockages_by_id = {}

    for latitude, longitude in route_coordinates:
        blockages = get_nearby_blockages(
            latitude=latitude,
            longitude=longitude,
            radius=radius,
            base_url=base_url,
        )

        for blockage in blockages:
            blockages_by_id[blockage["id"]] = blockage

    return list(blockages_by_id.values())