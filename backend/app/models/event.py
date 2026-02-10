from sqlalchemy import Column, String, Enum as SQLEnum, DateTime, JSON
from ..database import Base
import enum


class EventType(str, enum.Enum):
    UPDATE = "UPDATE"
    MILESTONE = "MILESTONE"
    ISSUE = "ISSUE"
    WEEKLY_REPORT = "WEEKLY_REPORT"
    MONTHLY_REPORT = "MONTHLY_REPORT"
    MEETING_MINUTES = "MEETING_MINUTES"


class TimelineEvent(Base):
    __tablename__ = "events"

    id = Column(String(36), primary_key=True, index=True)
    project_id = Column(String(36), index=True, nullable=False)
    author_id = Column(String(36), nullable=False)
    author_name = Column(String(150), nullable=False)
    content = Column(String(5000), nullable=False)
    date = Column(DateTime, nullable=False)
    type = Column(SQLEnum(EventType), default=EventType.UPDATE)
    attachments = Column(JSON, default=list)  # List of {name, url, caption, folder}
