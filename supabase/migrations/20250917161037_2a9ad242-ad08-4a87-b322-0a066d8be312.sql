-- Ensure the current user is in the global community profiles
INSERT INTO public.global_community_profiles (user_id, display_name, avatar_url, bio, is_visible)
SELECT p.user_id, 
       COALESCE(p.display_name, p.full_name, 'User'),
       p.avatar_url,
       p.bio,
       true
FROM public.profiles p
WHERE p.user_id = 'c5a4daf9-190a-4a9e-9638-d6b32f85244a'
  AND NOT EXISTS (SELECT 1 FROM public.global_community_profiles WHERE user_id = p.user_id)
ON CONFLICT (user_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  avatar_url = EXCLUDED.avatar_url,
  bio = EXCLUDED.bio,
  is_visible = true;

-- Also ensure any other community users are added
INSERT INTO public.global_community_profiles (user_id, display_name, avatar_url, bio, is_visible)
SELECT DISTINCT p.user_id, 
       COALESCE(p.display_name, p.full_name, 'User'),
       p.avatar_url,
       p.bio,
       true
FROM public.profiles p
JOIN public.role_preferences rp ON p.user_id = rp.user_id
WHERE rp.role = 'community'
  AND p.user_id NOT IN (SELECT user_id FROM public.global_community_profiles)
ON CONFLICT (user_id) DO NOTHING;