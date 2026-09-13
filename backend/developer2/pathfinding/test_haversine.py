import sys
from pathlib import Path

pathfinding_dir = Path(__file__).resolve().parent
sys.path.append(str(pathfinding_dir))

from haversine import calculate_haversine_distance


def test_haversine():
    distance = calculate_haversine_distance(
        (15.4900, 73.8200),
        (15.5000, 73.8300)
    )
    assert distance > 0
    assert 1400 < distance < 1700