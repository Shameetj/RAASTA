def create_blockage_alert(blockage):
    """
    Create a user-friendly alert from a detected blockage.
    """

    severity = blockage.get("severity", "medium")
    blockage_type = blockage.get("type", "unknown")
    title = blockage.get("title", "Accessibility blockage detected")

    return {
        "alert": True,
        "severity": severity,
        "type": blockage_type,
        "title": title,
        "message": (
            f"{title}. "
            "Finding an accessible alternative route."
        ),
        "blockage_id": blockage.get("id"),
        "latitude": blockage.get("latitude"),
        "longitude": blockage.get("longitude"),
    }