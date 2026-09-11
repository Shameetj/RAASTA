from graph import Graph
from dijkstra import dijkstra


graph = Graph()

# Create locations
graph.add_node("A", 15.4900, 73.8200, "Hospital")
graph.add_node("B", 15.4910, 73.8210, "Stairs")
graph.add_node("C", 15.4920, 73.8220, "Destination")
graph.add_node("D", 15.4905, 73.8215, "Accessible Ramp")

# Normal route
graph.add_edge(
    "A",
    "B",
    100,
    path_type="sidewalk",
    accessible=True,
)

# Stairs
graph.add_edge(
    "B",
    "C",
    80,
    path_type="stairs",
    accessible=False,
)

# Accessible alternative
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


print("Normal route:")
print(dijkstra(graph, "A", "C"))

print("\nWheelchair route:")
print(dijkstra(graph, "A", "C", wheelchair=True))