# Vitana Assistant Full Account Awareness Plan

## Executive Summary

This document provides a comprehensive analysis and implementation plan for making the Vitana assistant (accessible through the Orb) **100% aware of everything the user does within their Vitana account**. Once achieved, this lays the foundation for **autopilot mode** and **automated task execution** on behalf of the user.

---

## 1. Current Architecture Analysis

### 1.1 Two Communication Channels

The Vitana assistant currently operates through **two separate AI channels**, each with different levels of context awareness:

| Channel | Technology | Context Awareness | Used By |
|---------|-----------|-------------------|---------|
| **Orb Voice (Gateway)** | REST + SSE via Cloud Run Gateway → Gemini Live | **Minimal** - only receives JWT token, language, voice style | `OrbVoiceClient.ts` → Gateway |
| **AI Chat (Text)** | Supabase Edge Function → Gemini API | **Rich** - full `fetch-user-context` data | `ai-chat/index.ts` |

### 1.2 What the AI Chat Channel Already Knows (via `fetch-user-context`)

The `fetch-user-context` edge function already aggregates an impressive amount of data:

**Identity**: userId, displayName, handle, email, tenantId, tenantName, roles, membershipTier, birthDate, ageYears

**Temporal**: currentTime, currentHour, dayOfWeek, timezone, upcomingEvents (next 7 days)

**Social**: recentMessages (last 24h), unreadCount, activeThreads

**Economic**: wallet balances (USD, VTN, CREDITS), recentTransactions (30 days), pendingPayments, exchangeRates

**Health**: vitanaIndex, recentDiaryEntries (7 days), goals, healthMetrics

**Memory**: recentConversations (7 days), rememberedInsights, learnedPreferences, behavioral patterns, autopilot actionHistory (30 days), memoryStats, memoryHeaders (full catalog)

**Community**: upcomingEvents (30 days), myRegisteredEvents, joinedGroups, activeMatches, followers/following, userInterests, userLocation, recentActivity

### 1.3 What the Orb Voice Channel Knows

**Almost nothing.** The Gateway receives:
- JWT access token (for authentication)
- Language (`lang: 'de'` - currently hardcoded)
- Voice style (`friendly, calm, empathetic`)

The system instruction sent to Gemini Live is generic:
```
"You are a helpful AI assistant. Keep your responses natural and conversational."
```

**This is the critical gap.** The Orb is the user's primary interface, yet it has the least context.

---

## 2. Identified Gaps (What the Assistant Does NOT Know)

### 2.1 CRITICAL: Orb Voice Channel Has No User Context

The Orb voice channel (primary user touchpoint) lacks:
- User name, profile, preferences
- Account data (wallet, health, community)
- Memory/conversation history
- Current page/screen context
- Real-time activity state
- Any personalization whatsoever

### 2.2 Missing Data Across Both Channels

Even the AI Chat channel (which is richer) has these gaps:

| Data Category | Currently Missing |
|---------------|------------------|
| **Navigation Context** | What page/screen the user is currently on |
| **Real-time Activity** | What the user just did (clicked, viewed, submitted) |
| **Session Activity** | Full activity log for the current session |
| **Discover/Shopping** | Browsed products, bookmarked items, order history |
| **Settings/Preferences** | Notification settings, privacy settings, connected apps |
| **Professional Data** | Appointments, provider notes, service bookings |
| **Content Created** | Posts, media uploads, shared content |
| **Lab/Biomarker Data** | Lab test orders, results, biomarker trends |
| **Reseller/Business** | Creator status, earnings, campaigns, payouts |
| **Live Room Activity** | Live rooms joined/hosted, recordings |
| **Ticket/Voucher History** | Event tickets purchased, vouchers redeemed |
| **Contact Book** | Imported contacts, sync status |
| **Proactive Engagement History** | What proactive messages were shown, user feedback |
| **Onboarding/Journey Stage** | User journey milestones, experience level |

### 2.3 Missing Real-Time Awareness

The assistant has no awareness of:
- **Current navigation state** (which page the user is on)
- **In-progress actions** (e.g., filling out a form, browsing products)
- **UI state** (e.g., modals open, tabs selected)
- **Device/platform context** (mobile vs desktop, screen size)

