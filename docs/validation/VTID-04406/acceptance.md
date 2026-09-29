# VTID-04406 — Connected Apps screen: a real switch for each of the nine Mail / Calendar / Contacts apps

This is the app half of the Connected Apps hub. The gateway half is
`exafyltd/vitana-platform` #3636 (VTID-04402..04405).

Before this change, the screen showed nine apps. Only the three Google ones
did anything, and only after a Google sign-in covering all of them. Apple and
Outlook logged to the console or showed "coming soon". The desktop page listed
the same apps three times, as static cards.

## What changed

- **`MailCalendarContactsPanel`** is used on both mobile and desktop. It
  renders one row per app with its status line and a switch. Everything it
  shows comes from `GET /api/v1/connected-apps`.
  - **Google and Outlook** go to the provider's consent screen, asking only for
    that app, and come back with the app on. In the app's WebView, the consent
    opens in the system browser and the screen polls until the app is on.
  - **Apple** opens a sheet that explains the app-specific password in three
    steps. The password is asked for once and covers all three Apple apps.
  - **Android** opens the phone's contact picker. Where the picker doesn't
    exist, the screen explains where to do this instead.
  - **Turning an app off** asks for confirmation first. For contacts apps the
    member can also choose to remove the contacts that were imported.
  - **Rows that sync** get a "Sync now" action. A row whose access has expired
    shows "Reconnect".
  - **An app the backend cannot serve** gets a disabled switch and the line
    "Not available yet".
- **Mobile** replaces the static productivity section with the panel, keeping
  the same collapsible header with an n/9 count.
- **Desktop** puts the panel under "Mail, Calendar & Contacts". The nine apps
  are removed from the three static card lists; WhatsApp, Telegram and Notion
  stay.
- **Strings**: a new `mailhub` shard, written German-first in du-form, in all
  eleven locales with matching placeholders.
- **Shared `Switch` fix**: in right-to-left layouts the knob slid out of its
  track. It now moves left. This affected every switch in Arabic.

## Acceptance criteria

AC-1: All nine apps render with a switch that follows the hub state, and the account is shown.
TEST: src/components/settings/connected-apps/MailCalendarContactsPanel.test.tsx › renders the nine apps

AC-2: An OAuth app hands the consent URL to the browser.
TEST: src/components/settings/connected-apps/MailCalendarContactsPanel.test.tsx › an OAuth app sends the member to the provider's consent screen

AC-3: Apple asks for an Apple ID and app-specific password once. A second Apple app turns on without asking again.
TEST: src/components/settings/connected-apps/MailCalendarContactsPanel.test.tsx › Apple asks / a second Apple app

AC-4: Turning off asks first, and removes imported contacts only when ticked.
TEST: src/components/settings/connected-apps/MailCalendarContactsPanel.test.tsx › turning off asks first

AC-5: An app the backend cannot serve has a disabled switch. On a browser without a contact picker, Android explains where to do it instead of failing.
TEST: src/components/settings/connected-apps/MailCalendarContactsPanel.test.tsx › cannot serve / Android without the contact picker

AC-6: Every `mailhub` key exists in all eleven locales with the same placeholders, the German text is du-form, and the panel uses no missing key.
TEST: src/components/settings/connected-apps/MailCalendarContactsPanel.test.tsx › mailhub strings

AC-7: The screen was checked visually against a stubbed hub on mobile (German), desktop (English) and mobile (Arabic, right-to-left).
- There is no horizontal scroll.
- The Apple sheet, the turn-off sheet and the Android explainer render correctly.
- In Arabic, the switches sit inside their tracks.
UI: outputs/mobile-de-*.png, outputs/desktop-en-*.png, outputs/mobile-ar-*.png (script: outputs/verify-connected-apps.cjs)

## How it was checked

`outputs/verify-connected-apps.cjs` signs in as the documented test user.
Sign-in's own session is the only write it makes (rule 31).

- `/api/v1/connected-apps` is served locally by `route.fulfill`, so nothing is
  connected, disconnected or synced anywhere.
- Every other non-GET request to a remote host is aborted. The run printed the
  aborted requests: telemetry, `user_preferences`, roles and presence.
