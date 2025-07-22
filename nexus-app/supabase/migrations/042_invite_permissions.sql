-- Migration: 042_invite_permissions.sql  
-- Description: Grant permissions for invite functions
-- Date: 2025-01-15

-- Grant execute permissions on invite functions
GRANT EXECUTE ON FUNCTION use_invite_atomic(text, UUID) TO authenticated, anon; 