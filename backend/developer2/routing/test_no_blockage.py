import sys
from pathlib import Path

developer2_path = Path(__file__).resolve().parent.parent

sys.path.append(str(developer2_path / "pathfinding"))
sys.path.append(str(developer2_path / "accessibility"))

from graph import Graph
from route_service import calculate_route


# -----------------------------
# Create test graph
# -----------------------------

graph = Graph()

graph.add_node("A", 15.0000, 73.0000, "Start")
graph.add_node("B", 15.0000, 73.0010, "Direct Path")
graph.add_node("C", 15.0000, 73.0020, "Destination")
graph.add_node("D", 15.0010, 73.0010, "Accessible Alternative")


# Direct route
graph.add_edge(
    "A",
    "B",
    100,
    "sidewalk",
    True,
)

graph.add_edge(
    "B",
    "C",
    100,
    "sidewalk",
    True,
)

# Alternative route
graph.add_edge(
    "A",
    "D",
    180,
    "sidewalk",
    True,
)

graph.add_edge(
    "D",
    "C",
    180,
    "sidewalk",
    True,
)


# -----------------------------
# Run routing
# -----------------------------

print("================================")
print("NO BLOCKAGE ROUTING TEST")
print("================================")

result = calculate_route(
    graph,
    "A",
    "C",
    wheelchair=True,
)


print("Routing result:")
print(result)


# -----------------------------
# Verify result
# -----------------------------

assert result["success"] is True
assert result["route"]["path"] == ["A", "B", "C"]
assert result["route"]["distance"] == 200
assert result["blockages"] == []
assert result["alerts"] == []


print()
print("NO BLOCKAGE ROUTING TEST PASSED!")