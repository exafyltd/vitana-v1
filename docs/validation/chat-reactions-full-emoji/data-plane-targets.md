# Emoji reactions: which database each path uses at release (read-only check, 2026-11-18)

## Answer
All three emoji paths (web, mobile, ORB) read and write `message_reactions` in the **Supabase project VITANA
(`inmkhvwdcuyhnxkgfvsb`)** in staging and in production today. None of them uses Aurora staging. The report that "the
gateway uses Aurora staging" holds only for the isolated `vitana-gateway-preview` service, which is not the staging gateway
the release deploys to.

## Evidence
| Path | Staging | Production | Evidence |
|---|---|---|---|
| Web (PostgREST from the browser) | Supabase VITANA | Supabase VITANA | `src/integrations/supabase/client.ts`: PostgREST goes to `VITE_DATA_API_URL` when set, else Supabase. Build logs: `VITE_DATA_API_URL=` empty in the last staging build (`AWS-STAGE-DEPLOY-FRONTEND`, run 43277315313, 2026-11-12) and the last production build (`AWS-PROD-DEPLOY-FRONTEND`, run 43833552311, 2026-11-16). Lane `autonomous-to-staging-r2/staging-frontend-isolation` (the web repoint) is `ready`, not built. |
| Mobile (native app) | Supabase VITANA | Supabase VITANA | `apps/mobile/src/config/env.ts:202`: `dataApiUrl` from `EXPO_PUBLIC_DATA_API_URL`, unset = Supabase. No build config in vitana-v1 sets it. |
| ORB `react_to_message` (gateway) | Supabase VITANA | Supabase VITANA | The tool uses the gateway `supabase-js` client from `SUPABASE_URL` (`orb-live.ts` → `dispatchOrbTool`). Staging `vitana-gateway:1025` (registered 2026-11-18 14:08 UTC): `SUPABASE_URL` from `vitana/supabase/staging/url`; every staging deploy log since 2026-11-02 reports `currently on: supabase`; secret `vitana/supabase/staging/url-aurora-proxy` does not exist, so the Aurora switch (`data_backend=aurora`) cannot be in effect. Production `vitana-gateway-awsdr:207`: `vitana/supabase/prod/url`. |
| Realtime (both clients) | Supabase VITANA | Supabase VITANA | Realtime always stays on Supabase (`data-routing.ts`: only `/rest/v1` is rewritten). |

Aurora staging (`vitana-aurora-staging`) exists and backs the PostgREST proxy (`vitana-postgrest-aurora-staging:24`,
`PGRST_DB_HOST`) and the isolated `vitana-gateway-preview` (`SUPABASE_URL=http://postgrest-aurora.vitana.internal:8080`).
Per VTID-05803 it holds a 6-table seed; its schema is built from **vitana-platform** `supabase/migrations/**`
(`scripts/ci/staging-db/build-schema.mjs`), which contain no `message_reactions` table (that table and this migration live
in vitana-v1). `STAGING-MIGRATE.yml` also reads only vitana-platform migrations.

Not checked: secret values (withheld from sessions, correct); live web bundles (sandbox egress blocks the hosts).

## Do both data planes need the schema?
- **For this release: no. Only Supabase VITANA needs it.** That is where every emoji path reads and writes.
- **Aurora staging does not need it now.** No emoji path reaches it, and it has no `message_reactions` table to change.
  Applying the migration there would fail (the `ALTER TABLE public.message_reactions` would find no table).
- **Later, when staging (or production) moves to Aurora:** the Aurora schema build would need the reaction tables and this
  migration. Because the build reads only vitana-platform migrations, a copy (or a cross-repo replay) is needed then. That is
  the Aurora cutover's work; it is noted as a follow-up, not part of this release.

## Effect on the migration request
Unchanged target: apply `20261117120000_message_reactions_full_emoji.sql` (SHA-256 `392b8e0a…`) to Supabase VITANA only.
Because staging and production share VITANA, the apply is a production database change at the moment it runs, whichever
environment the code is in.
