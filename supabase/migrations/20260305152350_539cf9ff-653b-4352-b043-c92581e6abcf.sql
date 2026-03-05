
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS: only admins can read user_roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admin function to view all deposits (bypasses RLS)
CREATE OR REPLACE FUNCTION public.admin_get_deposits()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  amount numeric,
  currency text,
  status text,
  description text,
  account_type text,
  created_at timestamptz,
  user_email text,
  user_name text,
  user_phone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  RETURN QUERY
  SELECT 
    t.id, t.user_id, t.amount, t.currency, t.status, t.description, t.account_type, t.created_at,
    p.email AS user_email, p.name AS user_name, p.phone_number AS user_phone
  FROM public.transactions t
  LEFT JOIN public.profiles p ON p.user_id = t.user_id
  WHERE t.type = 'deposit'
  ORDER BY t.created_at DESC
  LIMIT 200;
END;
$$;

-- Admin function to credit a user's account
CREATE OR REPLACE FUNCTION public.admin_credit_account(p_target_user_id uuid, p_amount numeric, p_account_type text DEFAULT 'real')
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  IF p_account_type = 'demo' THEN
    UPDATE public.profiles
    SET demo_balance = demo_balance + p_amount
    WHERE user_id = p_target_user_id
    RETURNING demo_balance INTO v_new_balance;
  ELSE
    UPDATE public.profiles
    SET real_balance = real_balance + p_amount
    WHERE user_id = p_target_user_id
    RETURNING real_balance INTO v_new_balance;
  END IF;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'user_not_found';
  END IF;

  -- Record the deposit transaction
  INSERT INTO public.transactions (user_id, type, amount, currency, status, description, account_type)
  VALUES (p_target_user_id, 'deposit', p_amount, 'USD', 'completed', 'Admin credit', p_account_type);

  RETURN v_new_balance;
END;
$$;

-- Admin function to get all users
CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
  user_id uuid,
  email text,
  name text,
  phone_number text,
  real_balance numeric,
  demo_balance numeric,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  RETURN QUERY
  SELECT p.user_id, p.email, p.name, p.phone_number, p.real_balance, p.demo_balance, p.created_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;
