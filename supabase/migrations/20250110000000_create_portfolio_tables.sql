-- Create portfolio tables and RLS policies

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create wallets table (for tracking which wallets a user has added to their portfolio)
CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, wallet_address)
);

-- 3. Create tokens table
CREATE TABLE IF NOT EXISTS tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    token_id TEXT NOT NULL,
    symbol TEXT,
    name TEXT,
    balance TEXT,
    decimals INTEGER,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, wallet_address, token_id)
);

-- 4. Create nfts table
CREATE TABLE IF NOT EXISTS nfts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    wallet_address TEXT NOT NULL,
    token_id TEXT NOT NULL,
    serial_number BIGINT NOT NULL,
    metadata JSONB,
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, wallet_address, token_id, serial_number)
);

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfts ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES FOR USERS TABLE
-- ========================================

DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

CREATE POLICY "Users can view their own data"
ON users FOR SELECT
TO authenticated
USING (
    wallet_address = (
        SELECT user_metadata->>'wallet_address' 
        FROM auth.users 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own data"
ON users FOR INSERT
TO authenticated
WITH CHECK (
    wallet_address = (
        SELECT user_metadata->>'wallet_address' 
        FROM auth.users 
        WHERE id = auth.uid()
    )
);

CREATE POLICY "Users can update their own data"
ON users FOR UPDATE
TO authenticated
USING (
    wallet_address = (
        SELECT user_metadata->>'wallet_address' 
        FROM auth.users 
        WHERE id = auth.uid()
    )
)
WITH CHECK (
    wallet_address = (
        SELECT user_metadata->>'wallet_address' 
        FROM auth.users 
        WHERE id = auth.uid()
    )
);

-- ========================================
-- RLS POLICIES FOR WALLETS TABLE
-- ========================================

DROP POLICY IF EXISTS "Users can view their own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can insert their own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can update their own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can delete their own wallets" ON wallets;

CREATE POLICY "Users can view their own wallets"
ON wallets FOR SELECT
TO authenticated
USING (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert their own wallets"
ON wallets FOR INSERT
TO authenticated
WITH CHECK (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can update their own wallets"
ON wallets FOR UPDATE
TO authenticated
USING (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
)
WITH CHECK (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can delete their own wallets"
ON wallets FOR DELETE
TO authenticated
USING (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

-- ========================================
-- RLS POLICIES FOR TOKENS TABLE
-- ========================================

DROP POLICY IF EXISTS "Users can view their own tokens" ON tokens;
DROP POLICY IF EXISTS "Users can insert their own tokens" ON tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON tokens;
DROP POLICY IF EXISTS "Users can delete their own tokens" ON tokens;

CREATE POLICY "Users can view their own tokens"
ON tokens FOR SELECT
TO authenticated
USING (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert their own tokens"
ON tokens FOR INSERT
TO authenticated
WITH CHECK (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can update their own tokens"
ON tokens FOR UPDATE
TO authenticated
USING (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
)
WITH CHECK (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can delete their own tokens"
ON tokens FOR DELETE
TO authenticated
USING (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

-- ========================================
-- RLS POLICIES FOR NFTS TABLE
-- ========================================

DROP POLICY IF EXISTS "Users can view their own nfts" ON nfts;
DROP POLICY IF EXISTS "Users can insert their own nfts" ON nfts;
DROP POLICY IF EXISTS "Users can update their own nfts" ON nfts;
DROP POLICY IF EXISTS "Users can delete their own nfts" ON nfts;

CREATE POLICY "Users can view their own nfts"
ON nfts FOR SELECT
TO authenticated
USING (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert their own nfts"
ON nfts FOR INSERT
TO authenticated
WITH CHECK (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can update their own nfts"
ON nfts FOR UPDATE
TO authenticated
USING (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
)
WITH CHECK (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can delete their own nfts"
ON nfts FOR DELETE
TO authenticated
USING (
    user_id IN (
        SELECT id FROM users 
        WHERE wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_user_id ON tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_tokens_wallet_address ON tokens(wallet_address);
CREATE INDEX IF NOT EXISTS idx_nfts_user_id ON nfts(user_id);
CREATE INDEX IF NOT EXISTS idx_nfts_wallet_address ON nfts(wallet_address);
