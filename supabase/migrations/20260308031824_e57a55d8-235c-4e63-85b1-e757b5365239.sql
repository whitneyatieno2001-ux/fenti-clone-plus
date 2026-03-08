CREATE OR REPLACE FUNCTION public.admin_credit_account(p_target_user_id uuid, p_amount numeric, p_account_type text DEFAULT 'real'::text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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

  INSERT INTO public.transactions (user_id, type, amount, currency, status, description, account_type)
  VALUES (p_target_user_id, 'deposit', p_amount, 'USD', 'completed', 'Deposit to ' || p_account_type || ' account', p_account_type);

  RETURN v_new_balance;
END;
$$;