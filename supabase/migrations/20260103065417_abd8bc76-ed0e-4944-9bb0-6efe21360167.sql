-- Add a signed profit_loss column to track actual P/L impact
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS profit_loss numeric DEFAULT 0;

-- Add index for faster P/L calculations
CREATE INDEX IF NOT EXISTS idx_transactions_profit_loss ON public.transactions(profit_loss);

-- Comment for clarity
COMMENT ON COLUMN public.transactions.profit_loss IS 'Signed profit/loss value: positive for wins, negative for losses';