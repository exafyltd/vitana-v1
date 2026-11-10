# VTID-05683 — native-wave1-readiness-tests/push: acceptance

**Readiness statement.** These tests are readiness evidence only. They do not prove the Wave 1 exit ("signed-in G1 member
navigates the full shell in all modes, receives a push and opens its deep link, on both platforms",
`NATIVE-APP-PLAN.md:196`), which needs G1 (`NATIVE-APP-PLAN.md` §5, §2a). Skipped cases are not counted toward the exit,
and neither are the passing ones.

Change types: Tooling/docs (new test files only). No source, existing test, helper, config or dependency changed.

## Cases added (running: 39 passed in 4 suites; skipped: 4)
Folder `apps/mobile/tests/wave1-readiness/push/`.
- **P1 `push-lifecycle.test.tsx` (7):** `usePushLifecycle` (`registration.ts:205`): token refresh calls `registerPushToken(session, token)` (also with a null session); sign-in syncs the badge with that session, sign-out does not; AppState `active` syncs, `background`/`inactive` do not; `active` signed out calls `syncBadge(null)`; unmount unsubscribes provider refresh, session listener and AppState; Noop provider with the real client mounts/unmounts safely.
- **P2 `push-timeout.test.ts` (6):** `PUSH_TIMEOUT_MS` is 10000; `registerPushToken`, `unregisterPushToken` (token kept) and `syncBadge` (no badge set) return `{ status: 'error' }` on a never-resolving fetch; a rejecting fetch is a result value; with fake timers the default timeout is pending at 9999 ms and errors at 10000 ms.
- **P3 `push-open-routing.test.tsx` (18, `it.each` expanded):** `useLinkRouting`: cold start, live open, https web-host URL, `open_link_url` fallback, `url` precedence; foreign host / `javascript:` / protocol-relative / no url / empty payload open home (5); foreign cold start opens home; rejected `getInitialOpen` swallowed; signed-out open held and replayed once after sign-in; cold-start held and replayed; latest held wins; unmount removes the listener and detaches the navigator; late cold-start after unmount ignored; Noop provider navigates nothing.
- **P4 `g1-test-provider.test.ts` (8):** defaults, `android` override and custom token, provider port, `pushOpen` shape, `registerToken` URL/method/headers/body, non-JSON body answered `null`, timeout rejection.

## Skipped, needs G1 / G2 (NOT counted toward the Wave 1 exit) — P5
- `g1-test-provider.test.ts`: "a token POST is recorded by the G1 test backend for the signed-in member" — needs G1 (isolated test backend).
- `g1-test-provider.test.ts`: "a notification is delivered by APNs or FCM to a device and its tap opens the deep link" — needs G2 (Firebase push project).
- `g1-test-provider.test.ts`: "the app badge shows the unread count read from the G1 backend for a real member" — needs G1.
- `push-open-routing.test.tsx`: "tapping a delivered notification on a device opens its deep link" — needs G2.

## Findings (source differs from the web contract or between its own parts; recorded, not asserted as correct, not fixed)
1. **Two token wire shapes.** `createG1TestPushProvider.registerToken` posts `{ token, device_type: 'ios'|'android' }` (`src/push/g1-test-provider.ts:105`); `createPushClient.registerPushToken` posts `{ fcm_token, device_type: 'ios_native'|'android_native', app_version }` (`src/push/registration.ts:108`). The G1 smoke over the fixture therefore does not exercise the production body. P4 pins only the test provider's body.
2. **Foreign push payload opens home even when signed out.** `dispatch` calls `navigate?.(HOME_HREF)` for an unresolvable link before any session check (`src/linking/link-router.ts:55-58`), while route targets are held until sign-in. Recorded by an "observation" case that pins current behaviour.
3. **Token refresh and foreground sync run with a null session.** `usePushLifecycle` passes `getSession()` (possibly null) to the client (`registration.ts:211`, `:217`); the client gate returns `skipped: no_session`. Pinned as current behaviour.

## Checklist (tasks.md Acceptance)
- [x] New test files only; `git diff --stat origin/main` lists only the declared paths (`commands.log`).
- [x] No source file, existing test/helper, `package.json` or lockfile changed.
- [x] P4 pins `{ token, device_type }` and the `fcm_token` difference is recorded (Finding 1).
- [x] G1/G2 skips (P5) are `it.skip` with `// needs G1 …` / `// needs G2 …`, listed above and not counted.
- [x] Red on base: `npx jest tests/wave1-readiness/push` on `origin/main` finds no tests (`commands.log`).
- [x] Not verified on staging: offline mock tests, nothing deployed.
