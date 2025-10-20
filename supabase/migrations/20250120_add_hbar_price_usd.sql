-- Add hbar_price_usd to wallets table
ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS hbar_price_usd NUMERIC(20, 8) DEFAULT 0;

COMMENT ON COLUMN wallets.hbar_price_usd IS 'Current USD price of HBAR from SaucerSwap';
