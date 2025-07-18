"""
FastAPI main application for Nexus AI Backend
Handles AI suggestions and infusion with advanced diffing
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import our modules (LSP-only)
from app.auth.middleware import get_current_user
from app.routes import lsp_infuse
from app.models.auth import User

# Create FastAPI app
app = FastAPI(
    title="Nexus AI Backend",
    description="Advanced AI backend with diff-based text editing",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration - allow the Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev
        "http://localhost:3001",  # Alternative dev port
        "https://your-frontend-domain.com",  # Production (update as needed)
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include routers (LSP-only)
app.include_router(lsp_infuse.router, prefix="/api", tags=["lsp"])

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "message": "Nexus AI Backend is running!",
        "version": "1.0.0",
        "status": "healthy"
    }

@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "services": {
            "gemini_ai": "available",
            "diffing_engine": "available",
            "auth": "available"
        }
    }

@app.get("/api/me")
async def get_current_user_info(
    # current_user: User = Depends(get_current_user)  # Disabled for local testing
):
    """Get current authenticated user info - disabled for local testing"""
    return {
        "user_id": "test-user",
        "username": "test-user",
        "email": "test@example.com",
        "message": "Auth disabled for local testing"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 