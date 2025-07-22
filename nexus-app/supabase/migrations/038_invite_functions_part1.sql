-- Migration: 038_invite_functions_part1.sql
-- Description: Atomic invite functions - Part 1
-- Date: 2025-01-15

-- =============================================================================
-- ATOMIC INVITE FUNCTIONS - SECURE & RACE-CONDITION FREE
-- =============================================================================

CREATE OR REPLACE FUNCTION use_invite_atomic(
  email_param text,
  user_id_param UUID
)
RETURNS TABLE(
  success boolean,
  invite_id UUID,
  referrer_email text,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  invite_record RECORD;
  clean_email text;
BEGIN
  -- Clean and normalize email (prevents case sensitivity issues)
  clean_email := LOWER(TRIM(email_param));
  
  -- Basic email validation
  IF clean_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::text, 'Invalid email format'::text;
    RETURN;
  END IF;

  -- ATOMIC: Find and consume invite in one operation (prevents race conditions)
  -- Only consider invites that haven't been cancelled
  UPDATE invites 
  SET 
    used_at = NOW(),
    used_by_user_id = user_id_param,
    updated_at = NOW()
  WHERE id = (
    SELECT i.id 
    FROM invites i
    LEFT JOIN user_invites ui ON i.id = ui.invite_id
    WHERE 
      LOWER(TRIM(i.email)) = clean_email
      AND i.used_at IS NULL 
      AND (i.expires_at IS NULL OR i.expires_at > NOW())
      AND ui.cancelled_at IS NULL -- Not cancelled
    ORDER BY i.created_at ASC  -- FIFO: use oldest invite first
    LIMIT 1
    FOR UPDATE SKIP LOCKED  -- Skip locked rows (prevents deadlocks)
  )
  RETURNING id, referrer_email INTO invite_record;

  -- Return result
  IF invite_record.id IS NOT NULL THEN
    RETURN QUERY SELECT true, invite_record.id, invite_record.referrer_email, 'Invite accepted'::text;
  ELSE
    RETURN QUERY SELECT false, NULL::UUID, NULL::text, 'No valid invite found'::text;
  END IF;
END;
$$; 