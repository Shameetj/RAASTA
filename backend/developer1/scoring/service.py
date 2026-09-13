PENALTIES = {
    "stairs": 35,
    "blocked_ramp": 30,
    "blocked_sidewalk": 25,
    "construction": 25,
    "road_closure": 35,
    "road_work": 20,
    "hazard": 20,
    "accident": 25,
    "broken_pavement": 0,
}


def calculate_accessibility_score(blockages):
    """
    Calculate wheelchair accessibility score.

    Starts at 100 and subtracts penalties
    for active obstacles along the route.
    """

    score = 100
    breakdown = []

    for blockage in blockages:
        # Support both object attributes and dict keys
        if isinstance(blockage, dict):
            is_active = blockage.get("is_active", True)
            b_type = blockage.get("type", "unknown")
            b_title = blockage.get("title", b_type)
        else:
            is_active = getattr(blockage, "is_active", True)
            b_type = getattr(blockage, "type", "unknown")
            b_title = getattr(blockage, "title", b_type)

        # Ignore inactive blockages
        if not is_active:
            continue

        penalty = PENALTIES.get(b_type, 0)

        if penalty > 0:
            score -= penalty

            breakdown.append({
                "type": b_type,
                "title": b_title,
                "penalty": -penalty
            })

    # Score cannot go below 0
    score = max(score, 0)

    # Determine accessibility grade
    if score >= 80:
        grade = "Highly Accessible"
    elif score >= 60:
        grade = "Moderately Accessible"
    elif score >= 40:
        grade = "Limited Accessibility"
    else:
        grade = "Poor Accessibility"

    # Generate explanation
    if not breakdown:
        explanation = "No accessibility obstacles detected on this route."
    else:
        obstacle_names = [
            item["type"].replace("_", " ")
            for item in breakdown
        ]

        explanation = (
            "Route contains: "
            + ", ".join(obstacle_names)
            + "."
        )

    return {
        "score": score,
        "grade": grade,
        "breakdown": breakdown,
        "explanation": explanation
    }