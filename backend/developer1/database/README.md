# Database Module (Developer 1)

## Responsibilities
- SQLite database connection (`raasta.db`)
- SQLAlchemy declarative base and session management (`get_db`)
- Database tables:
  - `blockages` (id, type, title, description, latitude, longitude, severity, is_active, created_at)
  - `demo_locations` (id, name, category, latitude, longitude, description)
- Seed script with sample demo obstacles (stairs, blocked ramps)
