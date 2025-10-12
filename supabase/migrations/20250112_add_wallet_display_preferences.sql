-- Add display preferences to wallets table

-- Add display_order column for custom wallet ordering
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Create index for faster ordering
CREATE INDEX IF NOT EXISTS idx_wallets_display_order ON wallets(user_id, display_order);

-- Update existing wallets to have sequential display_order based on created_at
WITH numbered_wallets AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at) as row_num
    FROM wallets
)
UPDATE wallets
SET display_order = numbered_wallets.row_num
FROM numbered_wallets
WHERE wallets.id = numbered_wallets.id;
