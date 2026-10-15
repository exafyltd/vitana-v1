/**
 * VTID-05212 — in-page anchors on the Connectors screen (`/connectors`) that
 * Vitana card deep links land on: E8 Connect Calendar → `#calendar`, E9 Import
 * Contacts → `#contacts`. Both live in the Mail, Calendar & Contacts section
 * (one panel, nine apps), on desktop and in the mobile view.
 */
export const MAIL_CALENDAR_CONTACTS_ANCHOR = 'connectors-mail-calendar-contacts';

/** URL hash → element id, for `useHashScroll`. */
export const CONNECTOR_SECTION_HASHES: Readonly<Record<string, string>> = {
  calendar: MAIL_CALENDAR_CONTACTS_ANCHOR,
  contacts: MAIL_CALENDAR_CONTACTS_ANCHOR,
};
