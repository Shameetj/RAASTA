# API Specification (Developer 4)

## Base URL
`http://localhost:8000/api`

---

### 1. `GET /locations`
- **Owner**: Dev 2 / Dev 1
- **Description**: Returns preset demo locations for 1-click test scenarios.
- **Response**: Array of `{ id, name, category, latitude, longitude, description }`.

---

### 2. `GET /blockages`
- **Owner**: Dev 1
- **Description**: Returns all active physical barriers (stairs, blocked ramps, construction).
- **Response**: Array of `{ id, type, title, description, latitude, longitude, severity, is_active }`.

---

### 3. `POST /blockages`
- **Owner**: Dev 1
- **Description**: Reports a new accessibility barrier.
- **Request Body**:
  ```json
  {
    "type": "stairs",
    "title": "Main Plaza Flight of 18 Steps",
    "description": "Concrete steps without ramp",
    "latitude": 28.6353,
    "longitude": 77.2182,
    "severity": "critical"
  }
  ```

---

### 4. `POST /routes/calculate`
- **Owner**: Dev 2
- **Description**: Primary navigation endpoint. Computes route, detects obstacles, generates step-free detour, calculates score, and prepares visual/vibration alerts.
- **Request Body**:
  ```json
  {
    "start": {"lat": 28.6315, "lng": 77.2167, "name": "Metro Station"},
    "destination": {"lat": 28.6358, "lng": 77.2215, "name": "Central Library"},
    "profile": "wheelchair"
  }
  ```
- **Response**:
  - `direct_route`: `{ coordinates, distance_meters, is_blocked, blockages_found }`
  - `alternative_route`: `{ coordinates, distance_meters, is_blocked, features, accessible_ramps }`
  - `accessibility_score`: `{ score, grade, breakdown }`
  - `visual_alerts`: Array of `{ level, title, message, icon, vibrate, vibration_pattern }`
  - `turn_by_turn`: Array of `{ step, instruction, visual_cue, icon, is_hazard, coordinates }`
