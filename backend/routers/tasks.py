from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta

from database import get_db
import models
import schemas
from dependencies import (
    get_current_user,
    check_cycle,
    check_parent_cycle,
    recalculate_parent_task,
    cascade_schedule_updates,
    execute_automations
)

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

@router.post("", response_model=schemas.TaskResponse)
def create_task(task_create: schemas.TaskCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    start_date = task_create.start_date
    due_date = task_create.end_date if task_create.end_date is not None else task_create.due_date
    
    if task_create.predecessor_id is not None:
        pred = db.query(models.Task).filter(models.Task.id == task_create.predecessor_id).first()
        if not pred:
            raise HTTPException(status_code=404, detail=f"Predecessor task with id {task_create.predecessor_id} not found")
        
        duration = 0
        if start_date and due_date:
            duration = (due_date - start_date).days
            if duration < 0:
                duration = 0
        
        if pred.due_date:
            start_date = pred.due_date + timedelta(days=1)
            due_date = start_date + timedelta(days=duration)
        else:
            raise HTTPException(status_code=400, detail="Predecessor task must have a due date to set dependency schedule")
        
        if check_cycle(db, None, task_create.predecessor_id):
            raise HTTPException(status_code=400, detail="Circular dependency detected")

    if task_create.parent_id is not None:
        if check_parent_cycle(db, None, task_create.parent_id):
            raise HTTPException(status_code=400, detail="Circular hierarchy detected")

    duration_days = None
    if start_date and due_date:
        duration_days = (due_date - start_date).days + 1

    db_task = models.Task(
        list_id=task_create.list_id,
        title=task_create.title,
        description=task_create.description,
        status=task_create.status,
        priority=task_create.priority,
        start_date=start_date,
        due_date=due_date,
        parent_task_id=task_create.parent_task_id,
        parent_id=task_create.parent_id,
        duration_days=duration_days,
        predecessor_id=task_create.predecessor_id,
        assigned_to_id=task_create.assigned_to_id,
        progress=task_create.progress,
        task_type=task_create.task_type,
        dependency_type=task_create.dependency_type,
        lag_days=task_create.lag_days,
        estimated_hours=task_create.estimated_hours,
        actual_hours=task_create.actual_hours,
        remaining_hours=task_create.remaining_hours,
        created_by=current_user.id
    )

    if task_create.assignee_ids:
        users = db.query(models.User).filter(models.User.id.in_(task_create.assignee_ids)).all()
        db_task.assignees = users

    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    if db_task.parent_id is not None:
        recalculate_parent_task(db, db_task.parent_id)
        db.refresh(db_task)
    
    execute_automations(db, db_task, "task_created")
    
    return db_task

@router.get("", response_model=List[schemas.TaskResponse])
def get_tasks(
    list_id: Optional[int] = None, 
    project_id: Optional[int] = None,
    workspace_id: Optional[int] = None,
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    query = db.query(models.Task)
    
    if list_id is not None:
        query = query.filter(models.Task.list_id == list_id)
    elif project_id is not None:
        query = query.join(models.List).join(models.Folder).filter(models.Folder.project_id == project_id)
    elif workspace_id is not None:
        query = query.join(models.List).join(models.Folder).join(models.Project).filter(models.Project.workspace_id == workspace_id)
        
    return query.filter(models.Task.parent_id == None, models.Task.parent_task_id == None).all()

@router.put("/{task_id}", response_model=schemas.TaskResponse)
def update_task(task_id: int, task_update: schemas.TaskUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_update.model_dump(exclude_unset=True)

    if "parent_id" in update_data:
        parent_id = update_data["parent_id"]
        if parent_id is not None:
            if parent_id == task_id:
                raise HTTPException(status_code=400, detail="A task cannot be its own parent")
            if check_parent_cycle(db, task_id, parent_id):
                raise HTTPException(status_code=400, detail="Circular hierarchy detected")

    old_parent_id = db_task.parent_id

    if "predecessor_id" in update_data:
        pred_id = update_data["predecessor_id"]
        if pred_id is not None:
            if pred_id == task_id:
                raise HTTPException(status_code=400, detail="A task cannot depend on itself")
            pred = db.query(models.Task).filter(models.Task.id == pred_id).first()
            if not pred:
                raise HTTPException(status_code=404, detail=f"Predecessor task with id {pred_id} not found")
            if check_cycle(db, task_id, pred_id):
                raise HTTPException(status_code=400, detail="Circular dependency detected")
            
            db_task.predecessor_id = pred_id
            if pred.due_date:
                duration = 0
                current_start = update_data.get("start_date", db_task.start_date)
                current_due = update_data.get("end_date", update_data.get("due_date", db_task.due_date))
                if current_start and current_due:
                    duration = (current_due - current_start).days
                    if duration < 0:
                        duration = 0
                
                db_task.start_date = pred.due_date + timedelta(days=1)
                db_task.due_date = db_task.start_date + timedelta(days=duration)
        else:
            db_task.predecessor_id = None

    for field, value in update_data.items():
        if field == "predecessor_id" or field == "assignee_ids":
            continue
        if db_task.predecessor_id is not None and field in ["start_date", "due_date", "end_date"]:
            continue
        setattr(db_task, field, value)

    if db_task.predecessor_id is not None:
        pred = db.query(models.Task).filter(models.Task.id == db_task.predecessor_id).first()
        if pred and pred.due_date:
            duration = 0
            if db_task.start_date and db_task.due_date:
                duration = (db_task.due_date - db_task.start_date).days
                if duration < 0:
                    duration = 0
            db_task.start_date = pred.due_date + timedelta(days=1)
            db_task.due_date = db_task.start_date + timedelta(days=duration)

    if db_task.start_date and db_task.due_date:
        db_task.duration_days = (db_task.due_date - db_task.start_date).days + 1
    else:
        db_task.duration_days = None

    if "assignee_ids" in update_data and update_data["assignee_ids"] is not None:
        users = db.query(models.User).filter(models.User.id.in_(update_data["assignee_ids"])).all()
        db_task.assignees = users

    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    cascade_schedule_updates(db, db_task)
    db.commit()
    db.refresh(db_task)

    if old_parent_id is not None:
        recalculate_parent_task(db, old_parent_id)
    if db_task.parent_id is not None:
        recalculate_parent_task(db, db_task.parent_id)
        db.refresh(db_task)

    if "status" in update_data:
        execute_automations(db, db_task, "status_changed")
        db.refresh(db_task)
    
    return db_task

@router.delete("/{task_id}")
def delete_task(task_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    parent_id = db_task.parent_id
    
    db.delete(db_task)
    db.commit()
    
    if parent_id is not None:
        recalculate_parent_task(db, parent_id)
        
    return {"message": "Task deleted successfully"}
