-- Atomic balance adjustment to prevent race conditions between concurrent bot trades

CREATE OR REPLACE FUNCTION public.adjust_profile_balance(
  p_account_type text,
  p_delta numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_new_balance numeric;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF p_account_type NOT IN ('demo', 'real') THEN
    RAISE EXCEPTION 'invalid_account_type';
  END IF;

  IF p_account_type = 'demo' THEN
    UPDATE public.profiles
    SET demo_balance = demo_balance + p_delta
    WHERE user_id = v_user_id
    RETURNING demo_balance INTO v_new_balance;
  ELSE
    UPDATE public.profiles
    SET real_balance = real_balance + p_delta
    WHERE user_id = v_user_id
    RETURNING real_balance INTO v_new_balance;
  END IF;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'profile_not_found';
  END IF;

  IF v_new_balance < 0 THEN
    -- Roll back the change by applying the inverse delta
    IF p_account_type = 'demo' THEN
      UPDATE public.profiles
      SET demo_balance = demo_balance - p_delta
      WHERE user_id = v_user_id
      RETURNING demo_balance INTO v_new_balance;
    ELSE
      UPDATE public.profiles
      SET real_balance = real_balance - p_delta
      WHERE user_id = v_user_id
      RETURNING real_balance INTO v_new_balance;
    END IF;

    RAISE EXCEPTION 'insufficient_funds';
  END IF;

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_profile_balance(text, numeric) TO authenticated;
