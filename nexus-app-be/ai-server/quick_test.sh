#!/bin/bash

echo "🧪 Quick AI Service Test"
echo "========================"

BASE_URL="http://localhost:8000"

# Check if server is running
echo "1. Checking if server is running..."
if curl -s "$BASE_URL/api/health" > /dev/null; then
    echo "✅ Server is running!"
else
    echo "❌ Server not running. Start with: python start_server.py"
    exit 1
fi

echo ""
echo "2. Health Check:"
curl -s "$BASE_URL/api/health" | python3 -m json.tool

echo ""
echo "3. User Info:"
curl -s "$BASE_URL/api/me" | python3 -m json.tool

echo ""
echo "4. Testing Suggestions..."
curl -s -X POST "$BASE_URL/api/suggestions" \
  -H "Content-Type: application/json" \
  -d '{"full_text": "Consciousness is a fascinating mystery that science is just beginning to understand."}' \
  | python3 -m json.tool

echo ""
echo "5. Testing Infuse - Highlight Mode..."
curl -s -X POST "$BASE_URL/api/infuse" \
  -H "Content-Type: application/json" \
  -d '{
    "full_text": "Hello world. This is a simple test.",
    "cursor_position": {"line": 0, "character": 0},
    "highlighted_range": {
      "start": {"line": 0, "character": 0},
      "end": {"line": 0, "character": 11}
    },
    "suggestion_text": "make this greeting more engaging",
    "mode": "highlight_click"
  }' | python3 -m json.tool

echo ""
echo "6. Testing Infuse - CMD Drop Mode..."
curl -s -X POST "$BASE_URL/api/infuse" \
  -H "Content-Type: application/json" \
  -d '{
    "full_text": "AI is changing the world.",
    "cursor_position": {"line": 0, "character": 10},
    "suggestion_text": "add specific examples and scientific context",
    "mode": "cmd_drop"
  }' | python3 -m json.tool

echo ""
echo "7. Testing Infuse - Paragraph Mode..."
curl -s -X POST "$BASE_URL/api/infuse" \
  -H "Content-Type: application/json" \
  -d '{
    "full_text": "First paragraph.\n\nSecond paragraph about AI research.\n\nThird paragraph.",
    "cursor_position": {"line": 2, "character": 5},
    "suggestion_text": "enhance with recent developments",
    "mode": "paragraph_drop"
  }' | python3 -m json.tool

echo ""
echo "✅ All tests complete!"
echo ""
echo "📖 For more examples, see: CURL_TESTS.md"
echo "🌐 API Documentation: http://localhost:8000/docs" 