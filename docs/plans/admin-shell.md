# Admin Shell — Convergence Contract

> **Status:** living document. Updated whenever a session takes ownership of new admin work or merges a batch.
> **Owners:** Session A (admin shell architecture), Session B (Navigator + shared infrastructure).
> **Last updated:** 2026-04-12 by Session B (initial).

This file is the **single source of truth** that prevents two parallel Claude Code sessions from stomping on the same `src/` files while building the admin area together. Read this file before doing ANY admin work. Update it before AND after every merged batch.

---

## 1. Convergence rule

There is **one admin shell**, owned by Session A. There is **one Navigator section**, owned by Session B. Both consume the **same backend** (`/api/v1/admin/*` on the gateway) through the **same React Query hooks**. Neither session creates a parallel admin UI.

If a third area (Knowledge, Members, Live, ...) needs an owner, claim it in this file before writing code.

When a session needs to touch a file owned by the other session, it MUST:

1. Comment in the relevant batch issue / PR before editing
2. Confine the change to the smallest possible diff
3. Ship it as a separate PR that the owning session reviews

---

## 2. Path → owning session

Update this table whenever a session adds files to or claims a directory in the admin area.

| Path | Owner | Purpose |
| --- | --- | --- |
| `src/App.tsx` (admin route block) | **shared, coordinated** | Both sessions register routes here. See §4 for the protocol. |
| `src/config/admin-navigation.ts` | Session A | Sidebar config — section list, icons, badges, role gating |
| `src/layouts/AdminLayout.tsx` (or equivalent shell) | Session A | Sidebar + topbar + content slot, role switcher, ORB widget |
| `src/components/admin/AdminDrawer.tsx` | Session A | Shared right-side drawer primitive |
| `src/components/admin/AdminTable.tsx` | Session A | Shared paginated table primitive |
| `src/lib/admin-api.ts` | Session A | Shared admin fetcher (auth header injection, error normalization) |
| `src/components/admin/TenantAdminGuard.tsx` | Session A | RBAC wrapper for tenant-admin routes |
| `src/pages/admin/Dashboard.tsx` + `dashboard/*` | Session A | Overview KPI screen |
| `src/pages/admin/users/*` (Members + Roles & Access) | Session A | Members section, Batch 1.B1 |
| `src/pages/admin/notifications/*` | Session A | |
| `src/pages/admin/community/*` | Session A | |
| `src/pages/admin/live/*` | Session A | |
| `src/pages/admin/intelligence/*` | Session A | |
| `src/pages/admin/system/*` | Session A | |
| `src/pages/admin/audit/*` | Session A | |
| **`src/pages/admin/navigator/*`** | **Session B** | Navigator section: Catalog, Coverage, Telemetry, History |
| **`src/pages/admin/navigator/components/*`** | **Session B** | Navigator-internal components: TriggerEditor, SimulatorPanel |
| **`src/hooks/useAdminNavigator.ts`** | **Session B** | React Query hooks for `/api/v1/admin/navigator/*` |
| **`src/generated/spa-routes.json`** | **Session B** | Auto-generated from `scripts/extract-routes.mjs` (prebuild) |
| **`scripts/extract-routes.mjs`** | **Session B** | TS compiler-API route walker (used by both sessions long-term) |

If you add a path not in this table, **add it here in the same PR**. If you need to add files to a directory another session owns, **ask first**.

---

## 3. Shared seam: backend + hooks

When in doubt about who owns what, **build features as gateway endpoints + shared React Query hooks**. Both sessions can consume them without touching each other's components.

- **Backend:** `services/gateway/src/routes/admin-*.ts` — one router per section, mounted at `/api/v1/admin/<section>`. Auth via `requireAdminAuth` middleware (dual JWT, see [services/gateway/src/middleware/admin-auth.ts](../../services/gateway/src/middleware/admin-auth.ts)).
- **Hooks:** `src/hooks/useAdmin<Section>.ts` — one file per section. Wrap all endpoint calls in React Query. Export typed return values. Both shells/components can import without coupling to UI.

The gateway routes ARE the contract. If Session A needs Members data, Session A creates `admin-members.ts` on the gateway and `useAdminMembers.ts` on the frontend. Session B does the same for Navigator. Neither session edits the other's routes file or hooks file.

---

## 4. Routing protocol — `src/App.tsx`

