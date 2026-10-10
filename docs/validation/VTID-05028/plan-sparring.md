# VTID-05028 — plan sparring record

- **Plan:** P5 — Make sure every active member actually gets their notifications. This VTID is workstream **W2** (vitana-v1); W1 and W3 are separate VTIDs in exafyltd/vitana-platform and share this sparring record and plan hash.
- **Plan hash (sha256 of the text between the plan markers, trimmed):** `c917a73724cce4442b08689e0b452ef6a224a12794dc42425521833c26c12677`
- **Sparring session:** `plan_sparring_sessions.id = bd9b0eb6-98c6-4ff0-b5a0-0c50ac30b439`
- **Partner:** `plan-sparring-partner` agent (independent, read-only; saw only the plan and the code)
- **Verdict:** CONVERGED (round 2)
- **Owner approval:** d.stevanovic@exafy.io in the Claude Code session, 2026-10-10 — "Make the decisions yourself and move on" (Gate 1, decisions delegated to the planner).

## Final plan

<!-- plan:begin -->
**Change class:** standard (migration, routes, frontend)
**Repos:** exafyltd/vitana-platform (W1, W3), exafyltd/vitana-v1 (W2)
**Three VTIDs, one per workstream.** Owner delegated the decisions on 2026-10-10 ("Make the decisions yourself and move on").

## Evidence (production, read-only, 2026-10-08 16:00–17:00 UTC fan-outs, first data with VTID-04962 `push_outcome`)
- 474 push-eligible rows: `delivered_appilix` 132 (66 members), `no_device` 324 (162), `fcm_error` 18 (9), `delivered_fcm` **0**.
- Re-cut by member activity (notification read / app session / chat message): active 7 d → 14/17 reached (82 %); active 30 d → 29/45 (64 %).
- The 153 `no_device` members have **no** device row at all; 123 dormant ≥ 90 d. 13 of them are active 30 d and never registered a device (none read an in-app notification in 30 d).
- 3 active `fcm_error` members are browser users (Chrome Android / Windows) — browser push depends on FCM, which is 0/18.
- Appilix is the only working channel. FCM project `lovable-vitana-vers1` (decommissioned GCP) delivers nothing.

## Decision on FCM (not built here)
The owner-approved native-app program (vitana-v1 `docs/programs/native-app/NATIVE-APP-PLAN.md`, VTID-05021) already owns this as **hard gate G2**: "prove FCM delivery from that project works … or provision a new Firebase project and migrate the gateway sender (and web push)". The data above answers G2: it does not work → new Firebase project. P5 does not duplicate that; it hands G2 the evidence. Creating the Firebase project needs Google-account access (owner action).

## W1 — Reach is measured and alarmed (vitana-platform)
- Migration: SQL function `push_reach_active(p_days int default 7)` (SECURITY DEFINER, `search_path=public`, EXECUTE to `service_role` only) returning `{active, eligible, reached}`:
  - `active` = members with a notification `read_at`, a `user_device_session_log.started_at`, or a sent `chat_messages` row in the window, excluding `notification_test_actors` and `service_bot_accounts`. (`user_device_session_log` already captures passive app opens, so readers who never post are counted; device-token refresh is deliberately NOT an activity signal — it would count only members who already have a device and bias reach upward.) Postgres-only SQL, no Supabase-specific features, so it runs unchanged on Aurora.
  - `eligible` = active members with ≥1 `user_notifications` row in the window whose `push_outcome` is not NULL and not `suppressed_*`.
  - `reached` = eligible members with ≥1 `delivered_*` outcome in the window.
- `GET /api/v1/ops/health/push-dispatch` adds `active_reach_7d: {active, eligible, reached, ratio}`; `degraded` with reason `active_member_reach_low` when `eligible >= 10 && ratio < 0.9`. Backlog and FCM-error logic unchanged and checked first. If the RPC errors, the field is omitted (no false alarm, no crash) — same pattern as `loadPushOutcomes`.
- Tests: Jest for the evaluator thresholds; the migration lints/parses; a staging HTTP check that `active_reach_7d` is present.