---

## 3. Implementation Plan

### Phase 1: Bridge Orb Voice Channel to Full Context (HIGH PRIORITY)

**Goal**: Make the Orb voice channel as context-aware as AI Chat.

#### 3.1.1 Inject User Context into Gateway Session Start

**Current flow**:
```
Client → POST /api/v1/orb/live/session/start → Gateway → Gemini Live (generic prompt)
```

**Proposed flow**:
```
Client → fetch-user-context → POST /api/v1/orb/live/session/start (with context) → Gateway → Gemini Live (personalized prompt)
```

**Implementation**:

1. **Modify `useOrbVoiceClient.ts`** to call `fetch-user-context` before session start:
```typescript
// Before creating session, fetch user context
const contextResponse = await supabase.functions.invoke('fetch-user-context', {
  body: { userId: user.id, forceRefresh: false }
});
const userContext = contextResponse.data?.context;

// Pass context to session start
const config: OrbVoiceClientConfig = {
  lang: userContext?.identity?.preferredLanguage || 'de',
  accessToken: accessToken,
  userContext: userContext, // NEW
};
```

2. **Modify `OrbVoiceClient.ts`** to send context in session start:
```typescript
body: JSON.stringify({
  lang: this.config.lang,
  voice_style: 'friendly, calm, empathetic',
  response_modalities: ['audio', 'text'],
  user_context: this.config.userContext, // NEW - full context object
})
```

3. **Modify Gateway** to build a personalized system instruction using the user context (same prompt engineering as `ai-chat/index.ts`).

**Files to modify**:
- `src/hooks/useOrbVoiceClient.ts`
- `src/lib/OrbVoiceClient.ts`
- Gateway service (Cloud Run - separate repo)
- Alternatively: `supabase/functions/vertex-live/index.ts` (if using direct Vertex path)

#### 3.1.2 Fix Vertex-Live Edge Function System Prompt

**Current** (in `vertex-live/index.ts`):
```typescript
systemInstruction: {
  parts: [{
    text: 'You are a helpful AI assistant...' // GENERIC!
  }]
}
```

**Proposed**: Before sending the setup message to Gemini, fetch user context and build a rich system prompt:
```typescript
// Fetch user context
const contextResponse = await supabase.functions.invoke('fetch-user-context', {
  body: { userId: user.id }
});
const ctx = contextResponse.data?.context;

// Build rich system instruction (reuse ai-chat prompt patterns)
const systemPrompt = buildVoiceSystemPrompt(ctx);
```

**Files to modify**:
- `supabase/functions/vertex-live/index.ts`

---

### Phase 2: Add Real-Time Navigation & Activity Context (MEDIUM PRIORITY)

**Goal**: Make the assistant aware of what the user is doing RIGHT NOW.

#### 3.2.1 Create a Navigation Context Provider

Track the user's current page/screen and expose it to the assistant.

```typescript
// New: src/context/NavigationContextProvider.tsx
interface NavigationContext {
  currentPage: string;         // e.g., '/health/tracker/sleep'
  currentPageLabel: string;    // e.g., 'Sleep Tracker'
  previousPage: string;
  timeOnPage: number;          // seconds
  navigationHistory: string[]; // last 10 pages
}
```

**Implementation**:
- Listen to React Router location changes
- Maintain a rolling buffer of recent navigation
- Expose via context for the assistant

#### 3.2.2 Create a Session Activity Feed

Aggregate all user actions during the current session into a compact feed the assistant can reference.

```typescript
// New: src/hooks/useSessionActivityFeed.ts
interface SessionActivity {
  timestamp: string;
  action: string;      // e.g., 'viewed_page', 'created_diary_entry', 'sent_message'
  details: string;     // e.g., 'Sleep Tracker page', 'Entry about morning yoga'
  category: string;    // e.g., 'navigation', 'health', 'social', 'financial'
}
```

**Implementation**:
- Hook into the existing `useActivityLogger` system
- Keep an in-memory rolling buffer (last 50 actions) of the current session
- Send this buffer as part of the context to the assistant

