import uuid
from urllib.parse import quote
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


@router.get("/{report_id}/export")
async def export_report(
    report_id: str,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Export a single report to DOCX."""
    from fastapi.responses import StreamingResponse
    from ..services.docx_service import generate_report_docx
    
    report = db.query(WeeklyReport).filter(WeeklyReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    # Serialize via Pydantic to ensure all fields/relationships are loaded
    report_dto = ReportResponse.model_validate(report)
    report_data = report_dto.model_dump()
    
    file_stream = generate_report_docx(report_data)
    
    # Safe filename
    date_str = report.created_at.strftime('%Y%m%d')
    filename = f"report_{report.username}_{date_str}.docx"
    filename_encoded = quote(filename)
    
    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename*=utf-8''{filename_encoded}"}
    )


@router.post("/batch-export")
async def batch_export_reports(
    report_ids: List[str],
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Export multiple reports as a ZIP file containing DOCX files."""
    from fastapi.responses import StreamingResponse
    from ..services.docx_service import generate_report_docx
    import zipfile
    from io import BytesIO
    from fastapi.encoders import jsonable_encoder
    
    reports = db.query(WeeklyReport).filter(WeeklyReport.id.in_(report_ids)).all()
    if not reports:
        raise HTTPException(status_code=404, detail="No reports found")
        
    zip_buffer = BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        for report in reports:
            report_dto = ReportResponse.model_validate(report)
            report_data = report_dto.model_dump()
            
            docx_stream = generate_report_docx(report_data)
            
            date_str = report.created_at.strftime('%Y%m%d')
            filename = f"report_{report.username}_{date_str}.docx"
            
            # Handle duplicate filenames
            if filename in zip_file.namelist():
                filename = f"report_{report.username}_{date_str}_{report.id[:4]}.docx"

            zip_file.writestr(filename, docx_stream.getvalue())
            
    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": "attachment; filename=reports_batch.zip"}
    )
