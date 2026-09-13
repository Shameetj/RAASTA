import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from test_app import app
from incidents.service import (
    calculate_bounding_box,
    map_tomtom_category,
    extract_incident_coordinates,
    get_live_incidents
)

client = TestClient(app)


def test_bounding_box_calculation():
    # Lat: 15.3990, Lon: 73.8115, Radius: 5000m
    bbox = calculate_bounding_box(15.3990, 73.8115, 5000)
    parts = bbox.split(",")
    assert len(parts) == 4
    min_lon, min_lat, max_lon, max_lat = map(float, parts)
    
    assert min_lat < 15.3990 < max_lat
    assert min_lon < 73.8115 < max_lon


def test_category_mapping():
    # Road closure
    cat, sev = map_tomtom_category(8, ["road closed"], 3)
    assert cat == "road_closure"
    assert sev == "high"

    # Road work
    cat, sev = map_tomtom_category(9, ["road works on lane 1"], 2)
    assert cat == "road_work"
    assert sev == "high"

    # Accident
    cat, sev = map_tomtom_category(1, ["vehicle collision"], 3)
    assert cat == "accident"
    assert sev == "high"

    # Construction
    cat, sev = map_tomtom_category(None, ["construction work ongoing"], 1)
    assert cat == "construction"
    assert sev == "medium"

    # Traffic jam is distinct traffic info (not automatically a blockage)
    cat, sev = map_tomtom_category(6, ["traffic congestion"], 1)
    assert cat == "traffic"
    assert sev == "low"


def test_extract_incident_coordinates():
    # Point
    geom_pt = {"type": "Point", "coordinates": [73.8115, 15.3990]}
    lat, lon = extract_incident_coordinates(geom_pt)
    assert lat == 15.3990
    assert lon == 73.8115

    # LineString
    geom_line = {"type": "LineString", "coordinates": [[73.8115, 15.3990], [73.8120, 15.4000]]}
    lat, lon = extract_incident_coordinates(geom_line)
    assert lat == 15.3990
    assert lon == 73.8115


def test_live_incidents_without_api_key():
    with patch.dict("os.environ", {"TOMTOM_API_KEY": ""}):
        incidents = get_live_incidents(15.3990, 73.8115, 5000)
        assert isinstance(incidents, list)
        assert len(incidents) == 0


def test_live_incidents_endpoint():
    response = client.get("/api/live-incidents?lat=15.3990&lon=73.8115&radius=5000")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["source"] == "tomtom"
    assert isinstance(data["incidents"], list)
