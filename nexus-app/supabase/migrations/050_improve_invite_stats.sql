-- Migration: 050_improve_invite_stats.sql
-- Description: Fix Available count to always be >= 0 and remove confusing Sent count
-- Date: 2025-01-25

-- Drop existing function to change return type
DROP FUNCTION IF EXISTS get_user_invite_stats(UUID);

-- Create new stats function with improved logic and removed Sent count
CREATE FUNCTION get_user_invite_stats(user_id_param UUID)
RETURNS TABLE(
    invite_limit INTEGER,
    invites_available INTEGER,
    pending_invites BIGINT,
    successful_signups BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.invite_limit,
        -- Ensure available is always >= 0 (protects against limit reductions)
        GREATEST(0, u.invite_limit - COUNT(ui.id) FILTER (WHERE ui.cancelled_at IS NULL AND i.used_at IS NULL))::INTEGER as invites_available,
        COUNT(ui.id) FILTER (WHERE ui.cancelled_at IS NULL AND i.used_at IS NULL) as pending_invites,
        COUNT(ui.id) FILTER (WHERE i.used_at IS NOT NULL) as successful_signups
    FROM users u
    LEFT JOIN user_invites ui ON u.id = ui.inviter_user_id
    LEFT JOIN invites i ON ui.invite_id = i.id
    WHERE u.id = user_id_param
    GROUP BY u.id, u.invite_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions (idempotent)
GRANT EXECUTE ON FUNCTION get_user_invite_stats(UUID) TO authenticated; 