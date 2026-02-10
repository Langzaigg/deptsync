import uuid
from urllib.parse import quote
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.project import Project
from ..schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse
from ..utils.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=List[ProjectResponse])
async def get_all_projects(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all projects."""
    return db.query(Project).all()


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a single project by ID."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("", response_model=ProjectResponse)
async def create_project(
    project: ProjectCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Create a new project."""
    db_project = Project(
        id=str(uuid.uuid4()),
        **project.model_dump()
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project


@router.put("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str, 
    update: ProjectUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Update a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(project, key, value)
    
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}")
async def delete_project(
    project_id: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Delete a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    db.delete(project)
    db.commit()
    return {"message": "Project deleted"}


@router.post("/{project_id}/timeline/export")
async def export_project_timeline(
    project_id: str,
    event_ids: List[str] = Body(default=[]),
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """
    Export project timeline to DOCX.
    If event_ids is provided, export only those events.
    If empty, export ALL events for the project.
    """
    from fastapi.responses import StreamingResponse
    from ..services.docx_service import generate_timeline_docx
    from ..models.event import TimelineEvent
    from ..schemas.event import EventResponse
    from datetime import datetime
    
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
        
    query = db.query(TimelineEvent).filter(TimelineEvent.project_id == project_id)
    
    if event_ids:
        query = query.filter(TimelineEvent.id.in_(event_ids))
        
    # Order by date descending
    events = query.order_by(TimelineEvent.date.desc()).all()
    
    if not events:
        raise HTTPException(status_code=404, detail="No events found to export")
        
    # Serialize events
    events_data = [EventResponse.model_validate(e).model_dump() for e in events]
    
    file_stream = generate_timeline_docx(project.title, events_data)
    
    date_str = datetime.now().strftime('%Y%m%d')
    filename = f"timeline_{project.title}_{date_str}.docx"
    filename_encoded = quote(filename)
    
    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename*=utf-8''{filename_encoded}"}
    )
