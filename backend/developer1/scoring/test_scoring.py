from scoring.service import calculate_accessibility_score


class FakeBlockage:
    def __init__(self, blockage_type, title, is_active=True):
        self.type = blockage_type
        self.title = title
        self.is_active = is_active


def test_case(name, blockages):
    result = calculate_accessibility_score(blockages)

    print(f"\n{name}")
    print("-" * 40)
    print(f"Score: {result['score']}")
    print(f"Grade: {result['grade']}")
    print("Breakdown:")

    for item in result["breakdown"]:
        print(f"  {item['type']}: {item['penalty']}")


test_case(
    "Test 1: No obstacles",
    []
)

test_case(
    "Test 2: Stairs",
    [
        FakeBlockage("stairs", "Stairs near entrance")
    ]
)

test_case(
    "Test 3: Blocked ramp",
    [
        FakeBlockage("blocked_ramp", "Ramp blocked")
    ]
)

test_case(
    "Test 4: Blocked sidewalk",
    [
        FakeBlockage("blocked_sidewalk", "Sidewalk blocked")
    ]
)

test_case(
    "Test 5: Stairs + blocked sidewalk",
    [
        FakeBlockage("stairs", "Stairs"),
        FakeBlockage("blocked_sidewalk", "Sidewalk blocked")
    ]
)

test_case(
    "Test 6: Inactive blockage",
    [
        FakeBlockage(
            "stairs",
            "Old stairs",
            is_active=False
        )
    ]
)
print("\nTest 7: Explanation")
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

print(result)