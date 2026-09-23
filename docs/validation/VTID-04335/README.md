# VTID-04335 — One Customer Support area for members; ticket numbers everywhere

Slice 5 ("Member screens") of `exafyltd/vitana-platform`
`docs/CUSTOMER-SUPPORT-REBUILD-BRIEF.md` §2.5 / §3.1 / §3.4, plus the vitana-v1
half of slice 4 (the admin drawer shows `linked_vtid`).

## Acceptance criteria → tests

| AC | What | Evidence |
|---|---|---|
| AC-1 | One member ticket list (`src/components/support/MyTicketsList.tsx`) reading `GET /api/v1/feedback/tickets/mine`, used by Support → My tickets (mobile + desktop), Talk to Vitana and the Diary list | TEST: `src/components/support/MyTicketsList.test.tsx` › "reads /api/v1/feedback/tickets/mine and shows every ticket number"; TEST: `src/lib/feedback-ticket.test.ts` › "Talk to Vitana uses the shared ticket list…" |
| AC-2 | One status vocabulary: received → under review → being fixed → fixed / won't fix / duplicate (`TICKET_STATUS_MAP`); unknown statuses never leak | TEST: `src/lib/feedback-ticket.test.ts` › "member status vocabulary (VTID-04335)"; TEST: `MyTicketsList.test.tsx` › "renders the member vocabulary, not internal statuses" |
| AC-3 | Resolved tickets show the answer and confirm / reopen; drafts are never shown | TEST: `MyTicketsList.test.tsx` › "shows the answer and confirm/reopen only on a resolved ticket"; TEST: `feedback-ticket.test.ts` › "shows an answer only once resolved, never a draft" |
| AC-4 | `?ticket=<id or FB-number>` highlights + scrolls to the ticket (also beyond the first page) | TEST: `MyTicketsList.test.tsx` › "highlights and scrolls to the ?ticket= deep link", "finds a deep-linked ticket beyond the first page" |
| AC-5 | `feedback_ticket_resolved` notification registered and deep-links to the specific ticket | TEST: `src/lib/notification-types.ticket.test.ts` |
| AC-6 | Diary list stops reading/deleting `user_feedback_reports`; shows bug/UX tickets from the shared list | TEST: `feedback-ticket.test.ts` › "the Diary list no longer reads or deletes user_feedback_reports"; TEST: `MyTicketsList.test.tsx` › "filters by kind" |
| AC-7 | No support/feedback screen falls back to the deleted GCP gateway; canonical helper `src/lib/gateway-base.ts` | TEST: `src/lib/gateway-base.test.ts`; TEST: `feedback-ticket.test.ts` › "no support/feedback screen falls back to the dead GCP gateway" |
| AC-8 | Desktop Support page is real: contact form posts (surface `support`), shows the returned ticket number + link, "Report by voice" opens the ORB, mock data removed | TEST: `feedback-ticket.test.ts` › "the desktop Support page has no mock tickets and a real submit", "buildSupportContactBody (VTID-04335)"; screenshot `support-contact-submitted-desktop.png` |
| AC-9 | Mobile Support has a "My tickets" tab (`?tab=tickets`), and Contact shows the returned ticket number + "View ticket" | screenshots `support-my-tickets-mobile.png`; code `MobileSupport.tsx` (success card) |
| AC-10 | Diary recorder + capture card show the returned FB number after submit | code `FeedbackRecorder.tsx`, `UnifiedCaptureCard.tsx` (`created-ticket-number`) |
| AC-11 | No hardcoded English in Talk to Vitana / Diary list / desktop Support; new `supportTickets` namespace in all 11 shipped locales (DE first, du-form); Talk to Vitana tab highlights | `src/i18n/*/supportTickets.json`; `i18n-register-check --all` 0 violations; `i18n-long-words --locale=de` 0; screenshot `talk-to-vitana-desktop.png` (tab active) |
| AC-12 | Admin drawer + admin list show `linked_vtid` next to the ticket number (FB → VTID → finding chain), rendered defensively | screenshots `admin-feedback-list-expanded-desktop.png`, `admin-drawer-linked-vtid-desktop.png` |
| AC-13 | RTL (Arabic) lays out right-to-left | screenshots `support-my-tickets-ar-rtl-desktop.png`, `support-my-tickets-ar-rtl-mobile.png` |

## How the screenshots were made

Local Vite dev server (`npm run dev -- --host 127.0.0.1`), Chromium via
Playwright with **every non-127.0.0.1 request intercepted**: a fake local
session (`fake-member@example.invalid`, never a real account), a fake `/mine`
payload, fake admin ticket payloads, and a stubbed `POST /feedback/tickets`
answering `FB-2026-09-000200`. Nothing was read from or written to any live
system. Desktop 1400×900, mobile 390×844. The "Präsenz Debug" box is the
dev-only presence overlay.

## Not done / follow-ups

- `/mine` does not return the report text (`raw_transcript`); the list
  renders it only if the gateway adds it.
- `linked_vtid` needs VTID-04333 on the gateway; until then the chip is simply
  absent.
- Mobile Support's Contact tab only shows its text box after a voice
  recording, so the mobile "ticket number after submit" card was not
  screenshotted (code path shared with desktop, which was).
- The admin drawer's existing English copy (pipeline labels) is unchanged —
  admin-facing, out of scope here.
