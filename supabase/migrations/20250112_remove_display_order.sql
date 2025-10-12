-- Remove display_order column as it's now handled in localStorage
-- This makes wallet ordering instant without database queries

-- Drop the index first
DROP INDEX IF EXISTS idx_wallets_display_order;

-- Remove the display_order column
ALTER TABLE wallets DROP COLUMN IF EXISTS display_order;
