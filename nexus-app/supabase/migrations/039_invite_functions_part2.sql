-- Migration: 039_invite_functions_part2.sql
-- Description: Invite management functions - Part 2
-- Date: 2025-01-15

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
      AND ui.cancelled_at IS NULL -- Not cancelled
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