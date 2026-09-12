from graph import Graph


graph = Graph()

graph.add_node("A", 15.4900, 73.8200, "Hospital")
graph.add_node("B", 15.4910, 73.8210, "Main Road")
graph.add_node("C", 15.4920, 73.8220, "Library")

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
    path_type="stairs",
    accessible=False,
)

print("Nodes:")
print(graph.nodes)

print("\nPaths from A:")
print(graph.get_neighbors("A"))

print("\nPaths from B:")
print(graph.get_neighbors("B"))