class Graph:
    def __init__(self):
        self.nodes = {}
        self.edges = {}

    def add_node(self, node_id, lat, lng, name=""):
        """Add a location/node to the graph."""
        self.nodes[node_id] = {
            "lat": lat,
            "lng": lng,
            "name": name,
        }
        self.edges.setdefault(node_id, [])

    def add_edge(
        self,
        from_node,
        to_node,
        distance,
        path_type="sidewalk",
        accessible=True,
    ):
        """Connect two nodes with a path."""
        edge = {
            "to": to_node,
            "distance": distance,
            "path_type": path_type,
            "accessible": accessible,
        }

        self.edges.setdefault(from_node, []).append(edge)

    def get_neighbors(self, node_id):
        """Return paths connected to a node."""
        return self.edges.get(node_id, [])