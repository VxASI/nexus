-- Migration: 037_complete_invite_system_fixed.sql
-- Description: Complete invite system with atomic operations, race condition protection, and user invite management
-- Date: 2025-01-15
-- FIXED: Proper SQL statement separation to avoid prepared statement errors

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

-- Optimized composite index for invite validation queries (covers main use case)
CREATE INDEX IF NOT EXISTS idx_invites_validation_optimized ON invites(email, used_at, expires_at) 
WHERE used_at IS NULL;

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