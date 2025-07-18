#!/usr/bin/env python3
"""
Simple startup script for the Nexus AI Server
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def check_environment():
    """Check if required environment variables are set"""
    required_vars = [
        'GOOGLE_API_KEY',
        # Supabase auth disabled for local testing
        # 'NEXT_PUBLIC_SUPABASE_URL', 
        # 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
    ]
    
    missing = []
    for var in required_vars:
        if not os.getenv(var):
            missing.append(var)
    
    if missing:
        print("❌ Missing environment variables:")
        for var in missing:
            print(f"   - {var}")
        print("\nCreate a .env file with these variables.")
        print("See TESTING_GUIDE.md for details.")
        return False
    
    print("✅ Environment variables configured")
    return True

def check_dependencies():
    """Check if required Python packages are installed"""
    try:
        import fastapi
        import uvicorn
        import google.generativeai
        print("✅ Dependencies installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Run: pip install -r requirements.txt")
        return False

def start_server():
    """Start the FastAPI server"""
    print("🚀 Starting Nexus AI Server...")
    print("📖 API Documentation: http://localhost:8000/docs")
    print("🏥 Health Check: http://localhost:8000/api/health")
    print("⏹️  Press Ctrl+C to stop")
    
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

if __name__ == "__main__":
    print("🔧 Nexus AI Server Startup Check")
    print("=" * 40)
    
    if not check_dependencies():
        sys.exit(1)
    
    if not check_environment():
        sys.exit(1)
    
    print("\n🎯 All checks passed!")
    start_server() 