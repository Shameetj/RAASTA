from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from blockages.router import router as blockage_router
from routes.router import router as routes_router


# Create database tables
Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="RAASTA Developer 1 Test API"
)


# Allow requests from the RAASTA frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://26.158.122.137:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# Include API routers
app.include_router(blockage_router)
app.include_router(routes_router)


@app.get("/")
def root():
    return {
        "message": "RAASTA Developer 1 backend is working!"
    }