-- Migration: 049_set_invite_limit_to_one.sql
-- Description: Set invite limit to 1 for all users and update default
-- Date: 2025-01-25

-- Update all existing users to have invite limit of 1
UPDATE users SET invite_limit = 1;

-- Change the default for new users
ALTER TABLE users ALTER COLUMN invite_limit SET DEFAULT 1; 