from database.connection import SessionLocal, Base, engine
from database.models import Blockage


def seed_database():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    try:
        # Clear existing blockage data
        db.query(Blockage).delete()
        db.commit()

        # Clean sample blockages for the demo
        sample_blockages = [
            Blockage(
                type="stairs",
                title="Stairs near main entrance",
                description="A staircase blocks the direct wheelchair route.",
                latitude=15.4909,
                longitude=73.8278,
                severity="high"
            ),
            Blockage(
                type="blocked_ramp",
                title="Wheelchair ramp blocked",
                description="Construction material is blocking the wheelchair ramp.",
                latitude=15.4915,
                longitude=73.8282,
                severity="high"
            ),
            Blockage(
                type="blocked_sidewalk",
                title="Sidewalk blocked",
                description="The sidewalk is partially blocked by construction.",
                latitude=15.4920,
                longitude=73.8290,
                severity="medium"
            ),
            Blockage(
                type="broken_pavement",
                title="Broken pavement",
                description="Uneven pavement may make wheelchair travel difficult.",
                latitude=15.4925,
                longitude=73.8295,
                severity="medium"
            ),
            Blockage(
                type="construction",
                title="Road construction",
                description="Construction work is blocking part of the pedestrian path.",
                latitude=15.4930,
                longitude=73.8300,
                severity="high"
            )
        ]

        db.add_all(sample_blockages)
        db.commit()

        print("Database reset and seeded successfully!")

    finally:
        db.close()


if __name__ == "__main__":
    seed_database()