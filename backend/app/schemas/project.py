from pydantic import BaseModel
from typing import Optional, List
from datetime import date
from ..models.project import ProjectStatus, ProjectPriority


class ProjectBase(BaseModel):
    title: str
    project_number: Optional[str] = None
    customer_name: Optional[str] = None
    priority: ProjectPriority = ProjectPriority.NORMAL
    description: Optional[str] = None
    business_scenario: Optional[str] = None
    status: ProjectStatus = ProjectStatus.INITIATION
    start_date: date
    end_date: Optional[date] = None
    manager_id: str
    admins: List[str] = []
    members: List[str] = []
    budget: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    project_number: Optional[str] = None
    customer_name: Optional[str] = None
    priority: Optional[ProjectPriority] = None
    description: Optional[str] = None
    business_scenario: Optional[str] = None
    status: Optional[ProjectStatus] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    admins: Optional[List[str]] = None
    members: Optional[List[str]] = None
    budget: Optional[str] = None


class ProjectResponse(ProjectBase):
    id: str

    class Config:
        from_attributes = True
