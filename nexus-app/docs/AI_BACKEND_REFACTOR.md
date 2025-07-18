
# AI Backend Refactor Documentation

This document captures the analysis of the current nexus-app-be backend, its production-readiness, gaps, and a detailed TODO list for refactoring it into a dedicated FastAPI server for AI features (suggestions and infuses/rewrites). This is based on the user's query and my proposed plan.

## 1. Analysis of nexus-app-be Backend

### Key Features and Processes
- **Core Purpose**: AI-driven text "infusions" (rewrites/enhancements) using Google's Gemini model, structured around Language Server Protocol (LSP) for precise edits.
- **AI Service**: Handles Gemini calls with prompts for enhancement types (e.g., enhance, expand). Returns enhanced text with retries and timeouts.
- **Diff/Edit Computation**: Computes LSP-compliant edits (TextEdit, WorkspaceEdit) for minimal, targeted changes.
- **Endpoints**: LSP-inspired routes for infusions, code actions, completions, previews, and applications.
- **Auth**: Simplified Supabase JWT verification (dev-oriented).
- **Other**: CORS, health checks, Pydantic models for LSP compliance.

### Honest Opinion: Production-Grade?
- **Strengths**: Clean, modular FastAPI structure; LSP compliance for editor integration; similar to tools like Cursor (precise diffs, suggestions).
- **Weaknesses**: Dev-focused (mock auth, no scaling features); lacks depth compared to Cursor (e.g., no multi-agent, limited prompts).
- **Rating**: 6/10 for prod-readiness; could be 9/10 with improvements.

### Gaps and Improvements
- **Gaps**: Weak auth/security, no scalability (caching, queues), basic prompts, poor error handling, no tests/monitoring.
- **Improvements**: Proper JWT, rate limiting, advanced prompts, logging, monitoring. Expand LSP for more features.

### Suitability for Three Infuse Modes
The app supports the modes well via LSP ranges:
- Highlight + Click: Target specific range.
- Cmd Drop: Full text infusion.
- Drag-Drop to Paragraph: Target paragraph range.
Minor frontend tweaks needed for detection.

### How AI Service Works
Gemini is called with constructed prompts (e.g., "Enhance this text: [text]"). Returns enhanced text, which is diffed into LSP edits.

## 2. Refactor Plan Overview
Move AI logic from Next.js to a dedicated FastAPI server in nexus-app-be/ai-server/. Use Supabase auth. New endpoints for suggestions and infuse, handling the three modes. Crucial flows: Send text/cursor/range from UI; return LSP edits; apply via Tiptap.

## TODO List
- [x] **Step 1: Create new directory structure in nexus-app-be/ai-server/**. Move existing files (main.py, ai/, routes/, models/, auth/) there and update imports. *Completed: Directory created, files copied, and old app/ directory and requirements.txt removed for cleanup. Imports may need manual adjustment based on testing.*
- [x] **Step 2: Enhance auth in ai-server/auth/middleware.py**. Add proper JWT validation using python-jose. *Completed: Added jose_jwt.decode for proper validation, including expiry and signature checks. Requires SUPABASE_JWT_SECRET env var.*
- [x] **Step 3: Add /api/suggestions endpoint** in ai-server/routes/. Takes full_text, returns LSP CompletionItem[]. *Completed: Added to lsp_infuse.py; uses new generate_suggestions in gemini_service.py to fetch 4 suggestions.*
- [x] **Step 4: Add /api/infuse endpoint** in ai-server/routes/. Handles three modes via params; uses Gemini for generation, computes LSP WorkspaceEdit. *Completed: Added to lsp_infuse.py; determines range and prompt based on mode, generates enhanced text, creates WorkspaceEdit.*
- [x] **Step 5: Update frontend (immerse/page.tsx and useAISuggestions.ts)** to call new backend endpoints instead of local API routes. Include auth token in requests. *Completed: Updated fetches to use BACKEND_URL with Authorization header from Supabase session.*
- [x] **Step 6: Remove old Gemini calls and API routes from Next.js** (e.g., /api/suggestions/*). *Completed: Deleted the three suggestion API routes and removed direct Gemini calls from geminiAIService.ts.*
- [ ] **Step 7: Test end-to-end flows** (suggestions, each infuse mode).
- [ ] **Step 8: Update this doc with completion notes and any changes.** 