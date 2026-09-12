from datetime import datetime

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime
)

from .connection import Base


class Blockage(Base):
    __tablename__ = "blockages"

    id = Column(Integer, primary_key=True, index=True)

    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    severity = Column(String, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )


class DemoLocation(Base):
    __tablename__ = "demo_locations"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String, nullable=False)
    category = Column(String, nullable=False)

    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    description = Column(String, nullable=True)