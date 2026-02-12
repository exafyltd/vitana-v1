UPDATE public.profiles 
SET 
  display_name = 'Jovana Comm',
  avatar_url = (SELECT raw_user_meta_data->>'avatar_url' FROM auth.users WHERE id = 'c7d3260d-8311-4a0b-ab1c-53928a37caec'),
  updated_at = now()
WHERE user_id = 'c7d3260d-8311-4a0b-ab1c-53928a37caec';