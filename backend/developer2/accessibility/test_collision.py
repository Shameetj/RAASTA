from collision import is_route_blocked


# Route points
route = [
    (15.4900, 73.8200),
    (15.4910, 73.8210),
    (15.4920, 73.8220),
]


# Blockage close to the route
nearby_blockage = (15.4910, 73.8211)


# Blockage far away from the route
far_blockage = (15.5000, 73.8300)


print("Nearby blockage:")
print(
    is_route_blocked(
        route,
        nearby_blockage,
    )
)


print("\nFar blockage:")
print(
    is_route_blocked(
        route,
        far_blockage,
    )
)