## W2 — App members get registered (vitana-v1)
- **Label race fix** (`src/lib/pushNotifications.ts`): today three call sites register an Appilix native token through the plain `registerTokenWithBackend()` (UA label) — `subscribe()` (~L161, after a non-blocking `registerAppilixDevice()` at ~L114), the 30-min refresh monitor's Appilix branch (~L388), and the `appilix:fcm_token` listener (~L419). All three change: inside Appilix the token is registered once, by `registerAppilixDevice()` (awaited), with the `Appilix …` label. Browsers unchanged. Vitest asserts mechanically that `registerTokenWithBackend` is never called while `isAppilix()` is true, for each of the three paths.
- **"Turn on notifications" card** inside the Appilix app only, shown on the inbox/notifications screen when the signed-in member has no live `user_device_tokens` row after the registration attempt (read with the same RLS-scoped `user_device_tokens` select pattern `PushDiagnostics.tsx` uses (incl. its `(supabase as any)` cast), plus a NEW `.is('revoked_at', null)` filter that PushDiagnostics does not have). Copy explains enabling notifications for the app in phone settings; a "Try again" button re-runs `subscribe()` and re-sends the Appilix identity. Dismissible for 7 days (localStorage, try/catch). No card in browsers (web push is blocked on G2).
- i18n: DE first, EN, then the other 9 GA locales via `scripts/translate-keys.mjs` (marked `_pending_review`); logical CSS properties (RTL).
- Tests: Vitest — Appilix path registers once with the Appilix label and never calls the plain registration; card visibility matrix (Appilix + no token → shown; token present / browser / dismissed → hidden). Staging: existing smoke + `existing` Vitest entry (staging cannot emulate the Appilix bridge; read-only).

