-- Create table for storing Binance API connections per user
CREATE TABLE public.binance_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  api_key_masked TEXT NOT NULL,
  is_connected BOOLEAN NOT NULL DEFAULT true,
  permissions TEXT[] DEFAULT '{"read"}',
  connected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.binance_connections ENABLE ROW LEVEL SECURITY;

-- Users can only access their own connections
CREATE POLICY "Users can view their own binance connections"
ON public.binance_connections FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own binance connections"
ON public.binance_connections FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own binance connections"
ON public.binance_connections FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own binance connections"
ON public.binance_connections FOR DELETE USING (auth.uid() = user_id);
