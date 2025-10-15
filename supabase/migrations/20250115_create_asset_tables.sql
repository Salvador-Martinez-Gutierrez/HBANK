-- Migration to create separate tables for different asset types
-- This replaces the old 'tokens' table with more specific categorization

-- ========================================
-- 1. TOKENS REGISTRY (shared metadata)
-- ========================================
CREATE TABLE IF NOT EXISTS tokens_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_address TEXT UNIQUE NOT NULL,
    token_name TEXT,
    token_symbol TEXT,
    token_icon TEXT,
    decimals INTEGER,
    token_type TEXT CHECK (token_type IN ('FUNGIBLE', 'NON_FUNGIBLE', 'LP_TOKEN')),
    price_usd TEXT DEFAULT '0',
    last_price_update TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. WALLET TOKENS (fungible tokens per wallet)
-- ========================================
CREATE TABLE IF NOT EXISTS wallet_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    token_id UUID REFERENCES tokens_registry(id) ON DELETE CASCADE,
    balance TEXT NOT NULL DEFAULT '0',
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wallet_id, token_id)
);

-- ========================================
-- 3. LIQUIDITY POOL TOKENS (LP tokens per wallet)
-- ========================================
CREATE TABLE IF NOT EXISTS liquidity_pool_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE,
    token_id UUID REFERENCES tokens_registry(id) ON DELETE CASCADE,
    balance TEXT NOT NULL DEFAULT '0',
    pool_metadata JSONB, -- Store pool info like token0, token1, fee tier, etc.
    last_synced_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(wallet_id, token_id)
);

-- ========================================
-- 4. UPDATE NFTS TABLE to link with wallet_id
-- ========================================
-- Add wallet_id reference to nfts table
ALTER TABLE nfts ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES wallets(id) ON DELETE CASCADE;
ALTER TABLE nfts ADD COLUMN IF NOT EXISTS token_registry_id UUID REFERENCES tokens_registry(id) ON DELETE SET NULL;

-- Update the unique constraint to use wallet_id
ALTER TABLE nfts DROP CONSTRAINT IF EXISTS nfts_user_id_wallet_address_token_id_serial_number_key;
ALTER TABLE nfts ADD CONSTRAINT nfts_wallet_id_token_id_serial_number_key 
    UNIQUE(wallet_id, token_id, serial_number);

-- ========================================
-- ENABLE RLS ON NEW TABLES
-- ========================================
ALTER TABLE tokens_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidity_pool_tokens ENABLE ROW LEVEL SECURITY;

-- ========================================
-- RLS POLICIES FOR TOKENS_REGISTRY
-- ========================================
-- Tokens registry is public read, but only system can write
DROP POLICY IF EXISTS "Anyone can view tokens registry" ON tokens_registry;
CREATE POLICY "Anyone can view tokens registry"
ON tokens_registry FOR SELECT
TO authenticated
USING (true);

-- ========================================
-- RLS POLICIES FOR WALLET_TOKENS
-- ========================================
DROP POLICY IF EXISTS "Users can view their wallet tokens" ON wallet_tokens;
DROP POLICY IF EXISTS "Users can insert their wallet tokens" ON wallet_tokens;
DROP POLICY IF EXISTS "Users can update their wallet tokens" ON wallet_tokens;
DROP POLICY IF EXISTS "Users can delete their wallet tokens" ON wallet_tokens;

