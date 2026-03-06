
DELETE FROM public.transactions WHERE user_id NOT IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
);
DELETE FROM public.bots WHERE user_id NOT IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
);
DELETE FROM public.bot_purchases WHERE user_id NOT IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
);
DELETE FROM public.binance_connections WHERE user_id NOT IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
);
DELETE FROM public.profiles WHERE user_id NOT IN (
  SELECT user_id FROM public.user_roles WHERE role = 'admin'
);
