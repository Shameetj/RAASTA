from pydantic import BaseModel


class ScoreBreakdown(BaseModel):
    type: str
    title: str
    penalty: int


class AccessibilityScore(BaseModel):
    score: int
    grade: str
    breakdown: list[ScoreBreakdown]
    explanation: str