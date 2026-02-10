import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..utils import now_beijing
from ..database import get_db
from ..models.event import TimelineEvent
from ..schemas.event import EventCreate, EventUpdate, EventResponse
from ..utils.auth import get_current_user
from ..models.user import User
from ..services.docx_service import generate_event_docx
from fastapi.responses import StreamingResponse
from urllib.parse import quote

router = APIRouter(prefix="/api/events", tags=["events"])


@router.get("", response_model=List[EventResponse])
async def get_events(
    project_id: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Get events, optionally filtered by project and date range."""
    query = db.query(TimelineEvent)
    if project_id:
        query = query.filter(TimelineEvent.project_id == project_id)
    if start_date:
        query = query.filter(TimelineEvent.date >= datetime.fromisoformat(start_date))
    if end_date:
        query = query.filter(TimelineEvent.date <= datetime.fromisoformat(end_date))
    return query.order_by(TimelineEvent.date.desc()).all()


@router.post("", response_model=EventResponse)
async def create_event(
    event: EventCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Create a new timeline event."""
    # Use Beijing time for creation if not provided or just force it
    # Ideally frontend sends time, but we can default to server time (which is technically UTC in container usually, but we want Beijing strings)
    # The utils.now_beijing() returns a datetime object in Beijing timezone (if configured) or UTC+8
    
    db_event = TimelineEvent(
        id=str(uuid.uuid4()),
        project_id=event.project_id,
        author_id=event.author_id,
        author_name=event.author_name,
        content=event.content,
        date=now_beijing(), # This might be overridden if event.date is passed? Schema doesn't have date in Create?
        # Check schema: EventCreate usually doesn't have date, it's auto-set? 
        # Looking at previous code, it used `date=now_beijing()`.
        # Wait, the previous code had `type=event.type`.
        type=event.type,
        attachments=[att.model_dump() for att in event.attachments]
    )
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    return db_event


@router.put("/{event_id}", response_model=EventResponse)
async def update_event(
    event_id: str, 
    update: EventUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Update an event."""
    event = db.query(TimelineEvent).filter(TimelineEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(event, key, value)
    
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}")
async def delete_event(
    event_id: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Delete an event."""
    event = db.query(TimelineEvent).filter(TimelineEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    
    db.delete(event)
    db.commit()
    return {"message": "Event deleted"}


@router.get("/{event_id}/export")
async def export_event(
    event_id: str,
    db: Session = Depends(get_db),
    # current_user: User = Depends(get_current_user)
):
    """Export a single event to DOCX."""
    
    event = db.query(TimelineEvent).filter(TimelineEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
        
    event_dto = EventResponse.model_validate(event)
    event_data = event_dto.model_dump()
    
    file_stream = generate_event_docx(event_data)
    
    # Sanitize filename
    date_part = str(event.date)[:10] if event.date else "unknown"
    author_part = event.author_name if event.author_name else "unknown"
    filename = f"event_{author_part}_{date_part}.docx"
    
    filename = f"event_{author_part}_{date_part}.docx"
    filename_encoded = quote(filename)
    
    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename*=utf-8''{filename_encoded}"}
    )
