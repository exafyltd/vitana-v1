# Release Overview Screen — MAXINA tenant view

**Status:** Draft (refined after walkthrough — 3-tab structure)
**Branch:** `claude/backlog-versioning-structure-7frZn`
**Companion spec (canonical):** `vitana-platform/specs/release-backlog-overview.md`
**Decisions reference:** `docs/role-cleanup-decisions.md`
**Related catalog:** `docs/feature-catalog-by-role.md`

This is the **frontend** half of the release-backlog-overview spec. The
canonical data model, API, OASIS events, and Command Hub design live in the
platform repo. This document covers what `vitana-v1` (the MAXINA community
app) needs to add: a tenant-facing release surface and a Command Hub
release surface, both in this repo.

---

## 1. Goal

Two release-tracking surfaces, both in this repo, driven by the same data
model and the same gateway endpoints:

1. **Tenant Admin** (e.g. MAXINA admin) — `/admin/releases` — sees their
   tenant's release matrix, authors customer-facing changelogs, manages
   their tenant's backlog.
2. **Developer** (and Exafy super-admin) — `/dev/releases` and
   `/dev/docs/backlog` — sees the full system matrix across all tenants,
   plus an in-app reader for the spec/decision/catalog markdown docs.

End-users (Community / Patient / Professional / Staff) never see these
surfaces. They only see the public in-app changelog at `/changelog` (Phase 5).

---

## 2. Where each surface lives

| Surface | Route | Page file | Audience |
|---------|-------|-----------|----------|
| **Tenant release hub** (3 tabs) | `/admin/releases` | `src/pages/admin/Releases.tsx` *(new)* | Tenant Admin |
| **Command Hub release matrix** | `/dev/releases` | `src/pages/dev/DevReleases.tsx` *(new)* | Developer + Exafy super-admin |
| **Command Hub doc viewer** | `/dev/docs/backlog` | extends `src/pages/dev/DevDocs.tsx` *(new sub-tab)* | Developer + Exafy super-admin |
| **Public changelog** (Phase 5) | `/changelog` | `src/pages/Changelog.tsx` *(new, Phase 5)* | Anyone (no auth) |

Mobile: per the role policy (Mobile = Community-only), none of `/admin/*` or
`/dev/*` are reachable on phones. The public `/changelog` is the only
release-related route that works on mobile.

---

## 3. `/admin/releases` — Tenant Admin (3 tabs)

One route, three tabs, one data path. The tabs share the same `useReleasesOverview()`
query (TanStack Query) for the tenant-scoped matrix; per-tab data uses the
existing endpoint set.

### Tab structure

| Tab | Route | What it shows | What the user does |
|-----|-------|---------------|--------------------|
| **Overview** | `/admin/releases` | Read-only matrix — platform components MAXINA depends on (Command Hub, Gateway/API, SDK) + MAXINA's own surfaces (Desktop / iOS / Android) with current versions, channels, compatibility badges, and pending counts | Inspect what's live and what's compatible |
| **Changelog** | `/admin/releases/changelog` | Per-release authoring UI: list of MAXINA's recent releases × surface, with the markdown changelog for each. Channel selector (internal / beta / stable). Promote / publish actions | Author and publish customer-facing release notes |
| **Backlog** | `/admin/releases/backlog` | CRUD list of pending items targeting MAXINA's next release. Title, summary, status (`proposed` / `planned` / `in_progress` / `blocked` / `done` / `dropped`), target version, optional VTID link, visibility (`internal` / `tenant` / `public`) | Triage and update pending work |

### Tab 1 — Overview

