from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    vk_id: int
    full_name: str
    role: str = 'user'

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

class TaskBase(BaseModel):
    text: str
    deadline: Optional[str] = None
    assignee_id: Optional[int] = None
    priority: Optional[str] = 'medium'
    project: Optional[str] = None
    status: Optional[str] = 'pending'

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    text: Optional[str] = None
    deadline: Optional[str] = None
    assignee_id: Optional[int] = None
    priority: Optional[str] = None
    project: Optional[str] = None
    status: Optional[str] = None

class TaskResponse(TaskBase):
    id: int
    author_id: int
    status: str
    created_at: datetime
    completed_at: Optional[datetime] = None
    assignee: Optional[UserResponse] = None
    author: Optional[UserResponse] = None
    
    model_config = ConfigDict(from_attributes=True)

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    text: str
    is_read: bool
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
