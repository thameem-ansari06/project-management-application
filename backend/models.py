from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, ForeignKey, Table, func, Float
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship, backref
from datetime import datetime
from database import Base

# Association table for task assignees (many-to-many relationship)
task_assignees = Table(
    "task_assignees",
    Base.metadata,
    Column("task_id", Integer, ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    avatar = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    workspaces = relationship("Workspace", back_populates="owner")
    workspace_memberships = relationship("WorkspaceMember", back_populates="user")
    created_tasks = relationship("Task", back_populates="creator", foreign_keys="[Task.created_by]")
    comments = relationship("Comment", back_populates="user")

class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    owner = relationship("User", back_populates="workspaces")
    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="workspace", cascade="all, delete-orphan")

class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    role = Column(String, default="Member")  # Owner, Admin, Member, Guest
    joined_at = Column(DateTime, server_default=func.now())

    # Relationships
    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="workspace_memberships")

class Invitation(Base):
    __tablename__ = "invitations"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    email = Column(String, index=True, nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    status = Column(String, default="pending")  # 'pending', 'accepted', 'expired'
    expires_at = Column(DateTime, nullable=False)

    # Relationships
    workspace = relationship("Workspace")

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    is_private = Column(Boolean, default=False)
    canvas_state = Column(JSONB, default=lambda: {}, server_default='{}')
    imported_json_name = Column(String, nullable=True)

    # Relationships
    workspace = relationship("Workspace", back_populates="projects")
    folders = relationship("Folder", back_populates="project", cascade="all, delete-orphan")

class Folder(Base):
    __tablename__ = "folders"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)

    # Relationships
    project = relationship("Project", back_populates="folders")
    lists = relationship("List", back_populates="folder", cascade="all, delete-orphan")

class List(Base):
    __tablename__ = "lists"

    id = Column(Integer, primary_key=True, index=True)
    folder_id = Column(Integer, ForeignKey("folders.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)

    # Relationships
    folder = relationship("Folder", back_populates="lists")
    tasks = relationship("Task", back_populates="list", cascade="all, delete-orphan")

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    list_id = Column(Integer, ForeignKey("lists.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, index=True, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="To Do")  # To Do, In Progress, Done
    priority = Column(String, default="Medium")  # Urgent, High, Medium, Low
    start_date = Column(Date, nullable=True)
    due_date = Column(Date, nullable=True)

    @property
    def end_date(self):
        return self.due_date

    @end_date.setter
    def end_date(self, value):
        self.due_date = value
    created_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    parent_task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    parent_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    # Core PM Fields
    duration_days = Column(Integer, nullable=True)
    progress = Column(Integer, default=0, server_default="0", nullable=False)
    task_type = Column(String, default="task", server_default="task", nullable=False, index=True)
    dependency_type = Column(String, default="FS", server_default="FS", nullable=True)
    lag_days = Column(Integer, default=0, server_default="0", nullable=False)
    
    # Estimation Fields
    estimated_hours = Column(Float, default=0.0, server_default="0.0", nullable=False)
    actual_hours = Column(Float, default=0.0, server_default="0.0", nullable=False)
    remaining_hours = Column(Float, default=0.0, server_default="0.0", nullable=False)
    predecessor_id = Column(Integer, ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    assigned_to_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    list = relationship("List", back_populates="tasks")
    creator = relationship("User", back_populates="created_tasks", foreign_keys=[created_by])
    assignee = relationship("User", foreign_keys=[assigned_to_id])
    
    # Subtasks
    subtasks = relationship("Task", backref=backref("parent", remote_side=[id]), cascade="all, delete-orphan", foreign_keys=[parent_task_id])
    
    # WBS Children
    children = relationship("Task", backref=backref("parent_node", remote_side=[id]), cascade="all, delete-orphan", foreign_keys=[parent_id])
    
    # Task dependencies
    predecessor = relationship("Task", remote_side=[id], backref="successors", foreign_keys=[predecessor_id])
    
    # Assignees
    assignees = relationship("User", secondary=task_assignees, backref="assigned_tasks")
    
    # Comments & Attachments
    comments = relationship("Comment", back_populates="task", cascade="all, delete-orphan")
    attachments = relationship("Attachment", back_populates="task", cascade="all, delete-orphan")

class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    task = relationship("Task", back_populates="comments")
    user = relationship("User", back_populates="comments")

class Attachment(Base):
    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    file_name = Column(String, nullable=False)
    file_url = Column(String, nullable=False)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    task = relationship("Task", back_populates="attachments")

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    tab_category = Column(String, default="Primary")
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

class TimeEntry(Base):
    __tablename__ = "time_entries"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    start_time = Column(DateTime, server_default=func.now())
    end_time = Column(DateTime, nullable=True)
    duration = Column(Integer, default=0)

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    content = Column(String, default="")
    file_name = Column(String, nullable=True)
    file_url = Column(String, nullable=True)
    file_size = Column(Integer, nullable=True)
    uploaded_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    uploader = relationship("User", foreign_keys=[uploaded_by])

class Channel(Base):
    __tablename__ = "channels"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    channel_id = Column(Integer, ForeignKey("channels.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    message = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationship to user
    user = relationship("User")

class Form(Base):
    __tablename__ = "forms"

    id = Column(Integer, primary_key=True, index=True)
    list_id = Column(Integer, ForeignKey("lists.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    fields = Column(String, default="[]")

class AutomationRule(Base):
    __tablename__ = "automation_rules"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    trigger_type = Column(String, nullable=False)
    condition_value = Column(String, nullable=True)
    action_type = Column(String, nullable=False)
    action_value = Column(String, nullable=True)

class Goal(Base):
    __tablename__ = "goals"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    title = Column(String, nullable=False)
    target_value = Column(Integer, default=100)
    current_value = Column(Integer, default=0)
    due_date = Column(Date, nullable=True)