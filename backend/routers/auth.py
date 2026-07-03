from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
import os
import uuid
import httpx
import urllib.parse

from database import get_db
import models
import schemas
from dependencies import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])

# --- AUTH ENDPOINTS ---
@router.post("/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, token: Optional[str] = None, db: Session = Depends(get_db)):
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
    
    personal_workspace = models.Workspace(
        name="Personal Workspace",
        owner_id=db_user.id
    )
    db.add(personal_workspace)
    db.commit()
    db.refresh(personal_workspace)
    
    member_entry = models.WorkspaceMember(
        workspace_id=personal_workspace.id,
        user_id=db_user.id,
        role="Owner"
    )
    db.add(member_entry)
    
    if token:
        invite = db.query(models.Invitation).filter(models.Invitation.token == token).first()
        if invite and invite.status == "pending" and invite.expires_at >= datetime.utcnow():
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

@router.post("/login", response_model=schemas.Token)
def login_user(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect email or password")
    
    access_token = create_access_token(data={"user_id": user.id, "email": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=schemas.UserResponse)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# --- GOOGLE OAUTH2 ENDPOINTS ---
GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI", "http://127.0.0.1:8000/api/auth/google/callback")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

@router.get("/google/login")
def google_login(
    invite_token: Optional[str] = None,
    invite_email: Optional[str] = None
):
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID in your .env file.")
    
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

@router.get("/google/callback")
def google_callback(code: str, state: Optional[str] = None, db: Session = Depends(get_db)):
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="Google OAuth is not configured.")
    
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
    
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        random_password = uuid.uuid4().hex
        user = models.User(
            name=name,
            email=email,
            password_hash=hash_password(random_password)
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        
        personal_workspace = models.Workspace(name="Personal Workspace", owner_id=user.id)
        db.add(personal_workspace)
        db.commit()
        db.refresh(personal_workspace)
        
        member_entry = models.WorkspaceMember(
            workspace_id=personal_workspace.id, user_id=user.id, role="Owner"
        )
        db.add(member_entry)
        db.commit()
    
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
    
    access_token = create_access_token(data={"user_id": user.id, "email": user.email})
    redirect_url = f"{FRONTEND_URL}/?google_token={access_token}"
    return RedirectResponse(url=redirect_url)
