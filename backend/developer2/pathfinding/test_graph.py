import sys
from pathlib import Path

pathfinding_dir = Path(__file__).resolve().parent
sys.path.append(str(pathfinding_dir))

from graph import Graph


def test_graph_creation():
    graph = Graph()
    graph.add_node("A", 15.4900, 73.8200, "Hospital")
    graph.add_node("B", 15.4910, 73.8210, "Main Road")
    graph.add_node("C", 15.4920, 73.8220, "Library")

    graph.add_edge("A", "B", 100, path_type="sidewalk", accessible=True)
    graph.add_edge("B", "C", 80, path_type="stairs", accessible=False)

    assert len(graph.nodes) == 3
    assert len(graph.get_neighbors("A")) == 1
    assert len(graph.get_neighbors("B")) == 1