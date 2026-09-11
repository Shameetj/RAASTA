# Developer 1: Database, Blockages & Accessibility Scoring

Welcome Developer 1! This folder is dedicated to your work.

## Ownership & Scope
You are responsible for:
1. **`database/`**: Setting up the SQLite connection, configuring SQLAlchemy models, and creating initial tables.
2. **`blockages/`**: Implementing endpoints and services for reporting, retrieving, and filtering physical obstacles (stairs, blocked ramps, broken sidewalks).
3. **`scoring/`**: Designing and implementing the algorithm that calculates a 0–100 wheelchair accessibility score based on obstacles along the route.

## Guidelines
- Keep your data models and functions modular so Developer 2 can easily query blockages and call your scoring function.
- Avoid modifying `backend/developer2/` directly; agree on shared interfaces.
