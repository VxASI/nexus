-- Migration: 046_invite_permissions_part5.sql
-- Description: Grant permissions for invite functions - Part 5
-- Date: 2025-01-15

GRANT EXECUTE ON FUNCTION cancel_user_invite(UUID, UUID) TO authenticated; 