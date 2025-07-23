-- Migration: 048_fix_pending_invite_limits.sql
-- Description: Fix invite limit checking to use pending invites count instead of total invites_used
-- Date: 2025-01-25

-- Drop existing function to ensure clean replacement
DROP FUNCTION IF EXISTS send_user_invite(UUID, TEXT);

-- Send user invite (FIXED to check pending invites instead of total invites_used)
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
    user_record RECORD;
    existing_invite RECORD;
    current_pending_count INTEGER;
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
    
    -- Check if email already exists as a user
    IF EXISTS (SELECT 1 FROM users WHERE LOWER(TRIM(email)) = clean_email) THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'User already exists'::TEXT;
        RETURN;
    END IF;
    
    -- Get user record
    SELECT invite_limit INTO user_record
    FROM users WHERE id = inviter_id_param;
    
    -- Check if user exists
    IF user_record IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'User not found'::TEXT;
        RETURN;
    END IF;
    
    -- Count current pending invites for this user
    SELECT COUNT(ui.id)::INTEGER INTO current_pending_count
    FROM user_invites ui
    JOIN invites i ON ui.invite_id = i.id
    WHERE ui.inviter_user_id = inviter_id_param
    AND ui.cancelled_at IS NULL
    AND i.used_at IS NULL;
    
    -- Check for existing invite from this user to this email
    SELECT ui.id as user_invite_id, ui.cancelled_at, i.id as invite_id, i.used_at
    INTO existing_invite
    FROM user_invites ui 
    JOIN invites i ON ui.invite_id = i.id
    WHERE ui.inviter_user_id = inviter_id_param 
    AND LOWER(TRIM(i.email)) = clean_email;
    
    -- If invite exists
    IF existing_invite.user_invite_id IS NOT NULL THEN
        -- If it's active (not cancelled and not used)
        IF existing_invite.cancelled_at IS NULL AND existing_invite.used_at IS NULL THEN
            RETURN QUERY SELECT FALSE, existing_invite.invite_id, 'Already invited this email'::TEXT;
            RETURN;
        END IF;
        
        -- If it's used
        IF existing_invite.used_at IS NOT NULL THEN
            RETURN QUERY SELECT FALSE, existing_invite.invite_id, 'User already exists'::TEXT;
            RETURN;
        END IF;
        
        -- If it's cancelled, reactivate it
        IF existing_invite.cancelled_at IS NOT NULL THEN
            -- Check invite limit using PENDING invites count (after reactivation this would be +1)
            IF current_pending_count >= user_record.invite_limit THEN
                RETURN QUERY SELECT FALSE, NULL::UUID, 'Invite limit reached'::TEXT;
                RETURN;
            END IF;
            
            -- Reactivate the cancelled invite
            UPDATE user_invites 
            SET cancelled_at = NULL
            WHERE id = existing_invite.user_invite_id;
            
            RETURN QUERY SELECT TRUE, existing_invite.invite_id, 'Invite resent successfully'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- No existing invite, create new one
    -- Check invite limit using PENDING invites count (after creation this would be +1)
    IF current_pending_count >= user_record.invite_limit THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'Invite limit reached'::TEXT;
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
    
    RETURN QUERY SELECT TRUE, new_invite_id, 'Invite sent successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update the cancel function to remove the invites_used counter updates
-- since we're now using dynamic pending count instead
DROP FUNCTION IF EXISTS cancel_user_invite(UUID, UUID);

-- Cancel user invite (UPDATED to not rely on invites_used counter)
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
    
    RETURN QUERY SELECT TRUE, 'Invite cancelled successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the stats function to show that invites_available is now based on pending count
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
        u.invites_used, -- Keep for backward compatibility but this is no longer used for limits
        (u.invite_limit - COUNT(ui.id) FILTER (WHERE ui.cancelled_at IS NULL AND i.used_at IS NULL))::INTEGER as invites_available,
        COUNT(ui.id) FILTER (WHERE ui.cancelled_at IS NULL AND i.used_at IS NULL) as pending_invites,
        COUNT(ui.id) FILTER (WHERE i.used_at IS NOT NULL) as successful_signups
    FROM users u
    LEFT JOIN user_invites ui ON u.id = ui.inviter_user_id
    LEFT JOIN invites i ON ui.invite_id = i.id
    WHERE u.id = user_id_param
    GROUP BY u.id, u.invite_limit, u.invites_used;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions (idempotent)
GRANT EXECUTE ON FUNCTION send_user_invite(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_user_invite(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_invite_stats(UUID) TO authenticated; 