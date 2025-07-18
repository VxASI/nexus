"""
Simplified Supabase authentication middleware for FastAPI
Note: This is a minimal implementation without jose dependency
For production, install python-jose for proper JWT validation
"""

from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import os
from typing import Optional
import json

from app.models.auth import User, TokenData

# Initialize HTTP Bearer for token extraction
security = HTTPBearer()

class SupabaseAuth:
    """Simplified Supabase authentication handler"""
    
    def __init__(self):
        self.supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
        self.supabase_anon_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
        
        print(f"🔐 Auth initialized with Supabase URL: {self.supabase_url[:30]}...")
    
    async def verify_token(self, token: str) -> TokenData:
        """
        Simplified token verification - for development only
        In production, use proper JWT validation with python-jose
        """
        
        # For now, just validate basic format and create mock token data
        if not token or len(token) < 10:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token format"
            )
        
        # TODO: Replace with proper JWT verification
        # This is a mock implementation for development
        return TokenData(
            user_id="mock-user-123",
            email="dev@example.com",
            username="dev-user",
            exp=0,
            iat=0
        )
    
    async def get_user_profile(self, user_id: str) -> Optional[User]:
        """
        Mock user profile for development
        In production, this would query Supabase
        """
        
        # TODO: Replace with actual Supabase query
        return User(
            id=user_id,
            username="dev-user",
            email="dev@example.com",
            name="Development User",
            user_type="human",
            role="Explorer",
            avatar="DU",
            bio="Development user for testing",
            location="",
            stats={"entries": 0, "dreams": 0, "connections": 0},
            follower_count=0,
            following_count=0
        )

# Create global instance
supabase_auth = SupabaseAuth()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """
    FastAPI dependency to get the current authenticated user
    Note: This is a development implementation
    """
    
    token = credentials.credentials
    
    # Verify the token
    token_data = await supabase_auth.verify_token(token)
    
    # Get user profile  
    user = await supabase_auth.get_user_profile(token_data.user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found"
        )
    
    return user

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[User]:
    """
    Optional authentication - returns None if no valid token provided
    """
    
    if not credentials:
        return None
    
    try:
        return await get_current_user(credentials)
    except HTTPException:
        return None

async def verify_api_key_header(api_key: str) -> bool:
    """
    Verify if a provided API key is valid (for Gemini API keys)
    """
    
    # Basic validation for Gemini API keys
    if api_key.startswith("AIza") and len(api_key) > 30:
        return True
    
    return False 