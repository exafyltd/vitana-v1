# src/lib/ — Utility Libraries (70 files)

## API Clients

| File | Purpose |
|------|---------|
| `commandHubApi.ts` | Command Hub API client (operator actions) |
| `taskApi.ts` | OASIS task API client |
| `community-gateway.ts` | Community gateway API wrapper |
| `devGatewayClient.ts` | Dev gateway API client |
| `OrbVoiceClient.ts` | Voice orb WebSocket client |
| `sseConnectionManager.ts` | SSE connection manager (Server-Sent Events) |
| `useSSE.ts` | SSE hook utility |

## Supabase & Auth

| File | Purpose |
|------|---------|
| `utils.ts` | Core utilities — `cn()` for Tailwind class merging, and more |
| `localStorage.ts` | localStorage wrapper with JSON serialization |
| `permissions.ts` | Permission checking utilities |
| `verification.ts` | User verification logic |
| `profileScope.ts` | Profile data scoping |
| `resolveProfileUserId.ts` | Profile user ID resolution |
| `vitanaBotIdentity.ts` | Vitana bot user identification |

## Transformers (data shape converters)

| File | Purpose |
|------|---------|
| `eventCardTransformers.ts` | Event → card display format |
| `eventTransformers.ts` | Event data transformers |
| `groupCardTransformers.ts` | Group → card display format |
| `rankingsCardTransformers.tsx` | Rankings → card format |
| `ticketCardTransformers.ts` | Ticket → card format |
| `ai-feed-transformers.ts` | AI feed data transformers |
| `autopilot-transformers.tsx` | Autopilot data transformers |

## Analytics & Tracking

| File | Purpose |
|------|---------|
| `analytics.ts` | Core analytics service |
| `analytics-events.ts` | Analytics event definitions |
| `horizontal-cards-analytics.ts` | Card scroll analytics |
| `horizontal-cards-slo.ts` | Card performance SLO tracking |
| `cta-taxonomy.ts` | CTA classification |

## Notifications & Audio

| File | Purpose |
|------|---------|
| `pushNotifications.ts` | Firebase push notification setup |
| `appilixNotificationFallback.ts` | Appilix notification fallback |
| `notification-types.ts` | Notification type definitions |
| `playSound.ts` | Sound effect playback |
| `playLoopingSound.ts` | Looping sound playback |
| `ios-audio-polyfill.ts` | iOS audio autoplay workaround |

## Firebase & External

| File | Purpose |
|------|---------|
| `firebase.ts` | Firebase initialization |
| `appilix.ts` | Appilix mobile bridge |

## Feature Utilities

| File | Purpose |
|------|---------|
| `feature-flags.ts` | Feature flag checks |
| `experiments.ts` | A/B experiment utilities |
| `screen-id.ts` | Screen ID mapping |
| `shareUrl.ts` | Share URL generation |
| `fileUpload.ts` | File upload utilities |
| `confetti.ts` | Celebration confetti animation |

## Content & Data

| File | Purpose |
|------|---------|
| `parseCalendarNL.ts` | Natural language calendar parsing |
| `calendarPendingQueue.ts` | Calendar pending event queue |
| `recipeUtils.ts` | Recipe data utilities |
| `planSummaryCalculator.ts` | Plan summary calculation |
| `messageStatus.ts` | Message delivery status |
| `campaign-templates.ts` | Campaign template definitions |

## Currency & Finance

| File | Purpose |
|------|---------|
| `currencies.tsx` | Currency definitions and formatting |
| `exchangeRates.ts` | Exchange rate data |
| `realExchangeRates.ts` | Live exchange rate fetching |

## i18n & Display

| File | Purpose |
|------|---------|
| `i18n-helpers.ts` | Internationalization helpers |
| `tenant-display.ts` | Tenant-specific display logic |
| `avatarPosition.ts` | Avatar positioning utility |
| `unsplashFallback.ts` | Fallback image from Unsplash |
| `preloadDemoImages.ts` | Demo image preloading |

## Event Utilities

| File | Purpose |
|------|---------|
| `eventsCtaUtils.ts` | Event CTA button logic |
| `eventPromotion.ts` | Event promotion utilities |

## Build & Component Helpers

| File | Purpose |
|------|---------|
| `withCardId.tsx` | HOC that adds card ID tracking |
| `embla-autoplay-plugin.ts` | Carousel autoplay config |
| `prefetch-registry.ts` | Route prefetch registry |
| `prefetchInboxThreads.ts` | Inbox thread prefetching |
| `vitanaIndex.ts` | Vitana index configuration |
| `buildOrbContext.ts` | Build context for voice orb |

## Mock Data

| File | Purpose |
|------|---------|
| `mockPlanData.ts` | Mock plan data for dev/testing |
| `mocks/` | Mock data directory |

## Key Patterns

- `utils.ts` exports `cn()` — use it everywhere for Tailwind class merging
- Transformers convert backend API shapes to frontend display shapes
- API clients use `fetch` with the gateway URL from env vars
- All analytics go through `analytics.ts` — never track directly
