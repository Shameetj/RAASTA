from fastapi import APIRouter, Query
from typing import List, Dict, Any

from .service import get_live_incidents

router = APIRouter(
    prefix="/api",
    tags=["Live Incidents"]
)


@router.get("/live-incidents")
def fetch_live_incidents(
    lat: float = Query(..., description="Center latitude"),
    lon: float = Query(..., description="Center longitude"),
    radius: float = Query(5000.0, description="Search radius in meters (default: 5000)")
) -> Dict[str, Any]:
    """
    Returns live road traffic incidents from TomTom Traffic Incident API.
    Fails safely and gracefully if external provider is unavailable.
    """
    try:
        incidents = get_live_incidents(lat=lat, lon=lon, radius=radius)
        return {
            "success": True,
            "source": "tomtom",
            "count": len(incidents),
            "incidents": incidents
        }
    except Exception as exc:
        print(f"[API Error in /live-incidents]: {exc}")
        return {
            "success": True,
            "source": "tomtom",
            "count": 0,
            "incidents": []
        }
