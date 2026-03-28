# Lovable Implementation Instructions — Autopilot Onboarding, Milestones & Social Connect

> **GitHub Issue:** exafyltd/vitana-v1#12
> **Backend Gateway:** `https://gateway-86804897789.us-central1.run.app`
> **Existing Gateway Env Var:** `VITE_GATEWAY_URL` (fallback: `https://gateway-q74ibpv6ia-uc.a.run.app/api/v1`)

---

## IMPORTANT: Gateway URL

The backend for these new endpoints uses a **different** gateway URL than the existing one in the codebase.

**Existing code** uses: `import.meta.env.VITE_GATEWAY_URL || "https://gateway-q74ibpv6ia-uc.a.run.app/api/v1"`
**New endpoints** use: `https://gateway-86804897789.us-central1.run.app`

Create a new constant for the community autopilot gateway:

```typescript
// In a new file: src/lib/community-gateway.ts
import { supabase } from '@/integrations/supabase/client';

export const COMMUNITY_GATEWAY = 'https://gateway-86804897789.us-central1.run.app';

export async function communityFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Not authenticated');

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'X-Vitana-Active-Role': 'community',
    ...(options.headers as Record<string, string> || {}),
  };

  if (options.body && typeof options.body === 'string') {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(`${COMMUNITY_GATEWAY}${path}`, { ...options, headers });
}
```

---

## TASK 1: Autopilot Dashboard Page (Priority 1)

### 1A. Create the page file

**Create file:** `src/pages/AutopilotDashboard.tsx`

This is a **new standalone page** (not the existing `AutopilotSettings.tsx` which manages preferences). This page shows personalized onboarding tasks for community users.

**Use these existing patterns:**
- Wrap in `<AppLayout>` (from `@/components/AppLayout`)
- Use `<SEO>` component for meta tags
- Use `<StandardHeader>` for the page title
- Use shadcn `Card`, `CardHeader`, `CardContent`, `Button`, `Progress` from `@/components/ui/*`
- Use `useAuth()` from `@/context/AuthProvider` for the user/session

**Page behavior:**

1. On mount, fetch onboarding tasks:
```typescript
GET /api/v1/autopilot/recommendations
Headers: Authorization: Bearer <token>, X-Vitana-Active-Role: community
```
Response: `{ recommendations: [{ id, title, summary, status, source_ref, impact_score }] }`

2. Show a **progress bar** at top: `completed / total` tasks. Use the shadcn `<Progress>` component.

3. Render each task as a **Card** with:
   - Title and summary text
   - Status badge: "pending" (gray), "activated" (blue), "completed" (green)
   - A **"Start"** button for pending tasks
   - A **"+10 VTN"** badge/animation when completed (use green text with a coin icon)

4. When user taps **"Start"**:
```typescript
POST /api/v1/autopilot/recommendations/${rec.id}/activate
Headers: Authorization: Bearer <token>, X-Vitana-Active-Role: community
```
Response: `{ action_type: 'navigate' | 'notify', target: string, completion_message: string }`

- If `action_type === 'navigate'` → call `navigate(target)` (React Router `useNavigate`)
- If `action_type === 'notify'` → show a toast with the `completion_message` using `sonner` toast

5. Use `useQuery` from `@tanstack/react-query` with key `['autopilot-onboarding']` and staleTime of 2 minutes.

**UI Layout (mobile-first):**
```
┌────────────────────────────────┐
│ 🚀 Your Onboarding Journey    │
│ Complete tasks to earn VTN!    │
│                                │
│ ████████░░░░  5/8 completed    │  ← Progress bar
│                                │
│ ┌────────────────────────────┐ │
│ │ ✅ Complete your profile   │ │  ← completed task (green check, "+10 VTN" shown)
│ │    +10 VTN earned!         │ │
│ └────────────────────────────┘ │
│ ┌────────────────────────────┐ │
│ │ 📖 Write your first diary  │ │  ← pending task
│ │    Start your wellness...  │ │
│ │              [Start →]     │ │
│ └────────────────────────────┘ │
│ ┌────────────────────────────┐ │
│ │ 👥 Explore the community   │ │
│ │    Discover groups and...  │ │
│ │              [Start →]     │ │
│ └────────────────────────────┘ │
└────────────────────────────────┘
```

### 1B. Add the route

**Edit file:** `src/App.tsx`

