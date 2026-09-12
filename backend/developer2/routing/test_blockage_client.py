from blockage_client import (
    get_active_blockages,
    get_nearby_blockages,
    get_blockages_by_type,
)


print("Testing active blockages...")

blockages = get_active_blockages()

print("Active blockages:")
print(blockages)

assert isinstance(blockages, list)

for blockage in blockages:
    assert "id" in blockage
    assert "type" in blockage
    assert "latitude" in blockage
    assert "longitude" in blockage
    assert "severity" in blockage
    assert blockage["is_active"] is True


print("Active blockage test passed!")


print("\nTesting nearby blockages...")

nearby = get_nearby_blockages(
    latitude=15.4909,
    longitude=73.8278,
    radius=0.001,
)

print("Nearby blockages:")
print(nearby)

assert isinstance(nearby, list)

print("Nearby blockage test passed!")


print("\nTesting blockage type filter...")

stairs = get_blockages_by_type("stairs")

print("Stairs blockages:")
print(stairs)

assert isinstance(stairs, list)

for blockage in stairs:
    assert blockage["type"] == "stairs"
    assert blockage["is_active"] is True


print("Type filter test passed!")

print("\nAll blockage client tests passed!")

print("\nTesting blockages along a route...")

route_coordinates = [
    (15.4909, 73.8278),
    (15.4910, 73.8280),
    (15.4920, 73.8290),
]

from blockage_client import get_blockages_for_route

route_blockages = get_blockages_for_route(
    route_coordinates
)

print("Route blockages:")
print(route_blockages)

assert isinstance(route_blockages, list)

ids = [blockage["id"] for blockage in route_blockages]

assert len(ids) == len(set(ids))

print("Route blockage test passed!")

print("\nAll blockage client tests passed!")