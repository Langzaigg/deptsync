from pydantic import BaseModel
from typing import Optional, List
from ..models.user import UserRole


class UserBase(BaseModel):
    job_number: str
    name: str
    role: UserRole = UserRole.EMPLOYEE
    avatar: Optional[str] = None
    skills: List[str] = []


class UserCreate(BaseModel):
    job_number: str
    name: str
    password: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    avatar: Optional[str] = None
    skills: Optional[List[str]] = None
    role: Optional[UserRole] = None


class UserResponse(BaseModel):
    id: str
    job_number: str
    name: str
    username: str
    role: UserRole
    avatar: Optional[str] = None
    skills: List[str] = []

    class Config:
        from_attributes = True
