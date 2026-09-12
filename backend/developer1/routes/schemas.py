from typing import Literal

from pydantic import BaseModel, Field


class Coordinate(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)


class RouteCalculateRequest(BaseModel):
    start: Coordinate
    destination: Coordinate
    profile: Literal["wheelchair", "deaf"]