# VTID-05041 — public profile lookup without email (vitana-v1 half)

Plan: docs/validation/VTID-05041/plan-sparring.md (Track S / S2, converged in 2 rounds, owner approved
2026-10-10, plan hash 4e5a3a8c…22c7). The database change — `get_user_profile_by_identifier(text)` recreated
without `email`, plus the memory-function lockdown — is the vitana-platform migration
`20261010164100_vtid_05041_definer_functions_lockdown.sql`; this PR is the mirror guard and the client types.

AC-1 Any migration in this repo newer than `20260721124500_public_profile_rpc_default_account_type_verification.sql`
(the last definition here) that creates or replaces `get_user_profile_by_identifier` with `email` in its
RETURNS TABLE fails the build.
TEST: src/integrations/supabase/profile-lookup-no-email.vtid-05041.test.ts

AC-2 The generated RPC type in `src/integrations/supabase/types.ts` and the `DatabaseProfile` interface in
`src/pages/PublicProfilePage.tsx` no longer declare `email`; no caller (PublicProfilePage, ProfilePreviewDialog,
useRealMatches) reads `.email`. Mutation-checked: `email` put back into the interface → the test fails.
TEST: src/integrations/supabase/profile-lookup-no-email.vtid-05041.test.ts

AC-3 No behaviour change for visitors or members: the lookup's callers and the error-logging contract are unchanged.
TEST: src/hooks/useRealMatches.profile-error-logging.test.ts
