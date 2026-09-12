from datetime import datetime

from pydantic import BaseModel, Field


class BlockageCreate(BaseModel):
    type: str
    title: str
    description: str | None = None

    latitude: float
    longitude: float

    severity: str = Field(
        default="medium",
        pattern="^(low|medium|high)$"
    )


class BlockageResponse(BaseModel):
    id: int
    type: str
    title: str
    description: str | None

    latitude: float
    longitude: float

    severity: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True