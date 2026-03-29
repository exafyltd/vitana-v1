

# Community Onboarding & Social Features — Implementation Plan

## Overview
8 new files, 6 edited files. Adds a community gateway wrapper, onboarding task dashboard, auto-completion hook, social accounts page, auto-share settings, milestone celebration modal, invite friends page, and sidebar navigation update.

---

## New Files

### 1. `src/lib/community-gateway.ts`
Reusable fetch wrapper for the community autopilot backend (`https://gateway-86804897789.us-central1.run.app`). Exports `COMMUNITY_GATEWAY` constant and `communityFetch()` that attaches JWT + `X-Vitana-Active-Role: community` header.

### 2. `src/pages/AutopilotDashboard.tsx`
"My Journey" page at `/autopilot`. Fetches onboarding tasks from `GET /api/v1/autopilot/recommendations`, shows progress bar (completed/total), renders task cards sorted (pending first, completed last). Start button activates tasks via POST, handles `navigate`/`notify` action types. Uses `AppLayout`, `StandardHeader`, `SEO`. Responsive: full-width mobile, `max-w-2xl` desktop.

### 3. `src/hooks/useAutopilotComplete.ts`
Hook exporting `completeBySourceRef(sourceRef)`. Uses module-level `Set<string>` to deduplicate. Fetches recommendations, finds matching incomplete task, POSTs complete, shows VTN reward toast. Silent on failure.

### 4. `src/pages/settings/SocialConnect.tsx`
Social accounts management page at `/settings/social`. Fetches providers (public GET) and user connections (authed). Shows connected accounts with enrichment status badges and disconnect button. Shows available providers with connect button that redirects to OAuth `auth_url`. Handles `?connected=` callback params on mount.

### 5. `src/components/MilestoneCelebration.tsx`
Global dialog component listening for `vitana-milestone` custom DOM events. Shows celebration modal with mapped emoji icon, title, body, VTN reward amount, and continue button that navigates to the event URL. Hardcoded milestone-to-icon/reward mapping (13 milestones).

### 6. `src/pages/InviteFriends.tsx`
Invite contacts page at `/invite`. Simple form (name required, email/phone optional) to build a local contact list. "Send Invites" POSTs to `/api/v1/automations/execute/AP-1303` with contacts payload. Responsive layout.

---

## Edited Files

### 7. `src/pages/settings/AutopilotSettings.tsx`
Add "Auto-Share" Card after the Frequency & Timing card. Fetches share prefs via `communityFetch('/api/v1/social-accounts/share-prefs')`. Shows switches for auto-share enabled and share milestones, provider checkboxes (facebook/linkedin/instagram), visibility select dropdown. Immediate mutation on each change.

### 8. `src/lib/pushNotifications.ts` (~line 263)
Add milestone event dispatch at the beginning of the `onForegroundMessage` callback, before the focus check. When `data.milestone` exists, dispatches `vitana-milestone` CustomEvent.

### 9. `src/pages/EditProfilePage.tsx` (~line 448-451)
Add `useAutopilotComplete` import and call `completeBySourceRef('onboarding_profile')` and `completeBySourceRef('onboarding_avatar')` in the IdentityDrawer `onOpenChange` handler when closing.

### 10. `src/pages/Community.tsx`, `src/pages/ai/Companion.tsx`, `src/pages/memory/Diary.tsx`, `src/pages/Health.tsx`, `src/pages/home/Matches.tsx`
Each gets a `useEffect` on mount calling `completeBySourceRef` with the appropriate source ref (`onboarding_explore`, `onboarding_maxina`, `onboarding_diary_day0`, `onboarding_health`, `onboarding_discover_matches`).

### 11. `src/config/role-navigation.ts` (line 20)
Insert `{ title: "My Journey", path: "/autopilot", icon: Zap, i18nKey: "sidebar.myJourney" }` as the second item in `communityNavigation` (after Home, before Community).

### 12. `src/config/navigation.ts` (line 162)
Add `{ id: "social", name: "Social Accounts", path: "/settings/social" }` to `settingsNavigation` after "connected-apps".

### 13. `src/App.tsx`
- Import `AutopilotDashboard`, `SocialConnect`, `InviteFriends`, `MilestoneCelebration`
- Add routes: `/autopilot`, `/settings/social`, `/invite` (all wrapped in `<AuthGuard>`)
- Mount `<MilestoneCelebration />` next to `<SonnerToaster />`

---

## Technical Notes
- The community gateway (`gateway-86804897789.us-central1.run.app`) is hardcoded, separate from the existing `VITE_GATEWAY_URL` autopilot gateway
- `useAutopilotComplete` uses a module-level `Set` (not React state) so it persists across remounts within the same session
- The existing `/settings/autopilot` redirect to `/assistant?tab=autopilot` is left untouched
- No database changes required — all data comes from the external gateway API

