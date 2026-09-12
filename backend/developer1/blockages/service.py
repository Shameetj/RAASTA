from sqlalchemy.orm import Session

from database.models import Blockage
from .schemas import BlockageCreate


def create_blockage(
    db: Session,
    blockage_data: BlockageCreate
):
    blockage = Blockage(
        **blockage_data.model_dump()
    )

    db.add(blockage)
    db.commit()
    db.refresh(blockage)

    return blockage


def get_active_blockages(db: Session):
    return (
        db.query(Blockage)
        .filter(Blockage.is_active == True)
        .all()
    )


def get_blockages_by_type(
    db: Session,
    blockage_type: str
):
    return (
        db.query(Blockage)
        .filter(
            Blockage.type == blockage_type,
            Blockage.is_active == True
        )
        .all()
    )


def get_blockages_near_location(
    db: Session,
    latitude: float,
    longitude: float,
    radius: float = 0.001
):
    return (
        db.query(Blockage)
        .filter(
            Blockage.is_active == True,
            Blockage.latitude.between(
                latitude - radius,
                latitude + radius
            ),
            Blockage.longitude.between(
                longitude - radius,
                longitude + radius
            )
        )
        .all()
    )


def clear_blockage(
    db: Session,
    blockage_id: int
):
    blockage = (
        db.query(Blockage)
        .filter(Blockage.id == blockage_id)
        .first()
    )

    if blockage is None:
        return None

    blockage.is_active = False

    db.commit()
    db.refresh(blockage)

    return blockage