Add the import at the top with the other lazy/direct page imports:
```typescript
import AutopilotDashboard from "./pages/AutopilotDashboard";
```

Add the route inside the `<Routes>` block, near the other top-level authenticated routes. Place it under an `<AuthGuard>`:
```tsx
<Route path="/autopilot" element={<AuthGuard><AutopilotDashboard /></AuthGuard>} />
```

**Do NOT** change the existing `/settings/autopilot` redirect — that stays as-is.

---

## TASK 2: Completion Callbacks (Priority 2)

### What this does
When a user completes a real action (saves profile, writes diary, visits a page), we fire `POST /api/v1/autopilot/recommendations/${id}/complete` to mark it done and earn VTN.

### 2A. Create a completion hook

**Create file:** `src/hooks/useAutopilotComplete.ts`

```typescript
import { useCallback, useRef } from 'react';
import { communityFetch } from '@/lib/community-gateway';
import { useAuth } from '@/context/AuthProvider';
import { toast } from 'sonner';

// Track which source_refs have already been fired this session
const firedRefs = new Set<string>();

export function useAutopilotComplete() {
  const { user } = useAuth();

  const completeBySourceRef = useCallback(async (sourceRef: string) => {
    if (!user || firedRefs.has(sourceRef)) return;
    firedRefs.add(sourceRef);

    try {
      // First, load recommendations to find the one with this source_ref
      const listRes = await communityFetch('/api/v1/autopilot/recommendations');
      if (!listRes.ok) return;
      const { recommendations } = await listRes.json();
      const rec = recommendations?.find((r: any) => r.source_ref === sourceRef && r.status !== 'completed');
      if (!rec) return;

      // Complete it
      const res = await communityFetch(`/api/v1/autopilot/recommendations/${rec.id}/complete`, {
        method: 'POST',
      });
      if (!res.ok) return;
      const { reward } = await res.json();
      if (reward) {
        toast.success(`+${reward} VTN earned!`, {
          description: `Task completed: ${rec.title}`,
          duration: 4000,
        });
      }
    } catch (e) {
      console.warn('[Autopilot] complete error:', e);
    }
  }, [user]);

  return { completeBySourceRef };
}
```

### 2B. Wire into existing pages

Add `useAutopilotComplete()` calls to these **existing** pages. In each case, add the hook import and call `completeBySourceRef` at the right moment:

| File to edit | source_ref | When to fire |
|---|---|---|
| `src/pages/EditProfilePage.tsx` | `onboarding_profile` | After the profile save API returns success (200). Add inside the existing save handler's `.then()` or after the mutation's `onSuccess`. |
| `src/pages/EditProfilePage.tsx` | `onboarding_avatar` | After avatar upload succeeds. Find the avatar upload handler and add the call in its success callback. |
| The diary/journal entry page (likely `src/pages/memory/Diary.tsx` or similar) | `onboarding_diary_day0` | After diary POST returns 201/success. Add in the create mutation's `onSuccess`. |
| `src/pages/community/*.tsx` (the community overview page, likely at route `/comm`) | `onboarding_explore` | On page mount, fire once. Use `useEffect(() => { completeBySourceRef('onboarding_explore'); }, [])` |
| The Maxina chat page (likely at `/chat` or `/messages`) | `onboarding_maxina` | On page mount, fire once. Same pattern as above. |
| The interests/profile settings page | `onboarding_interests` | After interests save succeeds. |
| The health overview page (at `/health`) | `onboarding_health` | On page mount, fire once. |
| The matches page (at `/matches` or `/home/matches`) | `onboarding_discover_matches` | On page mount, fire once. |

**Pattern for page-mount completion (fire once):**
```typescript
import { useAutopilotComplete } from '@/hooks/useAutopilotComplete';

// Inside the component:
const { completeBySourceRef } = useAutopilotComplete();
useEffect(() => {
  completeBySourceRef('onboarding_explore');
}, [completeBySourceRef]);
```

**Pattern for action completion (after save):**
```typescript
// Inside the existing save/submit success handler:
completeBySourceRef('onboarding_profile');
```

> **Note:** The `firedRefs` Set prevents duplicate calls per session, so it's safe to call on every mount.

---

## TASK 3: Social Connect Page (Priority 3)

### 3A. Create the page

**Create file:** `src/pages/settings/SocialConnect.tsx`

