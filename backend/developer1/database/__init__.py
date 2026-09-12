from .connection import Base, engine, get_db
from .models import Blockage, DemoLocation


def init_db():
    Base.metadata.create_all(bind=engine)