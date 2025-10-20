-- Clean up miscategorized tokens
-- This migration moves tokens to the correct tables based on their token_type

-- STEP 1: Move NON_FUNGIBLE tokens from wallet_tokens to nfts
-- First, insert into nfts table
INSERT INTO nfts (wallet_id, token_id, token_registry_id, serial_number, metadata, last_synced_at)
SELECT 
    wt.wallet_id,
    tr.token_address,
    tr.id,
    1 as serial_number, -- Default serial number
    '{}'::jsonb as metadata,
    NOW() as last_synced_at
FROM wallet_tokens wt
JOIN tokens_registry tr ON wt.token_id = tr.id
WHERE tr.token_type = 'NON_FUNGIBLE'
ON CONFLICT (wallet_id, token_id, serial_number) DO UPDATE
SET last_synced_at = EXCLUDED.last_synced_at;

-- Then, delete from wallet_tokens
DELETE FROM wallet_tokens wt
USING tokens_registry tr
WHERE wt.token_id = tr.id
AND tr.token_type = 'NON_FUNGIBLE';

-- STEP 2: Move NON_FUNGIBLE tokens from liquidity_pool_tokens to nfts
-- First, insert into nfts table
INSERT INTO nfts (wallet_id, token_id, token_registry_id, serial_number, metadata, last_synced_at)
SELECT 
    lpt.wallet_id,
    tr.token_address,
    tr.id,
    1 as serial_number,
    '{}'::jsonb as metadata,
    NOW() as last_synced_at
FROM liquidity_pool_tokens lpt
JOIN tokens_registry tr ON lpt.token_id = tr.id
WHERE tr.token_type = 'NON_FUNGIBLE'
ON CONFLICT (wallet_id, token_id, serial_number) DO UPDATE
SET last_synced_at = EXCLUDED.last_synced_at;

-- Then, delete from liquidity_pool_tokens
DELETE FROM liquidity_pool_tokens lpt
USING tokens_registry tr
WHERE lpt.token_id = tr.id
AND tr.token_type = 'NON_FUNGIBLE';

-- STEP 3: Move FUNGIBLE tokens from nfts to wallet_tokens
-- First, insert into wallet_tokens
INSERT INTO wallet_tokens (wallet_id, token_id, balance, last_synced_at)
SELECT 
    n.wallet_id,
    tr.id,
    '0' as balance, -- Default balance, will be updated on next sync
    NOW() as last_synced_at
FROM nfts n
JOIN tokens_registry tr ON n.token_registry_id = tr.id
WHERE tr.token_type = 'FUNGIBLE'
ON CONFLICT (wallet_id, token_id) DO UPDATE
SET last_synced_at = EXCLUDED.last_synced_at;

-- Then, delete from nfts
DELETE FROM nfts n
USING tokens_registry tr
WHERE n.token_registry_id = tr.id
AND tr.token_type = 'FUNGIBLE';

-- STEP 4: Move LP_TOKEN tokens from nfts to liquidity_pool_tokens
-- First, insert into liquidity_pool_tokens
INSERT INTO liquidity_pool_tokens (wallet_id, token_id, balance, pool_metadata, last_synced_at)
SELECT 
    n.wallet_id,
    tr.id,
    '0' as balance,
    '{}'::jsonb as pool_metadata,
    NOW() as last_synced_at
FROM nfts n
JOIN tokens_registry tr ON n.token_registry_id = tr.id
WHERE tr.token_type = 'LP_TOKEN'
ON CONFLICT (wallet_id, token_id) DO UPDATE
SET last_synced_at = EXCLUDED.last_synced_at;

-- Then, delete from nfts
DELETE FROM nfts n
USING tokens_registry tr
WHERE n.token_registry_id = tr.id
AND tr.token_type = 'LP_TOKEN';

-- Log the cleanup
DO $$
BEGIN
    RAISE NOTICE 'Token categorization cleanup completed';
    RAISE NOTICE 'Check the tables to verify all tokens are in the correct place';
END $$;
