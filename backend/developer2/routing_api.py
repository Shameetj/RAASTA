from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import Literal

from routing.route_service import calculate_route_from_coordinates


app = FastAPI(
    title="RAASTA Developer 2 Routing API"
)


class Coordinate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class RouteRequest(BaseModel):
    start: Coordinate
    destination: Coordinate
    profile: Literal["wheelchair", "deaf"]
    active_blockages: list[dict] = Field(default_factory=list)


@app.get("/")
def root():
    return {
        "message": "RAASTA Developer 2 routing service is working!"
    }


@app.post("/route")
def calculate_route(request: RouteRequest):
    try:
        result = calculate_route_from_coordinates(
            start_latitude=request.start.latitude,
            start_longitude=request.start.longitude,
            destination_latitude=request.destination.latitude,
            destination_longitude=request.destination.longitude,
            active_blockages=request.active_blockages,
            profile=request.profile,
        )

        if not result.get("success", False):
            raise HTTPException(
                status_code=503,
                detail=result,
            )

        return result

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Developer 2 routing service failed: {exc}",
        )