-- Migration: 047_fix_invite_resending.sql
-- Description: Fix invite re-sending for cancelled invites and improve error handling
-- Date: 2025-01-22

-- Drop existing function if it exists to ensure clean replacement
DROP FUNCTION IF EXISTS send_user_invite(UUID, TEXT);

-- Send user invite (UPDATED to handle cancelled invites properly)
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
    existing_invite RECORD;
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
    
    -- Get user stats
    SELECT invite_limit, invites_used INTO user_stats
    FROM users WHERE id = inviter_id_param;
    
    -- Check if user exists
    IF user_stats IS NULL THEN
        RETURN QUERY SELECT FALSE, NULL::UUID, 'User not found'::TEXT;
        RETURN;
    END IF;
    
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
            -- Check invite limit (only if we're reactivating)
            IF user_stats.invites_used >= user_stats.invite_limit THEN
                RETURN QUERY SELECT FALSE, NULL::UUID, 'Invite limit reached'::TEXT;
                RETURN;
            END IF;
            
            -- Reactivate the cancelled invite
            UPDATE user_invites 
            SET cancelled_at = NULL
            WHERE id = existing_invite.user_invite_id;
            
            -- Increment invite count
            UPDATE users 
            SET invites_used = invites_used + 1
            WHERE id = inviter_id_param;
            
            RETURN QUERY SELECT TRUE, existing_invite.invite_id, 'Invite resent successfully'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- No existing invite, create new one
    -- Check invite limit
    IF user_stats.invites_used >= user_stats.invite_limit THEN
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
    
    -- Update user invite count
    UPDATE users 
    SET invites_used = invites_used + 1
    WHERE id = inviter_id_param;
    
    RETURN QUERY SELECT TRUE, new_invite_id, 'Invite sent successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions (idempotent)
GRANT EXECUTE ON FUNCTION send_user_invite(UUID, TEXT) TO authenticated; 