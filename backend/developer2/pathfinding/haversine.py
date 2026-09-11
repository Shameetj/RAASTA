from math import radians, sin, cos, sqrt, atan2


def calculate_haversine_distance(coord1, coord2):
    """
    Calculate the distance between two GPS coordinates in meters.

    coord format:
        (latitude, longitude)
    """

    lat1, lon1 = coord1
    lat2, lon2 = coord2

    earth_radius = 6371000

    lat1 = radians(lat1)
    lat2 = radians(lat2)
    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)

    a = (
        sin(delta_lat / 2) ** 2
        + cos(lat1) * cos(lat2) * sin(delta_lon / 2) ** 2
    )

    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return earth_radius * c