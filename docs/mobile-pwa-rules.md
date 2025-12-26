# VITANA Mobile PWA - Global Rules

> **This document defines mandatory rules for all mobile PWA development.**  
> Desktop experience remains unchanged.

---

## 1. Full-Screen Overlay Rule

- All popups, dialogs, and sheets must be full-screen on mobile (`fixed inset-0`)
- Use the shared `MobileFullScreenSheet` wrapper component for all mobile overlays
- Desktop-style centered modals are **NOT** permitted on mobile

```tsx
// ✅ Correct
<MobileFullScreenSheet open={open} onClose={onClose}>
  <EventDetail event={event} />
</MobileFullScreenSheet>

// ❌ Wrong
<Dialog className="max-w-md mx-auto">
  <EventDetail event={event} />
</Dialog>
```

---

## 2. Hybrid Browsing Model

| Content Type | Navigation | Gesture | Controls |
|-------------|------------|---------|----------|
| Events / Meetups / Live Rooms | Horizontal, full-screen | Swipe left/right | Left/right arrows visible |
| Shorts / short-form media | Vertical, full-screen | Swipe up/down | — |

### Rules:
- Horizontal navigation must support **both** swipe gestures AND visible left/right controls
- Only preload **next 1 item** (performance constraint)
- Use `embla-carousel-react` for horizontal carousels

---

## 3. Share System Rules

### URL Structure
- Preserve language in all share URLs: `?lang=de|en`
- Public share pages use `/pub/*` routes (load without authentication)
- Example: `/pub/event/{slug}?lang=de`

### Auth Flow Parameter Preservation
- After inline auth, return user to **exact CTA action context**
- Preserve these parameters through auth:
  - `redirectTo` (original page)
  - `?lang=` (language preference)
  - UTM parameters (`utm_source`, `utm_medium`, etc.)

### Instagram Story Fallback
- Provide pre-formatted caption with emoji and CTA
- Example: `🌿 Join me at [Event Name]! 👉 vitana.app/pub/event/xyz`

---

## 4. ORB Mode Rules

Single ORB with centralized `orbMode` state in `StreamingStateContext`:

```typescript
type OrbMode = 'browse' | 'action' | 'live';
```

| Mode | Trigger | Mic | UI |
|------|---------|-----|-----|
| `browse` | Default on feeds/players | ✅ Allowed | Floating ORB button + panel |
| `action` | Autopilot suggestion | ✅ Allowed | Panel with suggestion cards |
| `live` | Enter Live Room | ❌ Blocked | Collapsed pill (text-only) |

### Critical Rules:
- ORB **never** steals mic in Live Rooms without explicit user confirmation
- When `orbMode = 'live'`, ORB must visually indicate voice is disabled:
  - Muted/grayed color
  - "Text only" badge visible
  - Tap opens text input, not mic

### State Machine Transitions
```
browse ←→ action  (free transition)
browse → live     (entering live room)
action → live     (entering live room from action)
live → browse     (exiting live room)
live → action     ❌ NOT ALLOWED (must exit live first)
```

---

## 5. Live Room Mic-Switch Flow

When user wants ORB voice while in a Live Room:

1. User taps ORB pill → selects "Use ORB voice"
2. **Confirmation dialog**: "Switch mic to ORB? Room audio will be muted."
3. If confirmed:
   - Pause room mic (`useAudioPriority` handles this)
   - Activate ORB mic
   - Show "Return mic to room" button
4. On return:
   - Stop ORB mic
   - Resume room mic
   - ORB returns to text-only pill state

---

## 6. i18n Rules (German-First)

### Auto-Detection
```typescript
const defaultLang = navigator.language.startsWith('de') ? 'de' : 'en';
```

### Persistence
- User override via menu toggle
- Language persisted via:
  - `localStorage.setItem('vitana-lang', lang)`
  - `?lang=` parameter in shared links

### Translation Files
- All critical strings for all 14 mobile surfaces must exist in:
  - `src/locales/de.json`
  - `src/locales/en.json`

### Skeleton Loader Styling
- Match content shape (cards, text blocks)
- Shimmer animation
- German placeholder text in development

---

## 7. Performance Non-Negotiables

These are **phase gates** — do not advance phases without validation:

