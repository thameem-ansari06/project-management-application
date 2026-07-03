from pydantic import BaseModel, EmailStr, ConfigDict
from datetime import date, datetime
from typing import List, Optional

# --- USER & AUTH SCHEMAS ---
class UserCreate(BaseModel):
    name: str
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str
    avatar: Optional[str] = None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    user_id: Optional[int] = None

# --- WORKSPACE SCHEMAS ---
class WorkspaceCreate(BaseModel):
    name: str

class WorkspaceResponse(BaseModel):
    id: int
    name: str
    owner_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class WorkspaceMemberCreate(BaseModel):
    user_id: int
    role: str = "Member"

class WorkspaceMemberResponse(BaseModel):
    id: int
    workspace_id: int
    user_id: int
    role: str
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)

# --- INVITATION SCHEMAS ---
class InvitationCreate(BaseModel):
    email: str
    role: str = "Member"

class InvitationResponse(BaseModel):
    id: int
    workspace_id: int
    email: str
    token: str
    status: str
    expires_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- PROJECT SCHEMAS ---
class ProjectCreate(BaseModel):
    workspace_id: int
    name: str
    description: Optional[str] = None
    is_private: bool = False
    canvas_state: Optional[dict] = {}
    imported_json_name: Optional[str] = None

class ProjectResponse(ProjectCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_private: Optional[bool] = None
    canvas_state: Optional[dict] = None
    imported_json_name: Optional[str] = None

# --- FOLDER SCHEMAS ---
class FolderCreate(BaseModel):
    project_id: int
    name: str
    description: Optional[str] = None

class FolderResponse(FolderCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)

# --- LIST SCHEMAS ---
class ListCreate(BaseModel):
    folder_id: int
    name: str
    description: Optional[str] = None

class ListResponse(ListCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)

# --- COMMENT SCHEMAS ---
class CommentCreate(BaseModel):
    task_id: int
    message: str

class CommentResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    message: str
    created_at: datetime
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)

# --- ATTACHMENT SCHEMAS ---
class AttachmentResponse(BaseModel):
    id: int
    task_id: int
    file_name: str
    file_url: str
    uploaded_by: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class TaskCreate(BaseModel):
    list_id: int
    title: str
    description: Optional[str] = None
    status: str = "To Do"
    priority: str = "Medium"
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    end_date: Optional[date] = None
    parent_task_id: Optional[int] = None
    parent_id: Optional[int] = None
    duration_days: Optional[int] = None
    predecessor_id: Optional[int] = None
    assignee_ids: Optional[List[int]] = []
    assigned_to_id: Optional[int] = None

    # Task Model v2 Fields
    progress: Optional[int] = 0
    task_type: Optional[str] = "task"
    dependency_type: Optional[str] = "FS"
    lag_days: Optional[int] = 0
    estimated_hours: Optional[float] = 0.0
    actual_hours: Optional[float] = 0.0
    remaining_hours: Optional[float] = 0.0

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = "To Do"
    priority: Optional[str] = "Medium"
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    end_date: Optional[date] = None
    duration_days: Optional[int] = None
    parent_task_id: Optional[int] = None
    parent_id: Optional[int] = None
    predecessor_id: Optional[int] = None
    assignee_ids: Optional[List[int]] = []
    assigned_to_id: Optional[int] = None
    
    # Task Model v2 Fields
    progress: Optional[int] = 0
    task_type: Optional[str] = "task"
    dependency_type: Optional[str] = "FS"
    lag_days: Optional[int] = 0
    estimated_hours: Optional[float] = 0.0
    actual_hours: Optional[float] = 0.0
    remaining_hours: Optional[float] = 0.0

class TaskResponse(BaseModel):
    id: int
    list_id: int
    title: str
    description: Optional[str] = None
    status: str
    priority: str
    start_date: Optional[date] = None
    due_date: Optional[date] = None
    duration_days: Optional[int] = None
    created_by: Optional[int] = None
    parent_task_id: Optional[int] = None
    parent_id: Optional[int] = None
    predecessor_id: Optional[int] = None
    assigned_to_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    
    # Task Model v2 Fields
    progress: int
    task_type: str
    dependency_type: Optional[str]
    lag_days: int
    estimated_hours: float
    actual_hours: float
    remaining_hours: float
    assignee: Optional[UserResponse] = None
    assignees: List[UserResponse] = []
    comments: List[CommentResponse] = []
    attachments: List[AttachmentResponse] = []
    subtasks: List['TaskResponse'] = []
    children: List['TaskResponse'] = []

    model_config = ConfigDict(from_attributes=True)

# Resolve circular reference for nested subtasks in TaskResponse
TaskResponse.model_rebuild()

class DashboardOverview(BaseModel):
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    overdue_tasks: int
    completion_rate: float

# --- NOTIFICATION SCHEMAS ---
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    tab_category: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- TIME ENTRY SCHEMAS ---
class TimeEntryCreate(BaseModel):
    task_id: int

class TimeEntryResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    start_time: datetime
    end_time: Optional[datetime] = None
    duration: int

    model_config = ConfigDict(from_attributes=True)

# --- DOCUMENT SCHEMAS ---
class DocumentCreate(BaseModel):
    workspace_id: int
    title: str
    content: Optional[str] = ""
    file_name: Optional[str] = None
    file_url: Optional[str] = None
    file_size: Optional[int] = None
    uploaded_by: Optional[int] = None

class DocumentResponse(DocumentCreate):
    id: int
    created_at: datetime
    updated_at: datetime
    uploader: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)

# --- CHAT SCHEMAS ---
class ChannelCreate(BaseModel):
    workspace_id: int
    name: str

class ChannelResponse(ChannelCreate):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MessageCreate(BaseModel):
    channel_id: int
    message: str

class MessageResponse(BaseModel):
    id: int
    channel_id: int
    user_id: int
    message: str
    created_at: datetime
    user: UserResponse

    model_config = ConfigDict(from_attributes=True)

# --- FORM SCHEMAS ---
class FormCreate(BaseModel):
    list_id: int
    title: str
    description: Optional[str] = None
    fields: str = "[]"  # JSON list of fields

class FormResponse(FormCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)

# --- AUTOMATION RULE SCHEMAS ---
class AutomationRuleCreate(BaseModel):
    workspace_id: int
    trigger_type: str
    condition_value: Optional[str] = None
    action_type: str
    action_value: Optional[str] = None

class AutomationRuleResponse(AutomationRuleCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)

# --- GOAL SCHEMAS ---
class GoalCreate(BaseModel):
    workspace_id: int
    title: str
    target_value: int = 100
    current_value: int = 0
    due_date: Optional[date] = None

class GoalResponse(GoalCreate):
    id: int

    model_config = ConfigDict(from_attributes=True)