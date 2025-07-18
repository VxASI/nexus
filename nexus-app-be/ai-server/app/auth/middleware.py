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
import jwt
from jose import jwt as jose_jwt

from app.models.auth import User, TokenData

# Initialize HTTP Bearer for token extraction
security = HTTPBearer()

class SupabaseAuth:
    """Supabase authentication handler with proper JWT validation"""
    
    def __init__(self):
        self.supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
        self.supabase_anon_key = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "")
        self.supabase_jwt_secret = os.getenv("SUPABASE_JWT_SECRET")  # Add this: Secret key for JWT verification
        if not self.supabase_jwt_secret:
            raise ValueError("SUPABASE_JWT_SECRET environment variable is required")
        print(f"🔐 Auth initialized with Supabase URL: {self.supabase_url[:30]}...")
    
    async def verify_token(self, token: str) -> TokenData:
        """Verify JWT token using python-jose"""
        try:
            decoded = jose_jwt.decode(
                token,
                self.supabase_jwt_secret,
                algorithms=["HS256"],  # Adjust algorithm as per Supabase (usually HS256)
                audience="authenticated",  # Supabase default audience
                issuer=self.supabase_url + "/auth/v1"
            )
            return TokenData(
                user_id=decoded.get("sub"),
                email=decoded.get("email"),
                username=decoded.get("username", decoded.get("email").split("@")[0]),
                exp=decoded.get("exp"),
                iat=decoded.get("iat")
            )
        except jose_jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token has expired")
        except jose_jwt.JWTError as e:
            raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    
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