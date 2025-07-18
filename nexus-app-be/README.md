# Nexus AI Backend (LSP-Only)

A sophisticated FastAPI backend for **Language Server Protocol (LSP) compliant** AI-powered text editing. This system provides professional-grade text enhancement capabilities following LSP standards for seamless editor integration.

## 🚀 Key Features

### **LSP-Compliant Architecture**
- **Standard LSP Endpoints**: textDocument/codeAction, textDocument/completion, workspace/executeCommand
- **LSP-Compatible Responses**: TextEdit, WorkspaceEdit, CodeAction objects
- **Editor Agnostic**: Works with any LSP-compatible editor (VS Code, Neovim, etc.)
- **Professional Workflow**: Follows Language Server Protocol conventions

### **Advanced AI Text Enhancement**
- **Context-Aware Processing**: Uses AI to enhance, expand, clarify, and rewrite text
- **Precise Character-Level Changes**: LSP-compliant TextEdit objects with exact positions
- **Smart Change Detection**: Calculates minimal diffs for efficient application
- **Fallback Support**: Graceful handling when AI services are unavailable

### **LSP Standard Features**
- **Code Actions**: AI-powered enhancement actions available in context menus
- **Completions**: AI-generated text completions at cursor position
- **Workspace Edits**: Multi-document modifications with proper versioning
- **Command Execution**: Custom AI enhancement commands

### **Production-Ready Architecture**
- **Supabase JWT Authentication**: Seamless integration with frontend auth
- **Comprehensive Error Handling**: Graceful fallbacks and detailed error messages
- **Health Monitoring**: Built-in service health checks
- **CORS Support**: Configured for Next.js frontend integration

## 📁 Project Structure (LSP-Only)

```
nexus-app-be/
├── app/
│   ├── main.py              # FastAPI application entry point
│   ├── auth/                # Authentication middleware
│   │   └── middleware.py    # Supabase JWT validation
│   ├── ai/                  # AI services (LSP-focused)
│   │   ├── gemini_service.py # Minimal AI service for text enhancement
│   │   └── lsp_diff_service.py # LSP-compliant diffing engine
│   ├── models/              # Pydantic models (LSP-only)
│   │   ├── auth.py          # User authentication models
│   │   └── lsp_models.py    # LSP-compliant data models
│   └── routes/              # API endpoints (LSP-only)
│       └── lsp_infuse.py    # LSP-compliant text enhancement routes
├── requirements.txt         # Core dependencies
├── requirements-core.txt    # Minimal dependencies
├── env.example             # Environment configuration template
└── venv/                   # Virtual environment (activated)
```

## 🛠 Installation & Setup

### Prerequisites
- Python 3.9+
- Virtual environment (recommended)
- Supabase project (same as frontend)

### Quick Start

1. **Clone and navigate to backend directory**
   ```bash
   cd nexus-app-be
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   # Core dependencies (when pip issues are resolved)
   pip install -r requirements-core.txt
   
   # Or install manually
   pip install fastapi uvicorn diff-match-patch python-dotenv pydantic
   ```

4. **Configure environment**
   ```bash
   cp env.example .env
   # Edit .env with your actual values
   ```

5. **Run the server**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

6. **Verify installation**
   - API Docs: http://localhost:8000/docs
   - Health Check: http://localhost:8000/api/health

## 🔧 Environment Configuration

Copy `env.example` to `.env` and configure:

```bash
# Supabase (must match your Next.js frontend)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here  # Optional for development

# LangSmith (Optional - for AI tracing)
LANGSMITH_API_KEY=your-langsmith-key-here
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=nexus-ai-backend
```

## 🌐 API Endpoints

### **Suggestions API**

#### `POST /api/suggestions`
Generate AI suggestions based on content and cursor position.

**Request:**
```json
{
  "content": "Your text content here...",
  "cursor_position": {"line": 5, "char": 10},
  "context_window": 500,
  "preferences": {
    "gemini_api_key": "AIza..."
  }
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "id": "gemini-123456-0",
      "text": "Enhanced suggestion text",
      "type": "enhance",
      "confidence": 0.85,
      "suggested_action": "merge"
    }
  ],
  "processing_time_ms": 1250
}
```

#### `POST /api/suggestions/stream`
Stream suggestions in real-time using Server-Sent Events.

### **Infuse API** ⭐ (Core Innovation)

#### `POST /api/infuse`
Apply AI suggestions with precise diff-based changes.

