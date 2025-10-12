-- Fix RLS policies for tokens table to allow authenticated users to insert their own tokens

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own tokens" ON tokens;
DROP POLICY IF EXISTS "Users can insert their own tokens" ON tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON tokens;
DROP POLICY IF EXISTS "Users can delete their own tokens" ON tokens;

-- Enable RLS on tokens table
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own tokens
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

-- Policy: Users can insert their own tokens
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

-- Policy: Users can update their own tokens
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

-- Policy: Users can delete their own tokens
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
