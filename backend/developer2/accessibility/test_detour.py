import sys
from pathlib import Path

sys.path.append(
    str(Path(__file__).resolve().parent.parent / "pathfinding")
)

from graph import Graph
from detour import find_alternative_route


graph = Graph()

# Locations
graph.add_node("A", 15.4900, 73.8200, "Hospital")
graph.add_node("B", 15.4910, 73.8210, "Main Road")
graph.add_node("C", 15.4920, 73.8220, "Destination")
graph.add_node("D", 15.4905, 73.8215, "Accessible Ramp")


# Direct route
graph.add_edge(
    "A",
    "B",
    100,
    path_type="sidewalk",
    accessible=True,
)

graph.add_edge(
    "B",
    "C",
    80,
    path_type="sidewalk",
    accessible=True,
)


# Alternative route
graph.add_edge(
    "A",
    "D",
    150,
    path_type="ramp",
    accessible=True,
)

graph.add_edge(
    "D",
    "C",
    100,
    path_type="sidewalk",
    accessible=True,
)


# Blockage near B
blockage = (15.4910, 73.8211)


alternative = find_alternative_route(
    graph,
    "A",
    "C",
    blockage,
)


print("Alternative route:")
print(alternative)