**Request:**
```json
{
  "action_type": "highlight_click|cmd_drop|paragraph_drop",
  "original_text": "Text to be modified...",
  "suggestion": {
    "text": "AI suggestion to incorporate",
    "type": "enhance",
    "suggested_action": "merge"
  },
  "selection": {
    "start": {"line": 1, "char": 0},
    "end": {"line": 1, "char": 10},
    "text": "selected"
  },
  "cursor_position": {"line": 1, "char": 5},
  "context": {
    "before": "Text before...",
    "after": "Text after...",
    "paragraph": "Current paragraph...",
    "full_document": "Complete document..."
  },
  "gemini_api_key": "AIza..."
}
```

**Response:**
```json
{
  "infused_text": "Complete modified text...",
  "changes": [
    {
      "type": "replace",
      "start_line": 1,
      "end_line": 1,
      "start_char": 10,
      "end_char": 20,
      "new_text": "enhanced content",
      "description": "Replaced text with new content"
    }
  ],
  "explanation": "Successfully enhanced the highlighted text with 1 precise edit...",
  "confidence": 0.85,
  "processing_time_ms": 1800,
  "diff_stats": {
    "insertions": 0,
    "deletions": 0,
    "modifications": 1,
    "total_chars_added": 15,
    "total_chars_removed": 10
  }
}
```

#### `POST /api/infuse/stream`
Stream infusion process with real-time progress updates.

#### `POST /api/infuse/preview`
Preview changes before applying them.

### **Health Checks**
- `GET /api/health` - Overall system health
- `GET /api/suggestions/health` - Suggestions service health  
- `GET /api/infuse/health` - Infuse service health

## 🔐 Authentication

The backend integrates seamlessly with Supabase authentication:

1. **Frontend sends JWT**: Include `Authorization: Bearer <token>` header
2. **Backend validates**: Verifies token with Supabase  
3. **User context**: Available in route handlers via dependency injection

```python
from app.auth.middleware import get_current_user

@router.post("/some-endpoint")
async def protected_endpoint(current_user: User = Depends(get_current_user)):
    # Access user.id, user.username, etc.
    pass
```

## 🎯 Integration with Frontend

### Replace Existing AI Service

**Before (NextJS):**
```typescript
// Old approach
import { GeminiAIContentProcessor } from './services/geminiAIService';
```

**After (FastAPI Backend):**
```typescript
// New approach
class AIBackendService {
  async generateSuggestions(content: string, cursorPos: CursorPosition) {
    const response = await fetch('http://localhost:8000/api/suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        content,
        cursor_position: cursorPos,
        preferences: { gemini_api_key: userApiKey }
      })
    });
    return response.json();
  }

  async infuseContent(infuseRequest: InfuseRequest) {
    const response = await fetch('http://localhost:8000/api/infuse', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify(infuseRequest)
    });
    return response.json();
  }
}
```

### Apply Changes to Editor

The backend returns precise change instructions:

```typescript
// Apply changes from backend response
response.changes.forEach(change => {
  editor.replaceRange(
    { line: change.start_line, ch: change.start_char },
    { line: change.end_line, ch: change.end_char },
    change.new_text
  );
});
```

## 🚀 Key Advantages Over Previous System

### **1. Superior Text Editing**
- **Before**: Simple text replacement, position shifts, cursor jumps
- **After**: Precise character-level changes, stable cursor position

### **2. Enhanced User Experience**  
- **Before**: Blocking UI during AI processing
- **After**: Real-time streaming feedback, progress indicators

### **3. Better Architecture**
- **Before**: AI logic embedded in frontend
- **After**: Dedicated backend, better separation of concerns

### **4. Advanced Features**
- **Before**: Basic suggestion application
- **After**: Three distinct infusion types, preview mode, confidence scoring

### **5. Scalability**
- **Before**: Limited by browser constraints
- **After**: Server-side processing, multiple frontend support

## 🔧 Development

### Running Tests
```bash
# When tests are implemented
pytest app/tests/
```

### Code Formatting
```bash
black app/
isort app/
```

### Type Checking  
```bash
mypy app/
```

## 🚀 Deployment

### Production Considerations
1. **Environment Variables**: Set all required env vars
2. **CORS Origins**: Update for production domains
3. **JWT Secret**: Obtain from Supabase dashboard
4. **Resource Limits**: Configure for expected load
5. **Monitoring**: Set up health check monitoring

### Docker Support (Future)
```dockerfile
# Dockerfile (to be implemented)
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY app/ app/
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🤝 Contributing

1. Follow the existing code structure
2. Add proper type hints and documentation
3. Test new features thoroughly
4. Update this README for significant changes

---

**This FastAPI backend represents a significant upgrade to the Nexus AI system, providing professional-grade text editing capabilities with precise diff-based modifications that rival tools like Cursor and GitHub Copilot.** 