`src/App.tsx` is the **only file both sessions need to touch routinely**, and the file most at risk of conflicts. Follow this protocol:

1. **Lazy imports go in alphabetical groups by section.** Each session has its own block, marked with a comment:
   ```tsx
   // Session A: Members
   const AdminMembersList = lazy(() => import("./pages/admin/users/AllUsers"));
   ...
   // Session B: Navigator (VTID-NAV-02)
   const AdminNavigatorCatalog = lazy(() => import("./pages/admin/navigator/Catalog"));
   ...
   ```
2. **Route definitions go in matching section blocks**, also marked. Keep all routes for one section contiguous.
3. **The catch-all `<Route path="*" element={<NotFound />} />` MUST stay last.** Anything below it is unreachable.
4. **Do not introduce a `/admin/*` wildcard route** unless it's explicitly the shell's outlet AND every existing specific `/admin/...` route is moved underneath it as a child route. If you need to do this, open a coordination issue first.
5. **When you add or remove a route, run `npm run build` locally before pushing.** The build fails fast on broken lazy imports.

---

## 5. Open batches

Update this section as batches start and complete. Format: `Batch X.Y — Owner — Status`.

### Active

- **Batch 1.C — Session A — Navigator integration into shell** (in progress)
  - Wires Session B's Navigator components into Session A's `/admin` shell as a section
  - Removes Session B's standalone `/admin/navigator/*` routes from `App.tsx` (replaced by shell-level routes)
  - Updates `src/config/admin-navigation.ts` with Navigator section using tab names: Catalog / Coverage / Simulator / Telemetry / History
  - **No new components, no new backend, no new migrations** — pure routing rewire
  - Estimated <1 day

- **Batch 1.B1 — Session A — Members + Roles & Access** (queued behind 1.C)
  - New migration: `tenant_invitations`
  - Tenant-admin RBAC middleware on gateway
  - 5 Members pages + AdminDrawer + AdminTable + admin-api.ts + TenantAdminGuard primitives

### Recently merged

- **Batch 1.A — Session A — Foundation** (merged before 2026-04-12)
- **VTID-NAV-02 (Backend) — Session B — Navigator API + DB-backed catalog** (merged 2026-04-11, [vitana-platform#615](https://github.com/exafyltd/vitana-platform/pull/615))
- **VTID-NAV-02 (Frontend) — Session B — /admin/navigator screens** (merged 2026-04-11, [vitana-v1#77](https://github.com/exafyltd/vitana-v1/pull/77))

---

## 6. Coordination protocol (rules both sessions follow)

1. **Always work in a worktree.** Never commit directly to `main`. Both sessions share the same `.git/` and race conditions destroy in-flight work.
   ```bash
   git worktree add /tmp/vitana-v1-<feature> -b claude/<feature> origin/main
   cd /tmp/vitana-v1-<feature>
   ```
2. **Always open a PR.** Never push directly to `main`. One PR per batch.
3. **Rebase before pushing.** If the other session merged something while you were working, rebase on `origin/main` and re-run `npm run build` before pushing.
4. **Check `git log` before merging.** Look for commits from the other session to make sure you're not silently overwriting their work.
5. **Update this file in the same PR** that adds new admin paths or claims new ownership.
6. **When in doubt, ask in the batch issue / PR.** Better to wait 5 minutes than to spend an hour resolving conflicts.

---

## 7. Quick reference — backend endpoints (already shipped)

| Endpoint | Method | Owner | Auth |
| --- | --- | --- | --- |
| `/api/v1/admin/navigator/catalog` | GET / POST | Session B | exafy_admin |
| `/api/v1/admin/navigator/catalog/:id` | PATCH / DELETE | Session B | exafy_admin |
| `/api/v1/admin/navigator/restore/:audit_id` | POST | Session B | exafy_admin |
| `/api/v1/admin/navigator/simulate` | POST | Session B | exafy_admin |
| `/api/v1/admin/navigator/spa-routes` | GET | Session B | exafy_admin |
| `/api/v1/admin/navigator/coverage` | GET | Session B | exafy_admin |
| `/api/v1/admin/navigator/telemetry` | GET | Session B | exafy_admin |
| `/api/v1/admin/navigator/reload` | POST | Session B | exafy_admin |

All gated by `requireAdminAuth` (dual JWT, supports both Lovable Supabase and Platform JWT).

---

*If this file is out of date, the convergence is broken. Fix the file first, then write code.*
