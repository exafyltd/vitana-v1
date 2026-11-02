# Verification — VTID-05432 (native-wave2-profile-settings-r2 / support-connectors)

Native Wave 2 support-connectors lane: the member `/support` surface, the `/connectors`
directory and the `/settings/connected-apps` redirect, ported to native. All commands ran
offline (no network in tests; the native app has no production profile). Linux, worktree
`vitana-v1/.worktrees/native-wave2-profile-settings-r2-support-connectors`, base
`origin/main` a41e89a0d. Every command and its counts: `commands.log`.

**Not verified on staging:** device runtime and the real OAuth round-trip are deferred to
G1 (`next_actor: owner`); this cluster is all write surfaces, so build-time proof is the
mocked-gateway unit tests in `apps/mobile/tests/support/` (requirements R5.2).

## What was built

- `apps/mobile/src/screens/support/SupportScreen.tsx` + `app/(app)/support.tsx` — twin of
  `src/pages/MobileSupport.tsx` (mobile): the `tab` param with the web's `TAB_ALIASES`
  selects Contact (default), My tickets, FAQs or Community; `?ticket=` opens My tickets with
  that ticket highlighted; the mode pill writes `?tab=` back. Contact builds the
  `POST /api/v1/feedback/tickets` body with a native twin of `buildSupportContactBody`; the
  success card shows the ticket number and "View ticket". Quick contact: email (`mailto:`),
  report by voice (ORB hand-off via `src/ports/support.ts`; the web's `orbUnavailable` error
  until the native ORB registers), call (disabled, as on the web).
- `apps/mobile/src/screens/support/MyTicketsList.tsx` — twin of
  `src/components/support/MyTicketsList.tsx`: `GET /feedback/tickets/mine?limit=100`, the
  six-word member status, the timeline, the answer once resolved, confirm / reopen (POST),
  show more, highlight.
- `apps/mobile/src/screens/support/ConnectorsScreen.tsx` + `app/(app)/connectors.tsx` — twin
  of `MobileConnectedAppsView.tsx`: the ten `CONNECTOR_TABS` pills, search, connection
  summary, collapsible category sections (`IntegrationSection.tsx`), the detail sheet, live
  wearable / AI-provider / social-connection state, the session-expired banner.
- `apps/mobile/src/screens/support/MailHubSection.tsx` — twin of
  `MailCalendarContactsSection` + `MailCalendarContactsPanel`: one switch per hub app;
  connect (`return: 'mobile'`) with the consent URL handed to `openConsentUrl`, the Apple ID
  + app-password sheet, the turn-off sheet (with "remove contacts"), sync now.
- `apps/mobile/src/screens/support/AgentChannelsPanel.tsx` — twin of `VaeaChannelsPanel`
  (list, pause/resume, remove, add form).
- `apps/mobile/src/screens/support/data/{tickets,connectors}.ts` — the class-B web hooks and
  clients re-implemented on the native gateway fetch (plan decision 2; no `@vitana/core`
  change). `format.ts` — `Intl` twins of the web locale-format helpers.
- `apps/mobile/app/(app)/settings/connected-apps.tsx` — `Redirect` to `/connectors` keeping
  the query, as the web `RedirectPreservingSearch` does.
- `apps/mobile/src/ports/support.ts` (new port), `src/ports/ui.tsx` (re-exports Accordion,
  Checkbox, Collapsible, Select, Switch, Textarea and 20 lucide glyphs), `src/navigation/resolve.ts`
  (`/connectors`, `/settings/connected-apps`, `/support` in `NATIVE_ROUTES`).
- `src/i18n/*/supportNative.json` — 67 new keys, DE first (du-form), all 11 locales; the
  web's existing `mobilesupport.*`, `supportTickets.*`, `connectedApps.*`, `mailhub.*`,
  `screens.business.*`, `screens.settings.*`, `toasts.*` keys are reused.
- `apps/mobile/parity/ledger.json` — the 14 rows `not_started` → `native`.
- `apps/mobile/maestro/support/README.md` — the G1 flows (deferred).

## Red → green

`red-on-base.txt`: the lane's tests on origin/main — `routes.test.ts` 31/31 fail (rows
`not_started`, paths resolve to `unported`, route files missing); the three screen suites fail
because the screens do not exist. On the lane head: `npx jest tests/support` 4 suites, 158 tests
pass.

## Decisions taken (inside the plan) and deviations from the web screen

1. **Typed contact form, no microphone or attachments.** The web Contact tab records voice
   (MediaRecorder / Web Speech + backend STT) and attaches images. The native app ships no audio
   recorder or image picker, and adding one is a dependency outside the lane paths. The native form
   uses the web's typed-contact strings (`supportTickets.support.contactTitle / messageLabel /
   messagePlaceholder`) and sends `entry_method: 'text'`, no attachments. Voice capture and
   attachments belong to the G1 device pass.
2. **Not ported yet (follow-ups):** the AI-assistant key-paste modal (ChatGPT / Claude), the
   DoctorBox consent dialog, the social import dialog, the Google live-verification dialog, the
   "Connected AI" section (`ConnectedAiSection`), the "Add app" popup and the calendar button in
   the toolbar. Connect on those rows shows the web's generic "connection coming soon" toast;
   a connected Google / YouTube row shows "linked to <account>". No request is sent for them.
3. **OAuth is a one-way hand-off.** Google / YouTube connect GETs
   `/social-accounts/connect/<provider>?return=mobile` and the hub connect POSTs
   `return: 'mobile'`; the consent URL goes to `openConsentUrl` (system browser). The return leg
   and any real round-trip are G1. Tests replace the opener.
4. **Android contacts** show the web's "open it on your Android phone" help: the native app has
   no contact picker (the web's `contactPickerSupported() === false` branch).
5. **Web hard-coded English moved to the catalog.** The integration sub-lines, the shopping status
   labels, the demo "last sync" labels, the mode-pill fallbacks and the Autopilot "Close" label are
   `supportNative.*` keys. Autopilot errors show a catalog string, not the raw backend message.
6. **`/settings/connected-apps` redirects** (design §2c default).
7. Tests live in `apps/mobile/tests/support/` (jest roots at `tests/`).

## Deferred to G1 (owner gate; not a merge blocker)

Maestro `apps/mobile/maestro/support/*.yaml`, simulator / emulator screenshots, parity vs the
390×844 read-only staging `/support` (each tab) and `/connectors` (each category), and the OAuth
return leg — isolated G1 environment only (`staging-tests.json` `deferred_g1`).
