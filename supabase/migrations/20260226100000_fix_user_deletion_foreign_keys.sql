-- Fix missing ON DELETE CASCADE/SET NULL on foreign keys referencing auth.users(id)
-- These missing constraints block user deletion in Supabase.
--
-- Strategy:
--   - Columns that store "who did this" (audit trail): ON DELETE SET NULL
--     (keep the record, just lose the user reference)
--   - Columns that are the user's own data (NOT NULL user_id): ON DELETE CASCADE
--     (delete user's data when user is deleted)

-- 1. event_attendees.invited_by → SET NULL (audit: who sent the invite)
ALTER TABLE public.event_attendees DROP CONSTRAINT IF EXISTS event_attendees_invited_by_fkey;
ALTER TABLE public.event_attendees
  ADD CONSTRAINT event_attendees_invited_by_fkey
  FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. cj_orders.user_id → CASCADE (NOT NULL, user's own order data)
ALTER TABLE public.cj_orders DROP CONSTRAINT IF EXISTS cj_orders_user_id_fkey;
ALTER TABLE public.cj_orders
  ADD CONSTRAINT cj_orders_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. vitana_index_config.created_by → SET NULL (audit: who created config)
ALTER TABLE public.vitana_index_config DROP CONSTRAINT IF EXISTS vitana_index_config_created_by_fkey;
ALTER TABLE public.vitana_index_config
  ADD CONSTRAINT vitana_index_config_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. automation_rules.created_by → SET NULL (audit: who created the rule)
ALTER TABLE public.automation_rules DROP CONSTRAINT IF EXISTS automation_rules_created_by_fkey;
ALTER TABLE public.automation_rules
  ADD CONSTRAINT automation_rules_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. admin_proactive_settings.updated_by → SET NULL (audit: who last updated)
ALTER TABLE public.admin_proactive_settings DROP CONSTRAINT IF EXISTS admin_proactive_settings_updated_by_fkey;
ALTER TABLE public.admin_proactive_settings
  ADD CONSTRAINT admin_proactive_settings_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 6. event_co_creators.added_by → SET NULL (audit: who added the co-creator)
ALTER TABLE public.event_co_creators DROP CONSTRAINT IF EXISTS event_co_creators_added_by_fkey;
ALTER TABLE public.event_co_creators
  ADD CONSTRAINT event_co_creators_added_by_fkey
  FOREIGN KEY (added_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 7. mcp_tool_executions.executed_by → SET NULL (audit: who ran the tool)
ALTER TABLE public.mcp_tool_executions DROP CONSTRAINT IF EXISTS mcp_tool_executions_executed_by_fkey;
ALTER TABLE public.mcp_tool_executions
  ADD CONSTRAINT mcp_tool_executions_executed_by_fkey
  FOREIGN KEY (executed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 8. event_ticket_purchases.buyer_id → SET NULL (keep purchase record, lose user ref)
ALTER TABLE public.event_ticket_purchases DROP CONSTRAINT IF EXISTS event_ticket_purchases_buyer_id_fkey;
ALTER TABLE public.event_ticket_purchases
  ADD CONSTRAINT event_ticket_purchases_buyer_id_fkey
  FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 9. event_ticket_purchases.checked_in_by → SET NULL (audit: who checked in)
ALTER TABLE public.event_ticket_purchases DROP CONSTRAINT IF EXISTS event_ticket_purchases_checked_in_by_fkey;
ALTER TABLE public.event_ticket_purchases
  ADD CONSTRAINT event_ticket_purchases_checked_in_by_fkey
  FOREIGN KEY (checked_in_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 10. event_ticket_scans.scanned_by → SET NULL (audit: who scanned the ticket)
ALTER TABLE public.event_ticket_scans DROP CONSTRAINT IF EXISTS event_ticket_scans_scanned_by_fkey;
ALTER TABLE public.event_ticket_scans
  ADD CONSTRAINT event_ticket_scans_scanned_by_fkey
  FOREIGN KEY (scanned_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 11. package_purchases.buyer_id → SET NULL (keep purchase record, lose user ref)
ALTER TABLE public.package_purchases DROP CONSTRAINT IF EXISTS package_purchases_buyer_id_fkey;
ALTER TABLE public.package_purchases
  ADD CONSTRAINT package_purchases_buyer_id_fkey
  FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 12. vouchers.redeemed_by_user_id → SET NULL (keep voucher, lose redeemer ref)
ALTER TABLE public.vouchers DROP CONSTRAINT IF EXISTS vouchers_redeemed_by_user_id_fkey;
ALTER TABLE public.vouchers
  ADD CONSTRAINT vouchers_redeemed_by_user_id_fkey
  FOREIGN KEY (redeemed_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
