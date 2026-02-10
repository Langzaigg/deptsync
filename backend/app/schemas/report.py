from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime
from .event import AttachmentSchema, AttachmentCreate, AttachmentResponse


class ReportDetailSchema(BaseModel):
    project_id: str
    project_title: str
    content: Optional[str] = None
    plan: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


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
    
    model_config = ConfigDict(from_attributes=True)


class ReportCreate(BaseModel):
    week_start_date: datetime
    content: Optional[str] = None
    details: List[ReportDetailSchema] = []
    linked_project_ids: List[str] = []
    linked_inspiration_ids: List[str] = []
    attachments: List[AttachmentCreate] = []


class ReportResponse(ReportBase):
    id: str
    attachments: List[AttachmentResponse] = []

    model_config = ConfigDict(from_attributes=True)
