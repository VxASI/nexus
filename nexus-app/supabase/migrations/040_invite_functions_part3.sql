-- Migration: 040_invite_functions_part3.sql
-- Description: Send and cancel invite functions - Part 3
-- Date: 2025-01-15

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