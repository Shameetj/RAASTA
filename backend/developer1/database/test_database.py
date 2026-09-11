from database.connection import engine, Base, SessionLocal
from database.models import Blockage

print("Creating database...")

Base.metadata.create_all(bind=engine)

print("Database created successfully!")


db = SessionLocal()

test_blockage = Blockage(
    type="stairs",
    title="Test Stairs",
    latitude=15.4909,
    longitude=73.8278,
    severity="high"
)

db.add(test_blockage)
db.commit()

print("Test blockage inserted!")


blockages = db.query(Blockage).all()

print("\nBlockages in database:")

for blockage in blockages:
    print(
        blockage.id,
        blockage.type,
        blockage.title,
        blockage.latitude,
        blockage.longitude,
        blockage.severity
    )

db.close()

print("\nDatabase test completed! ✅")