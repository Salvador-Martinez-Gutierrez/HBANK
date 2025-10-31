-- =====================================================
-- Migration: Create DeFi Snapshot Tables
-- Description: Tables to store periodic snapshots of 
--              SaucerSwap pools, farms, and tokens data
-- Date: 2025-01-31
-- =====================================================

-- =====================================================
-- Table: defi_pools_snapshot
-- Purpose: Store SaucerSwap pool data (LP tokens)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.defi_pools_snapshot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_data JSONB NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient querying by last_updated
CREATE INDEX idx_defi_pools_snapshot_last_updated 
ON public.defi_pools_snapshot(last_updated DESC);

-- Comment on table
COMMENT ON TABLE public.defi_pools_snapshot IS 
'Stores periodic snapshots of SaucerSwap pool data obtained from their API. Updated by cron job every 5 minutes.';

-- =====================================================
-- Table: defi_farms_snapshot
-- Purpose: Store SaucerSwap farm data
-- =====================================================
CREATE TABLE IF NOT EXISTS public.defi_farms_snapshot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farm_data JSONB NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient querying by last_updated
CREATE INDEX idx_defi_farms_snapshot_last_updated 
ON public.defi_farms_snapshot(last_updated DESC);

-- Comment on table
COMMENT ON TABLE public.defi_farms_snapshot IS 
'Stores periodic snapshots of SaucerSwap farm data obtained from their API. Updated by cron job every 5 minutes.';

-- =====================================================
-- Table: defi_tokens_snapshot
-- Purpose: Store SaucerSwap token price data
-- =====================================================
CREATE TABLE IF NOT EXISTS public.defi_tokens_snapshot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_data JSONB NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient querying by last_updated
CREATE INDEX idx_defi_tokens_snapshot_last_updated 
ON public.defi_tokens_snapshot(last_updated DESC);

-- Comment on table
COMMENT ON TABLE public.defi_tokens_snapshot IS 
'Stores periodic snapshots of SaucerSwap token price data obtained from their API. Updated by cron job every 5 minutes.';

-- =====================================================
-- RLS Policies
-- Purpose: Public read access, service role write access
-- =====================================================

-- Enable RLS
ALTER TABLE public.defi_pools_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defi_farms_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defi_tokens_snapshot ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for GET /api/defi/snapshot)
CREATE POLICY "Allow public read access to pools snapshot"
ON public.defi_pools_snapshot
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public read access to farms snapshot"
ON public.defi_farms_snapshot
FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public read access to tokens snapshot"
ON public.defi_tokens_snapshot
FOR SELECT
TO public
USING (true);

-- Allow service role full access (for POST /api/defi/sync-snapshot)
CREATE POLICY "Allow service role full access to pools snapshot"
ON public.defi_pools_snapshot
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow service role full access to farms snapshot"
ON public.defi_farms_snapshot
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow service role full access to tokens snapshot"
ON public.defi_tokens_snapshot
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- Cleanup Function
-- Purpose: Delete snapshots older than 7 days to prevent
--          table bloat (we only need the latest snapshot)
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_old_defi_snapshots()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Keep only snapshots from the last 7 days
    DELETE FROM public.defi_pools_snapshot
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    DELETE FROM public.defi_farms_snapshot
    WHERE created_at < NOW() - INTERVAL '7 days';
    
    DELETE FROM public.defi_tokens_snapshot
    WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$;

COMMENT ON FUNCTION cleanup_old_defi_snapshots() IS 
'Removes snapshot records older than 7 days. Should be called periodically by pg_cron or external scheduler.';

-- =====================================================
-- Initial Snapshot (optional - creates empty records)
-- =====================================================
-- Uncomment if you want to create initial empty snapshots
-- INSERT INTO public.defi_pools_snapshot (pool_data) VALUES ('[]'::jsonb);
-- INSERT INTO public.defi_farms_snapshot (farm_data) VALUES ('[]'::jsonb);
-- INSERT INTO public.defi_tokens_snapshot (token_data) VALUES ('[]'::jsonb);
