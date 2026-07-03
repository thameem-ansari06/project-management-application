from fastapi import Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Optional, Set
from datetime import datetime, timedelta
import jwt
import bcrypt
import os

from database import get_db
import models

SECRET_KEY = os.environ.get("SECRET_KEY", "SUPER_SECRET_KEY_FOR_LOCAL_DEV")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

# --- PASSWORD HASHING HELPERS ---
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

# --- JWT HELPERS ---
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# --- DEPENDENCY: GET CURRENT USER FROM HEADER ---
def get_current_user(request: Request, db: Session = Depends(get_db)) -> models.User:
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user

# --- DEPENDENCY SCHEDULER & CYCLE DETECTION ---
def check_cycle(db: Session, task_id: Optional[int], predecessor_id: int) -> bool:
    if task_id is not None and task_id == predecessor_id:
        return True
    
    current_id = predecessor_id
    visited = set()
    while current_id is not None:
        if current_id in visited:
            return True
        visited.add(current_id)
        if task_id is not None and current_id == task_id:
            return True
        pred = db.query(models.Task).filter(models.Task.id == current_id).first()
        if not pred:
            break
        current_id = pred.predecessor_id
    return False

def check_parent_cycle(db: Session, task_id: Optional[int], parent_id: int) -> bool:
    if task_id is not None and task_id == parent_id:
        return True
    current_id = parent_id
    visited = set()
    while current_id is not None:
        if current_id in visited:
            return True
        visited.add(current_id)
        if task_id is not None and current_id == task_id:
            return True
        parent = db.query(models.Task).filter(models.Task.id == current_id).first()
        if not parent:
            break
        current_id = parent.parent_id
    return False

def recalculate_parent_task(db: Session, parent_id: int, visited: Set[int] = None):
    if visited is None:
        visited = set()
    if parent_id in visited:
        return
    visited.add(parent_id)
    
    parent = db.query(models.Task).filter(models.Task.id == parent_id).first()
    if not parent:
        return
        
    children = db.query(models.Task).filter(models.Task.parent_id == parent_id).all()
    if not children:
        parent.start_date = None
        parent.due_date = None
        parent.duration_days = None
        parent.status = "To Do"
    else:
        valid_start_dates = [c.start_date for c in children if c.start_date is not None]
        valid_due_dates = [c.due_date for c in children if c.due_date is not None]
        
        old_start = parent.start_date
        old_due = parent.due_date
        
        if valid_start_dates:
            parent.start_date = min(valid_start_dates)
        else:
            parent.start_date = None
            
        if valid_due_dates:
            parent.due_date = max(valid_due_dates)
        else:
            parent.due_date = None
            
        if parent.start_date and parent.due_date:
            parent.duration_days = (parent.due_date - parent.start_date).days + 1
        else:
            parent.duration_days = None
            
        # Status roll-up
        all_done = all(c.status == "Done" for c in children)
        any_in_progress = any(c.status == "In Progress" for c in children)
        
        if all_done:
            parent.status = "Done"
        elif any_in_progress:
            parent.status = "In Progress"
        else:
            parent.status = "To Do"
            
    db.add(parent)
    db.commit()
    db.refresh(parent)
    
    if children and 'old_start' in locals() and (parent.start_date != old_start or parent.due_date != old_due):
        cascade_schedule_updates(db, parent, visited)
        
    if parent.parent_id is not None:
        recalculate_parent_task(db, parent.parent_id, visited)

def cascade_schedule_updates(db: Session, task: models.Task, visited: Set[int] = None):
    if visited is None:
        visited = set()
    if task.id in visited:
        return
    visited.add(task.id)
    
    successors = db.query(models.Task).filter(models.Task.predecessor_id == task.id).all()
    for successor in successors:
        duration = 0
        if successor.start_date and successor.due_date:
            duration = (successor.due_date - successor.start_date).days
            if duration < 0:
                duration = 0
        
        if task.due_date:
            old_start = successor.start_date
            old_due = successor.due_date
            
            successor.start_date = task.due_date + timedelta(days=1)
            successor.due_date = successor.start_date + timedelta(days=duration)
            if successor.start_date and successor.due_date:
                successor.duration_days = (successor.due_date - successor.start_date).days + 1
            else:
                successor.duration_days = None
                
            db.add(successor)
            db.commit()
            db.refresh(successor)
            
            if successor.parent_id is not None and (successor.start_date != old_start or successor.due_date != old_due):
                recalculate_parent_task(db, successor.parent_id, visited)
                
            cascade_schedule_updates(db, successor, visited)

def execute_automations(db: Session, task: models.Task, trigger_type: str):
    lst = db.query(models.List).filter(models.List.id == task.list_id).first()
    if not lst:
        return
    folder = db.query(models.Folder).filter(models.Folder.id == lst.folder_id).first()
    if not folder:
        return
    project = db.query(models.Project).filter(models.Project.id == folder.project_id).first()
    if not project:
        return
    workspace_id = project.workspace_id

    rules = db.query(models.AutomationRule).filter(
        models.AutomationRule.workspace_id == workspace_id,
        models.AutomationRule.trigger_type == trigger_type
    ).all()

    for rule in rules:
        match = False
        if trigger_type == "status_changed":
            if rule.condition_value == task.status:
                match = True
        elif trigger_type == "task_created":
            match = True

        if match:
            if rule.action_type == "notify_user":
                target_user_id = int(rule.action_value) if (rule.action_value and rule.action_value.isdigit()) else task.created_by
                if target_user_id:
                    notif = models.Notification(
                        user_id=target_user_id,
                        title="Automation Triggered",
                        message=f"Task '{task.title}' trigger event was '{trigger_type}'."
                    )
                    db.add(notif)
            elif rule.action_type == "set_status":
                if rule.action_value:
                    task.status = rule.action_value
                    db.add(task)
    db.commit()
