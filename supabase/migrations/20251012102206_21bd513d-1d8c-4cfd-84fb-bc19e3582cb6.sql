-- Fix admin_system_health view to use scalar subqueries instead of CROSS JOINs
CREATE OR REPLACE VIEW admin_system_health AS
SELECT
  (SELECT COUNT(*) FROM memberships) AS total_memberships,
  (SELECT COUNT(*) FROM memberships WHERE status = 'active') AS active_memberships,
  (SELECT COUNT(*) FROM tenants) AS total_tenants,
  (SELECT COUNT(*) FROM message_threads) AS total_threads,
  (SELECT COUNT(*) FROM global_message_threads) AS total_global_threads,
  (SELECT COUNT(*) FROM messages) AS total_messages,
  (SELECT COUNT(*) FROM global_messages) AS total_global_messages;

-- Fix get_recent_admin_activity function to cast email to TEXT
CREATE OR REPLACE FUNCTION get_recent_admin_activity(limit_count INTEGER DEFAULT 10)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  event_type TEXT,
  event_data JSONB,
  created_at TIMESTAMPTZ,
  user_email TEXT
)
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.id,
    ae.user_id,
    ae.event_type,
    ae.event_data,
    ae.created_at,
    au.email::text AS user_email
  FROM audit_events ae
  LEFT JOIN auth.users au ON au.id = ae.user_id
  ORDER BY ae.created_at DESC
  LIMIT limit_count;
END;
$$;