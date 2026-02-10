from sqlalchemy import Column, String, Enum as SQLEnum, JSON, Date
from ..database import Base
import enum


class ProjectStatus(str, enum.Enum):
    INITIATION = "INITIATION"
    EXECUTION = "EXECUTION"
    ACCEPTANCE = "ACCEPTANCE"
    CLOSED = "CLOSED"


class ProjectPriority(str, enum.Enum):
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, index=True)
    title = Column(String(200), nullable=False)
    project_number = Column(String(100), nullable=True)
    customer_name = Column(String(200), nullable=True)
    priority = Column(SQLEnum(ProjectPriority), default=ProjectPriority.NORMAL)
    description = Column(String(2000), nullable=True)
    business_scenario = Column(String(2000), nullable=True)
    status = Column(SQLEnum(ProjectStatus), default=ProjectStatus.INITIATION)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    manager_id = Column(String(36), nullable=False)  # Project Creator
    admins = Column(JSON, default=list)  # Additional admin user IDs
    members = Column(JSON, default=list)  # Member user IDs
    budget = Column(String(100), nullable=True)
