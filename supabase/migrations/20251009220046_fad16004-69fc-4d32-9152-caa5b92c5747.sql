-- Admin Analytics Infrastructure
-- Create views and functions for real-time admin dashboard analytics

-- 1. Admin User Analytics View
CREATE OR REPLACE VIEW admin_user_analytics AS
SELECT 
  COUNT(DISTINCT au.id) as total_users,
  COUNT(DISTINCT CASE WHEN au.last_sign_in_at > NOW() - INTERVAL '24 hours' THEN au.id END) as active_users_24h,
  COUNT(DISTINCT CASE WHEN au.last_sign_in_at > NOW() - INTERVAL '7 days' THEN au.id END) as active_users_7d,
  COUNT(DISTINCT CASE WHEN au.created_at > NOW() - INTERVAL '7 days' THEN au.id END) as new_users_7d,
  COUNT(DISTINCT CASE WHEN au.created_at > NOW() - INTERVAL '30 days' THEN au.id END) as new_users_30d
FROM auth.users au;

-- 2. Admin System Health View
CREATE OR REPLACE VIEW admin_system_health AS
SELECT
  COUNT(DISTINCT m.id) as total_memberships,
  COUNT(DISTINCT CASE WHEN m.status = 'active' THEN m.id END) as active_memberships,
  COUNT(DISTINCT t.id) as total_tenants,
  COUNT(DISTINCT mt.id) as total_threads,
  COUNT(DISTINCT gmt.id) as total_global_threads,
  COUNT(DISTINCT msg.id) as total_messages,
  COUNT(DISTINCT gmsg.id) as total_global_messages
FROM memberships m
CROSS JOIN tenants t
CROSS JOIN message_threads mt
CROSS JOIN global_message_threads gmt
CROSS JOIN messages msg
CROSS JOIN global_messages gmsg;

-- 3. Admin Tenant Analytics View
CREATE OR REPLACE VIEW admin_tenant_analytics AS
SELECT
  t.id as tenant_id,
  t.name as tenant_name,
  t.slug as tenant_slug,
  COUNT(DISTINCT m.user_id) as total_users,
  COUNT(DISTINCT CASE WHEN m.status = 'active' THEN m.user_id END) as active_users,
  COUNT(DISTINCT CASE WHEN m.role = 'admin' THEN m.user_id END) as admin_count,
  COUNT(DISTINCT CASE WHEN m.role = 'staff' THEN m.user_id END) as staff_count,
  COUNT(DISTINCT CASE WHEN m.role = 'professional' THEN m.user_id END) as professional_count,
  COUNT(DISTINCT CASE WHEN m.role = 'patient' THEN m.user_id END) as patient_count
FROM tenants t
LEFT JOIN memberships m ON m.tenant_id = t.id
GROUP BY t.id, t.name, t.slug;

-- 4. Function: Get Active Users Count
CREATE OR REPLACE FUNCTION get_active_users_count(hours_ago INTEGER DEFAULT 24)
RETURNS INTEGER
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(DISTINCT id)::INTEGER
  FROM auth.users
  WHERE last_sign_in_at > NOW() - (hours_ago || ' hours')::INTERVAL;
$$;

-- 5. Function: Get System Health Status
CREATE OR REPLACE FUNCTION get_system_health()
RETURNS TABLE(
  metric TEXT,
  value TEXT,
  status TEXT
)
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'Database' as metric,
    'Operational' as value,
    'healthy' as status
  UNION ALL
  SELECT
    'Active Users (24h)' as metric,
    get_active_users_count(24)::TEXT as value,
    CASE 
      WHEN get_active_users_count(24) > 0 THEN 'healthy'
      ELSE 'warning'
    END as status
  UNION ALL
  SELECT
    'Total Tenants' as metric,
    COUNT(*)::TEXT as value,
    'healthy' as status
  FROM tenants;
END;
$$;

-- 6. Function: Get User Growth Trend (last 30 days)
CREATE OR REPLACE FUNCTION get_user_growth_trend()
RETURNS TABLE(
  date DATE,
  new_users INTEGER,
  total_users INTEGER
)
LANGUAGE PLPGSQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH daily_signups AS (
    SELECT 
      DATE(created_at) as signup_date,
      COUNT(*)::INTEGER as new_users
    FROM auth.users
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY DATE(created_at)
  ),
  cumulative AS (
    SELECT 
      signup_date,
      new_users,
      SUM(new_users) OVER (ORDER BY signup_date)::INTEGER as running_total
    FROM daily_signups
  )
  SELECT 
    signup_date as date,
    new_users,
    running_total as total_users
  FROM cumulative
  ORDER BY signup_date DESC
  LIMIT 30;
END;
$$;

-- 7. Function: Get Recent Activity (audit events)
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
    au.email as user_email
  FROM audit_events ae
  LEFT JOIN auth.users au ON au.id = ae.user_id
  ORDER BY ae.created_at DESC
  LIMIT limit_count;
END;
$$;

-- Grant permissions for admin users
GRANT SELECT ON admin_user_analytics TO authenticated;
GRANT SELECT ON admin_system_health TO authenticated;
GRANT SELECT ON admin_tenant_analytics TO authenticated;