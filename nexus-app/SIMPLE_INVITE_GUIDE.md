# Simple Invite System

## Overview

Minimal invite-only signup system. Users need an invite record in the database to sign up.

## Setup

1. **Run the migration:**
   ```bash
   cd nexus-app
   npx supabase migration up
   ```

2. **That's it!** Signup will now check for invites.

## How It Works

### Database Table
```sql
CREATE TABLE invites (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    referrer_email TEXT,
    expires_at TIMESTAMP WITH TIME ZONE, -- NULL = no expiry
    used_at TIMESTAMP WITH TIME ZONE,    -- NULL = not used yet
    used_by_user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Signup Flow
1. User tries to sign up with email
2. System checks: `SELECT * FROM invites WHERE email = ? AND used_at IS NULL AND (expires_at IS NULL OR expires_at > NOW())`
3. If invite found → signup proceeds → invite marked as used
4. If no invite → signup blocked with error

## Adding Invites

You can add invites through:

### 1. Direct SQL
```sql
-- Simple invite (no expiry)
INSERT INTO invites (email, referrer_email) 
VALUES ('user@example.com', 'admin@yourapp.com');

-- Invite with 30-day expiry
INSERT INTO invites (email, referrer_email, expires_at) 
VALUES ('user@example.com', 'admin@yourapp.com', NOW() + INTERVAL '30 days');
```

### 2. Your External App/Tool
Just insert records into the `invites` table with:
- `email` (required)
- `referrer_email` (optional)
- `expires_at` (optional)

### 3. Bulk Import
```sql
INSERT INTO invites (email, referrer_email) VALUES 
('user1@example.com', 'admin@yourapp.com'),
('user2@example.com', 'admin@yourapp.com'),
('user3@example.com', 'admin@yourapp.com');
```

## Monitoring

### Check invite status
```sql
-- See all pending invites
SELECT email, referrer_email, created_at, expires_at 
FROM invites 
WHERE used_at IS NULL;

-- See used invites
SELECT email, used_at, used_by_user_id 
FROM invites 
WHERE used_at IS NOT NULL;

-- Check specific email
SELECT * FROM invites WHERE email = 'user@example.com';
```

### Database Functions Available
- `check_valid_invite(email)` - Returns true/false if email has valid invite
- `use_invite(email, user_id)` - Marks invite as used

## Temporary Disable

To temporarily allow open signup, comment out the invite check in `AuthContext.tsx`:

```typescript
// Check if user has a valid invite
// const { data: hasInvite, error: inviteError } = await supabase
//   .rpc('check_valid_invite', { email_to_check: email });
// 
// if (!hasInvite) {
//   return { success: false, error: 'Invite required' };
// }
```

## Clean Up

### Remove expired invites
```sql
DELETE FROM invites 
WHERE expires_at < NOW() AND used_at IS NULL;
```

### Remove old used invites
```sql
DELETE FROM invites 
WHERE used_at < NOW() - INTERVAL '90 days';
```

That's it! Simple and effective invite system. 