#### 3.2.3 Enhance `fetch-user-context` with Missing Data

Extend the existing edge function to also fetch:

```typescript
// Add to fetchUserContext() parallel queries:

// Lab test orders & results (recent)
supabase.from('lab_test_orders')
  .select('status, test_type, created_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(5),

// Provider appointments
supabase.from('provider_appointments')
  .select('title, scheduled_time, status, provider_name')
  .eq('patient_id', userId)
  .gte('scheduled_time', new Date().toISOString())
  .limit(5),

// User preferences & settings
supabase.from('user_preferences')
  .select('*')
  .eq('user_id', userId)
  .single(),

// User journey stage
supabase.from('user_journey')
  .select('onboarding_stage, experience_level, engagement_score, days_active, milestones')
  .eq('user_id', userId)
  .single(),

// Recent media uploads
supabase.from('media_uploads')
  .select('file_name, media_type, created_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(5),

// Discover bookmarks
supabase.from('user_bookmarks')
  .select('item_type, item_id, created_at')
  .eq('user_id', userId)
  .limit(10),

// Package purchases & vouchers
supabase.from('package_purchases')
  .select('status, amount, created_at')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(5),

// Active discount codes
supabase.from('user_discount_codes')
  .select('code, discount_percent, expires_at')
  .eq('user_id', userId)
  .eq('is_used', false)
  .limit(5),

// Recent session activity (from user_activity_log - current session)
supabase.from('user_activity_log')
  .select('activity_type, activity_data, created_at')
  .eq('user_id', userId)
  .eq('session_id', currentSessionId)
  .order('created_at', { ascending: false })
  .limit(30),
```

**File to modify**:
- `supabase/functions/fetch-user-context/index.ts`

---

### Phase 3: Real-Time Context Updates During Conversation (MEDIUM PRIORITY)

**Goal**: Keep the assistant updated DURING an active conversation, not just at session start.

#### 3.3.1 Implement Context Refresh on Significant Events

When certain actions happen during a live orb session, push updated context:

```typescript
// In useOrbVoiceClient.ts - listen for significant events
useEffect(() => {
  const handleContextUpdate = (event: CustomEvent) => {
    // Re-fetch context and send to gateway as context update
    refreshAndSendContext(event.detail.type);
  };

  window.addEventListener('vitana:context-changed', handleContextUpdate);
  return () => window.removeEventListener('vitana:context-changed', handleContextUpdate);
}, []);
```

**Trigger events**:
- `wallet.transfer` - Balance changed
- `diary.created` - New diary entry
- `message.received` - New message
- `event.joined` - Joined an event
- `navigation.changed` - User navigated to a new page
- `autopilot.action.executed` - An autopilot action was executed

#### 3.3.2 Implement a Context Diff System

Instead of resending the entire context on every update, send only the changed parts:

```typescript
interface ContextDelta {
  field: string;        // e.g., 'economic.balances.USD'
  oldValue: any;
  newValue: any;
  timestamp: string;
}
```

This reduces bandwidth and allows the AI to process: "The user just transferred 50 VTNA to another user."

---

### Phase 4: Expand Assistant Tool Capabilities (HIGH PRIORITY for Autopilot)

**Goal**: Give the assistant the ability to execute actions on behalf of the user.

#### 3.4.1 Extend Orb Tools Beyond Navigation

Currently `useVitanaOrbTools.ts` supports:
- `navigate_to` - Navigate to a page
- `start_glass_mode` / `stop_glass_mode` - Screen sharing (coming soon)
- `start_camera_mode` - Camera mode (coming soon)
- `open_diary_entry` - Open diary
- `run_autopilot` - Activate autopilot
- `show_text_input` - Show text input

**Add these new tools**:

