# VTID-05650 — public entry (native-wave2-fix-forward-r2/public-entry)

## What changed
- `apps/mobile/app/index.tsx`: signed-out users get the storefront (`PublicLandingScreen`, VTID-05451) at `/`; signed in goes to `/home`; loading shows the loader.
- `apps/mobile/src/linking/link-router.ts`: an invite link also navigates to `/i/<code>` as soon as a navigator is attached, with no sign-in hold (`heldPublic` / `flushPublic`). `held` / `flush()` for every other link are unchanged.
- `apps/mobile/parity/ledger.json`: `PUBLIC.LANDING` `not_started` → `native`; the `{ "path": "/" }` entry removed from `native_only`.
- New tests: `tests/public-entry/invite-cold-start.test.ts`, `tests/public-entry/landing.test.tsx` (red on base, `red-on-base.txt`). `tests/index.test.tsx` signed-out case moved to the storefront.

## Owner decision 4 (final, 2026-11-08): the two landing-page test updates
> "You may update the 2 landing-page tests, limited to their landing-page assertions. The PR description must list each old and new assertion."

| File | Old assertion | New assertion |
|---|---|---|
| `apps/mobile/tests/resolve-link.test.ts` (case `auth / OAuth / invite links go to N3 handlers, not to the router, even signed out`) | `expect(nav).not.toHaveBeenCalled();` | `expect(nav).toHaveBeenCalledTimes(1);` and `expect(nav).toHaveBeenCalledWith('/i/inv1');` (plus one comment line). The reset-password and OAuth links still do not navigate: the navigator is called exactly once, for the invite only. The auth handler / invite handler / `heldHref()` assertions are unchanged. |
| `apps/mobile/tests/public/i18n-routes.test.tsx` (ledger case for `PUBLIC.LANDING`) | `it('PUBLIC.LANDING stays not_started until a cold \`/\` mounts the storefront (app/index.tsx, plan amendment)')` with `status: 'not_started'` | `it('PUBLIC.LANDING is native: a cold \`/\` mounts the storefront (app/index.tsx, VTID-05650)')` with `status: 'native'`. The `it()` title is part of this landing assertion and would be false otherwise. |

No other case in either file is touched. The title of the `resolve-link` case was left as on `origin/main` because it is not a landing assertion.

## Lane scope
Both files are outside this lane's `paths`; Lane scope [required] is red for exactly these two files. See `scope.json`. The legal fix is the lane-admin plan `plan(native-lane-paths-owner-20261108)` in vitana-platform. Nothing is bypassed.

## Not done here (G1, owner)
Device cold-start invite and storefront screenshot parity. See `staging-tests.json`.
