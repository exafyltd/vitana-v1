-- Fix security issues from previous migration

-- Revoke access to materialized view from public API (fixes ERROR 1 and WARN 3)
REVOKE ALL ON public.user_follow_counts FROM anon, authenticated;

-- Grant only SELECT through security definer function instead
-- Users should only access counts through the RPC function, not directly