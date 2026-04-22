# Vitana V1 — Community App

## Overview

VITANA community app (branded "MAXINA - Longevity Community"). React/Vite SPA with 551+ screens spanning community, health, AI, messaging, wallet, and admin features.

## Stack

- **Framework:** React 18 + TypeScript
- **Build:** Vite 5 (SWC plugin)
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** Zustand + TanStack React Query v5
- **Auth:** Supabase Auth (dual JWT — platform + community)
- **Routing:** React Router v6 (lazy-loaded routes)

## Build & Run

```bash
npm run dev       # Dev server on port 8080
npm run build     # Production build → dist/
npm run preview   # Preview production build
```

## Deployment (Dual — Parallel)

This app currently deploys to **two** hosts simultaneously:

| Host | URL | Trigger | Status |
|------|-----|---------|--------|
| **Cloud Run** | `community-app` service in `lovable-vitana-vers1` | `.github/workflows/DEPLOY.yml` on push to `main` | New (being verified) |
| **Lovable CDN** | `vitana-lovable-vers1.lovable.app` | Auto-deploy on push to `main` | Legacy (fallback) |

Once Cloud Run is verified working, Lovable will be decommissioned.

## Project Structure

```
src/
├── pages/          # Route page components (lazy-loaded)
├── components/     # 85+ component directories
│   └── ui/         # shadcn/ui primitives
├── hooks/          # 60+ custom hooks
├── contexts/       # React context providers
├── lib/            # Utilities (supabase client, etc.)
├── types/          # TypeScript type definitions
└── App.tsx         # Main router (1200+ lines, all routes)
```

## Environment

`.env` contains `VITE_*` vars baked at build time (public keys only):
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase connection
- `VITE_GATEWAY_URL` — Backend API (`gateway-*.run.app`)
- `VITE_OPERATOR_BASE_URL` — Operator API
- `VITE_DEV_HUB_ENABLED` — Dev Hub feature flag

## Multi-Repo Context

This is the **frontend** repo. The backend is in `exafyltd/vitana-platform`:
- **Backend API + Command Hub:** `vitana-platform/services/gateway/`
- **This app calls:** `VITE_GATEWAY_URL` for all API requests
- **Both repos** should be available in every Claude Code session

## Testing

**Test user UUID:** `a27552a3-0257-4305-8ed0-351a80fd3701`
Use this user when an authenticated user is needed for testing (e.g., Playwright screenshots, API calls, profile checks).

## Key Patterns

- **Mobile-first:** `useIsMobile()` hook, MobileAppShell wrapper
- **Role-based:** Community, Professional, Staff, Admin, Dev roles
- **Multi-tenant:** TenantProvider for portal-specific branding
- **Offline support:** OfflineProvider + LocalStorage query persistence
- **Auth flow:** Supabase Auth → role check → route guard

---

## Design System (DESIGN.md is authoritative)

**`DESIGN.md` at repo root is the single source of truth for every UI decision.** Read it before writing or refactoring any screen or component.

### Binding rules

1. **Reuse before create.** Every token, class, component, and screen pattern documented in `DESIGN.md` already exists. Use them.
2. **Never introduce a new** CSS variable, Tailwind extension, `src/components/ui/` primitive, font size, spacing value, radius, shadow, or variant **without updating `DESIGN.md` first** — and `DESIGN.md` only documents what already exists.
3. **No raw palette classes.** No `bg-gray-300`, `bg-red-600`, `text-blue-500`. Use semantic tokens: `bg-muted`, `bg-destructive`, `bg-primary`, `bg-pill-*`, `bg-domain-*`, etc. The full token catalog is in `DESIGN.md §B.1`.
4. **No arbitrary values.** No `w-[317px]`, `px-[13px]`, `text-[13px]`, `style={{ padding: 'NNpx' }}`, `style={{ minHeight: 'NNNpx' }}`. Use Tailwind's scale or the documented layout tokens (`--row-base`, `--grid-gap`, etc.).
5. **Cite on deviation.** If a change must diverge, the PR description cites the exact `§-number`. One-off exceptions get a `/* design-exception: §… */` comment at the site.
6. **Three canonical reference screens** — new screens copy one of these: `src/pages/Sharing.tsx:1–87` (baseline), `src/pages/Health.tsx:1–79` (multi-section), `src/pages/Home.tsx:14–67` (mobile-first).

### MANDATORY SCREEN CONTRACT

Every non-auth screen must render this tree. No exceptions without citing `DESIGN.md §B.6`.

```tsx
<AppLayout>
  <SEO title="…" description="…" />
  <SubNavigation items={<role|domain>Navigation} />
  <div className="p-6 min-h-screen pb-24">
    <div className="max-w-7xl mx-auto space-y-6">
      <StandardHeader title="…" emoji="…" subtitle="…" />
      <UtilityActionButton>
        <ExpandableSearchButton … />
        <UniversalCalendarButton />
        {/* domain-specific action buttons */}
      </UtilityActionButton>
      <SplitBar …>{/* only when 2+ sections */}</SplitBar>
      {/* page content */}
    </div>
  </div>
</AppLayout>
```

- `max-w-7xl` — not `max-w-2xl`, not `max-w-5xl`.
- Outer: `p-6 min-h-screen pb-24`. Inner: `max-w-7xl mx-auto space-y-6`.
- Background: `bg-background` or the documented gradient. Do **not** invent gradients.
- **Search lives ONLY inside `UtilityActionButton`.**
- Mobile: `StandardHeader` collapses to a single `<h1>`; `UtilityActionButton` still renders.

### Component primitive rules

- **Only use components under `src/components/ui/`** (86 files) and the composition wrappers `AppLayout`, `SEO`, `SubNavigation`, `StandardHeader`, `UtilityActionButton`, `ExpandableSearchButton`, `UniversalCalendarButton`, `SplitBar`, `MobileModePill`, `VitanaIndexChip`, `AutopilotChip`.
- If a primitive doesn't fit, open a discussion — do not quietly fork or clone one.
- List patterns follow `docs/design-system/horizontal-list-patterns.md` (Standard / Visual variants).

### Smoke test for compliance

Reject any diff that introduces: raw hex colors, raw Tailwind palette classes, arbitrary pixel values in `className` or `style`, a new CSS custom property, a new file under `src/components/ui/`, a search input outside `UtilityActionButton`, or a `max-w-*` smaller than `7xl` on a role dashboard.

*Cross-repo:* `DESIGN.md` here must stay identical to `vitana-platform/DESIGN.md`. Any change requires a synced PR in both repos.