```typescript
// Financial
'send_vtna': { to_user: string, amount: number, note?: string }
'check_balance': {}
'exchange_currency': { from: string, to: string, amount: number }

// Health
'log_water': { amount_ml: number }
'log_sleep': { hours: number, quality: string }
'log_meal': { description: string, calories?: number }
'log_workout': { type: string, duration_minutes: number }
'create_diary_entry': { text: string, tags?: string[] }

// Social
'send_message': { to_user_id: string, text: string }
'join_event': { event_id: string }
'leave_event': { event_id: string }
'join_group': { group_id: string }

// Calendar
'create_event': { title: string, start_time: string, end_time?: string }
'cancel_event': { event_id: string }

// Discovery
'book_service': { service_id: string }
'order_product': { product_id: string, quantity: number }

// Settings
'update_preference': { key: string, value: any }
'toggle_notifications': { enabled: boolean }

// Memory
'save_memory': { content: string, type: string }
'search_memory': { query: string }
```

**Files to modify**:
- `src/hooks/useVitanaOrbTools.ts` (add tool implementations)
- Gateway system prompt (declare tools for Gemini function calling)
- `supabase/functions/vertex-live/index.ts` (add tool declarations)

#### 3.4.2 Define Tool Safety Levels

```typescript
enum ToolSafetyLevel {
  READ_ONLY = 'read_only',        // No confirmation needed (check_balance, search_memory)
  LOW_RISK = 'low_risk',          // Auto-execute with notification (log_water, create_diary_entry)
  MEDIUM_RISK = 'medium_risk',    // Confirm via voice (send_message, join_event)
  HIGH_RISK = 'high_risk',        // Confirm via UI modal (send_vtna, order_product)
}
```

---

### Phase 5: Build the Unified Context Engine (LONG-TERM)

**Goal**: Create a single, always-fresh context engine that serves all AI channels.

#### 3.5.1 Architecture: `VitanaContextEngine`

```
┌─────────────────────────────────────────────────────────┐
│                 VitanaContextEngine                       │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐│
│  │  Identity    │  │  Temporal     │  │  Navigation     ││
│  │  Layer       │  │  Layer        │  │  Layer          ││
│  └─────────────┘  └──────────────┘  └─────────────────┘│
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐│
│  │  Economic    │  │  Health       │  │  Social         ││
│  │  Layer       │  │  Layer        │  │  Layer          ││
│  └─────────────┘  └──────────────┘  └─────────────────┘│
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐│
│  │  Memory      │  │  Community    │  │  Activity       ││
│  │  Layer       │  │  Layer        │  │  Layer          ││
│  └─────────────┘  └──────────────┘  └─────────────────┘│
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐│
│  │  Professional│  │  Discover     │  │  Settings       ││
│  │  Layer       │  │  Layer        │  │  Layer          ││
│  └─────────────┘  └──────────────┘  └─────────────────┘│
│                                                          │
│  Consumers:                                              │
│  ├── Orb Voice (Gateway/Vertex Live)                     │
│  ├── AI Chat (Edge Function)                             │
│  ├── Proactive Greeting System                           │
│  ├── Autopilot Action Generator                          │
│  ├── Recommendation Engine                               │
│  └── Future: Autonomous Agent                            │
└─────────────────────────────────────────────────────────┘
```

#### 3.5.2 Context Layers Detail

Each layer maintains its own data freshness requirements:

| Layer | Refresh Rate | Data Source | Priority |
|-------|-------------|-------------|----------|
| Identity | On login / profile update | `profiles` table | Low (stable) |
| Temporal | Every request | System clock + `calendar_events` | High |
| Navigation | Real-time (client-side) | React Router + window events | High |
| Economic | On wallet change event | `user_wallets` + `wallet_transactions` | Medium |
| Health | Hourly or on diary entry | `diary_entries` + tracker tables | Medium |
| Social | On message event | `messages` + `global_messages` | High |
| Memory | On conversation end | `ai_memory` + `ai_conversations` | Low |
| Community | On event/group action | `global_community_*` tables | Medium |
| Activity | Real-time (client-side) | `user_activity_log` + in-memory buffer | High |
| Professional | On appointment change | `provider_appointments` | Low |
| Discover | On browse/bookmark | `user_bookmarks` + browse history | Low |
| Settings | On settings change | `user_preferences` | Low |

#### 3.5.3 Client-Side Context Manager

