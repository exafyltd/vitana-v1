# VTID-04871 — calendar staging spec: answer the role lookup so the role gate settles

STAGING-VERIFY for the community app failed on one browser test,
`vtid-04812-calendar-add-and-type` (run under VTID-04852): the calendar page
drew (`vcal-page` visible), then `vcal-add` was "not found".

Cause: the staging guard aborts every POST to Supabase, including the
read-only `get_role_preference` RPC. `ProtectedRoute` shows a full-screen
spinner while that query loads, and React Query retries it. So the calendar
mounted, then flipped back to the spinner on each retry or tenant change,
taking the + button with it. Reproduced in the browser: the page stays on
the role spinner while that lookup is blocked. The app itself is fine.
`npm run test:calendar` asserts the + button with the role resolved.

Fix: the spec answers that one read-only lookup itself with the test user's
real role (`community`) via `page.route(...).fulfill`. That is the pattern the
Commerce specs already use. Nothing reaches Supabase, and the guard still
aborts every other write. The + assertion waits up to 15 s, absorbing one
legitimate re-mount.

AC-1: the calendar staging spec passes on staging. It asserts the page draws,
  the + button is visible and the text/mic bar is absent, the page uses the
  app font, and the weekday title and gradient hero are present.
TEST: STAGING-VERIFY community-app (playwright tests/e2e/staging/vtid-04812-calendar-add-and-type.staging.spec.ts)
