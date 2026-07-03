from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import xml.etree.ElementTree as ET
from fastapi.responses import Response, JSONResponse
from fastapi import UploadFile, File
import json
from database import get_db
import models
import schemas
from dependencies import get_current_user
from task_json import build_project_export, extract_tasks_from_payload, import_tasks_into_project

router = APIRouter(prefix="/api/projects", tags=["projects"])

@router.post("", response_model=schemas.ProjectResponse)
def create_project(project: schemas.ProjectCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_project = models.Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@router.get("", response_model=List[schemas.ProjectResponse])
def get_projects(workspace_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Project).filter(models.Project.workspace_id == workspace_id).all()

@router.get("/{project_id}", response_model=schemas.ProjectResponse)
def get_project_by_id(project_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@router.put("/{project_id}", response_model=schemas.ProjectResponse)
def update_project(project_id: int, project_update: schemas.ProjectUpdate, db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_project, key, value)
        
    db.commit()
    db.refresh(db_project)
    return db_project

@router.delete("/{project_id}")
def delete_project(project_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    member = db.query(models.WorkspaceMember).filter(
        models.WorkspaceMember.workspace_id == db_project.workspace_id,
        models.WorkspaceMember.user_id == current_user.id
    ).first()
    if not member or member.role.lower() not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Permission denied")
        
    db.delete(db_project)
    db.commit()
    return {"message": "Project deleted successfully"}

@router.get("/{project_id}/export-json")
def export_project_json(project_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Fetch tasks for this project
    folders = db.query(models.Folder).filter(models.Folder.project_id == project_id).all()
    folder_ids = [f.id for f in folders]
    
    tasks = []
    if folder_ids:
        lists = db.query(models.List).filter(models.List.folder_id.in_(folder_ids)).all()
        list_ids = [l.id for l in lists]
        if list_ids:
            tasks = db.query(models.Task).filter(models.Task.list_id.in_(list_ids)).order_by(models.Task.start_date.asc().nulls_last()).all()

    return JSONResponse(
        content=build_project_export(db_project, tasks),
        headers={"Content-Disposition": 'attachment; filename="schedule.json"'}
    )

@router.post("/{project_id}/import-json")
async def import_project_json(project_id: int, file: UploadFile = File(...), current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    content = await file.read()
    try:
        payload = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")

    tasks_data, import_format = extract_tasks_from_payload(payload)
    result = import_tasks_into_project(db, db_project, tasks_data, file.filename, current_user.id)
    result["format"] = import_format
    return result
