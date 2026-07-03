from fastapi import FastAPI, Depends, HTTPException, status, Request, UploadFile, File, WebSocket, WebSocketDisconnect, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, Response, JSONResponse
from sqlalchemy.orm import Session
from datetime import date, datetime, timedelta
from typing import List, Optional, Set
import os
import uuid
import jwt
import bcrypt
import httpx
import xml.etree.ElementTree as ET
import json
from dotenv import load_dotenv

# Load configuration from .env file securely
base_dir = os.path.dirname(os.path.abspath(__file__))
dotenv_path = os.path.join(base_dir, ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

# Imports for database connection and models
import models
import schemas
from database import engine, get_db
from task_json import build_project_export, extract_tasks_from_payload, import_tasks_into_project
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType

# Create database tables automatically
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="PM Workspace API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Files serving for file attachments
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Mail Configuration
MAIL_USERNAME = os.getenv("MAIL_USERNAME", "noreply@example.com")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "")
MAIL_FROM = os.getenv("MAIL_FROM") or MAIL_USERNAME
MAIL_SERVER = os.getenv("MAIL_SERVER", "smtp.gmail.com")
MAIL_PORT_STR = os.getenv("MAIL_PORT", "587")

try:
    MAIL_PORT = int(MAIL_PORT_STR)
except ValueError:
    MAIL_PORT = 587

if MAIL_PORT == 465:
    MAIL_STARTTLS = False
    MAIL_SSL_TLS = True
else:
    MAIL_STARTTLS = True
    MAIL_SSL_TLS = False

mail_config = ConnectionConfig(
    MAIL_USERNAME=MAIL_USERNAME,
    MAIL_PASSWORD=MAIL_PASSWORD,
    MAIL_FROM=MAIL_FROM,
    MAIL_PORT=MAIL_PORT,
    MAIL_SERVER=MAIL_SERVER,
    MAIL_STARTTLS=MAIL_STARTTLS,
    MAIL_SSL_TLS=MAIL_SSL_TLS,
    USE_CREDENTIALS=True if MAIL_PASSWORD else False,
    VALIDATE_CERTS=False
)

# Security Configurations
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

# --- AUTH ENDPOINTS ---
@app.post("/api/auth/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, token: Optional[str] = None, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email is already registered")
    
    db_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=hash_password(user.password)
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    # Pre-seed a default personal workspace for them
    personal_workspace = models.Workspace(
        name="Personal Workspace",
        owner_id=db_user.id
    )
    db.add(personal_workspace)
    db.commit()
    db.refresh(personal_workspace)
    
    # Add ownership member entry
    member_entry = models.WorkspaceMember(
        workspace_id=personal_workspace.id,
        user_id=db_user.id,
        role="Owner"
    )
    db.add(member_entry)
    
    # Check if an invitation token was provided
    if token:
        invite = db.query(models.Invitation).filter(models.Invitation.token == token).first()
        if invite and invite.status == "pending" and invite.expires_at >= datetime.utcnow():
            # Add member entry to invited workspace
            invited_member = models.WorkspaceMember(
                workspace_id=invite.workspace_id,
                user_id=db_user.id,
                role="Member"
            )
            db.add(invited_member)
            invite.status = "accepted"
            
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/api/auth/login", response_model=schemas.Token)
def login_user(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"user_id": user.id, "email": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/auth/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# --- GOOGLE OAUTH2 ENDPOINTS ---
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://127.0.0.1:8000/api/auth/google/callback")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

@app.get("/api/auth/google/login")
def google_login(
    invite_token: Optional[str] = None,
    invite_email: Optional[str] = None
):
    """Redirect the user to Google's OAuth2 consent page."""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID in your .env file.")
    
    import urllib.parse
    state = ""
    if invite_token:
        state_data = f"invite_token={invite_token}"
        if invite_email:
            state_data += f"&invite_email={invite_email}"
        state = urllib.parse.quote(state_data)
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
    }
    if state:
        params["state"] = state
    
    query = urllib.parse.urlencode(params)
    google_auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{query}"
    return RedirectResponse(url=google_auth_url)

