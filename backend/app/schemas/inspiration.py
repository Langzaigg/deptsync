from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class InspirationBase(BaseModel):
    author_id: str
    author_name: str
    content: str
    tags: List[str] = []
    color: str = "#fef3c7"
    created_at: datetime


class InspirationCreate(BaseModel):
    content: str
    tags: List[str] = []
    color: str = "#fef3c7"


class InspirationUpdate(BaseModel):
    content: Optional[str] = None
    tags: Optional[List[str]] = None
    color: Optional[str] = None


class InspirationResponse(InspirationBase):
    id: str

    class Config:
        from_attributes = True
