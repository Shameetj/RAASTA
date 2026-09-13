from alerts import create_blockage_alert


blockage = {
    "id": 1,
    "type": "stairs",
    "title": "Stairs blocking sidewalk",
    "description": "Cannot be used by wheelchair users.",
    "latitude": 15.0000,
    "longitude": 73.0010,
    "severity": "high",
}


alert = create_blockage_alert(blockage)


print("Alert:")
print(alert)


assert alert["alert"] is True
assert alert["severity"] == "high"
assert alert["type"] == "stairs"
assert alert["blockage_id"] == 1


print("Alert test passed!")