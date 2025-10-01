-- Add 'follow' to notification_type enum
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'follow';

-- Update follow_user function to create notifications
CREATE OR REPLACE FUNCTION public.follow_user(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  follower_name text;
BEGIN
  -- Validation
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Authentication required');
  END IF;

  IF auth.uid() = target_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Cannot follow yourself');
  END IF;

  -- Insert follow relationship
  INSERT INTO public.user_follows (follower_id, following_id)
  VALUES (auth.uid(), target_user_id)
  ON CONFLICT (follower_id, following_id) DO NOTHING;

  -- Get follower's display name for notification
  SELECT COALESCE(display_name, full_name, 'Someone') 
  INTO follower_name
  FROM public.profiles 
  WHERE user_id = auth.uid();

  -- Create notification for the followed user
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    target_user_id,
    'follow',
    'New Follower',
    follower_name || ' started following you',
    jsonb_build_object(
      'follower_id', auth.uid(),
      'follower_name', follower_name
    )
  );

  RETURN jsonb_build_object('success', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$function$;