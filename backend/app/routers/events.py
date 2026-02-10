import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from ..database import get_db
from ..models.event import TimelineEvent
from ..schemas.event import EventCreate, EventUpdate, EventResponse
from ..utils.auth import get_current_user
from ..models.user import User

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
    db_event = TimelineEvent(
        id=str(uuid.uuid4()),
        **event.model_dump()
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
