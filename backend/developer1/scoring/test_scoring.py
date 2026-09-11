from scoring.service import calculate_accessibility_score


class FakeBlockage:
    def __init__(self, blockage_type, title, is_active=True):
        self.type = blockage_type
        self.title = title
        self.is_active = is_active


def test_no_obstacles():
    result = calculate_accessibility_score([])

    assert result["score"] == 100
    assert result["grade"] == "Highly Accessible"


def test_stairs():
    result = calculate_accessibility_score(
        [
            FakeBlockage(
                "stairs",
                "Stairs near entrance"
            )
        ]
    )

    assert result["score"] == 65
    assert result["grade"] == "Moderately Accessible"


def test_blocked_ramp():
    result = calculate_accessibility_score(
        [
            FakeBlockage(
                "blocked_ramp",
                "Ramp blocked"
            )
        ]
    )

    assert result["score"] == 70
    assert result["grade"] == "Moderately Accessible"


def test_blocked_sidewalk():
    result = calculate_accessibility_score(
        [
            FakeBlockage(
                "blocked_sidewalk",
                "Sidewalk blocked"
            )
        ]
    )

    assert result["score"] == 75
    assert result["grade"] == "Moderately Accessible"


def test_stairs_and_blocked_sidewalk():
    result = calculate_accessibility_score(
        [
            FakeBlockage("stairs", "Stairs"),
            FakeBlockage(
                "blocked_sidewalk",
                "Sidewalk blocked"
            )
        ]
    )

    assert result["score"] == 40


def test_inactive_blockage():
    result = calculate_accessibility_score(
        [
            FakeBlockage(
                "stairs",
                "Old stairs",
                is_active=False
            )
        ]
    )

    assert result["score"] == 100
    assert result["grade"] == "Highly Accessible"


def test_explanation():
    result = calculate_accessibility_score(
        [
            FakeBlockage(
                "stairs",
                "Stairs near entrance"
            ),
            FakeBlockage(
                "blocked_ramp",
                "Ramp blocked"
            )
        ]
    )

    assert "score" in result
    assert "grade" in result
    assert "breakdown" in result
    assert "explanation" in result