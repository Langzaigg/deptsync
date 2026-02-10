from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from ..models.event import EventType


class AttachmentBase(BaseModel):
    name: str
    url: str
    caption: Optional[str] = None
    folder: Optional[str] = None


class AttachmentCreate(AttachmentBase):
    @field_validator('url')
    @classmethod
    def strip_prefix(cls, v: str) -> str:
        if v and v.startswith('/api/files/content/'):
             return v.replace('/api/files/content/', '', 1)
        return v


class AttachmentResponse(AttachmentBase):
    @field_validator('url', mode='before')
    @classmethod
    def transform_url(cls, v: str) -> str:
        # Transform relative path to proxy URL
        if v and not v.startswith(('http', 'data:', '/')):
             return f"/api/files/content/{v}"
        return v


# Legacy support
AttachmentSchema = AttachmentBase


class EventBase(BaseModel):
    project_id: str
    author_id: str
    author_name: str
    content: str
    date: datetime
    type: EventType = EventType.UPDATE
    attachments: List[AttachmentCreate] = []


class EventCreate(EventBase):
    date: Optional[datetime] = None


class EventUpdate(BaseModel):
    content: Optional[str] = None
    type: Optional[EventType] = None
    attachments: Optional[List[AttachmentCreate]] = None


class EventResponse(EventBase):
    id: str
    attachments: List[AttachmentResponse] = []

    class Config:
        from_attributes = True
