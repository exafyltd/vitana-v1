UPDATE profiles 
SET avatar_url = NULL 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'daniela.kueper0607@gmail.com'
);