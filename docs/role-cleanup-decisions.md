# Decisions: Role Model Cleanup & Backlog Structure

**Status:** Approved (decisions captured during walkthrough)
**Branch:** `claude/backlog-versioning-structure-7frZn`
**Companion docs:**
- `docs/feature-catalog-by-role.md` — full inventory the audit was based on
- `docs/release-backlog-overview-screen.md` — frontend release-tracking spec
- `vitana-platform/specs/release-backlog-overview.md` — canonical platform spec

This document records the decisions made for cleaning up the role model and
the related code-hygiene issues surfaced by the feature-catalog-by-role audit.
Each decision below has a recommended fix; the actual code changes live in
separate tickets (see § "Tickets to open" at the bottom).

---

## Canonical role model (the source of truth)

MAXINA has **6 user roles**. Anything else found in code is to be removed.

| # | Role | Tier | Notes |
|---|------|------|-------|
| 1 | `community` | 1 | Default. The only role enabled on mobile. |
| 2 | `patient` | 2 | |
| 3 | `professional` | 3 | Doctors, coaches, providers. |
| 4 | `staff` | 4 | Front-desk / operators. |
| 5 | `admin` | 5 | Tenant admin (e.g. MAXINA admin). Owns Admin pages incl. release backlog. |
| 6 | `developer` | 6 | Engineering. Required for Command Hub access. |

**Inheritance:** higher tier satisfies lower-tier guards. So `developer`
satisfies every other guard; `admin` satisfies `staff`, `professional`,
`patient`, `community`; etc.

**Cross-tenant super-admin:** the existing `useTenant().isExafyAdmin`
capability bypasses all role checks. This is **not a 7th role** — it's a
tenant-level capability for Exafy staff. It coexists with the 6 roles.

**Removed:** `infra` (was in the `UserRole` union but never used). `reseller`
(was demoted to a capability stored in `reseller_profiles` table; should be
swept from any remaining doc/code references — separate ticket).

---

## Decision log

### Q1 — Command Hub access (`/dev/*`)

**Decision:** Only `developer` role and Exafy super-admin (`isExafyAdmin`)
can access Command Hub. No one else.

**Fix:**
- Replace `<DevAuthGuard>` in `src/App.tsx` with a guard that checks
  `(useRole().role === 'developer') || useTenant().isExafyAdmin`
- Remove the role-promotion hack in `src/layouts/DevLayout.tsx` (the
  user already has the right authority — promotion is a smell)
- `VITE_DEV_HUB_ENABLED` becomes a feature flag for non-prod builds, **not**
  the security boundary

---

### Q2 — `/admin/init-events`

**Decision:** Move it under `/dev/*` (e.g. `/dev/admin-init-events`) so it
inherits the Developer + super-admin guard from Q1. It's a developer
bootstrap utility — it was never an admin-product feature.

**Fix:**
- Remove the unguarded `<Route path="/admin/init-events">` from `App.tsx`
- Add `<Route path="/dev/admin-init-events" element={<InitEvents />} />`
  inside the new Command Hub-guarded `/dev/*` block
- Move `src/pages/admin/InitEvents.tsx` → `src/pages/dev/AdminInitEvents.tsx`

---

### Q3 — Mobile role policy

**Decision:** MAXINA Mobile (iOS + Android) = **Community-only**, full stop.
No admin/staff/professional/patient/developer access on phones.

**Fix:**
- Keep the existing `useIsMobile()` override in `src/hooks/useRole.tsx` that
  forces the active role to `community` on mobile
- **Document this as policy** in `CLAUDE.md` so it stops being a surprise
- Reflect in `vitana-platform/specs/release-backlog-overview.md`: the iOS
  and Android tenant surfaces only ever ship the Community feature set, so
  compatibility tracking only needs to compare against Community-scope
  platform contracts

---

### Q4 — 6 duplicate route declarations

**Decision:** In all 6 pairs, the currently-active (first) declaration is
correct. Delete the second declaration in each pair.

**Fix (single PR):** delete these `<Route>` lines from `App.tsx`:

| Route | Delete this duplicate |
|-------|----------------------|
| `/admin/community/meetups` | the `EventsModeration` declaration |
| `/admin/content/videos` | the `VideosManagement` declaration |
| `/admin/content/podcasts` | the `PodcastsManagement` declaration |
| `/admin/content/music` | the `MusicManagement` declaration |
| `/admin/notifications/sent` | the `AdminNotificationsSentLog` declaration |
| `/inbox/reminder` | the standalone `Reminder` page declaration *(the redirect to `/reminders` is correct, per VTID-02601)* |

Plus the 2 same-component duplicates (pure copy-paste): delete the second
`<Route path="/dev/oasis">` and `<Route path="/dev/pipelines">`.

