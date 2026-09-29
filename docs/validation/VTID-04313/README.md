# VTID-04313 — Diary reports into the unified ticket pipeline; Talk to Vitana crash fixed

Step 7 (frontend) of `exafyltd/vitana-platform` `docs/INTAKE-CHANNELS-PLAN.md`.

## Talk to Vitana crashed for anyone with a voice or resolved ticket

`tickets.map(t => …)` shadowed the i18n `t()`, so `t('screens.community.viaVoice')`,
the "handled by" line and the "did it work?" box called the ticket object:
`TypeError: t is not a function`. The page fell into the error boundary
("Something went wrong") whenever a ticket had `voice_origin`, a
`resolver_agent`, or status `resolved` — i.e. for almost every member who
ever reported something by voice. `tsc` on `main` already reported it
(`TalkToVitana.tsx(238): This expression is not callable`).

- `before-main-crash-mobile.png` — unmodified `main`, same mocked data: 3× `t is not a function`, error boundary.
- `after-card-mobile.png` / `after-card-desktop.png` / `after-page-desktop.png` — this branch: ticket renders, with the new "Unsere Antwort" block showing the resolution.

Rendered on a local Vite dev server with **every** non-localhost request
intercepted by Playwright (fake session, fake `/mine` payload) — nothing was
read from or written to any live system. The "Präsenz Debug" box is the
dev-only presence overlay.

## Diary recorders → feedback_tickets

`FeedbackRecorder` and `UnifiedCaptureCard` posted to the legacy
`/api/v1/voice-feedback/submit` (`user_feedback_reports`), which nothing
downstream reads. They now post to `/api/v1/feedback/tickets` through
`src/lib/feedback-ticket.ts` (kind `bug` / `ux_issue`, severity and
attachments in `structured_fields`). The Diary list shows both new tickets
and legacy reports (legacy rows stay deletable; ticket rows are not
deletable by the member). The 5 legacy rows are left in place as history
rather than copied: they are Feb–Jun reports, and copying them would start
triage, spec drafting and notifications for stale issues.

## Tests

`src/lib/feedback-ticket.test.ts` (7). Full `vitest run`: 139 files / 762
tests pass. `npm run build` passes. `tsc` on the touched files reports only
errors that also exist on `main` (SubNavigation props, a test file).
