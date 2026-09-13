import os

import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.connection import get_db
from blockages.service import get_active_blockages

from .schemas import RouteCalculateRequest


DEV2_ROUTING_URL = os.getenv(
    "DEV2_ROUTING_URL",
    "https://raasta-dev2.onrender.com/route",
)
router = APIRouter(
    prefix="/api/routes",
    tags=["Routes"],
)


@router.post("/calculate")
def calculate_route_endpoint(
    request: RouteCalculateRequest,
    db: Session = Depends(get_db),
):
    try:
        # Get all active blockages from Developer 1's database.
        blockage_records = get_active_blockages(db)

        # Convert SQLAlchemy objects into dictionaries
        # expected by Developer 2's routing service.
        active_blockages = [
            {
                "id": blockage.id,
                "type": blockage.type,
                "title": blockage.title,
                "description": blockage.description,
                "latitude": blockage.latitude,
                "longitude": blockage.longitude,
                "severity": blockage.severity,
                "is_active": blockage.is_active,
                "created_at": blockage.created_at.isoformat()
                if blockage.created_at
                else None,
            }
            for blockage in blockage_records
        ]

        # Send the route request to Developer 2 over Radmin VPN.
        dev2_response = requests.post(
            DEV2_ROUTING_URL,
            json={
                "start": {
                    "latitude": request.start.latitude,
                    "longitude": request.start.longitude,
                },
                "destination": {
                    "latitude": request.destination.latitude,
                    "longitude": request.destination.longitude,
                },
                "profile": request.profile,
                "active_blockages": active_blockages,
            },
            timeout=60,
        )

        # If Developer 2 returns an HTTP error, forward a useful message.
        if not dev2_response.ok:
            raise HTTPException(
                status_code=503,
                detail={
                    "message": "Developer 2 routing service failed.",
                    "status_code": dev2_response.status_code,
                    "response": dev2_response.text,
                },
            )

        result = dev2_response.json()

        # A failed route should not be returned as HTTP success.
        if not result.get("success", False):
            raise HTTPException(
                status_code=503,
                detail=result,
            )

        return result

    except HTTPException:
        raise

    except requests.RequestException as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Could not connect to Developer 2 routing service: {exc}",
        )

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Routing service failed: {exc}",
        )