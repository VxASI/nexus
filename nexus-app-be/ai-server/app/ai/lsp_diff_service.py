"""
LSP-compliant diff service providing professional-grade text editing
This service follows Language Server Protocol standards for maximum compatibility
"""

from typing import List, Dict, Any, Optional, Tuple
import re
from dataclasses import dataclass

from app.models.lsp_models import (
    Position, Range, TextEdit, NexusTextEdit, NexusWorkspaceEdit,
    TextDocumentIdentifier, VersionedTextDocumentIdentifier,
    convert_cursor_to_position, convert_selection_to_range
)

@dataclass
class DocumentVersion:
    """Track document versions for concurrent edit handling"""
    uri: str
    version: int
    text: str
    last_modified: float

class LSPDiffService:
    """LSP-compliant diff service for precise text modifications"""
    
    def __init__(self):
        self.document_versions: Dict[str, DocumentVersion] = {}
        print("🔧 LSP-compliant DiffService initialized")
    
    def calculate_lsp_edits(
        self, 
        original_text: str, 
        modified_text: str,
        document_uri: str = "file:///temp.txt",
        document_version: Optional[int] = None
    ) -> NexusWorkspaceEdit:
        """
        Calculate LSP-compliant TextEdits between original and modified text
        
        Returns:
            NexusWorkspaceEdit with precise character-level changes
        """
        
        if original_text == modified_text:
            return NexusWorkspaceEdit(
                changes={document_uri: []},
                metadata={"no_changes": True}
            )
        
        # For now, implement a sophisticated replacement strategy
        # In production, this would use diff-match-patch for granular edits
        edits = self._calculate_minimal_edits(original_text, modified_text)
        
        return NexusWorkspaceEdit(
            changes={document_uri: edits},
            metadata={
                "edit_count": len(edits),
                "original_length": len(original_text),
                "modified_length": len(modified_text),
                "document_version": document_version
            }
        )
    
    def _calculate_minimal_edits(self, original: str, modified: str) -> List[NexusTextEdit]:
        """Calculate minimal set of edits (sophisticated replacement for now)"""
        
        # Split into lines for analysis
        original_lines = original.split('\n')
        modified_lines = modified.split('\n')
        
        edits = []
        
        # Strategy 1: If single line, try character-level diff
        if len(original_lines) == 1 and len(modified_lines) == 1:
            edit = self._single_line_diff(original_lines[0], modified_lines[0])
            if edit:
                edits.append(edit)
        
        # Strategy 2: Multi-line changes - find common prefix/suffix
        elif len(original_lines) > 1 or len(modified_lines) > 1:
            edit = self._multi_line_diff(original_lines, modified_lines)
            if edit:
                edits.append(edit)
        
        # Fallback: Replace entire content
        if not edits:
            edits.append(NexusTextEdit(
                range=Range(
                    start=Position(line=0, character=0),
                    end=Position(
                        line=len(original_lines) - 1,
                        character=len(original_lines[-1]) if original_lines else 0
                    )
                ),
                newText=modified,
                explanation="Complete text replacement",
                ai_generated=True
            ))
        
        return edits
    
    def _single_line_diff(self, original: str, modified: str) -> Optional[NexusTextEdit]:
        """Calculate diff for single line changes"""
        
        if original == modified:
            return None
        
        # Find common prefix
        prefix_len = 0
        for i, (a, b) in enumerate(zip(original, modified)):
            if a == b:
                prefix_len = i + 1
            else:
                break
        
        # Find common suffix
        suffix_len = 0
        for i in range(1, min(len(original) - prefix_len, len(modified) - prefix_len) + 1):
            if original[-i] == modified[-i]:
                suffix_len = i
            else:
                break
        
        # Calculate the change range
        start_char = prefix_len
        end_char = len(original) - suffix_len
        replacement_text = modified[prefix_len:len(modified) - suffix_len if suffix_len > 0 else len(modified)]
        
        return NexusTextEdit(
            range=Range(
                start=Position(line=0, character=start_char),
                end=Position(line=0, character=end_char)
            ),
            newText=replacement_text,
            explanation=f"Character-level edit: replaced {end_char - start_char} chars with {len(replacement_text)} chars",
            ai_generated=True
        )
    
    def _multi_line_diff(self, original_lines: List[str], modified_lines: List[str]) -> Optional[NexusTextEdit]:
        """Calculate diff for multi-line changes"""
        
        # Find common prefix lines
        prefix_lines = 0
        for i, (orig, mod) in enumerate(zip(original_lines, modified_lines)):
            if orig == mod:
                prefix_lines = i + 1
            else:
                break
        
        # Find common suffix lines
        suffix_lines = 0
        min_remaining = min(len(original_lines) - prefix_lines, len(modified_lines) - prefix_lines)
        for i in range(1, min_remaining + 1):
            if original_lines[-i] == modified_lines[-i]:
                suffix_lines = i
            else:
                break
        
        # Calculate change boundaries
        start_line = prefix_lines
        end_line = len(original_lines) - suffix_lines
        
        # Handle edge cases
        if start_line >= end_line:
            # No lines to replace, this is an insertion
            end_line = start_line
        
        # Extract the replacement text
        replacement_lines = modified_lines[prefix_lines:len(modified_lines) - suffix_lines if suffix_lines > 0 else len(modified_lines)]
        replacement_text = '\n'.join(replacement_lines)
        
        return NexusTextEdit(
            range=Range(
                start=Position(line=start_line, character=0),
                end=Position(
                    line=end_line - 1 if end_line > start_line else start_line,
                    character=len(original_lines[end_line - 1]) if end_line > start_line and end_line - 1 < len(original_lines) else 0
                )
            ),
            newText=replacement_text,
            explanation=f"Multi-line edit: lines {start_line}-{end_line - 1}",
            ai_generated=True
        )
    
    def apply_workspace_edit(self, edit: NexusWorkspaceEdit, document_uri: str) -> str:
        """Apply workspace edit to document and return new content"""
        
        if not edit.changes or document_uri not in edit.changes:
            return ""  # No changes for this document
        
        text_edits = edit.changes[document_uri]
        if not text_edits:
            return ""  # No edits
        
        # For now, assume we're working with the first edit
        # In production, this would apply all edits in order
        first_edit = text_edits[0]
        return first_edit.newText
    
    def create_code_action_edit(
        self,
        suggestion_text: str,
        target_range: Range,
        document_uri: str,
        action_type: str,
        suggestion_id: str
    ) -> NexusWorkspaceEdit:
        """Create a workspace edit for a specific code action"""
        
        edit = NexusTextEdit(
            range=target_range,
            newText=suggestion_text,
            explanation=f"AI suggestion: {action_type}",
            suggestion_type=action_type,
            ai_generated=True
        )
        
        return NexusWorkspaceEdit(
            changes={document_uri: [edit]},
            metadata={
                "suggestion_id": suggestion_id,
                "action_type": action_type,
                "ai_model": "gemini-2.0-flash-exp"
            }
        )
    
    def validate_edit_positions(self, edit: TextEdit, document_text: str) -> bool:
        """Validate that edit positions are within document bounds"""
        
        lines = document_text.split('\n')
        
        # Check start position
        if edit.range.start.line >= len(lines):
            return False
        if edit.range.start.character > len(lines[edit.range.start.line]):
            return False
        
        # Check end position
        if edit.range.end.line >= len(lines):
            return False
        if edit.range.end.character > len(lines[edit.range.end.line]):
            return False
        
        return True
    
    def get_edit_preview(self, edit: NexusWorkspaceEdit, document_uri: str) -> Dict[str, Any]:
        """Generate a preview of what changes will be made"""
        
        if not edit.changes or document_uri not in edit.changes:
            return {"preview": "No changes", "edit_count": 0}
        
        edits = edit.changes[document_uri]
        
        preview_info = {
            "edit_count": len(edits),
            "changes": []
        }
        
        for i, text_edit in enumerate(edits):
            change_info = {
                "index": i,
                "range": {
                    "start": {"line": text_edit.range.start.line, "character": text_edit.range.start.character},
                    "end": {"line": text_edit.range.end.line, "character": text_edit.range.end.character}
                },
                "newText": text_edit.newText[:100] + "..." if len(text_edit.newText) > 100 else text_edit.newText,
                "explanation": getattr(text_edit, 'explanation', 'LSP text edit')
            }
            preview_info["changes"].append(change_info)
        
        return preview_info
    
    def calculate_edit_metrics(self, edit: NexusWorkspaceEdit) -> Dict[str, int]:
        """Calculate metrics about the edit complexity"""
        
        metrics = {
            "total_edits": 0,
            "characters_added": 0,
            "characters_removed": 0,
            "lines_affected": 0
        }
        
        if not edit.changes:
            return metrics
        
        for edits in edit.changes.values():
            metrics["total_edits"] += len(edits)
            
            for text_edit in edits:
                metrics["characters_added"] += len(text_edit.newText)
                
                # Calculate removed characters (approximate)
                range_size = (
                    (text_edit.range.end.line - text_edit.range.start.line) * 50 +  # Assume 50 chars per line
                    (text_edit.range.end.character - text_edit.range.start.character)
                )
                metrics["characters_removed"] += max(0, range_size)
                
                # Lines affected
                metrics["lines_affected"] += max(1, text_edit.range.end.line - text_edit.range.start.line + 1)
        
        return metrics 