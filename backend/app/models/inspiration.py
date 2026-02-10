from sqlalchemy import Column, String, DateTime, JSON
from ..database import Base


class Inspiration(Base):
    __tablename__ = "inspirations"

    id = Column(String(36), primary_key=True, index=True)
    author_id = Column(String(36), nullable=False)
    author_name = Column(String(150), nullable=False)
    content = Column(String(2000), nullable=False)
    tags = Column(JSON, default=list)
    color = Column(String(20), default="#fef3c7")  # Hex color for sticky note
    created_at = Column(DateTime, nullable=False)
