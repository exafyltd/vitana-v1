# MAXINA Feature Catalog by Role

**Status:** Draft (auto-generated from `src/App.tsx` routes + role-guard inspection)
**Branch:** `claude/backlog-versioning-structure-7frZn`
**Companion specs:**
- `docs/release-backlog-overview-screen.md` (this repo) — release/version overview screen
- `vitana-platform/specs/release-backlog-overview.md` — canonical platform spec

This document inventories **what each user role can actually do** inside the
MAXINA app — feature-by-feature, route-by-route, with the page file and any
role guard that applies. It is the role-perspective companion to the release
backlog spec.

---

## Role model

- **Source of truth:** `src/hooks/useRole.tsx` defines the union
  `UserRole = "community" | "patient" | "professional" | "staff" | "admin" | "developer" | "infra"`.
  `CLAUDE.md` lists 5 roles, but the code has **7** — `patient`, `developer`,
  `infra` are present in addition. **`CLAUDE.md` is stale on this point.**
- **Roles inherit (numeric hierarchy):**
  `community(1) < patient(2) < professional(3) < staff(4) < admin(5) < developer(6) < infra(7)`.
  `hasPermission(required)` returns true if the user's level ≥ required level.
  So **Admin satisfies every Community/Patient/Professional/Staff guard**;
  Developer/Infra satisfy Admin; Exafy admins (per `useTenant().isExafyAdmin`)
  bypass all checks.
- **Persistence:** active role per tenant is stored via Supabase RPC
  `get_role_preference` / `set_role_preference`, cached in TanStack Query under
  `["rolePref", tenantId]`. **Mobile devices are forced to `community`**
  (`useIsMobile()` override in `useRole`) — role-switching is desktop-only.
- **Guard components:**
  - `src/components/AuthGuard.tsx` — requires a Supabase session; redirects
    unauthenticated users to a tenant-scoped login (`/maxina`, `/alkalma`,
    `/earthlinks`, `/exafy-admin`, or `/`). Handles OAuth callback recovery.
  - `src/components/ProtectedRoute.tsx` — wraps `AuthGuard` children with
    `useRole().hasPermission(requiredRole)`; renders `<NotAuthorized />` on failure.
  - `src/routes/guards/AdminGuard.tsx` — convenience guard that requires
    `>= staff` (note: name is misleading; it actually grants staff+).
    **Not used anywhere in App.tsx — likely dead code.**
  - `src/components/dev/DevAuthGuard.tsx` — requires only an authenticated user
    (no role check); used to wrap `/dev/*` (gated additionally by
    `DEV_HUB_CONFIG.enabled` flag inside `DevLayout`). `DevLayout` auto-promotes
    the role to `admin` while inside Command Hub and restores it on exit.
- **Route guard pattern in `src/App.tsx`:**
  `<AuthGuard><ProtectedRoute requiredRole="X"><Page /></ProtectedRoute></AuthGuard>`.
  Many shared/community routes use only `<AuthGuard>` (no role check) — those
  are accessible to **any logged-in user**, which by hierarchy means every role.

---

## Community

Community pages are reachable by any authenticated role (since all roles
satisfy `requiredRole="community"` or have only `<AuthGuard>`). The role-specific
subdirectory is `src/pages/community/`.

| Feature | Route | Page file | Notes |
|---------|-------|-----------|-------|
| Home / dashboard | `/home` | `src/pages/Home.tsx` | Explicit `requiredRole="community"`. Legacy `/dashboard*` and `/home/*` redirect here. |
| News article reader | `/news/:id` | `src/pages/NewsArticleDetail.tsx` | `requiredRole="community"`. |
| Community hub | `/comm` | `src/pages/Community.tsx` | |
| Groups list | `/comm/groups` | `src/pages/community/Groups.tsx` | |
| Group detail | `/comm/groups/:id`, `/comm/my-groups/:id` | `src/pages/community/GroupDetail.tsx` | |
| Events & Meetups (consolidated) | `/comm/events-meetups` | `src/pages/community/EventsAndMeetups.tsx` | Old `/comm/feed`, `/comm/events`, `/comm/meetups` redirect with `?tab=…`. |
| Live rooms list | `/comm/live-rooms` | `src/pages/community/LiveRooms.tsx` | |
| Live room viewer | `/comm/live-rooms/:roomId/view` | `src/pages/community/LiveRoomViewer.tsx` | |
| Media hub | `/comm/media-hub` | `src/pages/community/MediaHub.tsx` | |
| Members directory | `/comm/members` | `src/pages/community/Members.tsx` | |
| Open asks feed | `/comm/open-asks` | `src/pages/community/OpenAsks.tsx` | |
| Find a partner (dance + fitness) | `/comm/find-partner` | `src/pages/community/FindPartner.tsx` | |
| Talk to Vitana (feedback) | `/comm/talk-to-vitana` | `src/pages/community/TalkToVitana.tsx` | |
| Other community pages (no direct route) | — | `Challenges.tsx`, `Feed.tsx`, `Matchmaking.tsx`, `Meetups.tsx`, `Meetups2.tsx`, `MyGroups.tsx`, `MyBusinessRenamed.tsx`, `AIInsights.tsx`, `LiveInteraction.tsx`, `Events.tsx` | These files exist under `src/pages/community/` but are not referenced by any `<Route>` in App.tsx — likely deprecated or used as embedded sub-views. |

