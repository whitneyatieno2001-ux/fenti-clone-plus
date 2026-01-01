-- Add phone_number to profiles for payment matching
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_phone_number ON public.profiles(phone_number);