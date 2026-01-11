-- Create a table to track bot purchases
CREATE TABLE public.bot_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  bot_id TEXT NOT NULL,
  price NUMERIC NOT NULL,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.bot_purchases ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own bot purchases" 
ON public.bot_purchases 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bot purchases" 
ON public.bot_purchases 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add unique constraint to prevent duplicate purchases
CREATE UNIQUE INDEX idx_bot_purchases_user_bot ON public.bot_purchases (user_id, bot_id);