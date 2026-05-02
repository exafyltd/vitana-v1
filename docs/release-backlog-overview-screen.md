# Release Overview Screen — MAXINA tenant view

**Status:** Draft
**Branch:** `claude/backlog-versioning-structure-7frZn`
**Companion spec (canonical):** `vitana-platform/specs/release-backlog-overview.md`

This is the **frontend** half of the release-backlog-overview spec. The
canonical data model, API, and Command Hub design live in the platform repo.
This document covers only what `vitana-v1` (the MAXINA community app) needs
to add: a tenant-facing "My Releases" surface that consumes the platform
endpoint.

---

## 1. Goal

Give a MAXINA tenant admin (and dev/QA roles) a single screen showing:

- which platform versions MAXINA currently depends on (Vitanaland Command
  Hub, Gateway/API, SDK, vitanaland.com web)
- MAXINA's own current version on each surface (Desktop / iOS / Android)
- compatibility status for each surface vs the live platform SDK
- pending backlog items targeting MAXINA's next release (visibility ≥ tenant)

End-users (Community role) never see this screen — they get only the public
in-app changelog (see § 6).

---

## 2. Where it lives

**Route:** `/admin/releases` (new)
**Page file:** `src/pages/admin/Releases.tsx` (new)
**Nav placement:** existing admin shell sidebar, beneath the current admin
items (alongside whatever lives in `src/pages/admin/`).

Mobile: same route, renders as a stacked list (tabs for Platform / MAXINA /
Backlog) — follow the existing `useIsMobile()` + `MobileAppShell` pattern.

---

## 3. Two surfaces, one data path

| Surface | Audience | Where |
|---------|----------|-------|
| **Command Hub `Releases`** | Vitanaland platform_admin, release_manager | `vitana-platform` (Hub UI) — full matrix across all tenants |
| **MAXINA `/admin/releases`** | Tenant admin/dev/QA inside MAXINA | this repo — single-tenant subset |

Both call the **same** endpoint:

```
GET /api/v1/releases/overview
```

The gateway scopes the response based on the caller's role/tenant. From the
frontend's perspective there is no special tenant-only endpoint — the API
just returns less data when called with a tenant_admin token.

---

## 4. Data contract (what the screen consumes)

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
  tenants: TenantRow[];   // tenant_admin sees length 1 (self)
}
```

Fetching: TanStack Query against `VITE_GATEWAY_URL` using the existing
gateway client in `src/lib/`. Cache stale-time 60s; refresh on focus.

No new backend code in this repo — Supabase is not involved here.

---

## 5. UI structure

Three sections, top-to-bottom, on a single page:

### 5.1 Platform dependencies (read-only)

What MAXINA currently runs against. Card grid, one card per platform component:

```
┌─ Command Hub ─────────┐  ┌─ Gateway / API ───────┐  ┌─ SDK ─────────────┐
│ 2.3.4  · stable       │  │ 1.8.1  · stable       │  │ 2.3.0  · stable   │
│ Released 4d ago       │  │ Released 2d ago       │  │ Released 4d ago   │
│ 3 pending             │  │ 7 pending             │  │ 1 pending         │
└───────────────────────┘  └───────────────────────┘  └───────────────────┘
```

### 5.2 MAXINA surfaces

A 3-row table — Desktop / iOS / Android. Each row:

| Surface | Version | Channel | Min platform | Compat | Pending |
|---------|---------|---------|--------------|--------|---------|
| Desktop | 1.4.2 | stable | `>=2.3.0` | ✓ | 5 |
| iOS | 1.4.0 | stable | `>=2.3.0` | ✓ | 3 |
| Android | 1.3.9 | stable | `>=2.2.0` | ⚠ behind | 4 |

Compatibility badge colors follow the existing semantic tokens
(`success` / `warning` / `destructive`). No new colors.

### 5.3 Backlog (pending items)

Filtered list from `GET /api/v1/releases/backlog?tenant_id=<self>`. Group by
surface (Desktop / iOS / Android) with status pills. Tenant-admin can:

- create / edit / drop their own backlog items
- link an item to a VTID (free-text input — VTID validation happens server-side)
- never see `internal` visibility items (server filters them out)

---

## 6. Public changelog (separate, end-user facing)

Out of scope for the admin screen but worth noting for completeness so we
don't accidentally double-build it:

- End-users in MAXINA see a public changelog rendered from
  `GET /api/v1/releases/changelog/public` (no auth)
- Lives at `/changelog` (or wherever the existing settings/about flow puts it)
- Renders only `release_history` rows where `channel='stable'` and the
  component is in the public set (MAXINA Desktop/iOS/Android, vitanaland.com)
- This is a Phase-5 deliverable (per platform spec § 10)

---

## 7. Role gating

Use the existing role check pattern (Community / Professional / Staff /
Admin / Dev). Route guard on `/admin/releases`:

| Role | Access |
|------|--------|
| Admin | full read + write to MAXINA backlog |
| Dev | full read + create/edit own backlog items |
| Staff (QA) | read all, can flag items as `blocked` |
| Professional | no access (404) |
| Community | no access (404) |

---

## 8. Phasing (mirrors platform spec § 10)

- **Phase 1 (this branch):** spec docs only, no code.
- **Phase 2/3:** wait for platform `GET /releases/overview` to ship.
- **Phase 4 (this repo):** add `src/types/releases.ts`, `src/pages/admin/Releases.tsx`,
  route + nav entry, gateway client method. Estimated ~1 PR.
- **Phase 5:** add public `/changelog` route consuming the public endpoint.

---

## 9. Open questions

1. **Nav placement.** Does this go in the existing admin sidebar, or under
   the Dev Hub (gated by `VITE_DEV_HUB_ENABLED`)? Recommendation: admin
   sidebar — it's tenant operational data, not a dev tool.

2. **Tenant identity in the client.** Where does the frontend currently
   read `tenant_id` for the active session? `TenantProvider` exposes it,
   but the overview endpoint doesn't take a `tenant_id` param — the
   gateway derives it from the JWT. Confirm before wiring.

3. **Public changelog hosting.** vitanaland.com (separate property) vs
   in-app `/changelog` route — likely both, sharing the same JSON endpoint.

4. **Does Command Hub auth issue a separate token from MAXINA admin auth?**
   `CLAUDE.md` mentions "dual JWT — platform + community". Confirm that the
   tenant_admin role check on the gateway covers MAXINA admin tokens
   correctly without further work.
