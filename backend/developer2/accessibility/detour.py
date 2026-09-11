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
    detected_blockages,
    threshold=DEFAULT_BLOCKAGE_THRESHOLD,
):
    """
    Find an accessible alternative route while avoiding
    edges affected by detected blockages.

    detected_blockages:
        List of blockage dictionaries received from
        collision.detect_route_blockages().
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

    # Copy edges except those affected by blockages
    for from_node, edges in graph.edges.items():
        for edge in edges:

            edge_blocked = False

            for blockage in detected_blockages:

                blockage_coordinates = (
                    blockage["latitude"],
                    blockage["longitude"],
                )

                distance_from = calculate_haversine_distance(
                    (
                        graph.nodes[from_node]["lat"],
                        graph.nodes[from_node]["lng"],
                    ),
                    blockage_coordinates,
                )

                distance_to = calculate_haversine_distance(
                    (
                        graph.nodes[edge["to"]]["lat"],
                        graph.nodes[edge["to"]]["lng"],
                    ),
                    blockage_coordinates,
                )

                print(
                    f"Checking edge {from_node} -> {edge['to']} | "
                    f"distances: {distance_from:.2f}m, "
                    f"{distance_to:.2f}m"
                )

                if (
                    distance_from <= threshold
                    or distance_to <= threshold
                ):
                    edge_blocked = True
                    break

            if edge_blocked:
                continue

            alternative_graph.add_edge(
                from_node,
                edge["to"],
                edge["distance"],
                edge["path_type"],
                edge["accessible"],
            )

    # Debug: show the filtered graph
    print("Filtered graph:")
    print(alternative_graph.edges)

    # Find an accessible route on the filtered graph
    result = dijkstra(
        alternative_graph,
        start,
        destination,
        wheelchair=True,
    )

    print("Dijkstra result:")
    print(result)

    return result