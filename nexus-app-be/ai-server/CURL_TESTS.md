# AI Service - Curl Test Commands

## Prerequisites
Make sure your AI server is running:
```bash
cd nexus-app-be/ai-server
python start_server.py
```

---

## 1. Health Check ✅

### Basic Health Check
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

### User Info (Mock)
```bash
curl http://localhost:8000/api/me
```

**Expected Response:**
```json
{
  "user_id": "test-user",
  "username": "test-user", 
  "email": "test@example.com",
  "message": "Auth disabled for local testing"
}
```

---

## 2. Suggestions Endpoint 🔍

### Short Text
```bash
curl -X POST http://localhost:8000/api/suggestions \
  -H "Content-Type: application/json" \
  -d '{"full_text": "Consciousness is fascinating."}'
```

### Research Text
```bash
curl -X POST http://localhost:8000/api/suggestions \
  -H "Content-Type: application/json" \
  -d '{"full_text": "I am exploring the nature of consciousness and how it relates to artificial intelligence. The intersection of mind and machine presents profound questions about the nature of reality itself."}'
```

### Complex Academic Text
```bash
curl -X POST http://localhost:8000/api/suggestions \
  -H "Content-Type: application/json" \
  -d '{"full_text": "Recent developments in neuroscience have revealed fascinating insights into consciousness. However, the hard problem of consciousness - explaining why we have subjective experiences - remains unsolved. This gap between objective neural processes and subjective experience continues to challenge researchers."}'
```

**Expected Response Format:**
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

---

## 3. Infuse Modes 🎯

### Mode 1: Highlight + Click
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
    "suggestion_text": "improve clarity and add depth",
    "mode": "highlight_click"
  }'
```

### Mode 2: CMD + Drop (Full Text Infusion)
```bash
curl -X POST http://localhost:8000/api/infuse \
  -H "Content-Type: application/json" \
  -d '{
    "full_text": "Consciousness is fascinating. It represents one of the greatest mysteries in science.",
    "cursor_position": {"line": 0, "character": 10},
    "suggestion_text": "add scientific rigor and research context",
    "mode": "cmd_drop"
  }'
```

### Mode 3: Paragraph Drop
```bash
curl -X POST http://localhost:8000/api/infuse \
  -H "Content-Type: application/json" \
  -d '{
    "full_text": "First paragraph about consciousness.\n\nSecond paragraph with important research findings about neural correlates of consciousness.\n\nThird paragraph concluding thoughts.",
    "cursor_position": {"line": 2, "character": 10},
    "suggestion_text": "enhance with recent neuroscience discoveries",
    "mode": "paragraph_drop"
  }'
```

---

## 4. Advanced Test Cases 🧪

### Long Research Paper Excerpt
```bash
curl -X POST http://localhost:8000/api/suggestions \
  -H "Content-Type: application/json" \
  -d '{"full_text": "The question of consciousness has puzzled philosophers and scientists for centuries. From Descartes cogito ergo sum to modern theories of integrated information, we have struggled to understand what makes us aware. Recent advances in neuroscience, particularly the work on neural correlates of consciousness (NCCs), have provided new insights. However, the explanatory gap between neural activity and subjective experience remains. This is what Chalmers famously termed the hard problem of consciousness - explaining why there is something it is like to be conscious, rather than simply explaining the functional aspects of consciousness."}'
```

### Creative Writing Sample
```bash
curl -X POST http://localhost:8000/api/infuse \
  -H "Content-Type: application/json" \
  -d '{
    "full_text": "The old oak tree stood majestically in the meadow, its branches reaching toward the sky like ancient fingers grasping for forgotten dreams.",
    "cursor_position": {"line": 0, "character": 20},
    "suggestion_text": "add mystical elements and deeper metaphor",
    "mode": "highlight_click"
  }'
```

### Technical Documentation
```bash
curl -X POST http://localhost:8000/api/infuse \
  -H "Content-Type: application/json" \
  -d '{
    "full_text": "This API endpoint handles user authentication using JWT tokens. The implementation follows standard security practices.",
    "cursor_position": {"line": 0, "character": 0},
    "suggestion_text": "add code examples and security considerations",
    "mode": "cmd_drop"
  }'
