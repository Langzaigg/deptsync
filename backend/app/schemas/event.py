from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from ..models.event import EventType


class AttachmentSchema(BaseModel):
    name: str
    url: str
    caption: Optional[str] = None
    folder: Optional[str] = None


class EventBase(BaseModel):
    project_id: str
    author_id: str
    author_name: str
    content: str
    date: datetime
    type: EventType = EventType.UPDATE
    attachments: List[AttachmentSchema] = []


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    content: Optional[str] = None
    type: Optional[EventType] = None
    attachments: Optional[List[AttachmentSchema]] = None


class EventResponse(EventBase):
    id: str

    class Config:
        from_attributes = True
