import sys
from pathlib import Path

developer2_path = Path(__file__).resolve().parent.parent

sys.path.append(str(developer2_path / "pathfinding"))
sys.path.append(str(developer2_path / "accessibility"))
sys.path.append(str(developer2_path / "routing"))

from graph import Graph
from route_service import calculate_route


def test_live_rerouting():
    graph = Graph()

    # B is placed where a blockage is detected
    graph.add_node("A", 15.4900, 73.8278, "Start")
    graph.add_node("B", 15.4909, 73.8278, "Blocked Path")
    graph.add_node("C", 15.4918, 73.8278, "Destination")
    graph.add_node("D", 15.4900, 73.8295, "Accessible Alternative")

    # Direct route
    graph.add_edge("A", "B", 100, "sidewalk", True)
    graph.add_edge("B", "C", 100, "sidewalk", True)

    # Longer accessible alternative
    graph.add_edge("A", "D", 180, "sidewalk", True)
    graph.add_edge("D", "C", 180, "sidewalk", True)

    mock_blockages = [
        {
            "id": 1,
            "type": "stairs",
            "title": "Stairs near main entrance",
            "latitude": 15.4909,
            "longitude": 73.8278,
            "severity": "high",
            "is_active": True
        }
    ]

    result = calculate_route(
        graph,
        "A",
        "C",
        active_blockages=mock_blockages,
        wheelchair=True,
    )

    assert result is not None
    assert result["success"] is True
    assert len(result["blockages"]) > 0
    assert result["route"]["path"] == ["A", "D", "C"]