**Use same layout pattern** as `src/pages/settings/AutopilotSettings.tsx`:
- `<AppLayout>` wrapper
- `<SubNavigation items={settingsNavigation} />` (import from `@/config/navigation`)
- `<StandardHeader>` with title "Social Accounts" and emoji "🔗"

**Page behavior:**

1. On mount, fetch two endpoints in parallel:

```typescript
// No auth needed
GET /api/v1/social-accounts/providers
→ { providers: [{ provider: "instagram", name: "Instagram", configured: true }] }

// Auth required
GET /api/v1/social-accounts/connections
→ { connections: [{ provider: "instagram", username: "johndoe", display_name: "John",
     avatar_url: "...", enrichment_status: "completed", connected_at: "..." }] }
```

2. Use two `useQuery` calls:
   - `['social-providers']` for providers (no auth, staleTime 5 min)
   - `['social-connections']` for connections (with auth, staleTime 1 min)

3. **Connected accounts section:** For each connection, show a Card with:
   - Provider icon/logo, username, display name
   - "Connected" badge in green
   - `enrichment_status` indicator: "completed" ✅, "pending" ⏳, "failed" ❌
   - **"Remove"** button → calls:
     ```
     POST /api/v1/social-accounts/disconnect/${provider}
     Headers: Authorization: Bearer <token>
     ```
     Then invalidate the `['social-connections']` query.

4. **Available providers section:** For each provider where `configured === true` and NOT in connections, show a Card with:
   - Provider name and icon
   - **"Connect"** button → calls:
     ```
     GET /api/v1/social-accounts/connect/${provider}
     Headers: Authorization: Bearer <token>
     ```
     Response: `{ auth_url: "https://..." }`
     Then: `window.location.href = auth_url`

5. **Handle OAuth callback:** On page mount, check URL params:
   ```typescript
   const params = new URLSearchParams(location.search);
   const connected = params.get('connected');
   const username = params.get('username');
   if (connected) {
     toast.success(`${connected} connected!`, {
       description: username ? `Signed in as @${username}` : 'Profile enrichment started.',
     });
     // Clean URL
     navigate('/settings/social', { replace: true });
     // Refetch connections
     queryClient.invalidateQueries({ queryKey: ['social-connections'] });
   }
   ```

6. Show info text at top: "Connect your accounts to auto-fill your profile — no manual entry needed!"

**UI Layout:**
```
┌────────────────────────────────────┐
│ 🔗 Social Accounts                │
│ Connect your accounts to auto-    │
│ fill your profile — no manual     │
│ entry needed!                      │
│                                    │
│ Connected                          │
│ ┌────────────────────────────────┐ │
│ │ 📷 Instagram   @johndoe       │ │
│ │ Enrichment: ✅ Complete        │ │
│ │                    [Remove]    │ │
│ └────────────────────────────────┘ │
│                                    │
│ Available                          │
│ ┌────────────────────────────────┐ │
│ │ 🔵 Facebook                   │ │
│ │ Connect to import your bio    │ │
│ │                   [Connect]   │ │
│ └────────────────────────────────┘ │
│ ┌────────────────────────────────┐ │
│ │ 🔵 LinkedIn                   │ │
│ │ Import professional info      │ │
│ │                   [Connect]   │ │
│ └────────────────────────────────┘ │
└────────────────────────────────────┘
```

### 3B. Add the route

**Edit file:** `src/App.tsx`

Add import:
```typescript
import SocialConnect from "./pages/settings/SocialConnect";
```

Add route near the other `/settings/*` routes:
```tsx
<Route path="/settings/social" element={<AuthGuard><SocialConnect /></AuthGuard>} />
```

### 3C. Add to settings navigation

**Edit file:** `src/config/navigation.ts`

Add to the `settingsNavigation` array, after "connected-apps":
```typescript
{ id: "social", name: "Social Accounts", path: "/settings/social" },
```

---

## TASK 4: Auto-Share Settings Section (Priority 4)

### 4A. Add auto-share section to AutopilotSettings page

**Edit file:** `src/pages/settings/AutopilotSettings.tsx`

Add a **new Card section** at the bottom of the page (after the "Frequency & Timing" card) for auto-share settings.

**Fetch share preferences on mount:**
```typescript
GET /api/v1/social-accounts/share-prefs
Headers: Authorization: Bearer <token>
```
Response: `{ prefs: { auto_share_enabled, share_milestones, share_to_providers, share_visibility } }`