```
┌─ /admin/releases ─────────────────────────────────────────────┐
│ [Overview]  Changelog  Backlog                                │
│                                                                │
│  PLATFORM I DEPEND ON                                          │
│  ┌──────────────┬─────────┬──────────┬───────────┐             │
│  │ Component    │ Version │ Channel  │ Released  │             │
│  ├──────────────┼─────────┼──────────┼───────────┤             │
│  │ Command Hub  │ 2.3.4   │ stable   │ 4d ago    │             │
│  │ Gateway/API  │ 1.8.1   │ stable   │ 2d ago    │             │
│  │ SDK          │ 2.3.0   │ stable   │ 4d ago    │             │
│  └──────────────┴─────────┴──────────┴───────────┘             │
│                                                                │
│  MAXINA SURFACES                                               │
│  ┌──────────┬─────────┬─────────┬──────────────┬─────────┐     │
│  │ Surface  │ Version │ Channel │ Min platform │ Compat  │     │
│  ├──────────┼─────────┼─────────┼──────────────┼─────────┤     │
│  │ Desktop  │ 1.4.2   │ stable  │ >=2.3.0      │ ✓       │     │
│  │ iOS      │ 1.4.0   │ stable  │ >=2.3.0      │ ✓       │     │
│  │ Android  │ 1.3.9   │ stable  │ >=2.2.0      │ ⚠ behind│     │
│  └──────────┴─────────┴─────────┴──────────────┴─────────┘     │
└────────────────────────────────────────────────────────────────┘
```

Compatibility badge colors follow the existing semantic tokens
(`success` / `warning` / `destructive`). No new colors.

### Tab 2 — Changelog

The authoring surface for `release_history.changelog`. When tenant_admin
publishes on the `stable` channel, content propagates to:

- **App Store Connect** (for MAXINA iOS) — release notes for the next App Store version
- **Google Play Console** (for MAXINA Android) — release notes for the next Play Store version
- **In-app `/changelog`** (Phase 5) — public-facing changelog page
- **vitanaland.com** (separate property) — same JSON endpoint, different render

```
┌─ /admin/releases/changelog ──────────────────────────────────┐
│ Overview  [Changelog]  Backlog                               │
│                                                              │
│  Surface: [MAXINA iOS ▾]  Version: [1.4.0 ▾]  Channel: stable│
│                                                              │
│  ┌─ Release notes ───────────────────────────────────────┐  │
│  │ # MAXINA 1.4.0                                        │  │
│  │                                                        │  │
│  │ ## What's new                                          │  │
│  │ - Live Rooms now support up to 8 participants         │  │
│  │ - Smart Reminders consolidated into one tab           │  │
│  │                                                        │  │
│  │ ## Fixes                                               │  │
│  │ - ...                                                  │  │
│  └────────────────────────────────────────────────────────┘  │
│                                                              │
│  [Save draft]  [Promote to beta]  [Publish stable →]         │
│                                                              │
│  History:                                                    │
│   • 1.3.9 stable, 2026-04-22, edited by Anna 4d ago          │
│   • 1.3.8 stable, 2026-04-15, ...                            │
└──────────────────────────────────────────────────────────────┘
```

`internal_notes` (separate column, never published) is editable from the
same form but rendered with a "🔒 Internal — never shown to users" hint.

### Tab 3 — Backlog

Filtered list from `GET /api/v1/releases/backlog` (tenant-scoped server-side).
Group by surface (Desktop / iOS / Android) with status pills. Tenant_admin can:

- create / edit / drop their own backlog items
- link an item to a VTID (free-text input — VTID validation happens server-side)
- never see `internal` visibility items (server filters them out)

---

## 4. `/dev/releases` — Command Hub release matrix (Developer + Exafy super-admin)

**Page file (new):** `src/pages/dev/DevReleases.tsx`
**Layout shell:** existing `DevLayout.tsx` (Command Hub frame)
**Guard:** the new Q1 guard — `(useRole().role === 'developer') || useTenant().isExafyAdmin`

System-wide view, no tenant scoping. Same data model as the Admin Overview
tab, but unfiltered:

- All platform components (read/write)
- All tenants (currently MAXINA, future tenants visible as they're added)
- All channels including `internal` (which tenant_admin doesn't see)
- All backlog items including `visibility='internal'`

Layout follows § 6.1 of the canonical platform spec:

```
┌─ /dev/releases ────────────────────────────────────────────────┐
│  PLATFORM                                                      │
│  Component  · Version · Channel · Released · Pending           │
│  ...                                                           │
│                                                                │
│  TENANTS                                                       │
│  Tenant · Desktop · iOS · Android · Pending                    │
│  MAXINA · 1.4.2 ✓ · 1.4.0 ✓ · 1.3.9 ⚠ · 5/3/4                  │
│                                                                │
│  [Filter: channel ▾]  [Filter: tenant ▾]  [+ Backlog item]    │
└────────────────────────────────────────────────────────────────┘
```

Click any row → drawer with full release history + backlog items.

Nav placement: top-level item in the `DevLayout` sidebar, same level as
existing entries (Dashboard, Command, Agents, Pipelines, Oasis, VTID,
Gateway, CI/CD, Observability, Settings, Docs).

---

## 5. `/dev/docs/backlog` — Command Hub markdown viewer

**Page file:** extends existing `src/pages/dev/DevDocs.tsx` with a new sub-tab
**Existing sub-tabs:** `/dev/docs/catalogs`, `/dev/docs/screen-lists`,
`/dev/docs/frontpages`, `/dev/docs/role-views` — adding `/dev/docs/backlog`
follows this pattern exactly.

**Why this exists:** when a developer is working in Command Hub, they should
be able to read the release-tracking spec, the role-cleanup decisions, the
feature catalog, etc. **without leaving the surface or jumping to GitHub**.

**Files surfaced (curated list):**

| Title in tab | Source file |
|--------------|-------------|
| Release backlog — frontend spec | `vitana-v1/docs/release-backlog-overview-screen.md` (this file) |
| Release backlog — platform spec | `vitana-platform/specs/release-backlog-overview.md` (proxied via gateway) |
| Feature catalog by role | `vitana-v1/docs/feature-catalog-by-role.md` |
| Role cleanup decisions | `vitana-v1/docs/role-cleanup-decisions.md` |
| _(more added as docs ship)_ | |

**Implementation approach:**

- The page reads a curated list of doc paths from a config file (e.g.
  `src/config/devDocs.ts`)
- For files in `vitana-v1`, the markdown is fetched via Vite's
  `import.meta.glob('/docs/*.md', { as: 'raw' })` — bundled at build time, no
  runtime cost
- For files in `vitana-platform`, the gateway exposes `GET /api/v1/docs/specs/:filename`
  that reads from the platform repo (or a synced static bucket)
- Renders with the existing markdown component already used in the app
  (likely the same one rendering `NewsArticleDetail`)
- No CMS, no duplication of content — the repo files are the source of truth

**No edit-in-place.** This is read-only. Edits happen via PRs to the repo.

---

## 6. Data contract (frontend types)

Wire format defined in the platform spec § 4. Frontend type:

```ts
// src/types/releases.ts
export type ReleaseChannel = 'internal' | 'beta' | 'stable';
export type Compatibility  = 'ok' | 'behind' | 'breaking';
export type Surface =
  'command_hub' | 'web' | 'api' | 'sdk' | 'desktop' | 'ios' | 'android';

export interface PlatformComponent {
  slug: string;
  display_name: string;
  current_version: string;
  current_channel: ReleaseChannel;
  current_released_at: string;
  pending_count: number;
}

export interface TenantSurface {
  slug: string;
  surface: Surface;
  current_version: string;
  current_channel: ReleaseChannel;
  min_platform_version: string;
  compatibility: Compatibility;
  pending_count: number;
}

export interface TenantRow {
  tenant_id: string;
  name: string;
  surfaces: TenantSurface[];
}

export interface ReleasesOverview {
  platform: PlatformComponent[];
  tenants: TenantRow[];   // tenant_admin sees length 1; developer/super-admin see all
}

// For Tab 2 — Changelog
export interface ReleaseHistoryEntry {
  id: string;
  component_slug: string;
  version: string;
  channel: ReleaseChannel;
  released_at: string;
  released_by_name: string;
  changelog: string;            // markdown
  internal_notes: string | null; // tenant role sees null
  artifact_url: string | null;
}

// For Tab 3 — Backlog
export interface BacklogItem {
  id: string;
  component_slug: string;
  title: string;
  summary: string | null;
  vtid: string | null;
  status: 'proposed' | 'planned' | 'in_progress' | 'blocked' | 'done' | 'dropped';
  target_version: string | null;
  target_channel: ReleaseChannel | null;
  visibility: 'internal' | 'tenant' | 'public'; // tenant role only sees 'tenant' | 'public'
  priority: number;
}
```

Fetching: TanStack Query against `VITE_GATEWAY_URL` using the existing
gateway client in `src/lib/`. Cache stale-time 60s; refresh on focus.

No new backend code in this repo — Supabase is not involved here.

---

## 7. Public changelog (Phase 5)

Out of scope for the immediate work but recorded here so we don't accidentally
double-build it:

- End-users in MAXINA see a public changelog rendered from
  `GET /api/v1/releases/changelog/public` (no auth)
- Lives at `/changelog` in this app (and in `vitanaland.com` separately,
  consuming the same endpoint)
- Renders only `release_history` rows where `channel='stable'` and the
  component is in the public set (MAXINA Desktop/iOS/Android, vitanaland.com)
- This is what App Store Connect / Play Console scrape (or a worker pushes)
  for app-store release notes

---

## 8. Role gating

Aligned to the canonical 6-role model + Exafy super-admin (per
`role-cleanup-decisions.md`):

| Role | `/admin/releases` (any tab) | `/dev/releases` | `/dev/docs/backlog` | Public `/changelog` |
|------|----------------------------|-----------------|---------------------|---------------------|
| Community | ❌ | ❌ | ❌ | ✅ |
| Patient | ❌ | ❌ | ❌ | ✅ |
| Professional | ❌ | ❌ | ❌ | ✅ |
| Staff | ❌ | ❌ | ❌ | ✅ |
| Admin (tenant) | ✅ scoped to own tenant | ❌ | ❌ | ✅ |
| Developer | ✅ read all tenants | ✅ | ✅ | ✅ |
| Exafy super-admin | ✅ full | ✅ | ✅ | ✅ |

Mobile: every entry except `/changelog` returns `<NotAuthorized />` because
`useIsMobile()` forces role to `community` (per Q3).

---

## 9. Phasing

Mirrors the platform spec § 10:

- **Phase 1 (this branch):** spec docs only, no code. Currently here.
- **Phase 2:** wait for platform `GET /releases/overview` to ship.
- **Phase 3a (this repo):** add `src/types/releases.ts`, `src/pages/dev/DevReleases.tsx`,
  Command Hub nav entry, gateway client method.
- **Phase 3b (this repo):** add `/dev/docs/backlog` sub-tab to `DevDocs.tsx`,
  curate the doc list in `src/config/devDocs.ts`.
- **Phase 4 (this repo):** add `src/pages/admin/Releases.tsx` with the 3-tab
  structure, route + nav entry, all three tab components.
- **Phase 5 (this repo + worker):** add public `/changelog` route consuming
  the public endpoint; build the App Store / Play Store propagation worker.

---

## 10. Open questions

1. **Nav placement for `/admin/releases`.** Confirm the existing admin
   sidebar slot — likely between `Settings` and `Audit`.

2. **Tenant identity in the client.** Confirm `TenantProvider` is the correct
   source of `tenant_id` for the active session — the overview endpoint
   doesn't take a `tenant_id` param (gateway derives it from JWT), so the
   client needs nothing.

3. **Markdown component reuse.** Confirm which markdown component is the
   "blessed" renderer — likely the one used in `NewsArticleDetail.tsx`.
   Whatever it is, both `/dev/docs/backlog` and `/admin/releases/changelog`
   should use it for consistency.

4. **Changelog → App Store / Play Store mechanism.** Decoupled worker (per
   platform spec § 9.6) recommended. Confirm before Phase 5.

5. **Dual JWT (platform + community per CLAUDE.md).** Confirm the new Q1
   guard `(role === 'developer') || isExafyAdmin` works correctly across
   both token types — especially that `isExafyAdmin` is readable from the
   community-token-derived session.
