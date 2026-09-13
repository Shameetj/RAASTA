from pathlib import Path
import sys

# Make developer2 modules importable
DEVELOPER2_PATH = Path(__file__).resolve().parent.parent
sys.path.append(str(DEVELOPER2_PATH / "pathfinding"))
sys.path.append(str(DEVELOPER2_PATH / "routing"))

from graph import Graph
from route_service import calculate_route


# --------------------------------------------------
# Demo graph
# --------------------------------------------------

def create_demo_graph():
    graph = Graph()

    # Demo locations
    graph.add_node(
        "A",
        15.4900,
        73.8270,
        "Central Metro Station"
    )

    graph.add_node(
        "B",
        15.4910,
        73.8275,
        "Main Concourse"
    )

    graph.add_node(
        "C",
        15.4920,
        73.8290,
        "University Central Library"
    )

    graph.add_node(
        "D",
        15.4910,
        73.8260,
        "Accessible Promenade"
    )

    # Normal route
    graph.add_edge(
        "A",
        "B",
        100,
        path_type="sidewalk",
        accessible=True
    )

    graph.add_edge(
        "B",
        "C",
        80,
        path_type="stairs",
        accessible=False
    )

    # Accessible alternative
    graph.add_edge(
        "A",
        "D",
        150,
        path_type="ramp",
        accessible=True
    )

    graph.add_edge(
        "D",
        "C",
        100,
        path_type="sidewalk",
        accessible=True
    )

    return graph


# --------------------------------------------------
# Demo location → graph node
# --------------------------------------------------

def find_nearest_node(graph, latitude, longitude):
    """
    Finds the graph node closest to the requested coordinates.
    """

    from haversine import calculate_haversine_distance

    closest_node = None
    closest_distance = float("inf")

    for node_id, node in graph.nodes.items():

        distance = calculate_haversine_distance(
            (latitude, longitude),
            (node["lat"], node["lng"])
        )

        if distance < closest_distance:
            closest_distance = distance
            closest_node = node_id

    return closest_node


# --------------------------------------------------
# Add coordinates to route response
# --------------------------------------------------

def add_route_coordinates(graph, result):

    if not result or not result.get("route"):
        return result

    route = result["route"]

    coordinates = []

    for node_id in route["path"]:
        node = graph.nodes[node_id]

        coordinates.append([
            node["lat"],
            node["lng"]
        ])

    route["coordinates"] = coordinates

    return result


# --------------------------------------------------
# Main API-facing function
# --------------------------------------------------

def calculate_route_from_coordinates(
    start_latitude,
    start_longitude,
    destination_latitude,
    destination_longitude,
    profile="wheelchair"
):

    graph = create_demo_graph()

    start_node = find_nearest_node(
        graph,
        start_latitude,
        start_longitude
    )

    destination_node = find_nearest_node(
        graph,
        destination_latitude,
        destination_longitude
    )

    wheelchair = profile == "wheelchair"

    result = calculate_route(
        graph=graph,
        start=start_node,
        destination=destination_node,
        wheelchair=wheelchair
    )

    result = add_route_coordinates(graph, result)

    result["start_node"] = start_node
    result["destination_node"] = destination_node
    result["profile"] = profile

    return result