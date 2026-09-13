import sys
from pathlib import Path

developer2_path = Path(__file__).resolve().parent.parent
sys.path.append(str(developer2_path / "routing"))

from routing_provider import convert_osrm_route, format_osrm_instruction


def test_convert_osrm_route_turn_by_turn():
    mock_osrm_route = {
        "geometry": {
            "coordinates": [
                [73.827762, 15.490204],
                [73.827297, 15.490164],
                [73.826250, 15.492509],
            ]
        },
        "distance": 396.0,
        "duration": 53.3,
        "legs": [
            {
                "steps": [
                    {
                        "name": "MG Road",
                        "distance": 50.1,
                        "duration": 10.2,
                        "maneuver": {
                            "type": "depart",
                            "modifier": "left",
                            "location": [73.827762, 15.490204],
                        },
                    },
                    {
                        "name": "Rua Almirante Reis",
                        "distance": 289.3,
                        "duration": 37.4,
                        "maneuver": {
                            "type": "turn",
                            "modifier": "right",
                            "location": [73.827297, 15.490164],
                        },
                    },
                    {
                        "name": "",
                        "distance": 56.6,
                        "duration": 5.7,
                        "maneuver": {
                            "type": "arrive",
                            "modifier": "left",
                            "location": [73.826250, 15.492509],
                        },
                    },
                ]
            }
        ],
    }

    converted = convert_osrm_route(mock_osrm_route)

    assert "turn_by_turn" in converted
    assert len(converted["turn_by_turn"]) == 3

    # Check Step 1
    step1 = converted["turn_by_turn"][0]
    assert step1["instruction"] == "Head left on MG Road"
    assert step1["distance_meters"] == 50.1
    assert step1["duration_seconds"] == 10.2
    assert step1["coordinates"]["lat"] == 15.490204
    assert step1["coordinates"]["lng"] == 73.827762
    assert step1["maneuver_type"] == "depart"
    assert step1["modifier"] == "left"

    # Check Step 2
    step2 = converted["turn_by_turn"][1]
    assert step2["instruction"] == "Turn right onto Rua Almirante Reis"
    assert step2["distance_meters"] == 289.3
    assert step2["duration_seconds"] == 37.4
    assert step2["coordinates"]["lat"] == 15.490164
    assert step2["coordinates"]["lng"] == 73.827297
    assert step2["maneuver_type"] == "turn"
    assert step2["modifier"] == "right"

    # Check Step 3
    step3 = converted["turn_by_turn"][2]
    assert step3["instruction"] == "Arrive at destination"
    assert step3["distance_meters"] == 56.6
    assert step3["duration_seconds"] == 5.7
    assert step3["coordinates"]["lat"] == 15.492509
    assert step3["coordinates"]["lng"] == 73.826250
    assert step3["maneuver_type"] == "arrive"
    assert step3["modifier"] == "left"

    # Verify existing fields preserved
    assert converted["distance"] == 396.0
    assert converted["duration"] == 53.3
    assert converted["distance_meters"] == 396.0
    assert converted["duration_seconds"] == 53.3
    assert len(converted["coordinates"]) == 3
    assert converted["coordinates"][0] == [15.490204, 73.827762]
