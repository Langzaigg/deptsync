from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from ..models.task import TaskStatus


class TaskRemarkSchema(BaseModel):
    author_id: str
    author_name: str
    content: str
    date: str


class TaskBase(BaseModel):
    project_id: str
    title: str
    description: Optional[str] = None
    assignee_ids: List[str] = []
    deadline: date
    progress: int = 0
    status: TaskStatus = TaskStatus.PENDING
    remarks: List[TaskRemarkSchema] = []


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assignee_ids: Optional[List[str]] = None
    deadline: Optional[date] = None
    progress: Optional[int] = None
    status: Optional[TaskStatus] = None
    remarks: Optional[List[TaskRemarkSchema]] = None


class TaskResponse(TaskBase):
    id: str

    class Config:
        from_attributes = True