@app.get("/api/auth/google/callback")
def google_callback(code: str, state: Optional[str] = None, db: Session = Depends(get_db)):
    """Handle Google OAuth2 callback, create/find user, return JWT."""
    import urllib.parse
    
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="Google OAuth is not configured.")
    
    # Exchange auth code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "grant_type": "authorization_code",
    }
    
    try:
        token_response = httpx.post(token_url, data=token_data, timeout=10)
        token_response.raise_for_status()
        tokens = token_response.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to exchange Google auth code: {str(e)}")
    
    # Get user info from Google
    userinfo_url = "https://www.googleapis.com/oauth2/v3/userinfo"
    try:
        userinfo_response = httpx.get(
            userinfo_url,
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
            timeout=10
        )
        userinfo_response.raise_for_status()
        google_user = userinfo_response.json()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch Google user info: {str(e)}")
    
    email = google_user.get("email")
    name = google_user.get("name", email)
    
    if not email:
        raise HTTPException(status_code=400, detail="Could not retrieve email from Google account.")
    
    # Find or create user
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        # Create new user with a random password (OAuth users don't need one)
        random_password = uuid.uuid4().hex
        user = models.User(
            name=name,
            email=email,
            password_hash=hash_password(random_password)
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        # Create personal workspace for new user
        personal_workspace = models.Workspace(name="Personal Workspace", owner_id=user.id)
        db.add(personal_workspace)
        db.commit()
        db.refresh(personal_workspace)
        
        member_entry = models.WorkspaceMember(
            workspace_id=personal_workspace.id, user_id=user.id, role="Owner"
        )
        db.add(member_entry)
        db.commit()
    
    # Parse state to handle invitation token
    invite_token = None
    if state:
        decoded_state = urllib.parse.unquote(state)
        state_params = dict(urllib.parse.parse_qsl(decoded_state))
        invite_token = state_params.get("invite_token")
    
    if invite_token:
        invite = db.query(models.Invitation).filter(models.Invitation.token == invite_token).first()
        if invite and invite.status == "pending" and invite.expires_at >= datetime.utcnow():
            existing_member = db.query(models.WorkspaceMember).filter(
                models.WorkspaceMember.workspace_id == invite.workspace_id,
                models.WorkspaceMember.user_id == user.id
            ).first()
            if not existing_member:
                member_entry = models.WorkspaceMember(
                    workspace_id=invite.workspace_id,
                    user_id=user.id,
                    role="Member"
                )
                db.add(member_entry)
            invite.status = "accepted"
            db.commit()
    
    # Issue JWT
    access_token = create_access_token(data={"user_id": user.id, "email": user.email})
    
    # Redirect back to the frontend with the token
    redirect_url = f"{FRONTEND_URL}/?google_token={access_token}"
    return RedirectResponse(url=redirect_url)


@app.post("/api/workspace", response_model=schemas.WorkspaceResponse)
def create_workspace(workspace: schemas.WorkspaceCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_workspace = models.Workspace(
        name=workspace.name,
        owner_id=current_user.id
    )
    db.add(db_workspace)
    db.commit()
    db.refresh(db_workspace)
    
    # Add member entry as Owner
    member_entry = models.WorkspaceMember(
        workspace_id=db_workspace.id,
        user_id=current_user.id,
        role="Owner"
    )
    db.add(member_entry)
    db.commit()
    return db_workspace

@app.get("/api/workspace", response_model=List[schemas.WorkspaceResponse])
def get_workspaces(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Returns workspaces where user is a member
    return db.query(models.Workspace).join(models.WorkspaceMember).filter(models.WorkspaceMember.user_id == current_user.id).all()

@app.put("/api/workspace/{workspace_id}", response_model=schemas.WorkspaceResponse)
def update_workspace(workspace_id: int, workspace: schemas.WorkspaceCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_workspace = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
    if not db_workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Access check: Must be owner or admin
    member = db.query(models.WorkspaceMember).filter(models.WorkspaceMember.workspace_id == workspace_id, models.WorkspaceMember.user_id == current_user.id).first()
    if not member or member.role not in ["Owner", "Admin"]:
        raise HTTPException(status_code=403, detail="You do not have permission to rename this workspace")
    
    db_workspace.name = workspace.name
    db.commit()
    db.refresh(db_workspace)
    return db_workspace

@app.delete("/api/workspace/{workspace_id}")
def delete_workspace(workspace_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_workspace = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
    if not db_workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Query WorkspaceMember to verify requesting user role is strictly admin
    member = db.query(models.WorkspaceMember).filter(
        models.WorkspaceMember.workspace_id == workspace_id,
        models.WorkspaceMember.user_id == current_user.id
    ).first()
    if not member or member.role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")
    
    db.delete(db_workspace)
    db.commit()
    return {"message": "Workspace deleted successfully"}

# --- WORKSPACE MEMBERSHIP ---
@app.post("/api/workspace/{workspace_id}/members", response_model=schemas.WorkspaceMemberResponse)
def add_workspace_member(workspace_id: int, member_create: schemas.WorkspaceMemberCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check permissions of current user
    actor_member = db.query(models.WorkspaceMember).filter(models.WorkspaceMember.workspace_id == workspace_id, models.WorkspaceMember.user_id == current_user.id).first()
    if not actor_member or actor_member.role not in ["Owner", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Owners or Admins can invite members")
    
    # Check if target user exists
    target_user = db.query(models.User).filter(models.User.id == member_create.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    
    # Check if user is already a member
    existing = db.query(models.WorkspaceMember).filter(models.WorkspaceMember.workspace_id == workspace_id, models.WorkspaceMember.user_id == member_create.user_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this workspace")
    
    db_member = models.WorkspaceMember(
        workspace_id=workspace_id,
        user_id=member_create.user_id,
        role=member_create.role
    )
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member

@app.get("/api/workspaces/{workspace_id}/members", response_model=List[schemas.WorkspaceMemberResponse])
@app.get("/api/workspace/{workspace_id}/members", response_model=List[schemas.WorkspaceMemberResponse])
def get_workspace_members(workspace_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Check if current user is a member
    member = db.query(models.WorkspaceMember).filter(models.WorkspaceMember.workspace_id == workspace_id, models.WorkspaceMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return db.query(models.WorkspaceMember).filter(models.WorkspaceMember.workspace_id == workspace_id).all()

@app.post("/api/workspaces/{workspace_id}/invite", response_model=schemas.InvitationResponse)
def invite_workspace_member(
    workspace_id: int,
    invite_create: schemas.InvitationCreate,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Check permissions of current user
    actor_member = db.query(models.WorkspaceMember).filter(
        models.WorkspaceMember.workspace_id == workspace_id,
        models.WorkspaceMember.user_id == current_user.id
    ).first()
    if not actor_member or actor_member.role.strip().lower() not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Only Owners or Admins can invite members")
    
    # Generate unique secure token
    token = uuid.uuid4().hex
    
    # Save as pending
    db_invite = models.Invitation(
        workspace_id=workspace_id,
        email=invite_create.email,
        token=token,
        status="pending",
        expires_at=datetime.utcnow() + timedelta(days=7)
    )
    db.add(db_invite)
    db.commit()
    db.refresh(db_invite)
    
    # Send invitation email in the background
    html_body = f"""
    <html>
        <body style="margin: 0; padding: 0; background-color: #0a0a0a;">
            <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #e4e4e7;">
                <div style="background-color: #18181b; border-radius: 16px; padding: 48px 40px; border: 1px solid #27272a; box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
                    <div style="text-align: center; margin-bottom: 32px;">
                        <div style="display: inline-block; background: #09090b; border: 1px solid #27272a; border-radius: 12px; padding: 12px 20px;">
                            <span style="font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">XBP ASIA</span>
                        </div>
                    </div>
                    <h2 style="font-size: 26px; font-weight: 700; color: #ffffff; margin-top: 0; margin-bottom: 12px; text-align: center; letter-spacing: -0.5px;">
                        Join the Workspace
                    </h2>
                    <p style="font-size: 15px; line-height: 1.7; color: #a1a1aa; margin-bottom: 36px; text-align: center;">
                        You've been invited to collaborate. Accept your invite below — you'll be guided through a quick Google sign-in to get started.
                    </p>
                    <div style="text-align: center; margin-bottom: 32px;">
                        <a href="http://localhost:5173/join-team?email={invite_create.email}&token={token}" style="display: inline-flex; align-items: center; gap: 10px; background: #ffffff; color: #09090b; text-decoration: none; padding: 14px 32px; font-size: 15px; font-weight: 700; border-radius: 10px; letter-spacing: -0.2px;">
                            Accept Invite &rarr;
                        </a>
                    </div>
                    <p style="font-size: 12px; line-height: 1.6; color: #52525b; border-top: 1px solid #27272a; padding-top: 24px; margin-top: 32px; text-align: center;">
                        If the button doesn't work, copy and paste this link:<br>
                        <a href="http://localhost:5173/join-team?email={invite_create.email}&token={token}" style="color: #818cf8; text-decoration: underline; word-break: break-all;">
                            http://localhost:5173/join-team?email={invite_create.email}&token={token}
                        </a>
                        <br><br>
                        This invitation expires in 7 days. If you didn't expect this, you can safely ignore it.
                    </p>
                </div>
            </div>
        </body>
    </html>
    """
    
    message = MessageSchema(
        subject="You're invited to join a Workspace!",
        recipients=[invite_create.email],
        body=html_body,
        subtype=MessageType.html
    )
    
    fm = FastMail(mail_config)
    background_tasks.add_task(fm.send_message, message)
    
    return db_invite

@app.post("/api/workspaces/accept-invite")
def accept_invite(
    token: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    invite = db.query(models.Invitation).filter(models.Invitation.token == token).first()
    if not invite:
        raise HTTPException(status_code=404, detail="Invitation not found")
    
    if invite.status != "pending":
        raise HTTPException(status_code=400, detail=f"Invitation has already been {invite.status}")
    
    if invite.expires_at < datetime.utcnow():
        invite.status = "expired"
        db.commit()
        raise HTTPException(status_code=400, detail="Invitation has expired")
    
    # Check if user is already a member
    existing = db.query(models.WorkspaceMember).filter(
        models.WorkspaceMember.workspace_id == invite.workspace_id,
        models.WorkspaceMember.user_id == current_user.id
    ).first()
    
    if existing:
        invite.status = "accepted"
        db.commit()
        return {"message": "You are already a member of this workspace", "workspace_id": invite.workspace_id}
    
    # Link to WorkspaceMember
    member_entry = models.WorkspaceMember(
        workspace_id=invite.workspace_id,
        user_id=current_user.id,
        role="Member"
    )
    db.add(member_entry)
    invite.status = "accepted"
    db.commit()
    return {"message": "Successfully joined workspace", "workspace_id": invite.workspace_id}

# --- PROJECTS ---
@app.post("/api/projects", response_model=schemas.ProjectResponse)
def create_project(project: schemas.ProjectCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_project = models.Project(**project.model_dump())
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

@app.get("/api/projects", response_model=List[schemas.ProjectResponse])
def get_projects(workspace_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Project).filter(models.Project.workspace_id == workspace_id).all()

@app.get("/api/projects/{project_id}/export-json")
def export_project_json(project_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

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

@app.post("/api/projects/{project_id}/import-json")
async def import_project_json(project_id: int, file: UploadFile = File(...), current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    content = await file.read()
    try:
        payload = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file.")

    tasks_data, import_format = extract_tasks_from_payload(payload)
    result = import_tasks_into_project(db, db_project, tasks_data, file.filename, current_user.id)
    result["format"] = import_format
    return result

@app.post("/api/projects/{project_id}/remove-json")
def remove_project_json(project_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")

    existing_folder = db.query(models.Folder).filter(
        models.Folder.project_id == project_id,
        models.Folder.name == "Imported JSON Data"
    ).first()
    if existing_folder:
        db.delete(existing_folder)
        
    legacy_folder = db.query(models.Folder).filter(
        models.Folder.project_id == project_id,
        models.Folder.name == "Imported Folder"
    ).first()
    if legacy_folder:
        db.delete(legacy_folder)

    db_project.imported_json_name = None
    db.commit()

    return {"message": "Removed JSON file successfully"}

@app.get("/api/projects/{project_id}", response_model=schemas.ProjectResponse)
def get_project_by_id(project_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    return db_project

@app.put("/api/projects/{project_id}", response_model=schemas.ProjectResponse)
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

@app.delete("/api/projects/{project_id}")
def delete_project(project_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not db_project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Query WorkspaceMember to verify requesting user role is strictly admin
    member = db.query(models.WorkspaceMember).filter(
        models.WorkspaceMember.workspace_id == db_project.workspace_id,
        models.WorkspaceMember.user_id == current_user.id
    ).first()
    if not member or member.role.lower() != "admin":
        raise HTTPException(status_code=403, detail="Permission denied")
        
    db.delete(db_project)
    db.commit()
    return {"message": "Project deleted successfully"}

# --- FOLDERS ---
@app.post("/api/folders", response_model=schemas.FolderResponse)
def create_folder(folder: schemas.FolderCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_folder = models.Folder(**folder.model_dump())
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder

@app.get("/api/folders", response_model=List[schemas.FolderResponse])
def get_folders(project_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Folder).filter(models.Folder.project_id == project_id).all()

@app.put("/api/folders/{folder_id}", response_model=schemas.FolderResponse)
def update_folder(folder_id: int, folder: schemas.FolderCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not db_folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    db_folder.name = folder.name
    db_folder.description = folder.description
    db.commit()
    db.refresh(db_folder)
    return db_folder

@app.delete("/api/folders/{folder_id}")
def delete_folder(folder_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_folder = db.query(models.Folder).filter(models.Folder.id == folder_id).first()
    if not db_folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    db.delete(db_folder)
    db.commit()
    return {"message": "Folder deleted successfully"}

# --- LISTS ---
@app.post("/api/lists", response_model=schemas.ListResponse)
def create_list(lst: schemas.ListCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_list = models.List(**lst.model_dump())
    db.add(db_list)
    db.commit()
    db.refresh(db_list)
    return db_list

@app.get("/api/lists", response_model=List[schemas.ListResponse])
def get_lists(folder_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.List).filter(models.List.folder_id == folder_id).all()

@app.put("/api/lists/{list_id}", response_model=schemas.ListResponse)
def update_list(list_id: int, lst: schemas.ListCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_list = db.query(models.List).filter(models.List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
    db_list.name = lst.name
    db_list.description = lst.description
    db.commit()
    db.refresh(db_list)
    return db_list

@app.delete("/api/lists/{list_id}")
def delete_list(list_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_list = db.query(models.List).filter(models.List.id == list_id).first()
    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")
    db.delete(db_list)
    db.commit()
    return {"message": "List deleted successfully"}

# --- TASKS ENGINE (CRUD, Dependencies, Assignees, Subtasks) ---
@app.post("/api/tasks", response_model=schemas.TaskResponse)
def create_task(task_create: schemas.TaskCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 1. Resolve start/due date dependency math if predecessor is selected
    start_date = task_create.start_date
    due_date = task_create.end_date if task_create.end_date is not None else task_create.due_date
    
    if task_create.predecessor_id is not None:
        pred = db.query(models.Task).filter(models.Task.id == task_create.predecessor_id).first()
        if not pred:
            raise HTTPException(status_code=404, detail=f"Predecessor task with id {task_create.predecessor_id} not found")
        
        # Calculate duration of the new task from inputs or default to 1 day
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
        
        # Cycle Check
        if check_cycle(db, None, task_create.predecessor_id):
            raise HTTPException(status_code=400, detail="Circular dependency detected")

    # Parent Cycle Check
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

    # 2. Add assignees
    if task_create.assignee_ids:
        users = db.query(models.User).filter(models.User.id.in_(task_create.assignee_ids)).all()
        db_task.assignees = users

    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    # Recalculate parent
    if db_task.parent_id is not None:
        recalculate_parent_task(db, db_task.parent_id)
        db.refresh(db_task)
    
    # Trigger automation
    execute_automations(db, db_task, "task_created")
    
    return db_task

@app.get("/api/tasks", response_model=List[schemas.TaskResponse])
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
        # Complex join: Task -> List -> Folder -> Project -> Workspace
        query = query.join(models.List).join(models.Folder).join(models.Project).filter(models.Project.workspace_id == workspace_id)
        
    # Return top level tasks (subtasks can be loaded nested, or filter them out)
    return query.filter(models.Task.parent_id == None, models.Task.parent_task_id == None).all()

@app.put("/api/tasks/{task_id}", response_model=schemas.TaskResponse)
def update_task(task_id: int, task_update: schemas.TaskUpdate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_update.model_dump(exclude_unset=True)

    # Parent Cycle Check
    if "parent_id" in update_data:
        parent_id = update_data["parent_id"]
        if parent_id is not None:
            if parent_id == task_id:
                raise HTTPException(status_code=400, detail="A task cannot be its own parent")
            if check_parent_cycle(db, task_id, parent_id):
                raise HTTPException(status_code=400, detail="Circular hierarchy detected")

    old_parent_id = db_task.parent_id

    # Predecessor changes validation
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
                # Calculate current duration before shifting
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

    # Apply all other parameters except predecessor and dates if predecessor is active
    for field, value in update_data.items():
        if field == "predecessor_id" or field == "assignee_ids":
            continue
        # If task has a predecessor, start_date, due_date and end_date updates in payload are ignored
        if db_task.predecessor_id is not None and field in ["start_date", "due_date", "end_date"]:
            continue
        setattr(db_task, field, value)

    # Force recalculation if predecessor is active
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

    # Recalculate duration_days
    if db_task.start_date and db_task.due_date:
        db_task.duration_days = (db_task.due_date - db_task.start_date).days + 1
    else:
        db_task.duration_days = None

    # Update Assignees if provided
    if "assignee_ids" in update_data and update_data["assignee_ids"] is not None:
        users = db.query(models.User).filter(models.User.id.in_(update_data["assignee_ids"])).all()
        db_task.assignees = users

    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    # Trigger cascading updates to successors
    cascade_schedule_updates(db, db_task)
    db.commit()
    db.refresh(db_task)

    # Recalculate old parent and new parent
    if old_parent_id is not None:
        recalculate_parent_task(db, old_parent_id)
    if db_task.parent_id is not None:
        recalculate_parent_task(db, db_task.parent_id)
        db.refresh(db_task)

    # Trigger automation
    if "status" in update_data:
        execute_automations(db, db_task, "status_changed")
        db.refresh(db_task)
    
    return db_task

@app.delete("/api/tasks/{task_id}")
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

# --- COMMENTS ---
@app.post("/api/comments", response_model=schemas.CommentResponse)
def create_comment(comment: schemas.CommentCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_comment = models.Comment(
        task_id=comment.task_id,
        user_id=current_user.id,
        message=comment.message
    )
    db.add(db_comment)
    db.commit()
    db.refresh(db_comment)
    return db_comment

@app.get("/api/comments", response_model=List[schemas.CommentResponse])
def get_comments(task_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Comment).filter(models.Comment.task_id == task_id).order_by(models.Comment.created_at.asc()).all()

# --- ATTACHMENTS ---
@app.post("/api/attachments", response_model=schemas.AttachmentResponse)
def upload_attachment(task_id: int, file: UploadFile = File(...), current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Verify task exists
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Save the file locally
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())
        
    file_url = f"http://127.0.0.1:8000/uploads/{unique_filename}"
    
    db_attachment = models.Attachment(
        task_id=task_id,
        file_name=file.filename,
        file_url=file_url,
        uploaded_by=current_user.id
    )
    db.add(db_attachment)
    db.commit()
    db.refresh(db_attachment)
    return db_attachment

@app.get("/api/attachments", response_model=List[schemas.AttachmentResponse])
def get_attachments(task_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Attachment).filter(models.Attachment.task_id == task_id).all()

# --- DASHBOARD & ANALYTICS ---
@app.get("/api/dashboard/overview", response_model=schemas.DashboardOverview)
def get_dashboard_overview(workspace_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Fetch all tasks in the workspace
    tasks = db.query(models.Task).join(models.List).join(models.Folder).join(models.Project).filter(models.Project.workspace_id == workspace_id).all()
    
    total = len(tasks)
    completed = len([t for t in tasks if t.status.lower() in ["done", "completed"]])
    pending = len([t for t in tasks if t.status.lower() not in ["done", "completed"]])
    
    # Calculate overdue tasks (tasks that are not done and past due date)
    today = date.today()
    overdue = len([t for t in tasks if t.status.lower() not in ["done", "completed"] and t.due_date and t.due_date < today])
    
    rate = (completed / total * 100) if total > 0 else 0.0
    
    return {
        "total_tasks": total,
        "completed_tasks": completed,
        "pending_tasks": pending,
        "overdue_tasks": overdue,
        "completion_rate": round(rate, 2)
    }

# Backward compatibility /api/stats (maps to first workspace)
@app.get("/api/stats")
def get_stats(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    first_workspace = db.query(models.Workspace).join(models.WorkspaceMember).filter(models.WorkspaceMember.user_id == current_user.id).first()
    if not first_workspace:
        return {"active_projects": 0, "pending_tasks": 0, "completion_rate": 0}
    
    overview = get_dashboard_overview(first_workspace.id, current_user, db)
    return {
        "active_projects": db.query(models.Project).filter(models.Project.workspace_id == first_workspace.id).count(),
        "pending_tasks": overview["pending_tasks"],
        "completion_rate": overview["completion_rate"]
    }

# --- WEBSOCKET CONNECTION MANAGER ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[int, list[WebSocket]] = {}
        
    async def connect(self, websocket: WebSocket, channel_id: int):
        await websocket.accept()
        if channel_id not in self.active_connections:
            self.active_connections[channel_id] = []
        self.active_connections[channel_id].append(websocket)
        
    def disconnect(self, websocket: WebSocket, channel_id: int):
        if channel_id in self.active_connections:
            self.active_connections[channel_id].remove(websocket)
            if not self.active_connections[channel_id]:
                del self.active_connections[channel_id]
                
    async def broadcast(self, message: str, channel_id: int):
        if channel_id in self.active_connections:
            for connection in self.active_connections[channel_id]:
                try:
                    await connection.send_text(message)
                except Exception:
                    pass

ws_manager = ConnectionManager()

@app.websocket("/api/chat/ws/{channel_id}")
async def websocket_endpoint(websocket: WebSocket, channel_id: int):
    await ws_manager.connect(websocket, channel_id)
    try:
        while True:
            data = await websocket.receive_text()
            await ws_manager.broadcast(data, channel_id)
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, channel_id)

# --- NOTIFICATIONS ENDPOINTS ---
@app.get("/api/notifications", response_model=List[schemas.NotificationResponse])
def get_notifications(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Notification).filter(models.Notification.user_id == current_user.id).order_by(models.Notification.created_at.desc()).all()

@app.put("/api/notifications/{notification_id}/read", response_model=schemas.NotificationResponse)
def mark_notification_read(notification_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(models.Notification).filter(models.Notification.id == notification_id, models.Notification.user_id == current_user.id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

# --- TIME TRACKING ENDPOINTS ---
@app.post("/api/time-tracking/start", response_model=schemas.TimeEntryResponse)
def start_time_entry(entry: schemas.TimeEntryCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Stop any active timers for this user
    active_timers = db.query(models.TimeEntry).filter(models.TimeEntry.user_id == current_user.id, models.TimeEntry.end_time == None).all()
    for timer in active_timers:
        timer.end_time = datetime.utcnow()
        timer.duration = int((timer.end_time - timer.start_time).total_seconds())
        db.add(timer)
        
    db_entry = models.TimeEntry(
        task_id=entry.task_id,
        user_id=current_user.id,
        start_time=datetime.utcnow()
    )
    db.add(db_entry)
    db.commit()
    db.refresh(db_entry)
    return db_entry

@app.post("/api/time-tracking/stop/{entry_id}", response_model=schemas.TimeEntryResponse)
def stop_time_entry(entry_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    timer = db.query(models.TimeEntry).filter(models.TimeEntry.id == entry_id, models.TimeEntry.user_id == current_user.id).first()
    if not timer:
        raise HTTPException(status_code=404, detail="Active timer not found")
    timer.end_time = datetime.utcnow()
    timer.duration = int((timer.end_time - timer.start_time).total_seconds())
    db.commit()
    db.refresh(timer)
    return timer

@app.get("/api/time-tracking/task/{task_id}", response_model=List[schemas.TimeEntryResponse])
def get_task_time_entries(task_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.TimeEntry).filter(models.TimeEntry.task_id == task_id).all()

@app.get("/api/time-tracking/user", response_model=List[schemas.TimeEntryResponse])
def get_user_time_entries(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.TimeEntry).filter(models.TimeEntry.user_id == current_user.id).order_by(models.TimeEntry.start_time.desc()).all()

# --- DOCUMENT ENDPOINTS ---
@app.post("/api/documents", response_model=schemas.DocumentResponse)
def create_document(doc: schemas.DocumentCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_doc = models.Document(**doc.model_dump())
    if db_doc.uploaded_by is None:
        db_doc.uploaded_by = current_user.id
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

@app.post("/api/documents/upload", response_model=schemas.DocumentResponse)
def upload_document(
    workspace_id: int,
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Save the file locally in UPLOAD_DIR
    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    file_content = file.file.read()
    file_size = len(file_content)
    
    with open(file_path, "wb") as buffer:
        buffer.write(file_content)
        
    file_url = f"http://127.0.0.1:8000/uploads/{unique_filename}"
    
    db_doc = models.Document(
        workspace_id=workspace_id,
        title=file.filename,
        content=f"Uploaded file: {file.filename}",
        file_name=file.filename,
        file_url=file_url,
        file_size=file_size,
        uploaded_by=current_user.id
    )
    db.add(db_doc)
    db.commit()
    db.refresh(db_doc)
    return db_doc

@app.get("/api/documents", response_model=List[schemas.DocumentResponse])
def get_documents(workspace_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Document).filter(models.Document.workspace_id == workspace_id).order_by(models.Document.updated_at.desc()).all()

@app.put("/api/documents/{doc_id}", response_model=schemas.DocumentResponse)
def update_document(doc_id: int, doc_update: schemas.DocumentCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not db_doc:
        raise HTTPException(status_code=404, detail="Document not found")
    db_doc.title = doc_update.title
    db_doc.content = doc_update.content
    db.commit()
    db.refresh(db_doc)
    return db_doc

@app.delete("/api/documents/{doc_id}")
def delete_document(doc_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_doc = db.query(models.Document).filter(models.Document.id == doc_id).first()
    if not db_doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Check permissions of current user (must be workspace owner or admin)
    member = db.query(models.WorkspaceMember).filter(
        models.WorkspaceMember.workspace_id == db_doc.workspace_id,
        models.WorkspaceMember.user_id == current_user.id
    ).first()
    if not member or member.role.strip().lower() not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied. Only workspace managers can delete documents."
        )
        
    db.delete(db_doc)
    db.commit()
    return {"message": "Document deleted"}

# --- CHAT ENDPOINTS ---
@app.post("/api/chat/channels", response_model=schemas.ChannelResponse)
def create_channel(channel: schemas.ChannelCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_channel = models.Channel(**channel.model_dump())
    db.add(db_channel)
    db.commit()
    db.refresh(db_channel)
    return db_channel

@app.get("/api/chat/channels", response_model=List[schemas.ChannelResponse])
def get_channels(workspace_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Channel).filter(models.Channel.workspace_id == workspace_id).all()

@app.post("/api/chat/messages", response_model=schemas.MessageResponse)
def post_chat_message(msg: schemas.MessageCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_msg = models.Message(
        channel_id=msg.channel_id,
        user_id=current_user.id,
        message=msg.message
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg

@app.get("/api/chat/messages", response_model=List[schemas.MessageResponse])
def get_chat_messages(channel_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Message).filter(models.Message.channel_id == channel_id).order_by(models.Message.created_at.asc()).all()

# --- FORMS ENDPOINTS ---
@app.post("/api/forms", response_model=schemas.FormResponse)
def create_form(form: schemas.FormCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_form = models.Form(**form.model_dump())
    db.add(db_form)
    db.commit()
    db.refresh(db_form)
    return db_form

@app.get("/api/forms", response_model=List[schemas.FormResponse])
def get_forms(list_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Form).filter(models.Form.list_id == list_id).all()

@app.post("/api/forms/submit/{form_id}", response_model=schemas.TaskResponse)
def submit_form(form_id: int, payload: dict, db: Session = Depends(get_db)):
    form = db.query(models.Form).filter(models.Form.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
        
    title = payload.get("title", f"Form Submission {datetime.utcnow().strftime('%Y-%m-%d')}")
    description = payload.get("description", "")
    priority = payload.get("priority", "Medium")
    
    # Save as new task
    db_task = models.Task(
        list_id=form.list_id,
        title=title,
        description=description,
        priority=priority,
        status="To Do"
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    
    # Trigger automation
    execute_automations(db, db_task, "task_created")
    return db_task

# --- AUTOMATION RULES ENDPOINTS ---
@app.post("/api/automation/rules", response_model=schemas.AutomationRuleResponse)
def create_automation_rule(rule: schemas.AutomationRuleCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_rule = models.AutomationRule(**rule.model_dump())
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

@app.get("/api/automation/rules", response_model=List[schemas.AutomationRuleResponse])
def get_automation_rules(workspace_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.AutomationRule).filter(models.AutomationRule.workspace_id == workspace_id).all()

@app.delete("/api/automation/rules/{rule_id}")
def delete_automation_rule(rule_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_rule = db.query(models.AutomationRule).filter(models.AutomationRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(db_rule)
    db.commit()
    return {"message": "Rule deleted"}

# --- GOALS ENDPOINTS ---
@app.post("/api/goals", response_model=schemas.GoalResponse)
def create_goal(goal: schemas.GoalCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_goal = models.Goal(**goal.model_dump())
    db.add(db_goal)
    db.commit()
    db.refresh(db_goal)
    return db_goal

@app.get("/api/goals", response_model=List[schemas.GoalResponse])
def get_goals(workspace_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Goal).filter(models.Goal.workspace_id == workspace_id).all()

@app.put("/api/goals/{goal_id}", response_model=schemas.GoalResponse)
def update_goal(goal_id: int, goal: schemas.GoalCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db_goal.title = goal.title
    db_goal.target_value = goal.target_value
    db_goal.current_value = goal.current_value
    db_goal.due_date = goal.due_date
    db.commit()
    db.refresh(db_goal)
    return db_goal

@app.delete("/api/goals/{goal_id}")
def delete_goal(goal_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_goal = db.query(models.Goal).filter(models.Goal.id == goal_id).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    db.delete(db_goal)
    db.commit()
    return {"message": "Goal deleted"}

# --- AI ASSISTANT ENDPOINTS ---
@app.post("/api/ai/chat")
def ai_chat(payload: dict, current_user: models.User = Depends(get_current_user)):
    prompt = payload.get("prompt", "").lower()
    
    # Check if OPENAI_API_KEY is available in env
    key = os.environ.get("OPENAI_API_KEY")
    if key:
        # If key exists, we can do request to OpenAI
        # For security and simplicity, we can do a request to openai here
        # or we fallback to our smart PM generator below.
        pass
        
    # Dynamic PM Assistant response mapping
    if "summarize" in prompt or "summary" in prompt:
        return {"response": "### Project Workspace Summary\n\n*   **Overall Progress**: **60%** of tasks complete.\n*   **Active Sprint status**: 4 tasks in progress, 2 pending review.\n*   **Bottleneck**: 'Database Revisions' is blocking downstream APIs.\n*   **Recommendation**: Approve the pending schema shifts to unblock Thameem."}
    elif "generate task" in prompt or "create task" in prompt:
        return {"response": "### Generated Tasks Outline\n\n1.  **Draft API Routing Specs** (Duration: 3 Days, Priority: High)\n2.  **Integrate WebSocket Chat Handler** (Duration: 2 Days, Priority: Medium)\n3.  **Validate JWT Crypt Token Length** (Duration: 1 Day, Priority: Low)"}
    elif "meeting notes" in prompt or "notes" in prompt:
        return {"response": "### Meeting Summary - June 08\n\n*   **Focus**: Migration to hierarchical PM system.\n*   **Decisions**: Adopt finish-to-start cascading rules; store attachments locally.\n*   **Action Items**: Thameem to set up workspace folders; deploy test client."}
    else:
        return {"response": "### Workspace AI Assistant\nHello! I am your PM Workspace Assistant. I can help you summarize workspace progress, generate task ideas, or compose meeting notes. \n\n*Try asking me:*\n*   *\"Summarize workspace status\"*\n*   *\"Generate tasks for chat application\"*\n*   *\"Draft meeting notes\"*"}

# --- SVG REPORTS GENERATORS ---
@app.get("/api/reports/burndown")
def get_burndown_report(workspace_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Calculate days in the last week and simulated tasks remaining
    today = date.today()
    data = []
    
    # Get total tasks in the workspace
    total = db.query(models.Task).join(models.List).join(models.Folder).join(models.Space).filter(models.Space.workspace_id == workspace_id).count()
    completed = db.query(models.Task).join(models.List).join(models.Folder).join(models.Space).filter(
        models.Space.workspace_id == workspace_id,
        models.Task.status.in_(["Done", "Completed"])
    ).count()
    
    remaining = total
    for i in range(7):
        day_date = today - timedelta(days=6-i)
        simulated_remaining = max(0, int(remaining - (completed / 7) * i))
        data.append({
            "day": day_date.strftime("%b %d"),
            "remaining": simulated_remaining
        })
    return data

@app.get("/api/reports/velocity")
def get_velocity_report(workspace_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    # Return sprint numbers and tasks completed per sprint
    return [
        {"sprint": "Sprint 1", "completed": 5},
        {"sprint": "Sprint 2", "completed": 8},
        {"sprint": "Sprint 3", "completed": 12},
        {"sprint": "Sprint 4", "completed": 15}
    ]

# Include Notifications Router (Imported here to avoid circular imports)
from routers import notifications
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])
