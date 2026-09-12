import sys
from pathlib import Path

# Allow imports from sibling folders
developer2_path = Path(__file__).resolve().parent.parent

sys.path.append(str(developer2_path / "pathfinding"))
sys.path.append(str(developer2_path / "accessibility"))

from graph import Graph
from route_service import calculate_route


# --------------------------------------------------
# Create a test graph near Dev1's real blockage
# --------------------------------------------------

graph = Graph()

# B is placed exactly where Dev1 has a real blockage.
graph.add_node(
    "A",
    15.4900,
    73.8278,
    "Start"
)

graph.add_node(
    "B",
    15.4909,
    73.8278,
    "Blocked Path"
)

graph.add_node(
    "C",
    15.4918,
    73.8278,
    "Destination"
)

graph.add_node(
    "D",
    15.4900,
    73.8295,
    "Accessible Alternative"
)


# --------------------------------------------------
# Routes
# --------------------------------------------------

# Direct route
graph.add_edge(
    "A",
    "B",
    100,
    "sidewalk",
    True
)

graph.add_edge(
    "B",
    "C",
    100,
    "sidewalk",
    True
)

# Longer accessible alternative
graph.add_edge(
    "A",
    "D",
    180,
    "sidewalk",
    True
)

graph.add_edge(
    "D",
    "C",
    180,
    "sidewalk",
    True
)


# --------------------------------------------------
# Run RAASTA with REAL Dev1 blockages
# --------------------------------------------------

print("================================")
print("LIVE REROUTING TEST")
print("================================")

result = calculate_route(
    graph,
    "A",
    "C",
    wheelchair=True,
)


print("\nFinal result:")
print(result)


# --------------------------------------------------
# Verify
# --------------------------------------------------

assert result is not None
assert result["success"] is True

assert len(result["blockages"]) > 0

assert result["route"]["path"] == ["A", "D", "C"]

print("\n================================")
print("LIVE REROUTING TEST PASSED!")
print("================================")