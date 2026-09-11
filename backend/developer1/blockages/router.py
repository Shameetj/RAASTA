from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.connection import get_db

from .schemas import (
    BlockageCreate,
    BlockageResponse
)

from .service import (
    create_blockage,
    get_active_blockages,
    get_blockages_by_type,
    get_blockages_near_location,
    clear_blockage
)


router = APIRouter(
    prefix="/api/blockages",
    tags=["Blockages"]
)


@router.post(
    "",
    response_model=BlockageResponse
)
def report_blockage(
    blockage: BlockageCreate,
    db: Session = Depends(get_db)
):
    return create_blockage(db, blockage)


@router.get(
    "",
    response_model=list[BlockageResponse]
)
def list_blockages(
    type: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
    radius: float = 0.001,
    db: Session = Depends(get_db)
):
    if lat is not None and lon is not None:
        return get_blockages_near_location(
            db,
            lat,
            lon,
            radius
        )

    if type:
        return get_blockages_by_type(
            db,
            type
        )

    return get_active_blockages(db)


@router.delete(
    "/{blockage_id}",
    response_model=BlockageResponse
)
def delete_blockage(
    blockage_id: int,
    db: Session = Depends(get_db)
):
    blockage = clear_blockage(
        db,
        blockage_id
    )

    if blockage is None:
        raise HTTPException(
            status_code=404,
            detail="Blockage not found"
        )

    return blockage