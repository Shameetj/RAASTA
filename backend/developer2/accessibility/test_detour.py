import sys
from pathlib import Path

sys.path.append(
    str(Path(__file__).resolve().parent.parent / "pathfinding")
)

from graph import Graph
from detour import find_alternative_route


graph = Graph()


# -------------------------
# Nodes
# -------------------------

graph.add_node("A", 15.0000, 73.0000, "Start")
graph.add_node("B", 15.0000, 73.0010, "Blocked Path")
graph.add_node("C", 15.0000, 73.0020, "Destination")
graph.add_node("D", 15.0010, 73.0010, "Accessible Alternative")


# -------------------------
# Normal route
# -------------------------

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
    80,
    "sidewalk",
    True,
)


# -------------------------
# Alternative route
# -------------------------

graph.add_edge(
    "A",
    "D",
    130,
    "sidewalk",
    True,
)

graph.add_edge(
    "D",
    "C",
    120,
    "sidewalk",
    True,
)


# -------------------------
# Detected blockage
# -------------------------

detected_blockages = [
    {
        "id": 1,
        "type": "stairs",
        "title": "Stairs blocking sidewalk",
        "description": "Cannot be used by wheelchair users.",
        "latitude": 15.0000,
        "longitude": 73.0010,
        "severity": "high",
        "distance_to_route_meters": 0.0,
    }
]


# -------------------------
# Find alternative route
# -------------------------

result = find_alternative_route(
    graph,
    "A",
    "C",
    detected_blockages,
)


print("Alternative route:")
print(result)


# -------------------------
# Test
# -------------------------

assert result is not None
assert result["path"] == ["A", "D", "C"]
assert result["distance"] == 250

print("Detour test passed!")