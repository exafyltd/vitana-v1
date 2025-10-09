-- Admin Notification System: RLS Policies and Database Views

-- 1. Allow admins/staff to view all notification logs
CREATE POLICY "Staff can view all notification logs"
ON notification_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('admin', 'staff')
    AND m.status = 'active'
  )
  OR
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);

-- 2. Allow admins/staff to view all notification settings
CREATE POLICY "Staff can view all notification settings"
ON notification_settings FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = auth.uid()
    AND m.role IN ('admin', 'staff')
    AND m.status = 'active'
  )
  OR
  COALESCE((auth.jwt() -> 'app_metadata' ->> 'exafy_admin')::boolean, false) = true
);