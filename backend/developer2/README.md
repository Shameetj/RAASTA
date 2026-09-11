# Developer 2: Routing, Pathfinding & Accessibility Engine

Welcome Developer 2! This folder is dedicated to your work.

## Ownership & Scope
You are responsible for:
1. **`routing/`**: Calculating routes between start and destination coordinates, assembling the final navigation response, and exposing the `/api/routes/calculate` endpoint.
2. **`pathfinding/`**: Base pedestrian walking paths (via OSRM API or coordinate graph) and automatic alternative detour routing when hazards occur.
3. **`accessibility/`**: Obstacle collision/proximity detection (checking whether the pedestrian route intersects any known stairs or blockages).

## Guidelines
- Query blockages using Developer 1's database models or query functions.
- Call Developer 1's scoring function to attach the accessibility score to the navigation response.
- Keep your routing code independent so you can unit test with mock coordinates without needing the DB.
