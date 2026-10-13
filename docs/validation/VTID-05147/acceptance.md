# VTID-05147 — Track S / S-M (vitana-v1 part): guards only, no runtime change

The fix lives in exafyltd/vitana-platform (migration `20261013200000_vtid_05147_s_m_membership_role_lockdown.sql`
and gateway defence in depth; evidence pack `docs/validation/VTID-05147/` there). This repo never wrote the
role/membership tables directly; these tests keep it so. Deploys nothing, so no Gate 2.

## Acceptance criteria

AC-1: No `.from('user_tenants'|'role_preferences'|'user_active_roles'|'user_permitted_roles')` write
(insert/update/upsert/delete) in `src/` or `supabase/functions/` outside a service-role client.
  TEST: src/integrations/supabase/role-tables-no-client-writes.vtid-05147.test.ts

AC-2: No migration here newer than the platform S-M migration recreates a dropped write policy, grants member
writes on the four tables, or redefines `set_role_preference` without the membership check.
  TEST: src/integrations/supabase/role-tables-no-client-writes.vtid-05147.test.ts (mirror guard + guard self-test)

AC-3: The role switcher only calls `rpc('set_role_preference')`; a refusal ("Not a member of this tenant",
"Role not granted for this tenant") rolls back, shows the error toast and does not navigate.
  TEST: src/hooks/useRoleSwitch.vtid-05147.wiring.test.ts
