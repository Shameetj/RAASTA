import heapq


def dijkstra(graph, start, destination, wheelchair=False):
    """
    Find the lowest-cost path from start to destination.

    If wheelchair=True, inaccessible paths are avoided.
    """

    distances = {node: float("inf") for node in graph.nodes}
    previous = {node: None for node in graph.nodes}

    distances[start] = 0

    priority_queue = [(0, start)]

    while priority_queue:
        current_distance, current_node = heapq.heappop(priority_queue)

        # Ignore an outdated queue entry
        if current_distance > distances[current_node]:
            continue

        # Destination reached
        if current_node == destination:
            break

        for edge in graph.get_neighbors(current_node):
            # Wheelchair users should not use inaccessible paths
            if wheelchair and not edge["accessible"]:
                continue

            neighbor = edge["to"]
            distance = edge["distance"]

            new_distance = current_distance + distance

            if new_distance < distances[neighbor]:
                distances[neighbor] = new_distance
                previous[neighbor] = current_node

                heapq.heappush(
                    priority_queue,
                    (new_distance, neighbor),
                )

    # No route found
    if distances[destination] == float("inf"):
        return None

    # Reconstruct route
    path = []
    current = destination

    while current is not None:
        path.append(current)
        current = previous[current]

    path.reverse()

    return {
        "path": path,
        "distance": distances[destination],
    }