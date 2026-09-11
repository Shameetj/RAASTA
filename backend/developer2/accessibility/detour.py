import sys
from pathlib import Path

# Allow imports from the sibling pathfinding folder
sys.path.append(
    str(Path(__file__).resolve().parent.parent / "pathfinding")
)

from graph import Graph
from dijkstra import dijkstra
from haversine import calculate_haversine_distance


DEFAULT_BLOCKAGE_THRESHOLD = 30


def edge_is_near_blockage(
    graph,
    from_node,
    to_node,
    blockage_coordinates,
    threshold=DEFAULT_BLOCKAGE_THRESHOLD,
):
    """
    Check whether a graph edge is close enough to a blockage
    to be considered blocked.

    For our MVP, we check the two endpoints of the edge.
    """

    from_point = (
        graph.nodes[from_node]["lat"],
        graph.nodes[from_node]["lng"],
    )

    to_point = (
        graph.nodes[to_node]["lat"],
        graph.nodes[to_node]["lng"],
    )

    from_distance = calculate_haversine_distance(
        from_point,
        blockage_coordinates,
    )

    to_distance = calculate_haversine_distance(
        to_point,
        blockage_coordinates,
    )

    return (
        from_distance <= threshold
        or to_distance <= threshold
    )


def find_alternative_route(
    graph,
    start,
    destination,
    blockage_coordinates,
    threshold=DEFAULT_BLOCKAGE_THRESHOLD,
):
    """
    Find an accessible route while avoiding edges
    affected by a reported blockage.
    """

    alternative_graph = Graph()

    # Copy all nodes
    for node_id, node in graph.nodes.items():
        alternative_graph.add_node(
            node_id,
            node["lat"],
            node["lng"],
            node["name"],
        )

    # Copy edges except those affected by the blockage
    for from_node, edges in graph.edges.items():
        for edge in edges:

            if edge_is_near_blockage(
                graph,
                from_node,
                edge["to"],
                blockage_coordinates,
                threshold,
            ):
                continue

            alternative_graph.add_edge(
                from_node,
                edge["to"],
                edge["distance"],
                edge["path_type"],
                edge["accessible"],
            )

    # Find an accessible route on the filtered graph
    return dijkstra(
        alternative_graph,
        start,
        destination,
        wheelchair=True,
    )