Use `useQuery` with key `['share-prefs']`.

**Update preferences on change:**
```typescript
PUT /api/v1/social-accounts/share-prefs
Headers: Authorization: Bearer <token>, Content-Type: application/json
Body: { auto_share_enabled, share_milestones, share_to_providers, share_visibility }
```

Use `useMutation` that invalidates `['share-prefs']` on success.

**UI — new card to add:**
```tsx
{/* Auto-Share */}
<Card>
  <CardHeader>
    <CardTitle>Auto-Share</CardTitle>
    <CardDescription>
      Automatically share your milestones and achievements
    </CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Master toggle */}
    <div className="flex items-center justify-between">
      <Label>Auto-share enabled</Label>
      <Switch checked={sharePrefs.auto_share_enabled} onCheckedChange={...} />
    </div>

    {/* Share milestones toggle */}
    <div className="flex items-center justify-between">
      <Label>Share milestones</Label>
      <Switch checked={sharePrefs.share_milestones} onCheckedChange={...} />
    </div>

    {/* Provider checkboxes */}
    <div className="space-y-2">
      <Label>Share to</Label>
      {/* Render a Checkbox for each provider: facebook, linkedin, etc. */}
      {/* checked = sharePrefs.share_to_providers.includes(provider) */}
    </div>

    {/* Visibility dropdown */}
    <div className="space-y-2">
      <Label>Visibility</Label>
      <Select value={sharePrefs.share_visibility} onValueChange={...}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="public">Public</SelectItem>
          <SelectItem value="connections">Connections Only</SelectItem>
          <SelectItem value="private">Private</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </CardContent>
</Card>
```

---

## TASK 5: Milestone Celebrations (Priority 5)

### 5A. Add milestone handler to the foreground message handler

**Edit file:** `src/lib/pushNotifications.ts`

Inside the `setupForegroundHandler` method, in the callback passed to `onForegroundMessage`, add milestone detection **before** the existing notification display logic (around line 263-291).

Add this check at the beginning of the callback:

```typescript
// Milestone celebration — always show even when focused
if (data.milestone) {
  // Dispatch a custom event that the UI can listen to
  window.dispatchEvent(new CustomEvent('vitana-milestone', {
    detail: {
      milestone: data.milestone,
      title: notif.title || data.title || 'Milestone!',
      body: notif.body || data.body || '',
      url: data.url || '/',
    },
  }));
  // Don't return — let normal notification flow continue for background
}
```

### 5B. Create a milestone celebration component

**Create file:** `src/components/MilestoneCelebration.tsx`

This is a **modal/dialog overlay** that appears when a milestone is earned. It should:

1. Listen for the `vitana-milestone` custom event on `window`
2. Show a centered modal with:
   - Large icon (map milestone name → emoji, see table below)
   - Title (e.g., "⭐ 7-Day Diary Streak!")
   - Body text
   - VTN reward amount (map milestone → reward)
   - A "Continue" button that navigates to `event.detail.url`
   - Optional confetti animation (use a simple CSS animation or the `canvas-confetti` package if already installed)

**Milestone → Icon & Reward mapping (hardcode this):**
```typescript
const MILESTONES: Record<string, { icon: string; reward: number }> = {
  profile_complete:       { icon: '✨', reward: 20 },
  first_diary:            { icon: '📖', reward: 15 },
  first_connection:       { icon: '🤝', reward: 20 },
  five_connections:       { icon: '🌱', reward: 30 },
  first_group:            { icon: '👥', reward: 15 },
  first_event_rsvp:       { icon: '📅', reward: 15 },
  first_match_accepted:   { icon: '💫', reward: 20 },
  diary_streak_3:         { icon: '🔥', reward: 20 },
  diary_streak_7:         { icon: '⭐', reward: 50 },
  diary_streak_30:        { icon: '🏆', reward: 100 },
  first_health_check:     { icon: '💚', reward: 25 },
  first_referral:         { icon: '🎯', reward: 0 },
  onboarding_complete:    { icon: '🎉', reward: 50 },
};
```

3. Use shadcn `<Dialog>` component, controlled by state that opens when the event fires.

### 5C. Mount the celebration component globally

**Edit file:** `src/App.tsx`

Add `<MilestoneCelebration />` inside the top-level providers, near other global components (toasts, etc.). It should always be mounted so it can listen for events:

