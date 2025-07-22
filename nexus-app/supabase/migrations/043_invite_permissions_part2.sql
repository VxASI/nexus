-- Migration: 043_invite_permissions_part2.sql
-- Description: Grant permissions for invite functions - Part 2
-- Date: 2025-01-15

GRANT EXECUTE ON FUNCTION has_valid_invite(text) TO authenticated, anon; 