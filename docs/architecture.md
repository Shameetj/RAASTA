# RAASTA Architecture Overview (Developer 4)

## Problem Statement
Standard navigation applications optimize for speed or vehicular traffic, frequently leading wheelchair users into flights of stairs or blocked sidewalks, and neglecting the critical visual and tactile feedback needed by deaf and hard-of-hearing pedestrians.

## Solution Architecture
- **Single Backend**: Python + FastAPI service hosting both data management and routing engines.
- **Single Database**: SQLite storing obstacles (stairs, blocked ramps, broken sidewalks) and preset test POIs.
- **Frontend**: React + Leaflet rendering interactive routes, obstacle markers, step-free detours, and visual alert cues.

## High-Level Data Flow
1. User selects Origin and Destination.
2. Frontend sends request to `POST /api/routes/calculate`.
3. Routing engine (Dev 2) extracts base route coordinates and queries blockages from database (Dev 1).
4. Collision engine checks if any route segment passes within 35m of an active blockage.
5. If blocked:
   - Alternative detour path with ramp waypoints is generated.
   - Accessibility score (Dev 1) evaluates obstacles vs. detour.
   - Visual alerts and tactile vibration patterns are prepared for Deaf/HoH users.
6. Frontend receives payload and updates the map, alert banner, and turn-by-turn cards.
