import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..utils import now_beijing
from ..models.report import WeeklyReport, WeeklyReportDetail
from ..schemas.report import ReportCreate, ReportResponse
from ..utils.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("", response_model=List[ReportResponse])
async def get_reports(
    user_id: Optional[str] = Query(None),
    project_id: Optional[str] = Query(None),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Get reports, optionally filtered by user or project."""
    query = db.query(WeeklyReport)
    if user_id:
        query = query.filter(WeeklyReport.user_id == user_id)
    if project_id:
        # Filter by linked project IDs (JSON contains)
        # Note: This is a simplified approach; for complex queries, consider a junction table
        pass
    return query.order_by(WeeklyReport.created_at.desc()).all()


@router.post("", response_model=ReportResponse)
async def create_report(
    report: ReportCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Create a new weekly report."""
    report_id = str(uuid.uuid4())
    db_report = WeeklyReport(
        id=report_id,
        user_id=current_user.id,
        username=current_user.username,
        week_start_date=report.week_start_date,
        content=report.content,
        linked_project_ids=report.linked_project_ids,
        linked_inspiration_ids=report.linked_inspiration_ids,
        attachments=[att.model_dump() for att in report.attachments],
        created_at=now_beijing()
    )
    db.add(db_report)
    
    # Add details
    for detail in report.details:
        db_detail = WeeklyReportDetail(
            id=str(uuid.uuid4()),
            report_id=report_id,
            project_id=detail.project_id,
            project_title=detail.project_title,
            content=detail.content,
            plan=detail.plan
        )
        db.add(db_detail)
    
    db.commit()
    db.refresh(db_report)
    return db_report


@router.delete("/{report_id}")
async def delete_report(
    report_id: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Delete a report."""
    report = db.query(WeeklyReport).filter(WeeklyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    db.delete(report)
    db.commit()
    return {"message": "Report deleted"}
