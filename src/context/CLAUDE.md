# src/context/ — React Context Providers (13 files)

## Provider Hierarchy

Providers are nested in `src/App.tsx`. Order matters — inner providers can access outer ones.

## Provider Index

| File | Provider | State it holds | Key consumers |
|------|----------|---------------|---------------|
| `AuthProvider.tsx` | `AuthProvider` | Supabase auth session, user, loading state | Everything — wraps entire app |
| `AuthContext.ts` | `AuthContext` | Context type definition (used by AuthProvider) | AuthProvider internals |
| `ProfileProvider.tsx` | `ProfileProvider` | User profile data, profile loading, refresh | Profile pages, nav, headers |
| `OfflineProvider.tsx` | `OfflineProvider` | Online/offline status, cached data fallback | Data-fetching hooks, UI indicators |
| `SoundscapeContext.tsx` | `SoundscapeProvider` | Audio playback state, current track, volume | Audio player, soundscape pages |
| `StreamingStateContext.tsx` | `StreamingStateProvider` | SSE connection state, streaming data | Task stream, real-time features |
| `CallContext.tsx` | `CallProvider` | Active call state, call actions (join/leave/mute) | CallManager, CallingScreen, IncomingCallModal |
| `StripeProvider.tsx` | `StripeProvider` | Stripe Elements config | Payment pages, checkout |
| `EventSelectionContext.tsx` | `EventSelectionProvider` | Selected event for detail views | Event pages |
| `MeetupSelectionContext.tsx` | `MeetupSelectionProvider` | Selected meetup for detail views | Meetup pages |
| `IntelligentGreetingProvider.tsx` | `IntelligentGreetingProvider` | Dynamic greeting state, time-aware messaging | Home page greeting |
| `VitanalandNavigationContext.tsx` | `VitanalandNavigationProvider` | Vitanaland navigation state | Vitanaland pages |
| `ActiveVTIDContext.tsx` | `ActiveVTIDProvider` | Current active VTID for dev tracking | Dev hub pages |
| `ProfilePreviewProvider` | (in `hooks/useProfilePreview.tsx`) | Profile hover preview state | Profile cards, member lists |

## How to Access

```tsx
// Auth
import { useAuth } from '@/context/AuthProvider';
const { user, session, signOut } = useAuth();

// Profile
import { useProfile } from '@/context/ProfileProvider';
const { profile, isLoading } = useProfile();

// Offline
import { useOffline } from '@/context/OfflineProvider';
const { isOffline } = useOffline();

// Tenant (note: this is a hook, not a context)
import { useTenant } from '@/hooks/useTenant';
```

## Patterns

- Providers wrap the app in `App.tsx` — don't add new providers in page components
- To add a new provider: create file here, wrap in `App.tsx` at the right nesting level
- Keep providers focused — one concern per provider
- Auth and Profile are the most critical — almost everything depends on them
- Offline provider enables cache-first reads when network is down
