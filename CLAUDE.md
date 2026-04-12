# Vitana V1 — Community App

## What This Is

React/Vite SPA branded "MAXINA - Longevity Community". 551+ screens spanning community, health, AI, messaging, wallet, and admin. This is the **frontend** repo. The backend is `exafyltd/vitana-platform` at `/home/user/vitana-platform/`.

## Commands

```bash
npm run dev          # Dev server → http://localhost:8080
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run lint         # ESLint check
```

No test suite exists in this repo. E2E tests live in `vitana-platform/e2e/`.

## Stack

- **React 18.3** + **TypeScript 5.8** + **Vite 5.4** (SWC)
- **Tailwind CSS 3.4** + **shadcn/ui** (40+ Radix primitives)
- **React Router v6** (lazy-loaded routes, guards)
- **TanStack React Query v5** (server state, localStorage persistence)
- **Zustand** (client state — 1 store: `userInterestsStore`)
- **React Context** (13 providers — auth, profile, tenant, offline, etc.)
- **Supabase Auth** (dual JWT — platform + community)
- **Framer Motion** (animations)
- **Stripe** (payments)
- **Daily.co** (WebRTC video)

## Path Alias

`@/*` → `./src/*` (configured in tsconfig and vite.config.ts)

## Directory Map

```
vitana-v1/
├── src/
│   ├── App.tsx                    # Master router — 150+ lazy routes, ALL route definitions
│   ├── main.tsx                   # Entry point — QueryClient, persistence, axe-core
│   ├── index.css                  # Global Tailwind styles (32KB)
│   ├── components/                # UI components — 56 subdirectories + 70 root-level components
│   │   └── ui/                    # shadcn/ui primitives (button, dialog, form, etc.)
│   ├── pages/                     # Route page components — 41 top-level + 19 subdirectories
│   ├── hooks/                     # 169 custom hooks
│   ├── lib/                       # 70 utility files — API clients, transformers, analytics
│   ├── context/                   # 13 React Context providers
│   ├── services/                  # 5 service files — voice, live rooms, vertex, greetings
│   ├── types/                     # 19 TypeScript type definition files
│   ├── stores/                    # Zustand stores (userInterestsStore.ts)
│   ├── config/                    # Navigation maps, tenant mapping, dev config
│   ├── integrations/supabase/     # Supabase client + auto-generated types (412KB)
│   ├── data/                      # Mock data (recipes, plans)
│   ├── utils/                     # Helper functions
│   ├── layouts/                   # Page layout components
│   └── generated/                 # Auto-generated files (route extraction)
├── supabase/
│   ├── functions/                 # 73 Supabase Edge Functions
│   ├── migrations/                # 200+ database migrations
│   └── config.toml                # Supabase project config
├── config/                        # Card templates, system cards, slots
├── docs/                          # 25+ reference documents (screen registry, API inventory, etc.)
├── public/                        # Static assets
├── .github/workflows/DEPLOY.yml   # Cloud Run deployment pipeline
├── Dockerfile                     # Multi-stage build (node→nginx)
├── nginx.conf                     # SPA fallback routing
├── vite.config.ts                 # Vite config (port 8080, SWC, @ alias)
├── tailwind.config.ts             # Tailwind config (custom colors, screens, fonts)
├── components.json                # shadcn/ui config
└── .env                           # VITE_* build-time vars (public keys only)
```

## Key Files — Read These First

| File | What it does | When to read it |
|------|-------------|-----------------|
| `src/App.tsx` | ALL 150+ routes defined here with lazy imports, guards, providers | Adding/moving routes, understanding page structure |
| `src/main.tsx` | QueryClient config, cache persistence, axe-core init | Debugging startup, query behavior |
| `src/integrations/supabase/client.ts` | Supabase client init | Any Supabase interaction |
| `src/integrations/supabase/types.ts` | Auto-generated DB types (412KB) | Understanding table shapes |
| `src/context/AuthProvider.tsx` | Auth session management | Auth flow issues |
| `src/context/ProfileProvider.tsx` | User profile data + caching | Profile data access patterns |
| `src/context/OfflineProvider.tsx` | Offline detection + fallback | Offline behavior |
| `src/config/navigation.ts` | Main navigation structure | Nav changes |
| `src/config/role-navigation.ts` | Role-based nav filtering | Role-specific menu items |
| `src/config/domain-tenant-mapping.ts` | Multi-tenant domain mapping | Tenant/portal issues |
| `src/lib/utils.ts` | Core utilities (cn, etc.) | Shared utility functions |
| `src/lib/analytics.ts` | Event tracking | Adding analytics events |

## Environment Variables

All `VITE_*` vars are baked at build time (public keys only):
- `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase connection
- `VITE_GATEWAY_URL` — Backend API (`https://gateway-q74ibpv6ia-uc.a.run.app/api/v1`)
- `VITE_OPERATOR_BASE_URL` — Operator API
- `VITE_DEV_HUB_ENABLED` — Dev Hub feature flag
- `VITE_EVENTS_BASE_URL` / `VITE_TASKS_BASE_URL` / `VITE_TASKS_STREAM_URL` — SSE streaming

## Route Structure

Routes are defined in `src/App.tsx`. Main groups:

