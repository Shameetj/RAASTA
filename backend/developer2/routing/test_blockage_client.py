import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

developer2_path = Path(__file__).resolve().parent.parent
sys.path.append(str(developer2_path / "routing"))

from blockage_client import (
    get_active_blockages,
    get_nearby_blockages,
    get_blockages_by_type,
    get_blockages_for_route,
)


def test_blockage_client():
    mock_data = [
        {
            "id": 1,
            "type": "stairs",
            "title": "Stairs near main entrance",
            "latitude": 15.4909,
            "longitude": 73.8278,
            "severity": "high",
            "is_active": True,
        }
    ]

    mock_resp = MagicMock()
    mock_resp.json.return_value = mock_data
    mock_resp.raise_for_status.return_value = None

    with patch("requests.get", return_value=mock_resp):
        blockages = get_active_blockages()
        assert isinstance(blockages, list)
        assert len(blockages) == 1
        assert blockages[0]["is_active"] is True

        nearby = get_nearby_blockages(15.4909, 73.8278)
        assert isinstance(nearby, list)

        stairs = get_blockages_by_type("stairs")
        assert len(stairs) == 1

        route_blockages = get_blockages_for_route([(15.4909, 73.8278)])
        assert len(route_blockages) == 1