CREATE POLICY "Users can view their wallet tokens"
ON wallet_tokens FOR SELECT
TO authenticated
USING (
    wallet_id IN (
        SELECT w.id FROM wallets w
        INNER JOIN users u ON w.user_id = u.id
        WHERE u.wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert their wallet tokens"
ON wallet_tokens FOR INSERT
TO authenticated
WITH CHECK (
    wallet_id IN (
        SELECT w.id FROM wallets w
        INNER JOIN users u ON w.user_id = u.id
        WHERE u.wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can update their wallet tokens"
ON wallet_tokens FOR UPDATE
TO authenticated
USING (
    wallet_id IN (
        SELECT w.id FROM wallets w
        INNER JOIN users u ON w.user_id = u.id
        WHERE u.wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
)
WITH CHECK (
    wallet_id IN (
        SELECT w.id FROM wallets w
        INNER JOIN users u ON w.user_id = u.id
        WHERE u.wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can delete their wallet tokens"
ON wallet_tokens FOR DELETE
TO authenticated
USING (
    wallet_id IN (
        SELECT w.id FROM wallets w
        INNER JOIN users u ON w.user_id = u.id
        WHERE u.wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

-- ========================================
-- RLS POLICIES FOR LIQUIDITY_POOL_TOKENS
-- ========================================
DROP POLICY IF EXISTS "Users can view their LP tokens" ON liquidity_pool_tokens;
DROP POLICY IF EXISTS "Users can insert their LP tokens" ON liquidity_pool_tokens;
DROP POLICY IF EXISTS "Users can update their LP tokens" ON liquidity_pool_tokens;
DROP POLICY IF EXISTS "Users can delete their LP tokens" ON liquidity_pool_tokens;

CREATE POLICY "Users can view their LP tokens"
ON liquidity_pool_tokens FOR SELECT
TO authenticated
USING (
    wallet_id IN (
        SELECT w.id FROM wallets w
        INNER JOIN users u ON w.user_id = u.id
        WHERE u.wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert their LP tokens"
ON liquidity_pool_tokens FOR INSERT
TO authenticated
WITH CHECK (
    wallet_id IN (
        SELECT w.id FROM wallets w
        INNER JOIN users u ON w.user_id = u.id
        WHERE u.wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can update their LP tokens"
ON liquidity_pool_tokens FOR UPDATE
TO authenticated
USING (
    wallet_id IN (
        SELECT w.id FROM wallets w
        INNER JOIN users u ON w.user_id = u.id
        WHERE u.wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
)
WITH CHECK (
    wallet_id IN (
        SELECT w.id FROM wallets w
        INNER JOIN users u ON w.user_id = u.id
        WHERE u.wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "Users can delete their LP tokens"
ON liquidity_pool_tokens FOR DELETE
TO authenticated
USING (
    wallet_id IN (
        SELECT w.id FROM wallets w
        INNER JOIN users u ON w.user_id = u.id
        WHERE u.wallet_address = (
            SELECT user_metadata->>'wallet_address' 
            FROM auth.users 
            WHERE id = auth.uid()
        )
    )
);

-- ========================================
-- CREATE INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_tokens_registry_token_address ON tokens_registry(token_address);
CREATE INDEX IF NOT EXISTS idx_tokens_registry_token_type ON tokens_registry(token_type);
CREATE INDEX IF NOT EXISTS idx_wallet_tokens_wallet_id ON wallet_tokens(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_tokens_token_id ON wallet_tokens(token_id);
CREATE INDEX IF NOT EXISTS idx_lp_tokens_wallet_id ON liquidity_pool_tokens(wallet_id);
CREATE INDEX IF NOT EXISTS idx_lp_tokens_token_id ON liquidity_pool_tokens(token_id);
CREATE INDEX IF NOT EXISTS idx_nfts_wallet_id ON nfts(wallet_id);
CREATE INDEX IF NOT EXISTS idx_nfts_token_registry_id ON nfts(token_registry_id);

-- ========================================
-- MIGRATE DATA FROM OLD TOKENS TABLE (if exists)
-- ========================================
-- This section will migrate data from the old 'tokens' table if it exists
-- Can be run safely even if there's no data
DO $$
BEGIN
    -- Check if old tokens table exists and has data
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tokens') THEN
        -- Migrate to tokens_registry and wallet_tokens
        -- This is a placeholder - you may need to adjust based on your data
        RAISE NOTICE 'Old tokens table exists. Manual migration may be required.';
    END IF;
END $$;

-- ========================================
-- ADD HELPFUL COMMENTS
-- ========================================
COMMENT ON TABLE tokens_registry IS 'Shared registry of all token metadata across all wallets';
COMMENT ON TABLE wallet_tokens IS 'Fungible token balances per wallet';
COMMENT ON TABLE liquidity_pool_tokens IS 'Liquidity pool token balances per wallet';
COMMENT ON COLUMN tokens_registry.token_type IS 'Token type: FUNGIBLE, NON_FUNGIBLE, or LP_TOKEN';
COMMENT ON COLUMN liquidity_pool_tokens.pool_metadata IS 'JSON metadata about the liquidity pool (token pairs, fees, etc.)';
