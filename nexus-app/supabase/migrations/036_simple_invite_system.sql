-- Migration: 036_complete_invite_system.sql
-- Description: Complete invite system with atomic operations, race condition protection, and user invite management
-- Date: 2025-01-15

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- INVITES TABLE (Enhanced)
-- =============================================================================

CREATE TABLE IF NOT EXISTS invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL,
    referrer_email TEXT,
    invited_by_user_id UUID REFERENCES users(id),  -- NEW: Track which user sent the invite
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL means no expiry
    used_at TIMESTAMP WITH TIME ZONE,
    used_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance  
CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_expires_at ON invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_invites_used_at ON invites(used_at);
CREATE INDEX IF NOT EXISTS idx_invites_email_used_expires ON invites(email, used_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_invites_invited_by_user_id ON invites(invited_by_user_id);

-- Add updated_at trigger for invites table
DROP TRIGGER IF EXISTS update_invites_updated_at ON invites;
CREATE TRIGGER update_invites_updated_at 
    BEFORE UPDATE ON invites 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- USER INVITES TABLE (NEW)
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inviter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    invite_id UUID NOT NULL REFERENCES invites(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cancelled_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE(inviter_user_id, email), -- One invite per user per email
    UNIQUE(invite_id) -- Each invite can only belong to one user_invite
);

-- Create indexes for user_invites
CREATE INDEX IF NOT EXISTS idx_user_invites_inviter ON user_invites(inviter_user_id);
CREATE INDEX IF NOT EXISTS idx_user_invites_email ON user_invites(email);
CREATE INDEX IF NOT EXISTS idx_user_invites_active ON user_invites(inviter_user_id) WHERE cancelled_at IS NULL;

-- =============================================================================
-- UPDATE USERS TABLE
-- =============================================================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS invite_limit INTEGER DEFAULT 3,      -- Default 3 invites per user
ADD COLUMN IF NOT EXISTS invites_used INTEGER DEFAULT 0;      -- Track used invites

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
      AND (ui.cancelled_at IS NULL OR ui.cancelled_at IS NULL) -- Not cancelled
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

-- =============================================================================
-- READ-ONLY STATUS CHECK (FOR UI)
-- =============================================================================

CREATE OR REPLACE FUNCTION has_valid_invite(email_param text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM invites i
    LEFT JOIN user_invites ui ON i.id = ui.invite_id
    WHERE 
      LOWER(TRIM(i.email)) = LOWER(TRIM(email_param))
      AND i.used_at IS NULL 
      AND (i.expires_at IS NULL OR i.expires_at > NOW())
      AND (ui.cancelled_at IS NULL OR ui.cancelled_at IS NULL) -- Not cancelled
  );
END;
$$;

-- =============================================================================
-- USER INVITE MANAGEMENT FUNCTIONS
-- =============================================================================

-- Get user invite statistics
CREATE OR REPLACE FUNCTION get_user_invite_stats(user_id_param UUID)
RETURNS TABLE(
    invite_limit INTEGER,
    invites_used INTEGER,
    invites_available INTEGER,
    pending_invites BIGINT,
    successful_signups BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.invite_limit,
        u.invites_used,
        (u.invite_limit - u.invites_used) as invites_available,
        COUNT(ui.id) FILTER (WHERE ui.cancelled_at IS NULL AND i.used_at IS NULL) as pending_invites,
        COUNT(ui.id) FILTER (WHERE i.used_at IS NOT NULL) as successful_signups
    FROM users u
    LEFT JOIN user_invites ui ON u.id = ui.inviter_user_id
    LEFT JOIN invites i ON ui.invite_id = i.id
    WHERE u.id = user_id_param
    GROUP BY u.id, u.invite_limit, u.invites_used;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send user invite
CREATE OR REPLACE FUNCTION send_user_invite(
    inviter_id_param UUID,
    email_param TEXT
)
RETURNS TABLE(
    success BOOLEAN,
    invite_id UUID,
    message TEXT
) AS $$
DECLARE
    user_stats RECORD;
    new_invite_id UUID;
    new_user_invite_id UUID;
    clean_email TEXT;
BEGIN
    -- Clean email
    clean_email := LOWER(TRIM(email_param));
    
    -- Basic email validation
    IF clean_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invalid email format'::TEXT;
        RETURN;
    END IF;
    
    -- Get user stats
    SELECT invite_limit, invites_used INTO user_stats
    FROM users WHERE id = inviter_id_param;
    
    -- Check if user exists
    IF user_stats IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'User not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check invite limit
    IF user_stats.invites_used >= user_stats.invite_limit THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invite limit reached'::TEXT;
        RETURN;
    END IF;
    
    -- Check if email already has active invite from this user
    IF EXISTS (
        SELECT 1 FROM user_invites ui 
        JOIN invites i ON ui.invite_id = i.id
        WHERE ui.inviter_user_id = inviter_id_param 
        AND LOWER(TRIM(i.email)) = clean_email
        AND ui.cancelled_at IS NULL
        AND i.used_at IS NULL
    ) THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Already invited this email'::TEXT;
        RETURN;
    END IF;
    
    -- Check if email already exists as a user
    IF EXISTS (SELECT 1 FROM users WHERE LOWER(TRIM(email)) = clean_email) THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'User already exists'::TEXT;
        RETURN;
    END IF;
    
    -- Create invite record
    INSERT INTO invites (email, invited_by_user_id)
    VALUES (clean_email, inviter_id_param)
    RETURNING id INTO new_invite_id;
    
    -- Create user_invite record
    INSERT INTO user_invites (inviter_user_id, email, invite_id)
    VALUES (inviter_id_param, clean_email, new_invite_id)
    RETURNING id INTO new_user_invite_id;
    
    -- Update user invite count
    UPDATE users 
    SET invites_used = invites_used + 1
    WHERE id = inviter_id_param;
    
    RETURN QUERY SELECT TRUE, new_invite_id, 'Invite sent successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cancel user invite
CREATE OR REPLACE FUNCTION cancel_user_invite(
    inviter_id_param UUID,
    invite_id_param UUID
)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    user_invite_record RECORD;
BEGIN
    -- Find the user invite
    SELECT ui.id, ui.cancelled_at, i.used_at 
    INTO user_invite_record
    FROM user_invites ui
    JOIN invites i ON ui.invite_id = i.id
    WHERE ui.inviter_user_id = inviter_id_param 
    AND ui.invite_id = invite_id_param;
    
    -- Check if invite exists
    IF user_invite_record IS NULL THEN
        RETURN QUERY SELECT FALSE, 'Invite not found'::TEXT;
        RETURN;
    END IF;
    
    -- Check if already cancelled
    IF user_invite_record.cancelled_at IS NOT NULL THEN
        RETURN QUERY SELECT FALSE, 'Invite already cancelled'::TEXT;
        RETURN;
    END IF;
    
    -- Check if already used
    IF user_invite_record.used_at IS NOT NULL THEN
        RETURN QUERY SELECT FALSE, 'Cannot cancel used invite'::TEXT;
        RETURN;
    END IF;
    
    -- Cancel the invite
    UPDATE user_invites 
    SET cancelled_at = NOW()
    WHERE inviter_user_id = inviter_id_param AND invite_id = invite_id_param;
    
    -- Decrease user invite count
    UPDATE users 
    SET invites_used = invites_used - 1
    WHERE id = inviter_id_param;
    
    RETURN QUERY SELECT TRUE, 'Invite cancelled successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- RLS POLICIES
-- =============================================================================

-- Enable RLS on invites
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own invites
CREATE POLICY "Users can read their own invites" ON invites
  FOR SELECT TO authenticated, anon
  USING (email = auth.jwt() ->> 'email');

-- Enable RLS on user_invites
ALTER TABLE user_invites ENABLE ROW LEVEL SECURITY;

-- Users can manage their own sent invites
CREATE POLICY "Users can manage their own sent invites" ON user_invites
  FOR ALL TO authenticated
  USING (inviter_user_id = auth.uid());

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION use_invite_atomic(text, UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION has_valid_invite(text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_user_invite_stats(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION send_user_invite(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_user_invite(UUID, UUID) TO authenticated; 