# Verification — VTID-05428 (native-wave2-profile-settings-r2 / delete-account)

Native Wave 2 delete-account lane: the public `/delete-account` port. All commands ran offline
(Linux, worktree `.worktrees/native-wave2-profile-settings-r2-delete-account`). Full command log with
counts: `commands.log`. Red on base: `red-on-base.txt`.

## What was built

- `apps/mobile/app/(public)/delete-account.tsx` — the route, in the `(public)` group (no `AuthGate`,
  no shell chrome), as plan decision 1a requires. Nothing under `app/(app)/`.
- `apps/mobile/src/screens/delete-account/DeleteAccountScreen.tsx` — twin of the web page's phone
  branch. Reads the session itself (`useAuth`): signed out → the sign-in-required view (Sign In →
  `/maxina`); signed in → info (five data categories, privacy-policy link) → confirm (typed check,
  Permanently Delete disabled until valid, Cancel clears) → final `AlertDialog` → deleting → done
  (local sign-out, Return to Home) or error (server message or catalog fallback; Try Again / Go Back).
  Same steps, order and `screens.legal.*` keys as the web.
- `apps/mobile/src/screens/delete-account/request.ts` — `buildAccountDeletionRequest()` (the
  `request-account-deletion` edge function, empty body, exactly as the web), `isDeleteConfirmed()`
  (the web's `trim().toUpperCase() === "DELETE"`), `requestAccountDeletion(client)` (client injected;
  maps invoke error / not-ok body / throw to a failure). Class B (needs the client), so native, not core.
- `apps/mobile/src/ports/delete-account.tsx` — lane-owned port: the N2 `AlertDialog` parts,
  `withAlpha`, and the four lucide glyphs the web page draws (back arrow mirrored under RTL). Kept
  separate from the shared `ports/ui.tsx` so parallel lanes do not collide.
- `apps/mobile/src/navigation/resolve.ts` — `/delete-account` added to `NATIVE_ROUTES`.
- `apps/mobile/parity/ledger.json` — the `/delete-account` row `not_started` → `native` (that row only;
  `--sync` reports 0 changes).
- `src/i18n/*/deleteAccountNative.json` — one new key `deleteAccountNative.errorFallback` (DE first,
  du-form; pt você, fr tu, ru ты, tr sen) in all 11 locales; every other string reuses `screens.legal.*`.
- `apps/mobile/maestro/delete-account/README.md` — the G1 device flow (deferred, `next_actor: owner`).
- `apps/mobile/tests/delete-account/delete-account.test.tsx` — 39 tests (see below).

## Tests (fixtures / mocked client only, no network)

`npx jest tests/delete-account` → 39/39: request builder + typed check + result mapping (4); signed
out view, Sign In, back (2); signed-in info, typed check + Cancel, dialog Cancel sends nothing,
confirm builds the request against the mocked `functions.invoke` + local sign-out + done, deleting
step, error step with server message / catalog fallback (7); 11 locales × (no raw key signed out and
signed in, shard keys mirrored) (22); Arabic RTL mirrored arrow, no physical left/right, route in
`(public)` not `(app)`, `/delete-account` resolves native (4).

The no-network guard is imported first; every test that reaches the confirm step asserts
`invoke` was called exactly with `('request-account-deletion', { body: {} })` on the mock, or not
at all.

## Not verified on staging

Not verified on staging: device runtime deferred to G1 (Maestro + simulator/emulator screenshots +
parity vs the 390×844 read-only staging page, the final dialog never confirmed). Recorded in
`staging-tests.json` `deferred_g1`, `next_actor: owner`.

## Deviations from the web page (small, deliberate)

1. Web's hardcoded English error fallbacks ("Something went wrong. Please try again.", "Request
   failed", "Deletion failed") become one catalog key `deleteAccountNative.errorFallback` (no
   hardcoded user-visible text). A server-provided error message is still shown as is.
2. The confirm description adds a space between the highlighted `DELETE` word and "below to confirm…";
   the web JSX renders them run together.
3. The typed check stays the web's literal `DELETE` in every locale (the German `screens.legal.delete`
   label reads "LÖSCHEN" on the web too); changing that is a product decision, not this port's.
4. Test-only: the test file unrefs React Query's timers (`timeoutManager.setTimeoutProvider`). After a
   successful deletion the AuthProvider's `signOut` calls `queryClient.clear()` while mounted, which
   leaves an orphaned tenant-registry query whose 24 h gc timer kept jest from exiting. No assertion
   changes and no shared helper is touched.
