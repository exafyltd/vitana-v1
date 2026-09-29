# VTID-04436 — app copy for Outlook and iPhone calendar push

The gateway half is `exafyltd/vitana-platform` #3642. With it, the Outlook and
Apple (iCloud) calendar switches also write the member's Vitanaland entries
into a calendar named "Vitanaland" in their account. This PR brings the
screen's text in line with that, in all eleven locales.

- **Outlook Calendar and Apple Calendar (iCloud)** now use the same line as
  Google Calendar: "See and add events, kept in step with Vitanaland". The old
  line was "See events and show busy times".
- **The turn-off dialog for a calendar** adds one sentence: the "Vitanaland"
  calendar stays in the member's account, and they can delete it there.

AC-1: Both calendar rows use the translated Google Calendar line in every locale, and the German text is du-form.
TEST: src/components/settings/connected-apps/MailCalendarContactsPanel.test.tsx › mailhub strings

AC-2: The turn-off dialog shows the new sentence. Checked on mobile in German, on desktop in English, and on mobile in Arabic (right-to-left). There is no horizontal scroll, the hub is stubbed, and remote writes were aborted.
- Screenshots: outputs/*-1-list.png, *-5-turn-off-dialog.png
- Harness: outputs/verify-connected-apps.cjs
