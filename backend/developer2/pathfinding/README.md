# Pathfinding Module (Developer 2)

## Responsibilities
- Pedestrian route retrieval from public Open Source Routing Machine (OSRM) foot API:
  `https://router.project-osrm.org/route/v1/foot/...`
- Fallback route generator (guarantees guaranteed offline routing during live hackathon demos)
- Haversine distance calculator between coordinates
- Detour path generator: when a route segment is blocked by stairs, compute alternative waypoints that divert the user through an accessible ramp corridor.
