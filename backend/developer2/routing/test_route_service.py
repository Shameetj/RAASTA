import sys
from pathlib import Path

developer2_path = Path(__file__).resolve().parent.parent

sys.path.append(str(developer2_path / "pathfinding"))
sys.path.append(str(developer2_path / "accessibility"))
sys.path.append(str(developer2_path / "routing"))

from graph import Graph
from route_service import calculate_route


def test_calculate_route_reroute():
    graph = Graph()
    graph.add_node("A", 15.0000, 73.0000, "Start")
    graph.add_node("B", 15.0000, 73.0010, "Blocked Path")
    graph.add_node("C", 15.0000, 73.0020, "Destination")
    graph.add_node("D", 15.0010, 73.0010, "Accessible Alternative")

    # Normal route: A -> B -> C
    graph.add_edge("A", "B", 100, "sidewalk", True)
    graph.add_edge("B", "C", 80, "sidewalk", True)

    # Alternative route: A -> D -> C
    graph.add_edge("A", "D", 130, "sidewalk", True)
    graph.add_edge("D", "C", 120, "sidewalk", True)

    active_blockages = [
        {
            "id": 1,
            "type": "stairs",
            "title": "Stairs blocking sidewalk",
            "description": "Cannot be used by wheelchair users.",
            "latitude": 15.0000,
            "longitude": 73.0010,
            "severity": "high",
            "is_active": True,
            "created_at": "2026-09-11T15:30:00Z",
        }
    ]

    result = calculate_route(
        graph,
        "A",
        "C",
        active_blockages,
        wheelchair=True,
    )

    assert result["success"] is True
    assert result["route"]["path"] == ["A", "D", "C"]
    assert result["route"]["distance"] == 250
    assert len(result["blockages"]) == 1
    assert result["blockages"][0]["type"] == "stairs"
    assert len(result["alerts"]) == 1
    assert result["alerts"][0]["severity"] == "high"