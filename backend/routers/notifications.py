from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import asyncio
from datetime import datetime
import json
import jwt

from database import get_db
import models
import schemas
from main import SECRET_KEY, ALGORITHM, get_current_user

router = APIRouter()

def get_current_user_query(token: str = Query(...), db: Session = Depends(get_db)) -> models.User:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def notification_generator(user_id: int, db: Session):
    last_checked_at = datetime.utcnow()
    
    # Initial fetch: get all unread notifications
    unread = db.query(models.Notification).filter(
        models.Notification.user_id == user_id,
        models.Notification.is_read == False
    ).all()
    
    if unread:
        for notif in unread:
            data = schemas.NotificationResponse.model_validate(notif).model_dump_json()
            yield f"data: {data}\n\n"
    
    while True:
        await asyncio.sleep(2)
        
        # Check for new notifications created after the last check
        new_notifications = db.query(models.Notification).filter(
            models.Notification.user_id == user_id,
            models.Notification.created_at > last_checked_at
        ).all()
        
        print(f"Found {len(new_notifications)} new notifications for user.")
        
        last_checked_at = datetime.utcnow()
        
        for notif in new_notifications:
            data = schemas.NotificationResponse.model_validate(notif).model_dump_json()
            yield f"data: {data}\n\n"

@router.get("/stream")
async def stream_notifications(current_user: models.User = Depends(get_current_user_query), db: Session = Depends(get_db)):
    """
    Server-Sent Events endpoint for real-time notifications.
    """
    return StreamingResponse(
        notification_generator(current_user.id, db),
        media_type="text/event-stream"
    )

@router.put("/{notification_id}/read", response_model=schemas.NotificationResponse)
def mark_notification_as_read(notification_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id, 
        models.Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.is_read = True
    notif.tab_category = 'Cleared'
    db.commit()
    db.refresh(notif)
    return notif

@router.put("/{notification_id}/snooze", response_model=schemas.NotificationResponse)
def snooze_notification(notification_id: int, current_user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id, 
        models.Notification.user_id == current_user.id
    ).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notif.tab_category = 'Later'
    db.commit()
    db.refresh(notif)
    return notif
