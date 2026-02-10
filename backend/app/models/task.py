from sqlalchemy import Column, String, Enum as SQLEnum, JSON, Date, Integer
from ..database import Base
import enum


class TaskStatus(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"


class TaskAssignment(Base):
    __tablename__ = "tasks"

    id = Column(String(36), primary_key=True, index=True)
    project_id = Column(String(36), index=True, nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(String(2000), nullable=True)
    assignee_ids = Column(JSON, default=list)
    deadline = Column(Date, nullable=False)
    progress = Column(Integer, default=0)  # 0-100
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.PENDING)
    remarks = Column(JSON, default=list)  # List of {authorId, authorName, content, date}