## W3 — Email backstop for undelivered important notifications (vitana-platform), ships OFF
- Migration: nullable `user_notifications.email_fallback_sent_at timestamptz` + partial index `(user_id, created_at) where email_fallback_sent_at is null and push_outcome in ('no_device','fcm_error')`.
- In-process job every 15 min, production only (`sharedDbLoopAllowed('EMAIL_FALLBACK_STAGING_OVERRIDE')`, never on staging), gated on `EMAIL_FALLBACK_ENABLED === 'true'` **and** `isResendConfigured()` (existing `services/email/resend-mailer.ts`). Unconfigured → loop not started, logged.
- Selects rows: `push_outcome in ('no_device','fcm_error')`, `read_at is null`, `email_fallback_sent_at is null`, created 1–24 h ago, type in an explicit allowlist (`new_chat_message`, `reminder_due`, any `priority in ('p0','p1')`). Groups by member → **one digest email per member**, at most one per 6 h (checked as `max(email_fallback_sent_at)` over that member's `user_notifications` rows).
- Skips: no confirmed email, `notification_test_actors` / `service_bot_accounts`, member has push disabled for everything (`push_enabled=false` is a deliberate opt-out → no email either), there is NO existing email opt-out column (verified: none in the gateway or migrations), so W3 adds one: nullable `user_notification_preferences.email_fallback_enabled boolean default true` in the same migration; `false` → skip. Exposing a toggle in settings UI is out of scope (follow-up); until then the only opt-outs are `push_enabled=false` and this column.
- Copy via the gateway catalog `tt()` — it covers all 11 GA locales (`GatewayLocale` in `i18n/catalog.ts`; fallback locale → EN → DE). New keys: DE + EN real translations; the other 9 locales via the existing catalog localizer, else fall back to EN by design, du-form, subject + list of up to 5 items (title only, never message bodies) + link to the app's notifications screen + link to notification settings. No tracking pixels.
- Stamps `email_fallback_sent_at` only after Resend returns `sent`; failures logged and retried next tick (max 24 h window).
- Wiring: NOT in the deploy workflows in this plan (the staging workflow hard-fails on a missing secret). Owner action: put the Resend key in Secrets Manager; a follow-up VTID wires `RESEND_API_KEY`/`EMAIL_FROM`/`EMAIL_FALLBACK_ENABLED` with a describe-secret guard. Until then the code is inert.
- Tests: Jest — selection, grouping, 6 h cap, every skip rule, stamp-after-send, inert when unconfigured, never on staging; catalog keys exist in DE/EN.

## Out of scope
- FCM migration / new Firebase project (G2 of VTID-05021).
- Browser web push replacement.
- Dormant members (≥ 90 d) — W3 covers them only for allowlisted types and only if they have an email.

## Rollback
W1: revert (function harmless). W2: revert frontend. W3: flag off / revert; columns nullable.
<!-- plan:end -->

## Sparring rounds

Findings below are condensed; the partner's verbatim findings are stored in sparring session `bd9b0eb6-98c6-4ff0-b5a0-0c50ac30b439`.

### Round 1 — NOT CONVERGED (3 majors)
- **F1 [major]** W3 relies on an email opt-out column on `email_events` that does not exist.
- **F2 [major]** The 30-min refresh monitor's Appilix branch (`pushNotifications.ts` ~L388) also registers the native token through `registerTokenWithBackend()` (UA label); the plan only covered `subscribe()`.
- **F3 [major]** The `appilix:fcm_token` listener (`pushNotifications.ts` ~L419) does the same; not covered either.
- **F4 [minor]** Confirm the gateway `tt()` catalog covers every GA locale for the W3 email copy.
- **F5 [minor]** Suggested changing the W1 activity signal (dropping/replacing `user_device_session_log`).
- **F6 [minor]** The W3 6-hour cap must state how "last sent" is computed.
- **F7 [minor]** W2's `user_device_tokens` read: match the existing typed-client workaround used elsewhere.

### Round 2 — CONVERGED
All three majors closed by the plan changes below; minors answered. No new blocker or major.

## Planner responses — round 1
- **F1** — ACCEPTED. W3 adds a new nullable `user_notification_preferences.email_fallback_enabled boolean default true` column in its own migration; `false` → skip. Settings toggle is a follow-up.
- **F2 / F3** — ACCEPTED. All three call sites (`subscribe()`, refresh monitor, `appilix:fcm_token` listener) are covered: inside Appilix the token is registered once, by an awaited `registerAppilixDevice()` with the `Appilix …` label. A Vitest assertion checks mechanically, per path, that `registerTokenWithBackend` is never called while `isAppilix()` is true.
- **F4** — ANSWERED. `tt()` covers all 11 GA locales (`GatewayLocale` in `i18n/catalog.ts`; fallback locale → EN → DE).
- **F5** — REJECTED. `user_device_session_log` stays as an activity signal: it captures passive app opens, so readers who never post or read a notification are still counted. The suggested alternative (device-token refresh) would count only members who already have a device and bias reach upward.
- **F6** — ACCEPTED. The cap is checked as `max(email_fallback_sent_at)` over the member's `user_notifications` rows.
- **F7** — ACCEPTED. W2 uses the same `(supabase as any)` cast `PushDiagnostics.tsx` uses, plus a new `.is('revoked_at', null)` filter.

## W2 implementation notes (this PR)
- `src/lib/pushNotifications.ts` — the three Appilix registration paths call an awaited `registerAppilixDevice()`; `registerTokenWithBackend()` runs only outside Appilix.
- `src/components/notifications/TurnOnNotificationsCard.tsx`, mounted in `NotificationsPanel.tsx` (the bell dropdown and the mobile drawer's notifications dialog).
- i18n: `screens.notifications.turnOn*` — DE first (du-form), EN, then es/sr/fr/pl/pt/ru/tr/zh/ar written by the planner and flagged `_pending_review`.
- No What's New entry: improvement to an existing feature.
