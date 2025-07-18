# AI Service Testing Guide

## ⚠️ Important Note

**Auth has been disabled for local testing.** The backend API works perfectly, but the frontend may have some lingering auth-related code that needs cleanup. **For now, test the API directly using curl commands below.**

## Quick Start

### 1. Environment Setup

**Backend Environment Variables** (create `nexus-app-be/ai-server/.env`):
```bash
# Google AI Configuration (REQUIRED)
GOOGLE_API_KEY=your_gemini_api_key

# Supabase Configuration (OPTIONAL - auth disabled for local testing)
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# SUPABASE_JWT_SECRET=your_supabase_jwt_secret

# Server Configuration
PORT=8000
HOST=0.0.0.0
ENVIRONMENT=development
```

**Frontend Environment Variables** (add to `nexus-app/.env.local`):
```bash
NEXT_PUBLIC_AI_BACKEND_URL=http://localhost:8000
```

### 2. Start Services

**Terminal 1 - Backend:**
```bash
cd nexus-app-be/ai-server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd nexus-app
npm run dev
```

### 3. Verify Setup

- **Backend Health**: Visit http://localhost:8000/docs
- **API Test**: `curl http://localhost:8000/api/health`
- **Frontend**: Visit http://localhost:3000/immerse (may have auth issues - use API testing instead)

## Testing Scenarios

### Test 1: API Health Check ✅

**Expected**: Backend should be running and responsive

```bash
curl http://localhost:8000/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "services": {
    "gemini_ai": "available",
    "diffing_engine": "available", 
    "auth": "available"
  }
}
```

### Test 2: Suggestions Endpoint 🔍

**Manual Test:**
1. Go to http://localhost:3000/immerse
2. Type some text in the editor
3. Press CMD+J (or wait for auto-suggestions)
4. Suggestions should appear as floating cards

**API Test:**
```bash
curl -X POST http://localhost:8000/api/suggestions \
  -H "Content-Type: application/json" \
  -d '{"full_text": "I am exploring the nature of consciousness and how it relates to artificial intelligence."}'
```

**Expected Response:**
```json
{
  "items": [
    {
      "label": "This concept connects to recent developments in cognitive neuroscience...",
      "kind": 1,
      "detail": "AI-generated suggestion",
      "insertText": "This concept connects to recent developments in cognitive neuroscience..."
    }
  ]
}
```

### Test 3: Infuse Modes 🎯

#### Mode 1: Highlight + Click
1. Select text in the editor
2. Click a suggestion card
3. Only selected text should be enhanced

**API Test:**
```bash
curl -X POST http://localhost:8000/api/infuse \
  -H "Content-Type: application/json" \
  -d '{
    "full_text": "Consciousness is a complex phenomenon. It involves awareness and perception.",
    "cursor_position": {"line": 0, "character": 15},
    "highlighted_range": {
      "start": {"line": 0, "character": 0},
      "end": {"line": 0, "character": 14}
    },
    "suggestion_text": "improve clarity",
    "mode": "highlight_click"
  }'
```

#### Mode 2: CMD + Drop  
1. Hold CMD key
2. Drag suggestion to editor
3. Entire text should be infused with suggestion

**API Test:**
```bash
curl -X POST http://localhost:8000/api/infuse \
  -H "Content-Type: application/json" \
  -d '{
    "full_text": "Consciousness is fascinating.",
    "cursor_position": {"line": 0, "character": 10},
    "suggestion_text": "add scientific depth",
    "mode": "cmd_drop"
  }'
```

#### Mode 3: Paragraph Drop
1. Drag suggestion to a paragraph
2. Only that paragraph should be rewritten

**API Test:**
```bash
curl -X POST http://localhost:8000/api/infuse \
  -H "Content-Type: application/json" \
  -d '{
    "full_text": "First paragraph.\n\nSecond paragraph with important content.\n\nThird paragraph.",
    "cursor_position": {"line": 2, "character": 10},
    "suggestion_text": "enhance this section",
    "mode": "paragraph_drop"
  }'
```

## Expected Behaviors

### Suggestions
- ✅ Generate 4 contextual suggestions based on full text
- ✅ Return suggestions as floating cards in UI
- ✅ Suggestions should be relevant to content
- ✅ Should work without user API key (centralized)

### Infuse Modes
- ✅ **highlight_click**: Replace only selected text
- ✅ **cmd_drop**: Enhance entire document with suggestion
- ✅ **paragraph_drop**: Rewrite target paragraph only
- ✅ Return LSP-compliant edits for precise text replacement
- ✅ Preserve document structure and formatting

### Authentication
- 🚫 **Currently DISABLED** for local testing
- ✅ All endpoints work without auth headers
- ✅ Mock user data returned for `/api/me` endpoint
- 📝 Auth can be re-enabled by uncommenting dependencies in routes

## Troubleshooting

### Backend Won't Start
- Check Python dependencies: `pip install -r requirements.txt`
- Verify environment variables are set
- Check port 8000 isn't already in use

### "No Gemini API key" Error
- Set `GOOGLE_API_KEY` in backend `.env` file
- Restart backend server after adding key

### Frontend Can't Connect
- Verify `NEXT_PUBLIC_AI_BACKEND_URL=http://localhost:8000` in frontend `.env.local`
- Check backend is running on port 8000
- Check CORS settings in backend

### Suggestions Not Working
- Check browser network tab for API errors
- Verify API key is working with direct API test
- Check backend logs for Gemini API errors

### Auth Errors
- 🚫 **Auth is DISABLED** - no auth errors expected
- All endpoints accessible without tokens
- To re-enable auth: uncomment `Depends(get_optional_user)` in routes
- For production: implement proper Supabase JWT validation

## Performance Expectations

- **Suggestions**: 2-5 seconds generation time
- **Infuse**: 3-8 seconds depending on text length
- **API Health**: < 100ms response time
- **Memory**: Backend should use < 500MB RAM

## Next Steps

1. ✅ Basic functionality working
2. 🔄 Enable proper Supabase auth
3. 📊 Add monitoring and logging
4. ⚡ Optimize performance
5. 🛡️ Add rate limiting
6. 📖 Complete API documentation 