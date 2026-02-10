from sqlalchemy import Column, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base


class WeeklyReport(Base):
    __tablename__ = "weekly_reports"

    id = Column(String(36), primary_key=True, index=True)
    user_id = Column(String(36), index=True, nullable=False)
    username = Column(String(150), nullable=False)
    week_start_date = Column(DateTime, nullable=False)
    content = Column(String(5000), nullable=True)  # Full text summary
    linked_project_ids = Column(JSON, default=list)
    linked_inspiration_ids = Column(JSON, default=list)
    attachments = Column(JSON, default=list)  # List of {name, url, caption, folder}
    created_at = Column(DateTime, nullable=False)

    # Relationship to details
    details = relationship("WeeklyReportDetail", back_populates="report", cascade="all, delete-orphan")


class WeeklyReportDetail(Base):
    __tablename__ = "weekly_report_details"

    id = Column(String(36), primary_key=True, index=True)
    report_id = Column(String(36), ForeignKey("weekly_reports.id"), nullable=False)
    project_id = Column(String(36), nullable=False)
    project_title = Column(String(200), nullable=False)
    content = Column(String(2000), nullable=True)
    plan = Column(String(2000), nullable=True)

    report = relationship("WeeklyReport", back_populates="details")


class Attachment(Base):
    """Generic attachment table for future use."""
    __tablename__ = "attachments"

    id = Column(String(36), primary_key=True, index=True)
    name = Column(String(500), nullable=False)
    url = Column(String(1000), nullable=False)
    caption = Column(String(500), nullable=True)
    folder = Column(String(200), nullable=True)
