# src/pages/ — Route Page Components

## Structure

Pages are the top-level components rendered by React Router routes defined in `src/App.tsx`.

- **Root-level pages** (41 .tsx files) — standalone pages
- **Subdirectories** (19 dirs) — grouped by feature domain

## Root-Level Pages

| File | Route | Purpose |
|------|-------|---------|
| `Index.tsx` | `/` | Landing page |
| `Home.tsx` | `/home` | Home dashboard |
| `Login.tsx` | `/login` | Auth portal selector |
| `Auth.tsx` | `/auth` | Auth page |
| `Register.tsx` | `/register` | Registration |
| `Logout.tsx` | `/logout` | Logout handler |
| `Community.tsx` | `/comm` | Community hub |
| `Health.tsx` | `/health` | Health dashboard |
| `HealthTracker.tsx` | `/health/tracker` | Health tracker |
| `AI.tsx` | `/ai` | AI assistant |
| `Discover.tsx` | `/discover` | Discovery marketplace |
| `Messages.tsx` | `/inbox` | Message inbox |
| `Memory.tsx` | `/memory` | Memory hub |
| `Wallet.tsx` | `/wallet` | Wallet dashboard |
| `Sharing.tsx` | `/sharing` | Data sharing hub |
| `Profile.tsx` | `/profile` | User profile |
| `EditProfilePage.tsx` | `/profile/edit` | Profile editor |
| `PublicProfilePage.tsx` | `/profile/:id` | Public profile view |
| `Settings.tsx` | `/settings` | User settings |
| `MobileSettings.tsx` | `/settings/mobile` | Mobile settings |
| `Calendar.tsx` | `/calendar` | Calendar view |
| `Cart.tsx` | `/cart` | Shopping cart |
| `Search.tsx` | `/search` | Global search |
| `BusinessHub.tsx` | `/business` | Professional hub |
| `MobileDailyDiary.tsx` | `/diary` | Mobile diary |
| `AutopilotDashboard.tsx` | `/autopilot` | Autopilot dashboard |
| `InviteFriends.tsx` | `/invite` | Friend invitations |
| `IntroExperience.tsx` | `/intro` | First-time experience |
| `CreatorOnboarded.tsx` | `/creator/onboarded` | Creator onboarding complete |
| `MyTickets.tsx` | `/tickets` | User's tickets |
| `TicketDemo.tsx` | `/ticket-demo` | Ticket demo page |
| `CheckoutSuccess.tsx` | `/checkout/success` | Payment success |
| `TicketPurchaseSuccess.tsx` | `/ticket/success` | Ticket purchase success |
| `PackagePurchaseSuccess.tsx` | `/package/success` | Package purchase success |
| `RedeemVoucher.tsx` | `/redeem` | Voucher redemption |
| `PublicEventLanding.tsx` | `/event/:slug` | Public event page |
| `PublicCampaignLanding.tsx` | `/campaign/:id` | Public campaign page |
| `ShareEntry.tsx` | `/share-entry` | Share link entry |
| `NotFound.tsx` | `*` | 404 page |
| `NotAuthorized.tsx` | `/not-authorized` | 403 page |

## Subdirectories

| Directory | Route prefix | Contents |
|-----------|-------------|----------|
| `admin/` | `/admin/*` | Admin dashboard, user management, tenants, analytics |
| `ai/` | `/ai/*` | AI assistant detail pages, insights |
| `assistant/` | `/assistant/*` | Voice assistant pages |
| `auth/` | `/auth/*` | Auth flow pages (callback, reset, confirm) |
| `community/` | `/comm/*` | Events, meetups, live rooms, members |
| `dev/` | `/dev/*` | Developer hub (50+ pages — dashboard, agents, gateway, VTID, pipelines, CI/CD, observability) |
| `discover/` | `/discover/*` | Discovery sub-pages |
| `health/` | `/health/*` | Health sub-pages (biology, plans, services) |
| `home/` | `/home/*` | Home sub-pages (context, actions, matches, AI feed) |
| `legal/` | `/legal/*` | Privacy policy, terms, support |
| `memory/` | `/memory/*` | Memory timeline, diary, recall |
| `messages/` | `/inbox/*` | Message threads, reminders, inspiration |
| `patient/` | `/patient/*` | Patient-specific pages |
| `portals/` | `/portals/*` | Multi-tenant portal pages (Maxina, Alkalma, Earthlinks, Community) |
| `professional/` | `/business/*` | Professional dashboard pages |
| `settings/` | `/settings/*` | Settings sub-pages |
| `sharing/` | `/sharing/*` | Campaign, distribution, consent pages |
| `staff/` | `/staff/*` | Staff-specific pages |
| `wallet/` | `/wallet/*` | Wallet sub-pages (balance, subscriptions, rewards) |

## Patterns

- All pages are lazy-loaded via `React.lazy()` in `App.tsx`
- Protected pages are wrapped with `<ProtectedRoute>` or role-specific guards
- Pages fetch data via hooks from `src/hooks/`
- Pages compose UI from components in `src/components/`
- Mobile variants use `useIsMobile()` for responsive behavior
- Page components should be thin — data fetching in hooks, UI in components
