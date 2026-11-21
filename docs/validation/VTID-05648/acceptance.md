# VTID-05648 acceptance (lane analytics)
- Change types: Integration.
- Outcome: native app reports `screen_viewed` to `/api/v1/analytics/events/batch`, shape as web, `source` ios/android. Met: `tests/analytics/client.test.ts`.
- States: signed out (anonymous), signed in (granted + hash), denied (dropped), no tenant (held), failed POST (kept), background (flush). Met: `client.test.ts`, `tracker.test.tsx`.
- Surfaces: `ShellRoot` renders one `<AnalyticsTracker />`; no UI. `tests/shell.test.tsx` unchanged and green.
- Locales / Accessibility: n/a, no text, no control.
- Contract: `{ events: AnalyticsEvent[] }`; no raw user id leaves the device.
- Staging proof: not verified on staging; covered by `npx jest tests/analytics`.
- New tests red on base (`red-on-base.txt`); no file outside `paths`.
