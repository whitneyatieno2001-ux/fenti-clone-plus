
-- Revoke broad UPDATE on profiles from public/anon roles
-- and grant UPDATE only on safe columns
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
GRANT UPDATE (name, phone_number, email) ON public.profiles TO authenticated;

-- Create a dedicated function for resetting demo balance
CREATE OR REPLACE FUNCTION public.reset_demo_balance()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET demo_balance = 10000
  WHERE user_id = auth.uid();
END;
$$;