```

---

## 5. Edge Cases 🔬

### Empty Text
```bash
curl -X POST http://localhost:8000/api/suggestions \
  -H "Content-Type: application/json" \
  -d '{"full_text": ""}'
```

### Single Word
```bash
curl -X POST http://localhost:8000/api/infuse \
  -H "Content-Type: application/json" \
  -d '{
    "full_text": "Hello",
    "cursor_position": {"line": 0, "character": 0},
    "suggestion_text": "make this greeting more engaging",
    "mode": "highlight_click"
  }'
```

### Multiple Paragraphs
```bash
curl -X POST http://localhost:8000/api/infuse \
  -H "Content-Type: application/json" \
  -d '{
    "full_text": "Introduction paragraph.\n\nBody paragraph with main content.\n\nConclusion paragraph.\n\nFinal thoughts paragraph.",
    "cursor_position": {"line": 4, "character": 5},
    "suggestion_text": "strengthen the conclusion",
    "mode": "paragraph_drop"
  }'
```

---

## 6. Performance Tests ⚡

### Timing a Request
```bash
time curl -X POST http://localhost:8000/api/suggestions \
  -H "Content-Type: application/json" \
  -d '{"full_text": "Artificial intelligence is transforming our world in unprecedented ways."}'
```

### Concurrent Requests (if you have `parallel` installed)
```bash
echo '{"full_text": "Test concurrent processing."}' | \
parallel -j 3 curl -X POST http://localhost:8000/api/suggestions \
  -H "Content-Type: application/json" \
  -d {} ::: $(seq 1 3)
```

---

## 7. Debugging Commands 🐛

### Verbose Response Headers
```bash
curl -v -X POST http://localhost:8000/api/suggestions \
  -H "Content-Type: application/json" \
  -d '{"full_text": "Debug test."}'
```

### Silent Mode (Just Response)
```bash
curl -s -X POST http://localhost:8000/api/suggestions \
  -H "Content-Type: application/json" \
  -d '{"full_text": "Silent test."}' | jq '.'
```

### Check Response Time
```bash
curl -w "@-" -o /dev/null -s -X POST http://localhost:8000/api/suggestions \
  -H "Content-Type: application/json" \
  -d '{"full_text": "Performance test."}' <<< 'Total time: %{time_total}s\n'
```

---

## Expected Behaviors ✅

- **Suggestions**: Should return 2-4 relevant suggestions in ~2-5 seconds
- **Infuse**: Should return LSP WorkspaceEdit with enhanced text in ~3-8 seconds  
- **Health**: Should respond instantly with status "healthy"
- **All endpoints**: Should return JSON responses with proper Content-Type headers

## Troubleshooting 🔧

If you get errors:
1. **Connection refused**: Backend not running → `python start_server.py`
2. **Gemini API errors**: Check your `GOOGLE_API_KEY` environment variable
3. **JSON parsing errors**: Check your curl syntax and JSON formatting
4. **Timeout errors**: Gemini API may be slow, wait longer or try simpler text

## Quick Test Script 📝

Save this as `test_ai_service.sh`:
```bash
#!/bin/bash
echo "🧪 Testing AI Service..."

echo "1. Health Check:"
curl -s http://localhost:8000/api/health | jq '.'

echo -e "\n2. User Info:"
curl -s http://localhost:8000/api/me | jq '.'

echo -e "\n3. Suggestions:"
curl -s -X POST http://localhost:8000/api/suggestions \
  -H "Content-Type: application/json" \
  -d '{"full_text": "Consciousness is fascinating."}' | jq '.items[0].label'

echo -e "\n4. Infuse Test:"
curl -s -X POST http://localhost:8000/api/infuse \
  -H "Content-Type: application/json" \
  -d '{
    "full_text": "Hello world.",
    "cursor_position": {"line": 0, "character": 0},
    "suggestion_text": "make this more engaging",
    "mode": "highlight_click"
  }' | jq '.edit'

echo -e "\n✅ All tests complete!"
```

Run with: `chmod +x test_ai_service.sh && ./test_ai_service.sh` 