```tsx
import MilestoneCelebration from './components/MilestoneCelebration';

// Inside the return, alongside other global elements:
<MilestoneCelebration />
```

---

## TASK 6: Contact Sync / Invite Friends (Priority 6)

### 6A. Create the invite page

**Create file:** `src/pages/InviteFriends.tsx`

**Layout:** Same as other pages — `<AppLayout>`, `<SEO>`, `<StandardHeader>` with title "Invite Friends" and emoji "🎯".

**Page behavior:**

1. Show a form to add contacts manually:
   - Name (required), Email (optional), Phone (optional)
   - "Add Contact" button to add to a local list
   - Display added contacts as removable chips/cards

2. **"Send Invites"** button at the bottom:
```typescript
POST /api/v1/automations/execute/AP-1303
Headers: Authorization: Bearer <token>, Content-Type: application/json
Body: {
  tenant_id: user.tenant_id,  // from useAuth() or useTenant()
  event_payload: {
    user_id: user.id,
    contacts: [{ name, email, phone }]
  }
}
```

3. Show success toast after API returns 200.

4. Use React Hook Form + Zod for the contact input form validation.

### 6B. Add the route

**Edit file:** `src/App.tsx`

```tsx
import InviteFriends from "./pages/InviteFriends";

<Route path="/invite" element={<AuthGuard><InviteFriends /></AuthGuard>} />
```

---

## TASK 7: Navigation Updates

### 7A. Add Autopilot to community/home sidebar

**Edit file:** `src/config/role-navigation.ts`

Find the community role's navigation config and add an entry for the autopilot dashboard:
```typescript
{ id: "autopilot", name: "My Journey", path: "/autopilot", icon: "🚀" }
```

This should appear prominently — ideally as the first or second item in the community user's sidebar.

### 7B. Add Social & Invite to the settings navigation

The social link was added in Task 3C. Also consider adding the invite link to relevant navigation (e.g., community sidebar or a sharing section).

---

## Summary of Files to Create

| File | Description |
|---|---|
| `src/lib/community-gateway.ts` | Auth fetch wrapper for community gateway |
| `src/pages/AutopilotDashboard.tsx` | Onboarding task dashboard |
| `src/hooks/useAutopilotComplete.ts` | Hook to complete tasks by source_ref |
| `src/pages/settings/SocialConnect.tsx` | Social account connect page |
| `src/components/MilestoneCelebration.tsx` | Milestone celebration modal |
| `src/pages/InviteFriends.tsx` | Contact sync / invite page |

## Summary of Files to Edit

| File | Change |
|---|---|
| `src/App.tsx` | Add 3 new routes (`/autopilot`, `/settings/social`, `/invite`) + mount `<MilestoneCelebration />` |
| `src/config/navigation.ts` | Add "Social Accounts" to `settingsNavigation` |
| `src/config/role-navigation.ts` | Add "My Journey" (`/autopilot`) to community role sidebar |
| `src/pages/settings/AutopilotSettings.tsx` | Add Auto-Share card section |
| `src/lib/pushNotifications.ts` | Add milestone event dispatch in foreground handler |
| `src/pages/EditProfilePage.tsx` | Wire `completeBySourceRef('onboarding_profile')` and `('onboarding_avatar')` |
| Community overview page | Wire `completeBySourceRef('onboarding_explore')` on mount |
| Maxina chat page | Wire `completeBySourceRef('onboarding_maxina')` on mount |
| Diary page | Wire `completeBySourceRef('onboarding_diary_day0')` on create success |
| Health overview page | Wire `completeBySourceRef('onboarding_health')` on mount |
| Matches page | Wire `completeBySourceRef('onboarding_discover_matches')` on mount |
| Interests settings page | Wire `completeBySourceRef('onboarding_interests')` on save success |

## Build Order

Execute in this exact order:
1. `src/lib/community-gateway.ts` — dependency for everything
2. `src/pages/AutopilotDashboard.tsx` + route in App.tsx
3. `src/hooks/useAutopilotComplete.ts` + wire into existing pages
4. `src/pages/settings/SocialConnect.tsx` + route + nav config
5. Auto-Share section in `AutopilotSettings.tsx`
6. `src/components/MilestoneCelebration.tsx` + push notification edit + mount in App.tsx
7. `src/pages/InviteFriends.tsx` + route
8. Navigation updates in role-navigation.ts
