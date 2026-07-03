from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import uuid
from datetime import datetime, timedelta

from database import get_db
import models
import schemas
from dependencies import get_current_user
from mail_utils import mail_config
from fastapi_mail import FastMail, MessageSchema, MessageType

router = APIRouter(tags=["workspaces"])

@router.post("/api/workspace", response_model=schemas.WorkspaceResponse)
def create_workspace(workspace: schemas.WorkspaceCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_workspace = models.Workspace(
        name=workspace.name,
        owner_id=current_user.id
    )
    db.add(db_workspace)
    db.commit()
    db.refresh(db_workspace)
    
    member_entry = models.WorkspaceMember(
        workspace_id=db_workspace.id,
        user_id=current_user.id,
        role="Owner"
    )
    db.add(member_entry)
    db.commit()
    return db_workspace

@router.get("/api/workspace", response_model=List[schemas.WorkspaceResponse])
def get_workspaces(current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return db.query(models.Workspace).join(models.WorkspaceMember).filter(models.WorkspaceMember.user_id == current_user.id).all()

@router.put("/api/workspace/{workspace_id}", response_model=schemas.WorkspaceResponse)
def update_workspace(workspace_id: int, workspace: schemas.WorkspaceCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_workspace = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
    if not db_workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    member = db.query(models.WorkspaceMember).filter(models.WorkspaceMember.workspace_id == workspace_id, models.WorkspaceMember.user_id == current_user.id).first()
    if not member or member.role not in ["Owner", "Admin"]:
        raise HTTPException(status_code=403, detail="You do not have permission to rename this workspace")
    
    db_workspace.name = workspace.name
    db.commit()
    db.refresh(db_workspace)
    return db_workspace

@router.delete("/api/workspace/{workspace_id}")
def delete_workspace(workspace_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_workspace = db.query(models.Workspace).filter(models.Workspace.id == workspace_id).first()
    if not db_workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    member = db.query(models.WorkspaceMember).filter(
        models.WorkspaceMember.workspace_id == workspace_id,
        models.WorkspaceMember.user_id == current_user.id
    ).first()
    if not member or member.role.lower() not in ["admin", "owner"]:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    db.delete(db_workspace)
    db.commit()
    return {"message": "Workspace deleted successfully"}

# --- WORKSPACE MEMBERSHIP ---
@router.post("/api/workspace/{workspace_id}/members", response_model=schemas.WorkspaceMemberResponse)
def add_workspace_member(workspace_id: int, member_create: schemas.WorkspaceMemberCreate, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    actor_member = db.query(models.WorkspaceMember).filter(models.WorkspaceMember.workspace_id == workspace_id, models.WorkspaceMember.user_id == current_user.id).first()
    if not actor_member or actor_member.role not in ["Owner", "Admin"]:
        raise HTTPException(status_code=403, detail="Only Owners or Admins can invite members")
    
    target_user = db.query(models.User).filter(models.User.id == member_create.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
    
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

@router.get("/api/workspaces/{workspace_id}/members", response_model=List[schemas.WorkspaceMemberResponse])
@router.get("/api/workspace/{workspace_id}/members", response_model=List[schemas.WorkspaceMemberResponse])
def get_workspace_members(workspace_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    member = db.query(models.WorkspaceMember).filter(models.WorkspaceMember.workspace_id == workspace_id, models.WorkspaceMember.user_id == current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return db.query(models.WorkspaceMember).filter(models.WorkspaceMember.workspace_id == workspace_id).all()

@router.post("/api/workspaces/{workspace_id}/invite", response_model=schemas.InvitationResponse)
def invite_workspace_member(
    workspace_id: int,
    invite_create: schemas.InvitationCreate,
    background_tasks: BackgroundTasks,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    actor_member = db.query(models.WorkspaceMember).filter(
        models.WorkspaceMember.workspace_id == workspace_id,
        models.WorkspaceMember.user_id == current_user.id
    ).first()
    if not actor_member or actor_member.role.strip().lower() not in ["owner", "admin"]:
        raise HTTPException(status_code=403, detail="Only Owners or Admins can invite members")
    
    token = uuid.uuid4().hex
    
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

@router.post("/api/workspaces/accept-invite")
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
    
    existing = db.query(models.WorkspaceMember).filter(
        models.WorkspaceMember.workspace_id == invite.workspace_id,
        models.WorkspaceMember.user_id == current_user.id
    ).first()
    
    if existing:
        invite.status = "accepted"
        db.commit()
        return {"message": "You are already a member of this workspace", "workspace_id": invite.workspace_id}
    
    member_entry = models.WorkspaceMember(
        workspace_id=invite.workspace_id,
        user_id=current_user.id,
        role="Member"
    )
    db.add(member_entry)
    invite.status = "accepted"
    db.commit()
    return {"message": "Successfully joined workspace", "workspace_id": invite.workspace_id}
