-- Add hbar_balance to wallets table
ALTER TABLE wallets
ADD COLUMN hbar_balance NUMERIC(20, 8) DEFAULT 0;
