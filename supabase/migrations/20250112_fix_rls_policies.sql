-- Fix RLS policies to use auth.uid() directly instead of comparing wallet_address
-- This is more secure and simpler since users.id matches auth.users.id

-- Add missing is_primary column to wallets table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallets' AND column_name = 'is_primary'
    ) THEN
        ALTER TABLE wallets ADD COLUMN is_primary BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Add missing label column to wallets table if it doesn't exist (rename from name)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallets' AND column_name = 'name'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallets' AND column_name = 'label'
    ) THEN
        ALTER TABLE wallets RENAME COLUMN name TO label;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'wallets' AND column_name = 'label'
    ) THEN
        ALTER TABLE wallets ADD COLUMN label TEXT;
    END IF;
END $$;

-- ========================================
-- RLS POLICIES FOR USERS TABLE
-- ========================================

DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;

-- Users can only see their own row (where users.id = auth.uid())
CREATE POLICY "Users can view their own data"
ON users FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users can insert their own data (using their auth.uid() as id)
CREATE POLICY "Users can insert their own data"
ON users FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Users can update their own data
CREATE POLICY "Users can update their own data"
ON users FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ========================================
-- RLS POLICIES FOR WALLETS TABLE
-- ========================================

DROP POLICY IF EXISTS "Users can view their own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can insert their own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can update their own wallets" ON wallets;
DROP POLICY IF EXISTS "Users can delete their own wallets" ON wallets;

-- Simplified: users can access wallets where user_id = their auth.uid()
CREATE POLICY "Users can view their own wallets"
ON wallets FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own wallets"
ON wallets FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own wallets"
ON wallets FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own wallets"
ON wallets FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ========================================
-- RLS POLICIES FOR TOKENS TABLE
-- ========================================

DROP POLICY IF EXISTS "Users can view their own tokens" ON tokens;
DROP POLICY IF EXISTS "Users can insert their own tokens" ON tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON tokens;
DROP POLICY IF EXISTS "Users can delete their own tokens" ON tokens;

-- Tokens are owned via wallet_id -> wallets.user_id relationship
CREATE POLICY "Users can view their own tokens"
ON tokens FOR SELECT
TO authenticated
USING (
    wallet_id IN (
        SELECT id FROM wallets WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own tokens"
ON tokens FOR INSERT
TO authenticated
WITH CHECK (
    wallet_id IN (
        SELECT id FROM wallets WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own tokens"
ON tokens FOR UPDATE
TO authenticated
USING (
    wallet_id IN (
        SELECT id FROM wallets WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    wallet_id IN (
        SELECT id FROM wallets WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own tokens"
ON tokens FOR DELETE
TO authenticated
USING (
    wallet_id IN (
        SELECT id FROM wallets WHERE user_id = auth.uid()
    )
);

-- ========================================
-- RLS POLICIES FOR NFTS TABLE
-- ========================================

DROP POLICY IF EXISTS "Users can view their own nfts" ON nfts;
DROP POLICY IF EXISTS "Users can insert their own nfts" ON nfts;
DROP POLICY IF EXISTS "Users can update their own nfts" ON nfts;
DROP POLICY IF EXISTS "Users can delete their own nfts" ON nfts;

-- NFTs are owned via wallet_id -> wallets.user_id relationship
CREATE POLICY "Users can view their own nfts"
ON nfts FOR SELECT
TO authenticated
USING (
    wallet_id IN (
        SELECT id FROM wallets WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can insert their own nfts"
ON nfts FOR INSERT
TO authenticated
WITH CHECK (
    wallet_id IN (
        SELECT id FROM wallets WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own nfts"
ON nfts FOR UPDATE
TO authenticated
USING (
    wallet_id IN (
        SELECT id FROM wallets WHERE user_id = auth.uid()
    )
)
WITH CHECK (
    wallet_id IN (
        SELECT id FROM wallets WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Users can delete their own nfts"
ON nfts FOR DELETE
TO authenticated
USING (
    wallet_id IN (
        SELECT id FROM wallets WHERE user_id = auth.uid()
    )
);
