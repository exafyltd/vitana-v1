# VTID-05681 — acceptance (native-wave1-readiness-tests/auth)

**Readiness statement.** These tests are readiness evidence only. They do not prove the Wave 1 exit ("signed-in G1 member
navigates the full shell in all modes, receives a push and opens its deep link, on both platforms",
`NATIVE-APP-PLAN.md:196`), which needs G1 (`NATIVE-APP-PLAN.md` §5, §2a). Skipped cases are not counted toward the exit,
and neither are the passing ones.

Checked base: vitana-v1 `origin/main` e31bf4627ff3c705c20f8e6b718ce4dd03353b7f (same as the plan pin).

## Cases added (running): 169 passed, 0 failed (5 files); skipped for G1: 5
| File (`apps/mobile/tests/wave1-readiness/auth/`) | Task | Cases |
|---|---|---|
| `sign-in-helpers.test.ts` | A1 | 25 |
| `resend-confirmation.test.ts` | A2 | 8 |
| `auth-gate.test.tsx` | A3 | 30 |
| `gateway-get.test.ts` | A4 | 8 |
| `confirm-keys-i18n.test.ts` | A5 | 98 (8 keys × 11 locales, 8 du-form checks on `de`, 2 key-set checks) |
| `g1-skips.test.ts` | A6 | 5 skipped |

## Skipped, needs G1 (NOT counted toward the Wave 1 exit)
All five are `it.skip` in `g1-skips.test.ts`, each with `// needs G1 (isolated test backend): <reason>` above it.
1. password sign-in against the G1 identity provider — no provider exists before G1.
2. a session survives an app restart — needs a real G1-issued session and a restart.
3. token refresh on expiry against the G1 identity provider — needs a G1 refresh token the provider can expire.
4. sign-out revokes the server session — needs a real server-side session.
5. Apple and Google sign-in end to end — needs the providers on the G1 project (also G2 for SDK credentials).

## Findings (source differs from the web contract)
None. Every candidate assertion held on main, so none was left out. Observations, recorded as behaviour and not as defects:
- `oauthErrorKey` maps a Google cancel to `somethingWentWrong`; only Apple cancel/expiry has its own key (`sign-in.ts:73`).
  The test pins today's mapping.
- `tests/helpers/supabase-double.ts` has no `auth.resend`; `resend-confirmation.test.ts` adds it to the double inside the
  test file (helpers are not edited).
- `emailRedirectFor` / `resetRedirect` throw `ConfigMissingError`, and `resendConfirmation` builds the link before its `try`
  (`sign-in.ts:143`), so it rejects (not `{ ok: false }`) when `authRedirectUrl` is unset; `failure()` also rethrows it (`:60`). Pinned.

## Task 0 premise check (at origin/main e31bf4627)
All premises held: `jest.config.js` roots/testMatch; helper exports (`createSupabaseDouble`, `fakeSession`, `no-network`, `mocks`);
`sign-in.ts` `SignInTimeoutError:43`, `oauthErrorKey:69`, `emailRedirectFor:87`, `resetRedirect:92`, `resendConfirmation:142`;
`gateway.ts` `gatewayGet:23`; `AuthGate.tsx` `isGuestPath:19`, `useCurrentHref:24`, `AuthGate:36`, redirect `:46`/`:50`;
`post-confirm.ts` `CONFIRMATION_ERROR_KEYS:23`. `git grep -w` over `apps/mobile/tests` found none of these subjects tested
(`SIGN_IN_DEADLINE_MS` is only used for a timer in `tests/auth.test.tsx:91`; its value is now pinned).
Plan-drift note: `src/i18n/catalog-map.generated.ts` is generated and git-ignored; `npm test` generates it (`pretest`),
a bare `npx jest` needs `npm run gen:i18n` first.

## Checklist (tasks.md Acceptance, auth)
- [x] Change types: Tooling/docs (new test files only).
- [x] Locales: A5 asserts every auth error key in each of de en es sr fr pl pt ru tr zh ar, in that locale's own catalog (no fallback to `de`).
- [x] Contract: `git diff --stat origin/main` lists only `apps/mobile/tests/wave1-readiness/auth/**` and `docs/validation/VTID-05681/**`; no source, existing test, helper or `package.json` change.
- [x] Readiness only: statement above; G1 skips listed as NOT counted.
- [x] Staging proof: not verified on staging: offline mock tests, nothing deployed; evidence is the new tests and a green `npm test` (206 suites, 5790 passed, 5 skipped).
- [x] Red on base: `npx jest tests/wave1-readiness/auth` on `origin/main` finds no tests (exit 1), see `commands.log`.
