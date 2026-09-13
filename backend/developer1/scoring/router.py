from fastapi import APIRouter, Body
from .service import calculate_accessibility_score
from .schemas import AccessibilityScore

router = APIRouter(
    prefix="/api/scoring",
    tags=["Scoring"]
)


@router.post("/calculate", response_model=AccessibilityScore)
def calculate_score(blockages: list = Body(default_factory=list)):
    return calculate_accessibility_score(blockages)