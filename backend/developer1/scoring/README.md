# Accessibility Scoring Module (Developer 1)

## Responsibilities
- 0 to 100 wheelchair accessibility score calculation logic
- Penalties definition:
  - Direct route has stairs: severe penalty (-35 pts)
  - Direct route has blocked ramp: penalty (-30 pts)
  - Blocked sidewalk / construction: penalty (-25 pts)
- Detour recovery bonus: when a certified step-free ramp detour bypasses the blockage, grade as "Highly Accessible (Via Detour)"
- Breakdown explanation (slope grade, ramp presence, sidewalk quality)
