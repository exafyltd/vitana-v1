# Maxina Tenant Admin Shell — Coordination Contract

> **Both Claude sessions MUST read this file before touching any `/admin/*` code, and MUST update it before and after each batch.** This is the single source of truth that prevents collision between the parallel sessions working on the Maxina admin rebuild.

**Last updated:** 2026-04-12 by Session B (Autopilot admin shipped)

---

## Convergence rule

**One shell, many contents.**

- **Session A** owns the 12-section admin shell — AppLayout hosting, sidebar config, AdminTabs primitive, AdminPlaceholder wildcard, role-grant chain. Everything that belongs to the "frame" every admin screen sees.
- **Session B** owns full-feature section contents — the pages, data hooks, and gateway backend routes that render inside the shell's section slots. Session B shipped Navigator end-to-end; future sections (Assistant, Knowledge, Autopilot, Insights) may be owned by either session depending on who picks them up first.
- **Backend (vitana-platform gateway) is the safe seam.** Both sessions consume the same `/api/v1/admin/*` routes via shared React Query hooks. No frontend component is duplicated, no endpoint is reimplemented.

When the same file must be edited by both sessions (notably `src/App.tsx` and `src/config/admin-navigation.ts`), the rule is: **rebase on the other session's latest `main` before editing**, and touch only the lines your batch actually needs.

---

## Status by section (Wave 1)

Legend: ✅ done · 🚧 in progress · ⏳ queued · — not started

