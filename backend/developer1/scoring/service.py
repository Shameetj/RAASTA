PENALTIES = {
    "stairs": 35,
    "blocked_ramp": 30,
    "blocked_sidewalk": 25,
    "construction": 25,
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

        # Ignore inactive blockages
        if not blockage.is_active:
            continue

        penalty = PENALTIES.get(blockage.type, 0)

        if penalty > 0:
            score -= penalty

            breakdown.append({
                "type": blockage.type,
                "title": blockage.title,
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