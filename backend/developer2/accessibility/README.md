# Accessibility Engine Module (Developer 2)

## Responsibilities
- Obstacle proximity and collision detection:
  - Perpendicular point-to-segment distance algorithm
  - Compares route coordinates against active blockages list within a safety threshold buffer (e.g. 30–35 meters)
- Visual alert generator for Deaf / Hard of Hearing profile:
  - High-visibility warning alert payload
  - Vibration pattern array (e.g. `[250, 100, 250, 100, 450]`) for browser/hardware vibration
- Turn-by-turn visual instruction steps with hazard warning badges and accessible ramp directions.