| Requirement | Target |
|-------------|--------|
| Route-level code splitting | Every `/m/*` route |
| Skeleton loaders | All content surfaces |
| Media preload | Next 1 item only |
| WebRTC stream caching | ❌ Never cache |
| Speak → filter latency | < 600ms |
| Device validation | Mid-tier Android (Pixel 4a class) |

### Lazy Loading Pattern
```typescript
const MobileEventFeed = lazy(() => import('./surfaces/MobileEventFeed'));
```

---

## 8. Mobile Routing

### Route Structure
```
/m/                    → Mobile home
/m/events              → Event feed (horizontal browse)
/m/meetups             → Meetup feed
/m/live                → Live rooms
/m/shorts              → Shorts (vertical scroll)
/m/wallet              → Wallet full-screen
/m/calendar            → Calendar full-screen
/pub/event/:slug       → Public event share page
/pub/meetup/:slug      → Public meetup share page
```

### Rules:
- Use dedicated `/m/*` routes with `MobileLayout` wrapper
- Mobile surfaces must **NOT** reuse desktop routes or layouts
- Desktop routing and UI remain completely unchanged
- `MobileLayout` includes:
  - Bottom navigation
  - ORB integration
  - Safe area handling

---

## 9. Component Architecture

### Shared Components (Mobile)
```
src/components/mobile/
├── MobileLayout.tsx           # Main wrapper with bottom nav
├── MobileFullScreenSheet.tsx  # Full-screen overlay wrapper
├── MobileBottomNav.tsx        # Bottom navigation
├── HorizontalCarousel.tsx     # Embla-based horizontal scroll
└── OrbPill.tsx                # Collapsed ORB for live mode
```

### Surface Components
```
src/components/mobile/surfaces/
├── MobileEventFeed.tsx
├── MobileMeetupFeed.tsx
├── MobileLiveRooms.tsx
├── MobileShorts.tsx
├── MobileWallet.tsx
└── MobileCalendar.tsx
```

---

## 10. Community Surface Special Case

Community is a **social aggregation lens**, not a standalone category.

### Sticky Pills
- Top sticky bar with filter pills: `Events | Meetups | Live | People`
- Pills switch content filter, **not routes**
- All content remains within `/m/community` route
- Reset scroll position on pill switch

### Purpose
"What is happening with people right now?" — Community aggregates social activity across events, meetups, live rooms, and people into a single lens.

```tsx
// ✅ Correct - Pills filter within same route
<CommunityPills 
  options={['Events', 'Meetups', 'Live', 'People']}
  activeFilter={filter}
  onFilterChange={setFilter}
/>

// ❌ Wrong - Navigating to separate routes
<Link to="/m/events">Events</Link>
```

---

## 11. Bottom Navigation Customization

### Default Configuration
| Position | Default | Fixed |
|----------|---------|-------|
| 1 | Events | No |
| 2 | Community | No |
| CENTER | **ORB** | **Yes** |
| 3 | Wallet | No |
| 4 | Profile | No |

### Customization Rules
- **ORB is permanently fixed** in center position
- User can customize 4 tab positions via Settings
- Suggestions are **never automatic** — user-initiated only
- Available destinations: Events, Community, Wallet, Profile, Health, Calendar, Messages, Live, Shorts, Services

### Eligible Tab Destinations
```typescript
const BOTTOM_NAV_ELIGIBLE = [
  { id: 'events', label: 'Events', route: '/m/events' },
  { id: 'community', label: 'Community', route: '/m/community' },
  { id: 'wallet', label: 'Wallet', route: '/m/wallet' },
  { id: 'profile', label: 'Profile', route: '/m/profile' },
  { id: 'health', label: 'Health', route: '/m/health' },
  { id: 'calendar', label: 'Calendar', route: '/m/calendar' },
  { id: 'messages', label: 'Messages', route: '/m/messages' },
  { id: 'live', label: 'Live', route: '/m/live' },
  { id: 'shorts', label: 'Shorts', route: '/m/shorts' },
  { id: 'services', label: 'Services', route: '/m/services' },
];
```

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2024-12-26 | Added Community Sticky Pills rule (Section 10) | — |
| 2024-12-26 | Added Bottom Navigation Customization rule (Section 11) | — |
| 2024-12-22 | Initial version from Implementation Plan v2 | — |