**Follow-up tickets** (separate from the route cleanup):
- Port host metadata, episode number, play counts, and `useTranslation` from
  the (deleted) `PodcastsManagement` into `ContentPodcasts` before the file
  itself is deleted from disk
- Port stats cards, type/days filters, paginated `AdminTable`, and
  body/priority/read columns from the (deleted) `AdminNotificationsSentLog`
  into `NotificationsSent` (`SentNew.tsx`) before the file itself is deleted

---

### Q5 — `AdminGuard.tsx`

**Decision:** Delete `src/routes/guards/AdminGuard.tsx`. Dead code, misleading
name (requires `>= staff` despite the name), zero callers.

**Fix:** delete the file. The codebase already speaks
`<ProtectedRoute requiredRole="X">` fluently — no replacement needed.

---

### Q6 — Orphan page files

**Decision:** Delete all 26 confirmed orphan files. Also delete
`src/pages/admin/Dashboard.tsx` plus its dead `lazy()` import in `App.tsx`.

**Files to delete (27 total):**

`src/pages/community/`:
`Challenges.tsx` · `Feed.tsx` · `Matchmaking.tsx` · `Meetups.tsx` ·
`Meetups2.tsx` · `MyGroups.tsx` · `MyBusinessRenamed.tsx` · `AIInsights.tsx` ·
`LiveInteraction.tsx` · `Events.tsx`

`src/pages/admin/`:
`AIAssistant.tsx` · `Audit.tsx` · `Automation.tsx` · `Dashboard.tsx` ·
`NotificationDashboard.tsx` · `PatientRecords.tsx` · `Queue.tsx` ·
`Staff.tsx` · `StreamSettings.tsx` · `StreamSupervision.tsx` ·
`SystemHealth.tsx` · `SystemSecurity.tsx` · `TelemedicineSessions.tsx` ·
`TenantAudit.tsx` · `TenantConfig.tsx` · `UserManagement.tsx` ·
`VertexTesting.tsx`

Plus the dead `lazy()` import line for `AdminDashboard` in `src/App.tsx:256`.

**Verification step before delete commit lands** (run on a fresh checkout):

```bash
rg -l "/(Challenges|Feed|Matchmaking|Meetups2?|MyGroups|MyBusinessRenamed|AIInsights|LiveInteraction|Events|AIAssistant|Audit|Automation|Dashboard|NotificationDashboard|PatientRecords|Queue|Staff|StreamSettings|StreamSupervision|SystemHealth|SystemSecurity|TelemedicineSessions|TenantAudit|TenantConfig|UserManagement|VertexTesting)['\"]" src/
```

If that returns no hits for any of these names, the delete is safe.

---

### Q7 — Documentation + `UserRole` type fix

**Decision:** Update `CLAUDE.md` to document the canonical 6 roles + remove
`infra` from the `UserRole` union in `src/hooks/useRole.tsx`. Doc and code
must agree.

**Fix:**
- Update `CLAUDE.md` to list all 6 roles (not 5), add the inheritance
  hierarchy, the mobile policy (Q3), the Exafy super-admin behavior, and
  the Command Hub gating rule (Q1)
- In `src/hooks/useRole.tsx`: change
  `UserRole = "community" | "patient" | "professional" | "staff" | "admin" | "developer" | "infra"`
  to drop `infra`. Update the inheritance map accordingly. Remove any
  `infra`-specific branches.

---

## Tickets to open

Five immediate fixes (one per actionable area) and three follow-up tickets:

### Immediate

| # | Title | Touches | Owner suggestion |
|---|-------|---------|------------------|
| T1 | Command Hub access: Developer + Exafy super-admin only | `App.tsx`, `DevAuthGuard`, `DevLayout` | Platform / security |
| T2 | Move `/admin/init-events` under `/dev/*` | `App.tsx`, file move | Platform / security |
| T3 | Delete 6 duplicate route declarations | `App.tsx` (route lines only — no component deletes) | Frontend cleanup |
| T4 | Delete `AdminGuard.tsx` (dead code) | `src/routes/guards/AdminGuard.tsx` | Frontend cleanup |
| T5 | Delete 27 orphan page files + dead `Dashboard.tsx` import; update `CLAUDE.md`; remove `infra` from `UserRole` union | `src/pages/{community,admin}/*`, `App.tsx`, `CLAUDE.md`, `useRole.tsx` | Frontend cleanup |

### Follow-up (post-cleanup)

| # | Title | Why |
|---|-------|-----|
| F1 | Port `PodcastsManagement` features into `ContentPodcasts` | Q4 winner is leaner — preserve host/episode/plays/i18n before deleting the loser file |
| F2 | Port `AdminNotificationsSentLog` features into `NotificationsSent` | Q4 winner is leaner — preserve stats cards/filters/pagination before deleting the loser file |
| F3 | Sweep repo for any lingering `reseller` references | Already deprecated; needs a clean pass across DB/RPC/UI |
