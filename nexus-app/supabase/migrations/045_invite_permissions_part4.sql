-- Migration: 045_invite_permissions_part4.sql
-- Description: Grant permissions for invite functions - Part 4
-- Date: 2025-01-15

GRANT EXECUTE ON FUNCTION send_user_invite(UUID, TEXT) TO authenticated; 