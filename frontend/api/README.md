# Frontend API Client Module (Developer 3)

## Responsibilities
- Centralized HTTP requests communicating with the single backend (`http://localhost:8000`):
  - `fetchLocations()`: Retrieves demo test places (`GET /api/locations`)
  - `fetchBlockages()`: Retrieves known obstacles (`GET /api/blockages`)
  - `calculateRoute({ start, destination, profile })`: Requests route calculation and alerts (`POST /api/routes/calculate`)
  - `reportBlockage(blockageData)`: Submits new obstacle report (`POST /api/blockages`)
  - `resetDemoData()`: Triggers clean demo state reset (`POST /api/demo/reset`)
- Built-in fallback responses for resilient offline testing during presentation
