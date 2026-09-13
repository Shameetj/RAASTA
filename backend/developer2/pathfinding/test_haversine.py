from haversine import calculate_haversine_distance


distance = calculate_haversine_distance(
    (15.4900, 73.8200),
    (15.5000, 73.8300)
)

print(f"Distance: {distance:.2f} meters")