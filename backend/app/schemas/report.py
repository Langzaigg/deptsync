from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .event import AttachmentSchema


class ReportDetailSchema(BaseModel):
    project_id: str
    project_title: str
    content: Optional[str] = None
    plan: Optional[str] = None


class ReportBase(BaseModel):
    user_id: str
    username: str
    week_start_date: datetime
    content: Optional[str] = None
    details: List[ReportDetailSchema] = []
    linked_project_ids: List[str] = []
    linked_inspiration_ids: List[str] = []
    attachments: List[AttachmentSchema] = []
    created_at: datetime


class ReportCreate(BaseModel):
    week_start_date: datetime
    content: Optional[str] = None
    details: List[ReportDetailSchema] = []
    linked_project_ids: List[str] = []
    linked_inspiration_ids: List[str] = []
    attachments: List[AttachmentSchema] = []


class ReportResponse(ReportBase):
    id: str

    class Config:
        from_attributes = True