| Section | Status | Owner | Notes |
|---|---|---|---|
| **Foundation (Batch 1.A)** | ✅ | Session A | 12-section sidebar via `ADMIN_SECTIONS`; `AdminTabs`; `AdminPlaceholder` + `/admin/*` wildcard; role-grant chain fixes (7 roles, `get_my_permitted_roles()` RPC with fallback, super-admin safety net). Verified: ORB + ProfileDrawer + Sidebar persist across community↔admin route changes. |
| **Overview** | ⏳ | — | Placeholder. Dashboard KPIs + at-risk cohort are Batch 1.D. Legacy `/admin/dashboard` still renders the old dashboard until rebuilt. |
| **Members** | ⏳ | Session A (queued) | Batch 1.B1 — next up. Directory, Invitations, Roles & Access, Segments, Audit. New backend: `tenant_invitations` table, `require-tenant-admin` middleware. Unblocks the role switcher for all 7 roles. |
| **Assistant** | ⏳ | — | Batch 1.B2 — after 1.B1. Per-tenant personality/voice/tools/routing/playground/sessions. New backend: `tenant_assistant_config` table, `getEffectiveConfig()` merge. |
| **Knowledge** | ⏳ | — | Batch 1.B2 — after 1.B1. Per-tenant KB corpus with baseline opt-out. New backend: `kb_documents` + `tenant_kb_baseline_optouts` tables. |
| **Navigator** | ✅ | Session B | VTID-NAV-02 shipped 2026-04-12 (vitana-v1 PR #77, vitana-platform PR #615). Catalog + Coverage + Telemetry + History tabs (Simulator is embedded in Catalog). Files: `src/pages/admin/navigator/*`, `src/hooks/useAdminNavigator.ts`, backend `/api/v1/admin/navigator/*`. Session A reconciled `ADMIN_SECTIONS.navigator.tabs` to match Session B's 4 tabs on 2026-04-12. |
| **Autopilot** | ✅ | Session B | VTID-AP-ADMIN shipped 2026-04-12 (vitana-platform PR #621, vitana-v1 PR #83). 5 tabs: Recommendations / Automations / Runs / Guardrails / Growth. Backend: `tenant_autopilot_settings`, `tenant_autopilot_bindings`, `tenant_autopilot_runs` tables + 11 endpoints at `/api/v1/admin/autopilot/*`. Files: `src/pages/admin/autopilot/*`, `src/hooks/useAdminAutopilot.ts`. |
| **Community** | ⏳ | — | Wave 2. Placeholder renders "Coming in Wave 2". |
| **Content** | ⏳ | — | Wave 2. |
| **Notifications** | ⏳ | — | Wave 2. |
| **Insights** | ⏳ | — | Wave 2. |
| **Settings** | ⏳ | — | Batch 1.D. Profile / Branding / Feature Flags / Integrations / Domains / Billing. |
| **Audit & Compliance** | ⏳ | — | Batch 1.D. Admin Actions / Access Log / OASIS Events (tenant-filtered) / Policies / Data Rights. |

---

## Shared files — touch only with coordination

These files are edited by both sessions. Before changing any of them, search `git log --oneline -- <file>` to see what the other session has done recently, rebase on `origin/main`, and make minimal, surgical edits.

| File | Shared concern | Who edits what |
|---|---|---|
| `src/App.tsx` | Admin route registrations + `/admin/*` wildcard | Session A owns the wildcard and Batch-1.A route block; Session B added specific Navigator + Autopilot routes. New section routes get registered BEFORE the wildcard. |
| `src/config/admin-navigation.ts` | Sidebar section list + tab catalogs | Each session updates its own section's `tabs[]` array. Sidebar order / section list is Session A's call. |
| `src/config/role-navigation.ts` | `adminNavigation` export derived from `ADMIN_SECTIONS` | Session A owns. Don't hand-edit `adminNavigation` — it's computed from the above. |
| `src/components/AppLayout.tsx` | Global frame hosting ORB + ProfileDrawer + Sidebar | **Do not modify.** Global frame invariants are load-bearing. |
| `src/hooks/useOrbVoiceWidget.ts` | ORB widget init | **Do not modify.** |
| `src/components/profile/ProfileDrawer.tsx` | Profile chip + role switcher | Session A owns. Must work identically on every route. |
| `src/hooks/useRole.tsx` | `UserRole` type + `setRole` flow | Session A owns. Currently 7 roles: community / patient / professional / staff / admin / developer / infra. |
| `src/hooks/useMemberships.ts` | `get_my_permitted_roles()` RPC wrapper | Session A owns. Has fallback to legacy `list_roles_for_active_tenant` for RPC rollout safety. |

---

## Safe seam — backend gateway

New features should land as gateway routes first, then be consumed by thin React Query hooks on the frontend. This lets both sessions build against a stable API without touching each other's React code.

| Backend area | Gateway path | Status | Notes |
|---|---|---|---|
| Navigator catalog + coverage + telemetry + history | `/api/v1/admin/navigator/*` | ✅ Session B | Live. Schema includes tenant-scoped entries (`tenant_id` nullable). |
| Autopilot settings + bindings + catalog + runs + recs | `/api/v1/admin/autopilot/*` | ✅ Session B | Live. 11 endpoints: GET/PATCH settings, CRUD bindings, GET catalog, GET runs + stats, GET recommendations + summary. All gated by `requireTenantAdmin`. |
| Tenant invitations | `/api/v1/admin/tenants/:tenantId/invitations` | ⏳ Session A (Batch 1.B1) | New `tenant_invitations` table + `require-tenant-admin` middleware. |
| Role grant / revoke | `/api/v1/roles/grant`, `/api/v1/roles/revoke` | ✅ existing | Already correct; Members UI consumes these directly. |
| Tenant-scoped admin users list | `/api/v1/admin/users?tenant_id=…` | ⚠️ needs extension | Currently gates on `exafy_admin` only; Batch 1.B1 adds tenant-admin token support. |
| Per-tenant assistant config | `/api/v1/admin/tenants/:tenantId/assistant/:surfaceKey` | ⏳ Batch 1.B2 | New `tenant_assistant_config` table + `getEffectiveConfig()` merge in `ai-personality-service.ts`. |
| Per-tenant KB | `/api/v1/admin/tenants/:tenantId/kb/*` | ⏳ Batch 1.B2 | New `kb_documents` (tenant_id nullable) + `tenant_kb_baseline_optouts` tables. |
| Overview summary aggregation | `/api/v1/admin/tenants/:tenantId/overview/summary` | ⏳ Batch 1.D | Single JSON blob for dashboard top-strip KPIs. |

---

## Git hygiene (required)

1. **Always work in a worktree**: `git worktree add /tmp/vitana-<feature> -b claude/<feature> origin/main`. Never commit directly to `main`.
2. **One PR per batch**. Rebase on the other session's merged work before pushing.
3. **Never skip hooks** (`--no-verify`) unless the user explicitly asks.
4. **Update this file** before opening a PR and after merging. Bump the "Last updated" line.

## Global frame invariants (HARD RULE)

The ORB widget, ProfileDrawer (including role switcher with all 7 roles for exafy_admin), and the sidebar are **pixel-identical on every screen for every role**. Only the sidebar item list changes between roles.

- Every admin page wraps its content in `<AppLayout>` — no parallel admin layout.
- Sidebar items are derived from `getRoleNavigation('admin')` (which reads `ADMIN_SECTIONS`). AppLayout's path-override at line ~81 forces admin nav whenever the path starts with `/admin/`.
- ORB hook is called once at `src/App.tsx:276` (`AppHooksInitializer`). Never per-page.
- ProfileDrawer is mounted once in `AppLayout` SidebarFooter. Never duplicated.
- Vite dev server runs on port 8080 with `--host 0.0.0.0` so both sessions (WSL2 + Windows) can verify locally.
