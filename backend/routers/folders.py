from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
import models
import schemas
from dependencies import get_current_user

router = APIRouter(prefix="/api/folders", tags=["folders"])

@router.post("", response_model=schemas.FolderResponse)
def create_folder(folder: schemas.FolderCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_folder = models.Folder(**folder.model_dump())
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder

@router.get("", response_model=List[schemas.FolderResponse])
def get_folders(project_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Folder).filter(models.Folder.project_id == project_id).all()

@router.put("/{folder_id}", response_model=schemas.FolderResponse)
def update_folder(folder_id: int, folder: schemas.FolderCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not db_folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    db_folder.name = folder.name
    db_folder.description = folder.description
    db.commit()
    db.refresh(db_folder)
    return db_folder

@router.delete("/{folder_id}")
def delete_folder(folder_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not db_folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    db.delete(db_folder)
    db.commit()
    return {"message": "Folder deleted successfully"}
