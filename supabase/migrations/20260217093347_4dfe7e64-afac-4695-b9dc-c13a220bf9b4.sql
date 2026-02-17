
-- Add columns to store encrypted API keys for Binance balance fetching
ALTER TABLE public.binance_connections 
ADD COLUMN IF NOT EXISTS api_key_encrypted TEXT,
ADD COLUMN IF NOT EXISTS api_secret_encrypted TEXT;
