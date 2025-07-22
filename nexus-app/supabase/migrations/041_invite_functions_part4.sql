-- Migration: 041_invite_functions_part4.sql
-- Description: Cancel function and RLS policies - Part 4
-- Date: 2025-01-15

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

-- Allow public read access to user_invites for invite validation (email matching only)
CREATE POLICY "Allow invite validation for matching emails" ON user_invites
  FOR SELECT TO authenticated, anon
  USING (email = (current_setting('request.jwt.claims', true)::json ->> 'email'));

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

-- Permissions are now handled in separate migration files (042-046)
-- to avoid prepared statement issues 