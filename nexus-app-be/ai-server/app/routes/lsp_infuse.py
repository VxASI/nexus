"""
LSP-compliant infuse API routes
Provides professional-grade text editing following Language Server Protocol standards
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse
from typing import Optional, List, Literal
import json
import time
import asyncio
from pydantic import BaseModel

from app.models.auth import User
from app.models.lsp_models import (
    Position, Range, TextEdit, NexusTextEdit, NexusWorkspaceEdit,
    NexusCodeAction, CodeActionKind, CompletionItem, CompletionItemKind,
    TextDocumentIdentifier, VersionedTextDocumentIdentifier,
    convert_cursor_to_position, convert_selection_to_range
)
from app.auth.middleware import get_optional_user
from app.ai.lsp_diff_service import LSPDiffService

router = APIRouter()

# Initialize services
lsp_diff_service = LSPDiffService()

# =============================================================================
# LSP-COMPLIANT ENDPOINTS
# =============================================================================

class LSPInfuseRequest(BaseModel):
    """LSP-compliant infuse request"""
    textDocument: VersionedTextDocumentIdentifier
    range: Range
    suggestion_text: str
    action_type: str = "refactor.rewrite"
    context: Optional[str] = None
    gemini_api_key: str

class LSPInfuseResponse(BaseModel):
    """LSP-compliant infuse response"""
    edit: NexusWorkspaceEdit
    codeActions: Optional[List[NexusCodeAction]] = None
    completions: Optional[List[CompletionItem]] = None

@router.post("/lsp/workspace/executeCommand", response_model=LSPInfuseResponse)
async def execute_infuse_command(
    request: LSPInfuseRequest,
    # current_user: Optional[User] = Depends(get_optional_user)  # Commented out for testing
):
    """
    LSP-compliant executeCommand for AI text infusion
    
    This endpoint follows LSP patterns for workspace modifications
    and provides standard TextEdit responses that any LSP client can understand.
    """
    
    start_time = time.time()
    
    try:
        # Extract the text to be modified from the range
        document_uri = request.textDocument.uri
        target_range = request.range
        
        # For now, we'll use the suggestion text directly
        # In production, this would call the AI service to generate content
        # based on the range and context
        
        # Generate AI-enhanced content
        if request.context:
            # Use context for AI generation
            enhanced_text = await _generate_contextual_enhancement(
                request.context, 
                request.suggestion_text,
                request.action_type,
                request.gemini_api_key
            )
        else:
            enhanced_text = request.suggestion_text
        
        # Create LSP-compliant workspace edit
        workspace_edit = lsp_diff_service.create_code_action_edit(
            suggestion_text=enhanced_text,
            target_range=target_range,
            document_uri=document_uri,
            action_type=request.action_type,
            suggestion_id=f"nexus-{int(time.time())}"
        )
        
        # Add timing metadata
        processing_time = int((time.time() - start_time) * 1000)
        workspace_edit.processing_time_ms = processing_time
        
        # Generate related code actions
        code_actions = _generate_related_code_actions(
            workspace_edit, 
            document_uri, 
            request.action_type
        )
        
        return LSPInfuseResponse(
            edit=workspace_edit,
            codeActions=code_actions
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to execute infuse command: {str(e)}"
        )

@router.post("/lsp/textDocument/codeAction")
async def get_code_actions(
    textDocument: TextDocumentIdentifier,
    range: Range,
    context: Optional[str] = None,
    # current_user: Optional[User] = Depends(get_optional_user)  # Commented out for testing
):
    """
    LSP textDocument/codeAction endpoint
    
    Returns available AI-powered code actions for the given range
    """
    
    try:
        actions = []
        
        # AI Enhancement Actions
        actions.append(NexusCodeAction(
            title="✨ Enhance with AI",
            kind=CodeActionKind.RefactorRewrite,
            action_type="highlight_click",
            confidence=0.9
        ))
        
        actions.append(NexusCodeAction(
            title="🔄 Expand Content",
            kind=CodeActionKind.RefactorExtract,
            action_type="cmd_drop",
            confidence=0.85
        ))
        
        actions.append(NexusCodeAction(
            title="🎯 Clarify Text",
            kind=CodeActionKind.RefactorRewrite,
            action_type="paragraph_drop",
            confidence=0.8
        ))
        
        return {"actions": [action.model_dump() for action in actions]}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get code actions: {str(e)}"
        )

@router.post("/lsp/textDocument/completion")
async def get_completions(
    textDocument: TextDocumentIdentifier,
    position: Position,
    context: Optional[str] = None,
    # current_user: Optional[User] = Depends(get_optional_user)  # Commented out for testing
):
    """
    LSP textDocument/completion endpoint
    
    Returns AI-powered completions for the given position
    """
    
    try:
        completions = []
        
        # AI-generated completions would go here
        # For now, return some sample completions
        
        completions.append(CompletionItem(
            label="AI Suggestion",
            kind=CompletionItemKind.Text,
            detail="AI-generated content enhancement",
            documentation="Enhance this text with AI-powered suggestions",
            insertText="[AI enhancement will appear here]"
        ))
        
        return {"items": [comp.model_dump() for comp in completions]}
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get completions: {str(e)}"
        )

@router.post("/lsp/workspace/applyEdit")
async def apply_workspace_edit(
    edit: NexusWorkspaceEdit,
    # current_user: Optional[User] = Depends(get_optional_user)  # Commented out for testing
):
    """
    LSP workspace/applyEdit endpoint
    
    Applies a workspace edit and returns success status
    """
    
    try:
        # Validate the edit
        for document_uri, text_edits in edit.changes.items():
            for text_edit in text_edits:
                # Validate edit positions (simplified)
                if text_edit.range.start.line < 0 or text_edit.range.start.character < 0:
                    raise HTTPException(
                        status_code=400,
                        detail="Invalid edit positions"
                    )
        
        # In a real implementation, this would apply the edit to the actual document
        # For now, we'll just return success
        
        return {
            "applied": True,
            "message": "Workspace edit applied successfully",
            "metadata": edit.metadata
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to apply workspace edit: {str(e)}"
        )

# =============================================================================
# ENHANCED ENDPOINTS WITH LSP FEATURES
# =============================================================================

@router.post("/lsp/infuse/preview")
async def preview_lsp_infusion(
    request: LSPInfuseRequest,
    # current_user: Optional[User] = Depends(get_optional_user)  # Commented out for testing
):
    """
    Preview LSP-compliant infusion changes
    
    Returns a detailed preview of what changes will be made
    """
    
    try:
        # Generate the workspace edit
        workspace_edit = lsp_diff_service.create_code_action_edit(
            suggestion_text=request.suggestion_text,
            target_range=request.range,
            document_uri=request.textDocument.uri,
            action_type=request.action_type,
            suggestion_id=f"preview-{int(time.time())}"
        )
        
        # Generate preview information
        preview = lsp_diff_service.get_edit_preview(
            workspace_edit, 
            request.textDocument.uri
        )
        
        # Calculate edit metrics
        metrics = lsp_diff_service.calculate_edit_metrics(workspace_edit)
        
        return {
            "preview": preview,
            "metrics": metrics,
            "lsp_compliant": True,
            "document_version": request.textDocument.version
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate preview: {str(e)}"
        )

@router.get("/lsp/capabilities")
async def get_lsp_capabilities():
    """
    Return LSP server capabilities
    
    This endpoint describes what LSP features our server supports
    """
    
    return {
        "capabilities": {
            "textDocumentSync": 1,  # Full document sync
            "completionProvider": {
                "resolveProvider": False,
                "triggerCharacters": [" ", "\n", "."]
            },
            "codeActionProvider": {
                "codeActionKinds": [
                    CodeActionKind.RefactorRewrite.value,
                    CodeActionKind.RefactorExtract.value,
                    CodeActionKind.QuickFix.value
                ]
            },
            "executeCommandProvider": {
                "commands": [
                    "nexus.infuse.enhance",
                    "nexus.infuse.expand", 
                    "nexus.infuse.clarify"
                ]
            },
            "workspaceEdit": True,
            "experimental": {
                "aiSuggestions": True,
                "streamingEdits": True,
                "confidenceScoring": True
            }
        },
        "serverInfo": {
            "name": "Nexus AI LSP Server",
            "version": "1.0.0"
        }
    }

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

async def _generate_contextual_enhancement(
    context: str, 
    suggestion: str,
    action_type: str,
    api_key: str
) -> str:
    """Generate AI-enhanced content using context"""
    
    try:
        # This would use the AI service to generate enhanced content
        # For now, return a simple enhancement
        if action_type == "refactor.rewrite":
            return f"{context} {suggestion}"
        elif action_type == "refactor.extract":
            return f"{suggestion}. {context}"
        else:
            return suggestion
            
    except Exception:
        return suggestion  # Fallback

def _generate_related_code_actions(
    workspace_edit: NexusWorkspaceEdit,
    document_uri: str,
    action_type: str
) -> List[NexusCodeAction]:
    """Generate related code actions for a given edit"""
    
    actions = []
    
    # Undo action
    actions.append(NexusCodeAction(
        title="↩️ Undo AI Changes",
        kind=CodeActionKind.QuickFix,
        action_type="undo",
        confidence=1.0
    ))
    
    # Alternative enhancement
    actions.append(NexusCodeAction(
        title="🔄 Try Different Enhancement",
        kind=CodeActionKind.RefactorRewrite,
        action_type="alternative",
        confidence=0.7
    ))
    
    return actions 

class SuggestionsRequest(BaseModel):
    full_text: str

@router.post("/suggestions")
async def get_suggestions(
    request: SuggestionsRequest,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Generate AI suggestions for the full text"""
    try:
        enhanced_suggestions = await gemini_service.generate_suggestions(request.full_text)
        completions = [
            CompletionItem(
                label=suggestion,
                kind=CompletionItemKind.Text,
                detail="AI-generated suggestion",
                insertText=suggestion
            ) for suggestion in enhanced_suggestions
        ]
        return {"items": completions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate suggestions: {str(e)}") 

class InfuseRequest(BaseModel):
    full_text: str
    cursor_position: Position
    highlighted_range: Optional[Range] = None
    suggestion_text: str
    mode: Literal['highlight_click', 'cmd_drop', 'paragraph_drop']
    gemini_api_key: str

@router.post("/infuse")
async def infuse_text(
    request: InfuseRequest,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Infuse AI rewrite based on mode"""
    try:
        # Determine target range and prompt based on mode
        if request.mode == 'highlight_click':
            target_range = request.highlighted_range or Range(start=request.cursor_position, end=request.cursor_position)
            context_text = request.full_text[target_range.start.character:target_range.end.character]  # Simplified extraction
            prompt_type = 'rewrite_highlighted'
        elif request.mode == 'cmd_drop':
            target_range = Range(start=Position(line=0, character=0), end=Position(line=len(request.full_text.split('\n'))-1, character=len(request.full_text)))
            context_text = request.full_text
            prompt_type = 'infuse_full'
        else:  # paragraph_drop
            # Simplified paragraph detection
            lines = request.full_text.split('\n')
            para_start = max(0, request.cursor_position.line - 1)
            para_end = min(len(lines)-1, request.cursor_position.line + 1)
            context_text = '\n'.join(lines[para_start:para_end+1])
            target_range = Range(start=Position(line=para_start, character=0), end=Position(line=para_end, character=len(lines[para_end])))
            prompt_type = 'rewrite_paragraph'
        
        enhanced_text = await gemini_service.generate_text_enhancement(
            text=context_text,
            context=request.suggestion_text,
            enhancement_type=prompt_type,
            api_key=request.gemini_api_key
        )
        
        workspace_edit = lsp_diff_service.create_code_action_edit(
            suggestion_text=enhanced_text,
            target_range=target_range,
            document_uri="virtual://immerse",  # Placeholder
            action_type="refactor.rewrite",
            suggestion_id=f"infuse-{int(time.time())}"
        )
        
        return LSPInfuseResponse(edit=workspace_edit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Infuse failed: {str(e)}") 