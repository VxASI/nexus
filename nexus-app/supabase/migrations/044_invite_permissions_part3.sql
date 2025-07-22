-- Migration: 044_invite_permissions_part3.sql
-- Description: Grant permissions for invite functions - Part 3
-- Date: 2025-01-15

GRANT EXECUTE ON FUNCTION get_user_invite_stats(UUID) TO authenticated; 