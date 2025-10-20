-- Diagnostic: Find tokens with NON_FUNGIBLE type in wrong tables

-- 1. Check wallet_tokens that should be NFTs
SELECT 
    wt.id,
    wt.wallet_id,
    tr.token_address,
    tr.token_name,
    tr.token_type,
    'wallet_tokens' as current_table,
    'Should be in nfts' as issue
FROM wallet_tokens wt
JOIN tokens_registry tr ON wt.token_id = tr.id
WHERE tr.token_type = 'NON_FUNGIBLE';

-- 2. Check liquidity_pool_tokens that should be NFTs
SELECT 
    lpt.id,
    lpt.wallet_id,
    tr.token_address,
    tr.token_name,
    tr.token_type,
    'liquidity_pool_tokens' as current_table,
    'Should be in nfts' as issue
FROM liquidity_pool_tokens lpt
JOIN tokens_registry tr ON lpt.token_id = tr.id
WHERE tr.token_type = 'NON_FUNGIBLE';

-- 3. Check nfts that should be fungible tokens
SELECT 
    n.id,
    n.wallet_id,
    tr.token_address,
    tr.token_name,
    tr.token_type,
    'nfts' as current_table,
    'Should be in wallet_tokens or liquidity_pool_tokens' as issue
FROM nfts n
JOIN tokens_registry tr ON n.token_registry_id = tr.id
WHERE tr.token_type IN ('FUNGIBLE', 'LP_TOKEN');

-- 4. Summary of token types
SELECT 
    token_type,
    COUNT(*) as count
FROM tokens_registry
GROUP BY token_type
ORDER BY count DESC;

-- 5. Check tokens without type
SELECT 
    token_address,
    token_name,
    token_symbol,
    token_type
FROM tokens_registry
WHERE token_type IS NULL;