```typescript
// New: src/services/VitanaContextManager.ts
class VitanaContextManager {
  private context: FullUserContext;
  private listeners: Set<(ctx: FullUserContext) => void>;
  private refreshTimers: Map<string, NodeJS.Timeout>;

  // Subscribe to real-time context changes
  subscribe(listener: (ctx: FullUserContext) => void): () => void;

  // Get current context snapshot (for AI channels)
  getSnapshot(): FullUserContext;

  // Force refresh specific layer
  refreshLayer(layer: ContextLayer): Promise<void>;

  // Handle real-time events from Supabase
  handleRealtimeEvent(table: string, payload: any): void;

  // Get compact context for voice (optimized for token limit)
  getVoiceContext(): CompactVoiceContext;

  // Get full context for text chat
  getChatContext(): FullChatContext;
}
```

---

### Phase 6: Supabase Real-Time Subscriptions for Live Context (MEDIUM PRIORITY)

**Goal**: React instantly to database changes that affect the user's context.

#### 3.6.1 Subscribe to Relevant Tables

```typescript
// In VitanaContextManager or a dedicated hook
const channels = [
  supabase.channel('user-context')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'user_wallets',
      filter: `user_id=eq.${userId}`
    }, (payload) => refreshLayer('economic'))
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `recipient_id=eq.${userId}`
    }, (payload) => refreshLayer('social'))
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'diary_entries',
      filter: `user_id=eq.${userId}`
    }, (payload) => refreshLayer('health'))
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'autopilot_actions',
      filter: `user_id=eq.${userId}`
    }, (payload) => refreshLayer('memory'))
    .subscribe();
];
```

---

## 4. Priority Roadmap

### Sprint 1 (Immediate - 1-2 weeks): Bridge the Orb Gap
1. **Inject user context into Vertex-Live/Gateway system prompt** (Phase 1)
2. **Fix hardcoded language** - derive from user profile preferences
3. **Reuse AI Chat system prompt patterns** for voice channel

### Sprint 2 (2-3 weeks): Expand Context Coverage
4. **Add missing data to `fetch-user-context`** (Phase 2.3)
5. **Add navigation context tracking** (Phase 2.1)
6. **Add session activity feed** (Phase 2.2)

### Sprint 3 (3-4 weeks): Real-Time & Tools
7. **Implement context refresh during active sessions** (Phase 3)
8. **Expand Orb tool capabilities** (Phase 4.1)
9. **Add tool safety levels** (Phase 4.2)

### Sprint 4 (4-6 weeks): Unified Engine
10. **Build VitanaContextManager** (Phase 5)
11. **Add Supabase real-time subscriptions** (Phase 6)
12. **Unify context across all AI consumers**

---

## 5. Critical Files Reference

### Frontend (Client)
| File | Purpose | Modify |
|------|---------|--------|
| `src/lib/OrbVoiceClient.ts` | REST+SSE voice client | Add userContext to config & session start |
| `src/hooks/useOrbVoiceClient.ts` | Voice client React hook | Fetch context before connect |
| `src/hooks/useVitanaOrbTools.ts` | Tool execution for AI commands | Expand with action tools |
| `src/context/StreamingStateContext.tsx` | Audio/streaming state | Add navigation context |
| `src/hooks/useActivityLogger.ts` | Activity logging | Feed into session activity buffer |
| `src/components/audio/VitanaAudioOverlay.tsx` | Main voice UI | Pass context updates |

### Backend (Supabase Edge Functions)
| File | Purpose | Modify |
|------|---------|--------|
| `supabase/functions/fetch-user-context/index.ts` | Context aggregation | Add missing data layers |
| `supabase/functions/ai-chat/index.ts` | AI chat handler | Already rich - reference patterns |
| `supabase/functions/vertex-live/index.ts` | Vertex WebSocket proxy | Inject personalized system prompt |
| `supabase/functions/get-proactive-context/index.ts` | Proactive greeting context | Align with unified context |

### Gateway (Cloud Run - External)
| Service | Purpose | Modify |
|---------|---------|--------|
| `gateway-q74ibpv6ia-uc.a.run.app` | Voice session management | Accept user_context in session start, build system prompt |

