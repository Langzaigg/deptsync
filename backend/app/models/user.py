from sqlalchemy import Column, String, Enum as SQLEnum, JSON
from ..database import Base
import enum


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    EMPLOYEE = "EMPLOYEE"


class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, index=True)
    job_number = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=False)
    username = Column(String(150), nullable=False)  # Display name: 姓名(工号)
    role = Column(SQLEnum(UserRole), default=UserRole.EMPLOYEE)
    avatar = Column(String(500), nullable=True)
    skills = Column(JSON, default=list)  # List of skill tags
