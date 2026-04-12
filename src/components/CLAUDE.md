# src/components/ — UI Components

## Structure

This directory has two types of contents:
1. **Root-level components** (~70 .tsx files) — standalone popups, guards, headers, overlays
2. **Feature subdirectories** (45 dirs) — grouped by domain

## Root-Level Components (key files)

| File | Purpose |
|------|---------|
| `ProtectedRoute.tsx` | Auth guard — redirects unauthenticated users to `/login` |
| `AuthGuard.tsx` | Role-based route guard |
| `AppLayout.tsx` | Main app layout wrapper |
| `PageHeader.tsx` | Standard page header |
| `StandardHeader.tsx` | Standard header variant |
| `ScreenScaffold.tsx` | Universal screen template |
| `SubNavigation.tsx` | Tab-based sub-navigation |
| `GlobalSearch.tsx` | Global search overlay |
| `NotificationBell.tsx` | Notification bell with badge |
| `TenantDetector.tsx` | Multi-tenant detection |
| `RTLProvider.tsx` | Right-to-left language support |
| `SEO.tsx` | SEO meta tags |
| `OnboardingOverlay.tsx` | First-time user onboarding |
| `MilestoneCelebration.tsx` | Achievement celebration |
| `ErrorNotificationStack.tsx` | Error notification display |
| `CallManager.tsx` | Call state manager |
| `CallingScreen.tsx` | Active call UI |
| `IncomingCallModal.tsx` | Incoming call modal |
| `LiveRoom.tsx` | Live room container |
| `MiniAudioPlayer.tsx` | Persistent audio player |
| `AutopilotPopup.tsx` | Autopilot actions popup |
| `MasterActionPopup.tsx` | Master action trigger |

## Popup Components (root level)

Most root-level files are popups that overlay the main UI:
`AddToAIFeedPopup`, `BillingActionPopup`, `BrowseServicesPopup`, `BusinessFiltersPopup`, `CalendarPopup`, `ConnectAppPopup`, `ConsentPackagePopup`, `CreateContentPopup`, `CreateEventPopup`, `CreateGroupPopup`, `CreateLiveRoomDialog`, `CreateMeetupPopup`, `CreatePackagePopup`, `CreateServicePopup`, `EditMeetupPopup`, `EnrichContextPopup`, `GoLivePopup`, `LabTestOrderPopup`, `ManageConsentPopup`, `ManageMyActionsPopup`, `MatchFiltersPopup`, `MediaUploadPopup`, `NewConversationPopup`, `NewTicketPopup`, `PrivacyAuditPopup`, `QuickSetupPopup`, `ResetDefaultsPopup`, `SmartPackagePopup`, `ViewDetailsPopup`, `WalletPopup`

## Feature Subdirectories

| Directory | Domain | Key contents |
|-----------|--------|-------------|
| `ui/` | shadcn/ui primitives | button, dialog, form, input, tabs, card, sheet, dropdown, etc. |
| `auth/` | Authentication | Login forms, registration, role selector |
| `home/` | Home dashboard | Feed cards, daily priority, context cards |
| `community/` | Community features | Member cards, community feed, social features |
| `events/` | Events | Event cards, creation, participation, tickets |
| `meetups/` | Meetups | Meetup cards, scheduling, RSVP |
| `groups/` | Groups | Group cards, directory, membership |
| `liverooms/` | Live rooms | Room UI, participant list, controls |
| `health/` | Health tracking | Health cards, trackers, plans, biomarkers |
| `ai/` | AI assistant | AI chat, insights, recommendations |
| `ai-feed/` | AI feed | AI-powered content feed |
| `messages/` | Messaging | Chat UI, thread view, message bubbles |
| `chat/` | Chat components | Chat input, chat list, real-time chat |
| `wallet/` | Wallet & payments | Balance display, transaction list, rewards |
| `billing/` | Billing | Subscription management, invoices |
| `payment/` | Payment | Stripe integration, checkout flow |
| `cart/` | Shopping cart | Cart items, checkout |
| `orders/` | Orders | Order history, tracking |
| `tickets/` | Tickets | Ticket purchase, display |
| `profile/` | User profile | Profile display, edit, gallery |
| `settings/` | User settings | Preferences, notifications, privacy |
| `contacts/` | Contacts | Contact list, sync |
| `coaches/` | Coaches | Coach profiles, booking |
| `creator/` | Creator tools | Content creation, publishing |
| `diary/` | Diary | Daily diary entries, insights |
| `memory/` | Memory | Timeline, recall, reinforcement |
| `discover/` | Discovery | Marketplace, browse, search |
| `discovery/` | Discovery (alternate) | Service discovery, recommendations |
| `sharing/` | Data sharing | Campaign creation, distribution, consent |
| `supplements/` | Supplements | Supplement tracking |
| `analysis/` | Analytics | Data analysis views |
| `proactive/` | Proactive features | Proactive suggestions, growth |
| `feedback/` | Feedback | User feedback collection |
| `notifications/` | Notifications | Notification list, settings |
| `calendar/` | Calendar | Calendar views, event scheduling |
| `admin/` | Admin tools | User management, tenant config, analytics |
| `dev/` | Dev tools | Dev hub components (modals, status panels) |
| `assistant/` | AI assistant | Voice assistant, orb widget |
| `audio/` | Audio | Audio player, soundscapes |
| `vertex/` | Vertex AI | Vertex integration UI |
| `actions/` | Actions | Action cards, automation triggers |
| `capture/` | Media capture | Photo/video capture |
| `templates/` | Templates | Reusable content templates |
| `reseller/` | Reseller | Reseller dashboard, payouts |
| `voucher/` | Vouchers | Voucher creation, redemption |
| `vitanaland/` | Vitanaland | Special event pages |
| `crossover/` | Crossover | Cross-feature integration |
| `mobile/` | Mobile-specific | Mobile-optimized components |
| `layout/` | Layout | Layout wrappers, shells |
| `bookmarks/` | Bookmarks | Bookmark management |
| `business/` | Business | Professional/business features |
| `context/` | Context display | User context visualization |
| `debug/` | Debug tools | Debug panels |
| `icons/` | Custom icons | App-specific icons |
| `legal/` | Legal | Privacy policy, terms, support |

## Patterns

- Every component uses Tailwind classes for styling
- Use `cn()` from `@/lib/utils` for conditional class composition
- Popups use shadcn `Dialog` or `Sheet` from `@/components/ui/`
- Cards use shadcn `Card` from `@/components/ui/card`
- Forms use React Hook Form + shadcn Form components
- Data display components receive data via props from parent pages that use hooks
