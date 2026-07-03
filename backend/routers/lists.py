from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
from dependencies import get_current_user

router = APIRouter(prefix="/api/lists", tags=["lists"])

@router.post("", response_model=schemas.ListResponse)
def create_list(lst: schemas.ListCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_list = models.List(**lst.model_dump())
    db.add(db_list)
    db.commit()
    db.refresh(db_list)
    return db_list

@router.get("", response_model=List[schemas.ListResponse])
def get_lists(folder_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.List).filter(models.List.folder_id == folder_id).all()

@router.put("/{list_id}", response_model=schemas.ListResponse)
def update_list(list_id: int, lst: schemas.ListCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_list = db.query(models.List).filter(models.List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
    db_list.name = lst.name
    db_list.description = lst.description
    db.commit()
    db.refresh(db_list)
    return db_list

@router.delete("/{list_id}")
def delete_list(list_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_list = db.query(models.List).filter(models.List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
    db.delete(db_list)
    db.commit()
    return {"message": "List deleted successfully"}
