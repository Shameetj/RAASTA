from fastapi import FastAPI

from database import Base, engine
from blockages.router import router as blockage_router
from routes.router import router as routes_router


# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="RAASTA Developer 1 Test API"
)


app.include_router(blockage_router)
app.include_router(routes_router)


@app.get("/")
def root():
    return {
        "message": "RAASTA Developer 1 backend is working!"
    }