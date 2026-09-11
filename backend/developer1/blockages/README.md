# Blockages Module (Developer 1)

## Responsibilities
- Blockage schemas (Pydantic models: `BlockageCreate`, `BlockageResponse`)
- Query functions to get all active blockages and filter by type or coordinates
- Endpoint handler for reporting new community obstacles (`POST /api/blockages`)
- Endpoint handler for listing obstacles (`GET /api/blockages`)
- Endpoint handler for clearing/deleting resolved obstacles (`DELETE /api/blockages/{id}`)
