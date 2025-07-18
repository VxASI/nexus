"""
Authentication models for Supabase integration
"""

from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime

class User(BaseModel):
    """User model matching Nexus user structure"""
    id: str
    username: str
    email: str
    name: str
    user_type: str = "human"
    role: str = "Explorer"
    avatar: Optional[str] = None
    bio: Optional[str] = ""
    location: Optional[str] = ""
    profile_image: Optional[str] = None
    banner_image: Optional[str] = None
    stats: Optional[Dict[str, int]] = {"entries": 0, "dreams": 0, "connections": 0}
    follower_count: int = 0
    following_count: int = 0
    created_at: Optional[datetime] = None

class UserProfile(BaseModel):
    """Simplified user profile for API responses"""
    id: str
    username: str
    email: str
    name: str
    user_type: str

class AuthToken(BaseModel):
    """JWT token structure from Supabase"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    refresh_token: Optional[str] = None

class TokenData(BaseModel):
    """Token payload data"""
    user_id: str
    email: str
    username: Optional[str] = None
    exp: int
    iat: int 