---

## Patient

(Declared in code, not in CLAUDE.md's 5-role list — see Open questions.)
All under `<ProtectedRoute requiredRole="patient">`. Satisfied by patient and
above (professional, staff, admin, developer, infra).

| Feature | Route | Page file | Notes |
|---------|-------|-----------|-------|
| Patient dashboard | `/patient/dashboard` | `src/pages/patient/PatientDashboard.tsx` | |
| Patient health | `/patient/health` | `src/pages/patient/PatientHealth.tsx` | |
| Patient appointments | `/patient/appointments` | `src/pages/patient/PatientAppointments.tsx` | |
| Patient — test results | `/patient/results` | inline JSX in App.tsx | Stub placeholder. |
| Patient — care team | `/patient/care-team` | inline JSX in App.tsx | Stub placeholder. |
| Patient — health goals | `/patient/goals` | inline JSX in App.tsx | Stub placeholder. |
| Patient — insurance | `/patient/insurance` | inline JSX in App.tsx | Stub placeholder. |
| Patient — notifications | `/patient/notifications` | inline JSX in App.tsx | Stub placeholder. |

---

## Professional

All routes wrapped with `<AuthGuard><ProtectedRoute requiredRole="professional">…</ProtectedRoute></AuthGuard>`.
Staff/Admin/Developer/Infra also satisfy this guard via hierarchy.

| Feature | Route | Page file | Notes |
|---------|-------|-----------|-------|
| Dashboard | `/professional/dashboard` | `src/pages/professional/Dashboard.tsx` | |
| Patients list | `/professional/patients` | `src/pages/professional/Patients.tsx` | |
| Schedule | `/professional/schedule` | inline JSX in App.tsx | Stub placeholder. |
| Clinical tools | `/professional/tools` | inline JSX in App.tsx | Stub placeholder. |
| Referrals | `/professional/referrals` | inline JSX in App.tsx | Stub placeholder. |
| Billing | `/professional/billing` | inline JSX in App.tsx | Stub placeholder. |
| Professional profile | `/professional/profile` | inline JSX in App.tsx | Stub placeholder. |
| Continuing education | `/professional/education` | inline JSX in App.tsx | Stub placeholder. |

---

## Staff

All wrapped with `requiredRole="staff"`. Admin/Developer/Infra also satisfy.

| Feature | Route | Page file | Notes |
|---------|-------|-----------|-------|
| Dashboard | `/staff/dashboard` | `src/pages/staff/Dashboard.tsx` | |
| Queue | `/staff/queue` | `src/pages/staff/Queue.tsx` | |
| Daily tasks | `/staff/tasks` | inline JSX in App.tsx | Stub placeholder. |
| Schedule | `/staff/schedule` | inline JSX in App.tsx | Stub placeholder. |
| Reports | `/staff/reports` | inline JSX in App.tsx | Stub placeholder. |
| Communications | `/staff/communications` | inline JSX in App.tsx | Stub placeholder. |
| Staff tools | `/staff/tools` | inline JSX in App.tsx | Stub placeholder. |
| Time tracking | `/staff/time` | inline JSX in App.tsx | Stub placeholder. |

---

## Admin

All wrapped with `<AuthGuard><ProtectedRoute requiredRole="admin">…</ProtectedRoute></AuthGuard>`.
This is where the **MAXINA tenant Backlog screen will live** (per the
release-backlog-overview-screen spec): `/admin/releases` → `src/pages/admin/Releases.tsx`.

Pages live under `src/pages/admin/` plus admin sub-directories: `assistant`,
`audit`, `community`, `content`, `dashboard`, `feedback`, `insights`,
`intelligence`, `knowledge`, `live`, `marketplace`, `media`, `members`,
`navigator`, `notifications`, `overview`, `settings`, `system`, `users`,
`automation`, `autopilot`, `ai-assistant`.

| Feature | Route | Page file | Notes |
|---------|-------|-----------|-------|
| Admin root → dashboard | `/admin` | (redirect) | Redirects to `/admin/dashboard`. |
| Overview dashboard | `/admin/dashboard` | `OverviewDashboard` | |
| Overview activity | `/admin/activity` | `OverviewActivity` | Also `src/pages/admin/dashboard/ActivityFeed.tsx`. |
| Overview alerts | `/admin/alerts` | `OverviewAlerts` | |
| System health overview | `/admin/health` | `OverviewHealth` | |
| **Releases (MAXINA tenant backlog)** | `/admin/releases` | `src/pages/admin/Releases.tsx` *(new — per release spec)* | Tenant-scoped subset of Command Hub releases view. |
| Marketplace overview | `/admin/marketplace` | `AdminMarketplaceOverview` | |
| Marketplace products | `/admin/marketplace/products` | `AdminMarketplaceProducts` | |
| Members directory | `/admin/members/directory` | `MembersDirectory` | Replaces legacy `/admin/users`. |
| Members invitations | `/admin/members/invitations` | `MembersInvitations` | |
| Members roles & access | `/admin/members/roles` | `MembersRolesAccess` | |
| Members segments | `/admin/members/segments` | `MembersSegments` | |
| Members audit | `/admin/members/audit` | `MembersAudit` | |
| Assistant — personality | `/admin/assistant/personality` | `AssistantPersonality` | |
| Assistant — speeches | `/admin/assistant/speeches` | `AssistantSpeeches` | |
| Assistant — voice | `/admin/assistant/voice` | `AssistantVoice` | |
| Assistant — tools | `/admin/assistant/tools` | `AssistantTools` | |
| Assistant — routing | `/admin/assistant/routing` | `AssistantRouting` | |
| Assistant — playground | `/admin/assistant/playground` | `AssistantPlayground` | |
| Assistant — sessions | `/admin/assistant/sessions` | `AssistantSessions` | |
| Knowledge — documents | `/admin/knowledge/documents` | `KnowledgeDocuments` | |
| Knowledge — topics | `/admin/knowledge/topics` | `KnowledgeTopics` | |
| Knowledge — indexing | `/admin/knowledge/indexing` | `KnowledgeIndexing` | |
| Knowledge — search test | `/admin/knowledge/search-test` | `KnowledgeSearchTest` | |
| Knowledge — governance | `/admin/knowledge/governance` | `KnowledgeGovernance` | |
| Feedback | `/admin/feedback`, `/admin/feedback/:tab` | `AdminFeedback` | |
| Settings — profile | `/admin/settings/profile` | `SettingsProfile` | |
| Settings — branding | `/admin/settings/branding` | `SettingsBranding` | |
| Settings — feature flags | `/admin/settings/feature-flags` | `SettingsFeatureFlags` | |
| Settings — integrations | `/admin/settings/integrations` | `SettingsIntegrations` | |
| Settings — domains | `/admin/settings/domains` | `SettingsDomains` | |
| Settings — billing | `/admin/settings/billing` | `SettingsBilling` | |
| Audit — actions | `/admin/audit/actions` | `AuditActions` | |
| Audit — access | `/admin/audit/access` | `AuditAccess` | |
| Audit — events | `/admin/audit/events` | `AuditOasisEvents` | |
| Audit — policies | `/admin/audit/policies` | `AuditPolicies` | |
| Audit — data rights | `/admin/audit/data-rights` | `AuditDataRights` | |
| Audit — events root | `/admin/audit` | `AdminAuditEvents` | |
| Audit — users | `/admin/audit/users` | `AdminAuditUserActivity` | |
| Audit — APIs | `/admin/audit/apis` | `AdminAuditApiMonitor` | |
| Audit — security | `/admin/audit/security` | `AdminAuditSecurity` | |
| Community supervision (root) | `/admin/community` | `CommunitySupervision` | |
| Community — reported content | `/admin/community/reported`, `/admin/community/moderation` | `CommunityReported` / `ReportedContent` | Two routes both render reported-content. |
| Community — meetups | `/admin/community/meetups` | `CommunityMeetups` / `EventsModeration` | **⚠ Route declared twice** with different elements. |
| Community — live rooms | `/admin/community/live-rooms` | `CommunityLiveRooms` | |
| Community — groups | `/admin/community/groups` | `CommunityGroups` | |
| Community — creators | `/admin/community/creators` | `CommunityCreators` | |
| Community — invitations (groups moderation) | `/admin/community/invitations` | `GroupsModeration` | |
| Content — videos | `/admin/content/videos` | `ContentVideos` / `VideosManagement` | **⚠ Route declared twice.** |
| Content — podcasts | `/admin/content/podcasts` | `ContentPodcasts` / `PodcastsManagement` | **⚠ Route declared twice.** |
| Content — music | `/admin/content/music` | `ContentMusic` / `MusicManagement` | **⚠ Route declared twice.** |
| Content — uploads | `/admin/content/uploads` | `ContentUploads` | |
| Content — analytics | `/admin/content/analytics` | `ContentAnalytics` | |
| Content root (media management) | `/admin/content` | `MediaManagement` | |
| Notifications — compose | `/admin/notifications/compose` | `NotificationsCompose` | |
| Notifications — templates | `/admin/notifications/templates` | `NotificationsTemplates` | |
| Notifications — sent log | `/admin/notifications/sent` | `NotificationsSent` / `AdminNotificationsSentLog` | **⚠ Route declared twice.** |
| Notifications — subscriptions | `/admin/notifications/subscriptions` | `NotificationsSubscriptions` | |
| Notifications — providers | `/admin/notifications/providers` | `NotificationsProviders` | |
| Notifications — categories | `/admin/notifications/categories` | `NotificationsCategories` | |
| Notifications — root (compose) | `/admin/notifications` | `AdminNotificationsCompose` | |
| Notifications — preferences | `/admin/notifications/preferences` | `AdminNotificationsPreferences` | |
| Insights — growth | `/admin/insights/growth` | `InsightsGrowth` | |
| Insights — engagement | `/admin/insights/engagement` | `InsightsEngagement` | |
| Insights — assistant usage | `/admin/insights/assistant-usage` | `InsightsAssistantUsage` | |
| Insights — autopilot impact | `/admin/insights/autopilot-impact` | `InsightsAutopilotImpact` | |
| Insights — reports | `/admin/insights/reports` | `InsightsReports` | |
| Live overview | `/admin/live` | `LiveStreamOverview` | |
| Live — rooms | `/admin/live/rooms` | `CommunityRoomsAdmin` | |
| Live — sessions | `/admin/live/sessions` | `AdminLiveSessions` | |
| Live — attendance | `/admin/live/attendance` | `AdminLiveAttendance` | |
| Intelligence — memory | `/admin/intelligence` | `AdminIntelligenceMemory` | |
| Intelligence — embeddings | `/admin/intelligence/embeddings` | `AdminIntelligenceEmbeddings` | |
| Intelligence — signals | `/admin/intelligence/signals` | `AdminIntelligenceSignals` | |
| Intelligence — relationships | `/admin/intelligence/relationships` | `AdminIntelligenceRelationships` | |
| System — root config | `/admin/system` | `AdminSystemConfiguration` | |
| System — tenants | `/admin/system/tenants` | `TenantManagementLegacy` | |
| System — creators | `/admin/system/creators` | `AdminSystemCreators` | |
| System — bootstrap | `/admin/system/bootstrap` | `Bootstrap` | |
| Navigator — catalog | `/admin/navigator` | `AdminNavigatorCatalog` | |
| Navigator — coverage | `/admin/navigator/coverage` | `AdminNavigatorCoverage` | |
| Navigator — telemetry | `/admin/navigator/telemetry` | `AdminNavigatorTelemetry` | |
| Navigator — history | `/admin/navigator/history` | `AdminNavigatorHistory` | |
| Autopilot — planning | `/admin/autopilot/planning` | `AdminAutopilotPlanning` | |
| Autopilot — recommendations | `/admin/autopilot/recommendations` | `AdminAutopilotRecommendations` | |
| Autopilot — automations | `/admin/autopilot/automations` | `AdminAutopilotAutomations` | |
| Autopilot — runs | `/admin/autopilot/runs` | `AdminAutopilotRuns` | |
| Autopilot — guardrails | `/admin/autopilot/guardrails` | `AdminAutopilotGuardrails` | |
| Autopilot — growth | `/admin/autopilot/growth` | `AdminAutopilotGrowth` | |
| Init events (debug) | `/admin/init-events` | `InitEvents` | **⚠ No guard** — renders directly with no AuthGuard or ProtectedRoute. |
| Catch-all admin placeholder | `/admin/*` | `AdminPlaceholder` | |

Several legacy admin routes redirect to the new structure:
`/admin/users → /admin/members/directory`,
`/admin/user-management → /admin/users`,
`/admin/tenant-management → /admin/system/tenants`,
`/admin/system-health → /admin/dashboard/health`,
`/admin/monitoring/* → /admin/audit/* or /admin/notifications`,
`/admin/ai-assistant → /admin/intelligence`,
`/admin/automation → /admin/intelligence`,
`/admin/live-stream → /admin/live`,
`/admin/media → /admin/content`,
`/admin/bootstrap → /admin/system/bootstrap`.

---

## Dev (Command Hub — system-wide backlog lives here)

Mounted under one parent route at `/dev` wrapped with
`<DevAuthGuard><DevLayout /></DevAuthGuard>`. **Auth check is only "is the
user logged in?"** — there is no role check in `DevAuthGuard`. Access is
additionally gated by `DEV_HUB_CONFIG.enabled` flag (`VITE_DEV_HUB_ENABLED`);
on entry, `DevLayout` auto-promotes the role to `admin` and restores the
prior role on unmount.

This is **Vitanaland Command Hub** — where the system-wide release backlog
overview lives (per the platform spec, the Command Hub UI is hosted in
`vitana-platform`; the `/dev/*` surface in this repo is the historical
in-app Command Hub).

| Feature | Route | Page file | Notes |
|---------|-------|-----------|-------|
| Dev login | `/dev/login` | `src/pages/dev/DevLogin.tsx` | Outside the guard. |
| Dev root | `/dev` (redirects to `/dev/dashboard`) | `src/layouts/DevLayout.tsx` | |
| Dashboard | `/dev/dashboard` | `src/pages/dev/DevDashboard.tsx` | |
| Dashboard — AI feed | `/dev/dashboard/ai-feed` | `DashboardAIFeed` | |
| Dashboard — alerts | `/dev/dashboard/alerts` | `DashboardAlerts` | |
| Dashboard — system health | `/dev/dashboard/health` | `DashboardSystemHealth` | |
| Command hub | `/dev/command` | `src/pages/dev/DevCommand.tsx` | |
| Command — approvals | `/dev/command/approvals` | `CommandApprovals` | |
| Command — history | `/dev/command/history` | `CommandHistory` | |
| Command — compose | `/dev/command/compose` | `CommandCompose` | |
| Command — tasks | `/dev/command/tasks` | `DevCommand` | Reuses parent component. |
| Command — autopilot runs | `/dev/command/autopilot-runs` | `DevCommand` | Reuses parent component. |
| Agents root | `/dev/agents` | `src/pages/dev/DevAgents.tsx` | |
| Agents — worker | `/dev/agents/worker` | `AgentsWorker` | |
| Agents — validator | `/dev/agents/validator` | `AgentsValidator` | |
| Agents — QA test | `/dev/agents/qa-test` | `AgentsQATest` | |
| Agents — crew template | `/dev/agents/crew-template` | `AgentsCrewTemplate` | |
| Pipelines root | `/dev/pipelines` | `src/pages/dev/DevPipelines.tsx` | **⚠ Declared twice.** |
| Pipelines — tests | `/dev/pipelines/tests` | `PipelinesTests` | |
| Pipelines — canary | `/dev/pipelines/canary` | `PipelinesCanary` | |
| Pipelines — rollbacks | `/dev/pipelines/rollbacks` | `PipelinesRollbacks` | |
| Oasis root | `/dev/oasis` | `src/pages/dev/DevOasis.tsx` | **⚠ Declared twice.** |
| Oasis — state | `/dev/oasis/state` | `OasisState` | |
| Oasis — ledger | `/dev/oasis/ledger` | `OasisLedger` | |
| Oasis — policies | `/dev/oasis/policies` | `OasisPolicies` | |
| VTID root | `/dev/vtid` | `src/pages/dev/DevVTID.tsx` | |
| VTID — issue | `/dev/vtid/issue` | `VTIDIssue` | |
| VTID — analytics | `/dev/vtid/analytics` | `VTIDAnalytics` | |
| VTID — search | `/dev/vtid/search` | `VTIDSearch` | |
| Gateway root | `/dev/gateway` | `src/pages/dev/DevGateway.tsx` | |
| Gateway — requests | `/dev/gateway/requests` | `GatewayRequests` | |
| Gateway — mobile links | `/dev/gateway/mobile` | `GatewayMobileLinks` | |
| Gateway — webhooks | `/dev/gateway/webhooks` | `GatewayWebhooks` | |
| CI/CD root | `/dev/cicd` | `src/pages/dev/DevCICD.tsx` | |
| CI/CD — runs | `/dev/cicd/runs` | `CICDRuns` | |
| CI/CD — artifacts | `/dev/cicd/artifacts` | `CICDArtifacts` | |
| CI/CD — matrix | `/dev/cicd/matrix` | `CICDMatrix` | |
| Observability root | `/dev/observability` | `src/pages/dev/DevObservability.tsx` | |
| Observability — traces | `/dev/observability/traces` | `ObservabilityTraces` | |
| Observability — metrics | `/dev/observability/metrics` | `ObservabilityMetrics` | |
| Observability — costs | `/dev/observability/costs` | `ObservabilityCosts` | |
| Settings root | `/dev/settings` | `src/pages/dev/DevSettings.tsx` | |
| Settings — auth | `/dev/settings/auth` | `SettingsAuth` | |
| Settings — flags | `/dev/settings/flags` | `SettingsFlags` | |
| Settings — tenants | `/dev/settings/tenants` | `SettingsTenants` | |
| Docs | `/dev/docs`, `/dev/docs/catalogs`, `/dev/docs/screen-lists`, `/dev/docs/frontpages`, `/dev/docs/role-views` | `src/pages/dev/DevDocs.tsx` | All four sub-paths reuse `DevDocs`. |

---

## Shared / authenticated, all roles

Routes with no role check (only `<AuthGuard>`). Accessible to **every role**
(community, patient, professional, staff, admin, developer, infra).

| Feature | Route | Page file | Notes |
|---------|-------|-----------|-------|
| Discover | `/discover` | `src/pages/Discover.tsx` | |
| Discover — AI picks | `/discover/ai-picks` | `AIPicksPage` | |
| Discover — marketplace | `/discover/marketplace` | `DiscoverMarketplace` | |
| Discover — supplements | `/discover/supplements` | `Supplements` | |
| Discover — wellness services | `/discover/wellness-services` | `WellnessServices` | |
| Discover — doctors & coaches | `/discover/doctors-coaches` | `DoctorsCoaches` | |
| Discover — provider profile | `/discover/provider/:id` | `ProviderProfile` | |
| Discover — deals & offers | `/discover/deals-offers` | `DealsOffers` | |
| Discover — orders | `/discover/orders` | `Orders` | |
| Cart | `/cart` | `src/pages/Cart.tsx` | |
| Checkout success | `/checkout/success` | `src/pages/CheckoutSuccess.tsx` | |
| Creator onboarded | `/creator/onboarded` | `src/pages/CreatorOnboarded.tsx` | |
| My tickets | `/my-tickets` | `src/pages/MyTickets.tsx` | |
| Daily diary (mobile) | `/daily-diary` | `src/pages/MobileDailyDiary.tsx` | |
| Health hub | `/health` | `src/pages/Health.tsx` | |
| Health — pillars | `/health/pillars` | `PillarsOfHealth` | |
| Health — services hub | `/health/services-hub` | `HealthWellnessServices` | |
| Health — conditions & risks | `/health/conditions` | `ConditionsRisks` | |
| Health — education | `/health/education` | `EducationResources` | |
| Health — my biology | `/health/my-biology` | `MyBiology` | |
| Health — plans | `/health/plans` | `Plans` | |
| Health — Vitana index detail | `/health/vitana-index` | `VitanaIndexDetail` | |
| Reminders | `/reminders` | `src/pages/Reminders.tsx` | |
| AI hub | `/ai` | `src/pages/AI.tsx` | |
| AI — insights | `/ai/insights` | `Insights` | |
| AI — recommendations | `/ai/recommendations` | `AIRecommendations` | |
| AI — daily summary | `/ai/daily-summary` | `DailySummary` | |
| AI — companion | `/ai/companion` | `Companion` | |
| Inbox / messages | `/inbox` | `src/pages/Messages.tsx` | Legacy `/messages/*` redirects to `/inbox`. |
| Inbox — archived | `/inbox/archived` | `Archived` | |
| Inbox — reminder | `/inbox/reminder` | `Reminder` | **⚠ Route declared twice** with conflicting destinations. |
| Inbox — inspiration | `/inbox/inspiration` | `Inspiration` | |
| Settings root | `/settings` | `SettingsRouter` | `requiredRole="community"` (i.e. all roles). |
| Settings — privacy | `/settings/privacy` | `Privacy` | |
| Settings — notifications | `/settings/notifications` | `SettingsNotifications` | |
| Settings — preferences | `/settings/preferences` | `Preferences` | |
| Settings — limitations | `/settings/limitations` | `Limitations` | |
| Settings — connected apps | `/settings/connected-apps` | `ConnectedApps` | |
| Settings — tenant role | `/settings/tenant-role` | `TenantRole` | |
| Settings — billing | `/settings/billing` | `Billing` | |
| Settings — support | `/settings/support` | `Support` | |
| Settings — social connect | `/settings/social` | `SocialConnect` | |
| AI assistant | `/assistant` | `AIAssistant` | |
| Profile (own — edit) | `/me/profile` | `src/pages/EditProfilePage.tsx` | `/profile` redirects here. |
| Search | `/search` | `src/pages/Search.tsx` | |
| Profile privacy | `/profile/me/privacy` | `src/pages/PrivacySettings.tsx` | |
| Intent board | `/intents/board` | `src/pages/IntentBoard.tsx` | Community feed of declared user objectives that the platform matches against. |
| My intents | `/intents/mine` | `src/pages/MyIntents.tsx` | Marked as deprecated alias. |
| Intent match detail | `/intents/match/:id` | `src/pages/IntentMatchDetail.tsx` | |
| Business opportunities | `/business/opportunities` | `src/pages/BusinessOpportunities.tsx` | |
| Business listings | `/business/listings` | `src/pages/BusinessListings.tsx` | |
| Business hub (parent + tabs) | `/business`, `/business/services`, `/business/clients`, `/business/sell-earn`, `/business/analytics` | `src/pages/BusinessHub.tsx` | Nested routes have `element={null}` — tabs rendered by parent. |
| Autopilot dashboard ("My Journey") | `/autopilot` | `src/pages/AutopilotDashboard.tsx` | |
| Invite friends | `/invite` | `src/pages/InviteFriends.tsx` | |
| Wallet hub | `/wallet` | `src/pages/Wallet.tsx` | |
| Wallet — balance | `/wallet/balance` | `Balance` | |
| Wallet — subscriptions | `/wallet/subscriptions` | `Subscriptions` | |
| Wallet — rewards | `/wallet/rewards` | `Rewards` | |
| Sharing root | `/sharing` | `src/pages/Sharing.tsx` | |
| Sharing — campaigns | `/sharing/campaigns` | `Campaigns` | |
| Sharing — campaign detail | `/sharing/campaigns/:id` | `CampaignDetail` | |
| Sharing — distribution | `/sharing/distribution` | `Distribution` | |
| Sharing — data consent | `/sharing/data-consent` | `DataConsent` | |
| Memory hub | `/memory` | `src/pages/Memory.tsx` | |
| Memory — timeline | `/memory/timeline` | `Timeline` | |
| Memory — diary | `/memory/diary` | `Diary` | |
| Memory — recall | `/memory/recall` | `Recall` | |
| Memory — permissions | `/memory/permissions` | `MemoryPermissions` | |

---

## Public (no auth required)

| Feature | Route | Page file | Notes |
|---------|-------|-----------|-------|
| Tenant detect / share entry | `/` | `src/pages/Index.tsx` (via `ShareEntry`) | |
| Intro experience | `/_intro/:tenantSlug` | `src/pages/IntroExperience.tsx` | |
| Login redirect | `/login`, `/register`, `/auth` | (redirects) | Redirect to `/` or `/maxina`. |
| Email confirmed | `/auth/confirmed`, `/maxina/confirmed`, `/alkalma/confirmed`, `/earthlinks/confirmed` | `EmailConfirmed`, `MaxinaConfirmed`, `AlkalmaConfirmed`, `EarthlinksConfirmed` | |
| OAuth callback completion | `/oauth/complete` | `OAuthComplete` | |
| Tenant portals (login pages) | `/maxina`, `/alkalma`, `/earthlinks`, `/exafy-admin` | `MaxinaPortal`, `AlkalmaPortal`, `EarthlinksPortal`, `ExafyAdminPortal` | |
| Reset password | `/reset-password` | `ResetPassword` | |
| Privacy policy | `/privacy` | `PrivacyPolicy` | |
| Terms of use | `/terms` | `TermsOfUse` | |
| Delete account | `/delete-account` | `DeleteAccount` | |
| Maxina support | `/maxina_support` | `MaxinaSupport` | |
| Voucher redemption | `/redeem` | `src/pages/RedeemVoucher.tsx` | |
| Logout | `/logout` | `src/pages/Logout.tsx` | |
| Public event landing (slug) | `/e/:slug`, `/pub/events/:id` | `src/pages/PublicEventLanding.tsx` | |
| Public campaign landing | `/pub/campaigns/:id` | `src/pages/PublicCampaignLanding.tsx` | |
| Public profile | `/u/:identifier` | `src/pages/PublicProfilePage.tsx` | |
| Product detail (public) | `/discover/product/:id` | `ProductDetail` | Anonymous-accessible per OG-share comment. |
| Ticket purchase success | `/tickets/success` | `src/pages/TicketPurchaseSuccess.tsx` | |
| Package purchase success | `/packages/success` | `src/pages/PackagePurchaseSuccess.tsx` | |
| Ticket demo | `/tickets/demo` | `src/pages/TicketDemo.tsx` | |
| Onboarding welcome | `/onboarding/welcome` | (under `src/pages/onboarding/`) | Wrapped in `<AuthGuard>` only — but listed here as it's the entry point. |
| Not found | `*` | `src/pages/NotFound.tsx` | |

---

## Open questions / discrepancies found

These are real findings from inspecting the code. Each one is worth a
separate ticket / cleanup.

1. **Patient role:** code defines `patient` as a hierarchy level between
   community and professional, but `CLAUDE.md` lists only 5 roles. Either the
   doc is stale, or the role is undocumented intentionally.

2. **Developer / Infra roles:** declared as the top of the hierarchy but no
   routes anywhere check `requiredRole="developer"` or `"infra"`. They appear
   to be capability levels rather than route-feature gates.

3. **`DevAuthGuard` is permissive:** `/dev/*` (Command Hub) only requires
   "is logged in", then `DevLayout` force-promotes the role to `admin`. So
   any logged-in user with `VITE_DEV_HUB_ENABLED=true` becomes admin while
   inside Command Hub. **Confirm whether this is intentional** — security
   review may want a real role check.

4. **`/admin/init-events` is unguarded** — renders `InitEvents` directly with
   no `AuthGuard` or `ProtectedRoute`. Likely an oversight or a deliberate
   dev-bootstrap escape hatch.

5. **Duplicate route declarations** (React Router's first-match wins;
   second declarations are dead code):
   - `/admin/community/meetups` (CommunityMeetups vs EventsModeration)
   - `/admin/content/videos|podcasts|music` (ContentX vs XManagement)
   - `/admin/notifications/sent` (NotificationsSent vs AdminNotificationsSentLog)
   - `/inbox/reminder` (Reminder page vs Navigate to /reminders)
   - `/dev/oasis` and `/dev/pipelines`

6. **`AdminGuard` naming bug:** `src/routes/guards/AdminGuard.tsx` requires
   `>= staff` (not admin). Misleading name. Currently unused (dead code) —
   either delete or rename.

7. **Mobile role enforcement:** `useRole` overrides any role to `community`
   on mobile via `useIsMobile()`. Every `/admin/*`, `/staff/*`,
   `/professional/*`, `/patient/*` route renders `<NotAuthorized />` on
   phones. Confirm intent.

8. **Several role-subdir page files have no route** — they may be embedded
   sub-views, dead code, or referenced by sub-routers not traced:
   - `src/pages/community/`: `Challenges`, `Feed`, `Matchmaking`, `Meetups`,
     `Meetups2`, `MyGroups`, `MyBusinessRenamed`, `AIInsights`,
     `LiveInteraction`, `Events`
   - `src/pages/admin/`: `AIAssistant`, `Audit`, `Automation`, `Dashboard`,
     `NotificationDashboard`, `PatientRecords`, `Queue`, `Staff`,
     `StreamSettings`, `StreamSupervision`, `SystemHealth`, `SystemSecurity`,
     `TelemedicineSessions`, `TenantAudit`, `TenantConfig`, `UserManagement`,
     `VertexTesting`

9. **`reseller` is no longer a role** — demoted to a capability stored in a
   `reseller_profiles` table (per `useRole.tsx` comment). No reseller-specific
   routes.

10. **`CLAUDE.md` documentation is stale** on the role count (says 5, code
    has 7). Worth updating in a separate doc-only PR.
