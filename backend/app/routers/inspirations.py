import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from ..database import get_db
from ..models.inspiration import Inspiration
from ..schemas.inspiration import InspirationCreate, InspirationUpdate, InspirationResponse
from ..utils.auth import get_current_user
from ..models.user import User

router = APIRouter(prefix="/api/inspirations", tags=["inspirations"])


@router.get("", response_model=List[InspirationResponse])
async def get_all_inspirations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all inspirations."""
    return db.query(Inspiration).order_by(Inspiration.created_at.desc()).all()


@router.post("", response_model=InspirationResponse)
async def create_inspiration(
    inspiration: InspirationCreate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Create a new inspiration."""
    db_inspiration = Inspiration(
        id=str(uuid.uuid4()),
        author_id=current_user.id,
        author_name=current_user.username,
        content=inspiration.content,
        tags=inspiration.tags,
        color=inspiration.color,
        created_at=datetime.utcnow()
    )
    db.add(db_inspiration)
    db.commit()
    db.refresh(db_inspiration)
    return db_inspiration


@router.put("/{inspiration_id}", response_model=InspirationResponse)
async def update_inspiration(
    inspiration_id: str, 
    update: InspirationUpdate, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Update an inspiration."""
    inspiration = db.query(Inspiration).filter(Inspiration.id == inspiration_id).first()
    if not inspiration:
        raise HTTPException(status_code=404, detail="Inspiration not found")
    
    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(inspiration, key, value)
    
    db.commit()
    db.refresh(inspiration)
    return inspiration


@router.delete("/{inspiration_id}")
async def delete_inspiration(
    inspiration_id: str, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    """Delete an inspiration."""
    inspiration = db.query(Inspiration).filter(Inspiration.id == inspiration_id).first()
    if not inspiration:
        raise HTTPException(status_code=404, detail="Inspiration not found")
    
    db.delete(inspiration)
    db.commit()
    return {"message": "Inspiration deleted"}
