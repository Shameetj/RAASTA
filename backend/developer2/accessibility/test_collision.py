from collision import detect_route_blockages


route = [
    (15.4909, 73.8278),
    (15.4910, 73.8279),
    (15.4911, 73.8280),
]


blockages = [
    {
        "id": 1,
        "type": "stairs",
        "title": "Stairs blocking sidewalk",
        "description": "Cannot be used by wheelchair users.",
        "latitude": 15.4909,
        "longitude": 73.8278,
        "severity": "high",
        "is_active": True,
        "created_at": "2026-09-11T15:30:00Z",
    },
    {
        "id": 2,
        "type": "construction",
        "title": "Construction nearby",
        "description": "Construction work.",
        "latitude": 15.5000,
        "longitude": 73.8400,
        "severity": "medium",
        "is_active": True,
        "created_at": "2026-09-11T15:30:00Z",
    },
]


detected = detect_route_blockages(route, blockages)

print("Detected blockages:")
print(detected)

assert len(detected) == 1
assert detected[0]["id"] == 1
assert detected[0]["type"] == "stairs"

print("Collision test passed!")