| Route prefix | Page directory | Auth | Purpose |
|---|---|---|---|
| `/` | `pages/Index.tsx` | Public | Landing |
| `/auth/*` | `pages/auth/` | Public | Auth flows |
| `/login` | `pages/Login.tsx` | Public | Portal selector |
| `/home/*` | `pages/home/` | Protected | Home dashboard, context, AI feed |
| `/ai/*` | `pages/ai/` | Protected | AI assistant, insights |
| `/comm/*` | `pages/community/` | Protected | Community hub, events, meetups, live rooms |
| `/discover/*` | `pages/discover/` | Protected | Marketplace |
| `/health/*` | `pages/health/` | Protected | Health tracking, biology, plans |
| `/inbox/*` | `pages/messages/` | Protected | Messages, reminders |
| `/wallet/*` | `pages/wallet/` | Protected | Balance, subscriptions, rewards |
| `/sharing/*` | `pages/sharing/` | Protected | Data sharing, campaigns |
| `/memory/*` | `pages/memory/` | Protected | Timeline, diary, recall |
| `/business/*` | `pages/professional/` | Protected | Professional hub |
| `/admin/*` | `pages/admin/` | Admin guard | Admin dashboard |
| `/dev/*` | `pages/dev/` | Dev guard | Developer hub (50+ pages) |
| `/portals/*` | `pages/portals/` | Portal-specific | Multi-tenant portals |

## Auth & Access Control

- **AuthProvider** (`src/context/AuthProvider.tsx`) — Supabase session management
- **ProtectedRoute** (`src/components/ProtectedRoute.tsx`) — Redirects to `/login` if unauthenticated
- **AuthGuard** (`src/components/AuthGuard.tsx`) — Role-based access check
- **Roles**: Community, Professional, Staff, Admin, Dev
- **Hook**: `useRole()` from `src/hooks/useRole.tsx`
- **Tenant**: `useTenant()` from `src/hooks/useTenant.tsx`

## Cross-Repo API Map

This app calls the backend at `VITE_GATEWAY_URL`. Key mappings:

| Frontend hook/lib | Backend route file | Purpose |
|---|---|---|
| `hooks/useChatApi.ts` | `routes/chat.ts` | Chat messages |
| `hooks/use-autopilot.ts` | `routes/autopilot.ts` | Autopilot actions |
| `hooks/useCommunityEvents.ts` | `routes/events.ts` | Event CRUD |
| `hooks/useLiveRoom.ts` | `routes/live.ts` | Live room management |
| `hooks/useMessages.ts` | `routes/conversation.ts` | Messaging |
| `hooks/useWallet.ts` | `routes/financial-monetization.ts` | Wallet/payments |
| `hooks/useHealthPlans.ts` | `routes/health.ts` | Health data |
| `hooks/useTaskStream.ts` | `routes/tasks.ts` | Task streaming (SSE) |
| `lib/commandHubApi.ts` | `routes/command-hub.ts` | Command hub API |
| `lib/taskApi.ts` | `routes/oasis-tasks.ts` | OASIS task API |
| `lib/community-gateway.ts` | Multiple routes | Community gateway client |
| `lib/devGatewayClient.ts` | Multiple routes | Dev gateway client |

## Deployment

Dual deployment (Cloud Run is primary, Lovable CDN is legacy fallback):

| Host | Service | Trigger |
|---|---|---|
| Cloud Run | `community-app` in `lovable-vitana-vers1` | `.github/workflows/DEPLOY.yml` on push to `main` |
| Lovable CDN | `vitana-lovable-vers1.lovable.app` | Auto-deploy on push to `main` (being decommissioned) |

## Architecture Rules — Do Not Violate

1. **Mobile-first**: Always use `useIsMobile()` hook. Test mobile layouts.
2. **Lazy-load routes**: All non-critical routes must use `React.lazy()` in `App.tsx`.
3. **Role-based access**: Never show admin/dev features to community users. Use guards.
4. **Multi-tenant**: Use `TenantProvider` for portal-specific branding. Never hardcode tenant-specific UI.
5. **Offline support**: Critical reads should fall back to cached data via `OfflineProvider`.
6. **No direct Supabase writes from components**: Use hooks that go through the gateway API.
7. **shadcn/ui for primitives**: Use `@/components/ui/*` for buttons, dialogs, forms, etc. Don't reinvent.
8. **Tailwind only**: No CSS modules, no styled-components, no inline styles on structural elements.
9. **Path alias**: Always import with `@/` prefix, never relative paths like `../../`.

## Common Tasks

### Add a new page
1. Create page component in `src/pages/{section}/` or `src/pages/`
2. Add lazy import in `src/App.tsx`
3. Add `<Route>` in the appropriate section of `App.tsx`
4. If protected: wrap with `<ProtectedRoute>` or appropriate guard

### Add a new component
1. Check if a shadcn/ui primitive exists first (`src/components/ui/`)
2. Create in the appropriate feature directory under `src/components/`
3. Use `cn()` from `@/lib/utils` for conditional class merging

### Add a new hook
1. Create in `src/hooks/`
2. Prefix with `use` (e.g., `useMyFeature.ts`)
3. For data fetching: use TanStack Query's `useQuery`/`useMutation`
4. For Supabase data: use the typed client from `@/integrations/supabase/client`

### Add a new API integration
1. Check if a hook already exists in `src/hooks/`
2. Check if a lib client exists in `src/lib/` (gateway client, task API, etc.)
3. Use `VITE_GATEWAY_URL` for backend calls
4. Always handle loading/error states with TanStack Query

## Graphify Integration (Phase 2)

When Graphify is available, use it to answer:
- "What components use this hook?" — graph traversal instead of grep
- "What happens when I change this type?" — follow imports through the dependency chain
- "What API does this page call?" — trace component → hook → lib → backend route

Keep CLAUDE.md for rules and architecture. Use Graphify for dynamic relationships.

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `python3 -c "from graphify.watch import _rebuild_code; from pathlib import Path; _rebuild_code(Path('.'))"` to keep the graph current