### New Files to Create
| File | Purpose |
|------|---------|
| `src/services/VitanaContextManager.ts` | Unified context engine |
| `src/context/NavigationContextProvider.tsx` | Navigation tracking |
| `src/hooks/useSessionActivityFeed.ts` | Session activity buffer |
| `src/hooks/useContextRefresh.ts` | Real-time context refresh |

---

## 6. Data Flow: Target Architecture

```
┌──────────────── USER INTERACTS WITH VITANA ───────────────────┐
│                                                                │
│  [Clicks page]  [Speaks to Orb]  [Types message]  [Any action] │
│       │               │               │               │       │
│       ▼               ▼               ▼               ▼       │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │            VitanaContextManager (Client)                 │  │
│  │  - Tracks navigation in real-time                        │  │
│  │  - Buffers session activities                            │  │
│  │  - Subscribes to Supabase real-time changes              │  │
│  │  - Provides context snapshots to AI channels             │  │
│  └───────────────────────┬─────────────────────────────────┘  │
│                           │                                    │
│              ┌────────────┼────────────┐                       │
│              ▼            ▼            ▼                       │
│     ┌────────────┐ ┌──────────┐ ┌───────────────┐            │
│     │  Orb Voice  │ │ AI Chat  │ │  Autopilot    │            │
│     │  (Gateway)  │ │ (Edge)   │ │  (Proactive)  │            │
│     │             │ │          │ │               │            │
│     │ Same rich   │ │ Same rich│ │  Same rich    │            │
│     │ context!    │ │ context! │ │  context!     │            │
│     └─────┬──────┘ └────┬─────┘ └──────┬────────┘            │
│           │              │              │                      │
│           ▼              ▼              ▼                      │
│     ┌──────────────────────────────────────────┐              │
│     │          Gemini / AI Model                │              │
│     │  - Knows user's name, preferences        │              │
│     │  - Knows current page/context             │              │
│     │  - Knows recent actions & history         │              │
│     │  - Knows wallet, health, community data   │              │
│     │  - Can execute tools on user's behalf     │              │
│     │  - Maintains conversation memory          │              │
│     └──────────────────────────────────────────┘              │
│                           │                                    │
│                           ▼                                    │
│                  ┌────────────────┐                            │
│                  │  ACTION OUTPUT  │                            │
│                  │  - Voice reply  │                            │
│                  │  - Text reply   │                            │
│                  │  - Tool call    │                            │
│                  │  - Navigation   │                            │
│                  │  - Data write   │                            │
│                  └────────────────┘                            │
└────────────────────────────────────────────────────────────────┘
```

---

## 7. Success Criteria

The Vitana assistant is "100% aware" when it can answer ANY of these questions correctly:

- "What's my name?" → Knows from profile
- "How much VTNA do I have?" → Knows from wallet
- "What page am I on?" → Knows from navigation context
- "What did I just do?" → Knows from session activity feed
- "Do I have any upcoming events?" → Knows from calendar + community events
- "Show me my diary entries from last week" → Knows from memory catalog
- "What groups am I in?" → Knows from community data
- "Did anyone message me?" → Knows from social data
- "Can you send 10 VTNA to Sarah?" → Can execute via tools
- "Log 2 liters of water for today" → Can execute via health tools
- "What was the last thing the autopilot suggested?" → Knows from action history
- "Book me an appointment with Dr. Smith" → Can execute via appointment tools
- "What's the current exchange rate?" → Knows from economic data
- "Navigate me to the sleep tracker" → Can execute via navigation tools

---

## 8. Security Considerations

- **Context data never leaves the authenticated session boundary** - all context is scoped to the authenticated user via JWT
- **Tool execution requires appropriate safety levels** - high-risk actions require explicit confirmation
- **Activity logging is privacy-aware** - only log what's needed, respect user preferences
- **Context caching respects data freshness** - cached context has TTL and forced refresh options
- **No cross-tenant data leakage** - context engine respects tenant boundaries via RLS policies
