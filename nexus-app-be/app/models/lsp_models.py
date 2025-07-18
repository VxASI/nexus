"""
LSP-compliant models following Language Server Protocol specifications
This provides full compatibility with LSP-based editors and tools
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union, Literal
from enum import Enum

# =============================================================================
# LSP CORE TYPES
# =============================================================================

class Position(BaseModel):
    """LSP Position - 0-indexed line and character"""
    line: int = Field(ge=0, description="Line position (0-indexed)")
    character: int = Field(ge=0, description="Character position (0-indexed)")

class Range(BaseModel):
    """LSP Range - start and end positions"""
    start: Position
    end: Position

class Location(BaseModel):
    """LSP Location - URI and range"""
    uri: str
    range: Range

class TextEdit(BaseModel):
    """LSP TextEdit - precise text modification"""
    range: Range
    newText: str = Field(description="New text to replace the range")

class TextDocumentIdentifier(BaseModel):
    """LSP TextDocument identifier"""
    uri: str

class VersionedTextDocumentIdentifier(TextDocumentIdentifier):
    """LSP Versioned TextDocument identifier"""
    version: Optional[int] = None

class TextDocumentItem(BaseModel):
    """LSP TextDocument item"""
    uri: str
    languageId: str
    version: int
    text: str

# =============================================================================
# LSP WORKSPACE EDITS
# =============================================================================

class WorkspaceEdit(BaseModel):
    """LSP WorkspaceEdit - batch of text edits across documents"""
    changes: Optional[Dict[str, List[TextEdit]]] = None
    documentChanges: Optional[List["TextDocumentEdit"]] = None

class TextDocumentEdit(BaseModel):
    """LSP TextDocumentEdit - edits for a specific document"""
    textDocument: VersionedTextDocumentIdentifier
    edits: List[TextEdit]

# =============================================================================
# LSP COMPLETION & SUGGESTIONS
# =============================================================================

class CompletionItemKind(int, Enum):
    """LSP CompletionItem kinds"""
    Text = 1
    Method = 2
    Function = 3
    Constructor = 4
    Field = 5
    Variable = 6
    Class = 7
    Interface = 8
    Module = 9
    Property = 10
    Unit = 11
    Value = 12
    Enum = 13
    Keyword = 14
    Snippet = 15
    Color = 16
    File = 17
    Reference = 18
    Folder = 19
    EnumMember = 20
    Constant = 21
    Struct = 22
    Event = 23
    Operator = 24
    TypeParameter = 25

class CompletionItem(BaseModel):
    """LSP CompletionItem - suggestion with metadata"""
    label: str
    kind: Optional[CompletionItemKind] = None
    detail: Optional[str] = None
    documentation: Optional[str] = None
    sortText: Optional[str] = None
    filterText: Optional[str] = None
    insertText: Optional[str] = None
    textEdit: Optional[TextEdit] = None
    additionalTextEdits: Optional[List[TextEdit]] = None

# =============================================================================
# LSP CODE ACTIONS
# =============================================================================

class CodeActionKind(str, Enum):
    """LSP CodeAction kinds"""
    QuickFix = "quickfix"
    Refactor = "refactor"
    RefactorExtract = "refactor.extract"
    RefactorInline = "refactor.inline"
    RefactorRewrite = "refactor.rewrite"
    Source = "source"
    SourceOrganizeImports = "source.organizeImports"

class CodeAction(BaseModel):
    """LSP CodeAction - executable action"""
    title: str
    kind: Optional[CodeActionKind] = None
    diagnostics: Optional[List["Diagnostic"]] = None
    edit: Optional[WorkspaceEdit] = None
    command: Optional["Command"] = None

# =============================================================================
# LSP DIAGNOSTICS
# =============================================================================

class DiagnosticSeverity(int, Enum):
    """LSP Diagnostic severity levels"""
    Error = 1
    Warning = 2
    Information = 3
    Hint = 4

class Diagnostic(BaseModel):
    """LSP Diagnostic - error/warning/info"""
    range: Range
    severity: Optional[DiagnosticSeverity] = None
    code: Optional[Union[int, str]] = None
    source: Optional[str] = None
    message: str
    relatedInformation: Optional[List["DiagnosticRelatedInformation"]] = None

class DiagnosticRelatedInformation(BaseModel):
    """LSP Diagnostic related information"""
    location: Location
    message: str

# =============================================================================
# LSP COMMANDS
# =============================================================================

class Command(BaseModel):
    """LSP Command - executable command"""
    title: str
    command: str
    arguments: Optional[List[Any]] = None

# =============================================================================
# NEXUS-SPECIFIC LSP EXTENSIONS
# =============================================================================

class NexusTextEdit(TextEdit):
    """Enhanced TextEdit with Nexus-specific metadata"""
    confidence: Optional[float] = Field(ge=0.0, le=1.0, default=None)
    suggestion_type: Optional[str] = None
    explanation: Optional[str] = None
    ai_generated: bool = True

class NexusWorkspaceEdit(WorkspaceEdit):
    """Enhanced WorkspaceEdit with Nexus AI metadata"""
    metadata: Optional[Dict[str, Any]] = None
    processing_time_ms: Optional[int] = None
    ai_model: Optional[str] = None
    confidence: Optional[float] = Field(ge=0.0, le=1.0, default=None)

class NexusCodeAction(CodeAction):
    """Enhanced CodeAction for AI suggestions"""
    suggestion_id: Optional[str] = None
    action_type: Optional[str] = None  # Allow any string for flexibility
    confidence: Optional[float] = Field(ge=0.0, le=1.0, default=None)

# =============================================================================
# CONVERSION UTILITIES
# =============================================================================

def convert_cursor_to_position(line: int, char: int, is_zero_indexed: bool = False) -> Position:
    """Convert cursor position to LSP Position"""
    if is_zero_indexed:
        return Position(line=line, character=char)
    else:
        return Position(line=max(0, line - 1), character=char)

def convert_selection_to_range(start_line: int, start_char: int, end_line: int, end_char: int, 
                              is_zero_indexed: bool = False) -> Range:
    """Convert selection to LSP Range"""
    start = convert_cursor_to_position(start_line, start_char, is_zero_indexed)
    end = convert_cursor_to_position(end_line, end_char, is_zero_indexed)
    return Range(start=start, end=end)

def convert_legacy_textchange_to_lsp(legacy_change: "TextChange") -> NexusTextEdit:
    """Convert our legacy TextChange to LSP-compliant TextEdit"""
    from app.models.infuse import TextChange
    
    range_lsp = convert_selection_to_range(
        legacy_change.start_line, legacy_change.start_char,
        legacy_change.end_line, legacy_change.end_char,
        is_zero_indexed=False  # Our legacy format uses 1-indexed lines
    )
    
    return NexusTextEdit(
        range=range_lsp,
        newText=legacy_change.new_text,
        explanation=legacy_change.description,
        ai_generated=True
    )

# Forward references
TextDocumentEdit.model_rebuild()
CodeAction.model_rebuild()
Diagnostic.model_rebuild() 