# Vitana Assistant: Intelligence & Memory Layer Integration Plan

## Relation to the Full Awareness Plan

This document extends `VITANA_ASSISTANT_FULL_AWARENESS_PLAN.md` by mapping the existing intelligence and memory layer, showing how every component must integrate with the assistant's context awareness, and identifying the **contextual intelligence solutions** that need to be built.

---

## 1. Current Intelligence & Memory Architecture Map

The Vitana platform has **12 intelligence subsystems** that currently operate in varying degrees of isolation:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    VITANA INTELLIGENCE LAYER                        │
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    DATA SOURCES (Input)                      │   │
│  │                                                             │   │
│  │  Conversations ──┐  Diary Entries ──┐  User Actions ──┐     │   │
│  │  (ai_messages)   │  (diary_entries) │  (activity_log) │     │   │
│  │                  ▼                  ▼                 ▼     │   │
│  └──────────────────┼──────────────────┼─────────────────┼─────┘   │
│                     │                  │                 │          │
│  ┌──────────────────▼──────────────────▼─────────────────▼─────┐   │
│  │              EXTRACTION LAYER (Transform)                   │   │
│  │                                                             │   │
│  │  [1] extract-diary-insights    → ai_memory (facts/goals)   │   │
│  │  [2] extractAndStoreInsights   → ai_memory (from chat)     │   │
│  │  [3] extract-user-interests    → user_interests             │   │
│  │  [4] analyze-patterns          → pattern_discoveries        │   │
│  │  [5] analyze-situation         → ai_situation_analyses      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                     │                                               │
│  ┌──────────────────▼──────────────────────────────────────────┐   │
│  │             STORAGE & RETRIEVAL LAYER (Persist)             │   │
│  │                                                             │   │
│  │  [6] ai_memory table           (facts, prefs, goals, etc.) │   │
│  │  [7] generate-memory-embedding (vector embeddings)          │   │
│  │  [8] search-memories           (pgvector + keyword search)  │   │
│  │  [9] reinforce-memory          (confidence reinforcement)   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                     │                                               │
│  ┌──────────────────▼──────────────────────────────────────────┐   │
│  │            CONTEXT AGGREGATION LAYER (Assemble)             │   │
│  │                                                             │   │
│  │  [10] fetch-user-context  → Full user context (AI Chat)     │   │
│  │  [11] get-proactive-context → Proactive context (lighter)   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                     │                                               │
│  ┌──────────────────▼──────────────────────────────────────────┐   │
│  │            INTELLIGENCE CONSUMERS (Output)                  │   │
│  │                                                             │   │
│  │  [A] ai-chat         (text conversation - FULL context)     │   │
│  │  [B] vertex-live      (voice via WebSocket - NO context)    │   │
│  │  [C] Gateway/Orb      (voice via REST+SSE - NO context)    │   │
│  │  [D] generate-proactive-greeting  (proactive context)       │   │
│  │  [E] generate-proactive-message   (proactive context)       │   │
│  │  [F] generate-recommendations     (full context)            │   │
│  │  [G] generate-daily-matches       (user interests)          │   │
│  │  [H] autopilot context calculator (health plans only)       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Component Inventory

### 2.1 EXTRACTION LAYER

| # | Component | Input | Output | Trigger | Gap |
|---|-----------|-------|--------|---------|-----|
| 1 | `extract-diary-insights` | Diary entry text | `ai_memory` (fact, preference, goal, pattern, insight) + embeddings | On diary creation | Only extracts from diary text, misses photos/attachments context |
| 2 | `extractAndStoreInsights` (inside `ai-chat`) | User message + AI response | `ai_memory` + embeddings | After every AI chat response | Only runs for text chat, **never for voice/Orb** |
| 3 | `extract-user-interests` | `ai_memory` + `diary_entries` | `user_interests` + `user_memory_metadata` | Manual/periodic | Never triggered automatically, no scheduler |
| 4 | `analyze-patterns` | `automation_executions` + `profiles` | `pattern_discoveries` | Manual trigger | Only analyzes automation executions, **not user behavior patterns** |
| 5 | `analyze-situation` | Freeform situation text | `ai_situation_analyses` | Manual from admin | Isolated from user context, designed for admin automation |

### 2.2 STORAGE & RETRIEVAL LAYER

| # | Component | What It Stores/Retrieves | Technology | Gap |
|---|-----------|-------------------------|------------|-----|
| 6 | `ai_memory` table | Facts, preferences, goals, patterns, insights | Postgres + `is_active` + `confidence_score` | No decay/expiry mechanism, no memory consolidation |
| 7 | `generate-memory-embedding` | Vector embeddings for semantic search | Gemini `text-embedding-004` → pgvector (768d) | Only generates for ai_memory, **not for diary entries** |
| 8 | `search-memories` | Semantic + keyword search across ai_memory AND diary | pgvector `match_memories` RPC + keyword fallback | Only searched during ai-chat, **never during voice/Orb** |
| 9 | `reinforce-memory` | Confidence score updates (confirm +5%, reference +3%, contradict -15%) | Direct ai_memory update | Only called from ai-chat when memories are referenced |

### 2.3 CONTEXT AGGREGATION LAYER

| # | Component | Data Assembled | Consumers | Gap |
|---|-----------|---------------|-----------|-----|
| 10 | `fetch-user-context` | Identity, temporal, social, economic, health, memory (stats + headers + highlights), community | `ai-chat`, `generate-recommendations`, `generate-enhanced-recommendations` | **Not used by voice channels (Orb, vertex-live)** |
| 11 | `get-proactive-context` | User profile, journey, preferences, memory (top 10), interests, recent actions, events, engagement, admin settings, diary | `generate-proactive-greeting`, `generate-proactive-message` | Lighter context, missing wallet/community/social data |

### 2.4 INTELLIGENCE CONSUMERS

| # | Consumer | Context Source | Memory Access | Semantic Search | Activity Aware | Gap |
|---|----------|---------------|---------------|-----------------|----------------|-----|
| A | `ai-chat` | `fetch-user-context` (full) | Full catalog + stats + headers | Yes (search-memories) | Only chat messages logged | **Gold standard** - all others should match this |
| B | `vertex-live` | **None** | **None** | **None** | **None** | **Completely blind** - generic system prompt |
| C | Gateway/Orb | **None** (only JWT + lang) | **None** | **None** | **None** | **Completely blind** - no context injected |
| D | `generate-proactive-greeting` | `get-proactive-context` (light) | Top 10 by confidence | No | Recent actions only | Missing wallet, community, social context |
| E | `generate-proactive-message` | `get-proactive-context` (light) | Top 10 by confidence | No | Recent actions + diary | Missing full memory catalog |
| F | `generate-recommendations` | `fetch-user-context` (full) | Preferences + insights + patterns | No | No | Good context but no semantic search |
| G | `generate-daily-matches` | `user_interests` + community profiles | No direct memory | No | No | Relies on extracted interests only |
| H | Autopilot context | Health plans (adherence scores) | No memory | No | No | Only health pillar synergy, no broader context |

---

## 3. Identified Contextual Intelligence Gaps

### Gap 1: Voice Channels Have Zero Intelligence

**Status**: CRITICAL

The Orb voice channel (Gateway REST+SSE) and `vertex-live` (WebSocket) are the user's primary interaction point, yet they:
- Receive no user context
- Have no memory access
- Cannot perform semantic memory search
- Cannot extract/store insights from conversations
- Cannot reinforce existing memories
- Have no awareness of recent activity

**Impact**: The assistant sounds generic, forgets everything between sessions, and can't personalize.

### Gap 2: No Insight Extraction from Voice Conversations

**Status**: CRITICAL

The `extractAndStoreInsights` function only runs inside `ai-chat/index.ts` (text channel). When users talk to the Orb:
- No facts are extracted from what they say
- No preferences are learned
- No goals are captured
- No embeddings are generated
- The Memory Garden never grows from voice interactions

**Impact**: Voice-heavy users build no memory. The intelligence layer is deaf to the primary interface.

### Gap 3: No Semantic Memory Search for Voice

**Status**: CRITICAL

`search-memories` is only called from `ai-chat`. When the user asks the Orb "What did I tell you about my birthday?", the Orb:
- Cannot search the memory vector store
- Cannot reference past diary entries
- Cannot find relevant facts

**Impact**: The Orb assistant cannot recall anything the user has previously shared.

### Gap 4: Two Separate Context Functions with Different Coverage

**Status**: HIGH

Two context aggregation functions exist that should be one:

| Feature | `fetch-user-context` | `get-proactive-context` |
|---------|---------------------|------------------------|
| Identity | Full (name, handle, email, tenant, roles, birthDate, age) | Light (name, age_range, gender) |
| Wallet/Economic | Full (balances, transactions, exchange rates) | **Missing** |
| Social/Messages | Full (recent messages, unread count) | **Missing** |
| Community | Full (events, groups, matches, followers) | **Missing** |
| Memory | Full catalog + stats + headers + highlights | Top 10 only |
| Journey | **Missing** | Full (stage, experience, engagement, milestones) |
| Preferences | **Missing** | Full (autopilot, greeting, language, voice) |
| Engagement History | **Missing** | Full (success rate, helpful count) |
| Admin Settings | **Missing** | Full (personality settings) |

**Impact**: The proactive system makes greeting/message decisions with incomplete data. The AI chat system doesn't know the user's journey stage or preferences.

### Gap 5: Interest Extraction is Not Automated

**Status**: MEDIUM

`extract-user-interests` must be manually triggered. There's no:
- Scheduled periodic re-extraction
- Trigger on new diary entries
- Trigger on new memory insertions
- Automatic refresh when enough new data accumulates

**Impact**: `user_interests` goes stale. Recommendations and daily matches use outdated interest profiles.

### Gap 6: Pattern Analysis Only Covers Automations, Not User Behavior

**Status**: MEDIUM

`analyze-patterns` only analyzes `automation_executions` and `profiles` signup data. It does NOT analyze:
- User navigation patterns (which pages they visit most)
- Time-of-day usage patterns (when they're most active)
- Feature engagement patterns (which features they use vs ignore)
- Health behavior patterns (sleep consistency, workout frequency)
- Social patterns (who they message most, groups they engage with)
- Conversational patterns (what topics they ask about)

**Impact**: The autopilot suggests generic actions instead of learning what this specific user actually needs.

### Gap 7: No Memory Consolidation or Decay

**Status**: MEDIUM

Memories in `ai_memory` have:
- `confidence_score` (reinforced/decayed by reference/contradiction)
- `is_active` flag
- No TTL/expiry mechanism
- No consolidation (merging similar memories into stronger ones)
- No promotion (temporary observations → confirmed facts)

**Impact**: Memory grows indefinitely, old irrelevant memories pollute semantic search results, and contradictory memories coexist without resolution.

### Gap 8: Activity Log Not Fed Back to Intelligence Layer

**Status**: HIGH

The `user_activity_log` has excellent coverage (90+ activity types tracked: wallet, calendar, discover, community, health, etc.) but this data is:
- Only used for **display** (activity timeline UI)
- **Never** fed into AI context at query time
- **Never** used for pattern extraction
- **Never** used for proactive suggestions

**Impact**: The assistant doesn't know what the user just did. It can't say "I see you just joined that yoga group - would you like me to add their next event to your calendar?"

### Gap 9: Autopilot Context is Health-Only

**Status**: MEDIUM

`autopilotContext.ts` only calculates synergy scores between health pillars (sleep, hydration, nutrition, mental, exercise, supplements). It has no integration with:
- Wallet/financial context
- Community engagement
- Calendar/scheduling
- Professional/provider data
- Discovery/shopping behavior

**Impact**: Autopilot actions are limited to health suggestions. Cannot suggest community, financial, or discovery actions.

### Gap 10: No Real-Time Context Updates During Conversations

**Status**: MEDIUM

All context is fetched once at conversation start and cached for 5 minutes. During a long Orb conversation, the context is stale:
- If a new message arrives mid-conversation, the assistant doesn't know
- If a wallet balance changes, it reports the cached value
- If an event is about to start, there's no interrupt mechanism

**Impact**: The assistant gives outdated information during active sessions.

---

## 4. Contextual Intelligence Solutions

### Solution 1: Unified Context Engine (merges fetch-user-context + get-proactive-context)

**Problem**: Two context functions with different coverage, both incomplete.

**Solution**: Create a single `VitanaContextEngine` that both consumes and is consumed by all intelligence components:

```
NEW: supabase/functions/build-full-context/index.ts

Input: { userId, contextScope: 'full' | 'voice' | 'proactive' }
Output: {
  // FROM fetch-user-context:
  identity, temporal, social, economic, health, memory (stats + catalog), community,

  // FROM get-proactive-context:
  journey, preferences, engagement_metrics, admin_settings,

  // NEW:
  recentActivity: {          // From user_activity_log (last 50 actions this session)
    actions: [...],
    sessionDuration: number,
    mostActiveFeature: string,
    lastAction: { type, timestamp, details }
  },

  discoveredPatterns: {       // From pattern_discoveries
    behavioral: [...],
    temporal: [...],
    health: [...]
  },

  autopilotState: {           // From autopilot_actions + health plans
    synergyScore: number,
    pendingActions: [...],
    recentExecutions: [...],
    healthPillarStatus: {...}
  },

  currentNavigation: {        // NEW: passed from client
    currentPage: string,
    timeOnPage: number,
    previousPages: string[]
  }
}
```

**Scope optimization**: Different consumers need different amounts of data:
- `voice` scope: Compact version optimized for token limits (no memory catalog, summarized activity)
- `full` scope: Everything (for ai-chat text conversations)
- `proactive` scope: Medium (for greeting/message generation)

### Solution 2: Voice Intelligence Pipeline

**Problem**: Voice conversations generate no intelligence.

**Solution**: Build an intelligence pipeline that runs after every voice turn:

```
Orb Voice Session
    │
    ├── User speaks → STT → text
    │
    ├── Gateway processes response
    │
    └── POST-TURN INTELLIGENCE PIPELINE (async, non-blocking):
        │
        ├── [A] extractAndStoreInsights(userTranscript, aiResponse)
        │       → ai_memory (facts, preferences, goals)
        │       → generate-memory-embedding (async)
        │
        ├── [B] Log to user_activity_log
        │       activity_type: 'orb.voice.turn'
        │       activity_data: { transcript, agentType, sessionId }
        │
        └── [C] Log to ai_messages
                conversation_id, role, content, input_method: 'voice'
```

**Implementation path**:
1. Gateway must POST transcript + AI response text to a new edge function `process-voice-turn`
2. Or: client-side `useOrbVoiceClient` captures transcripts and calls extraction functions directly

### Solution 3: Semantic Memory for Voice

**Problem**: Orb cannot search memory.

**Solution**: Two approaches (implement both):

**A. Pre-session memory injection**: When the Orb session starts, search memories relevant to the user's recent context and inject top results into the system prompt:
```typescript
// In Gateway session start:
const recentInsights = await searchMemories({ query: 'general context', userId });
const topMemories = recentInsights.relevant_memories.slice(0, 10);
systemPrompt += buildMemoryBlock(topMemories);
```

**B. Tool-based memory search**: Give the voice AI a `search_memory` tool declaration so Gemini can call it mid-conversation when the user asks about something from the past:
```typescript
// In Gemini Live setup:
tools: [{
  name: 'search_memory',
  description: 'Search user memory for relevant past information',
  parameters: { query: { type: 'string' } }
}]
```

### Solution 4: Activity-Aware Intelligence

**Problem**: Activity log is display-only, not fed to AI.

**Solution**: Inject recent session activity into context at query time:

```typescript
// In build-full-context:
const sessionActivity = await supabase
  .from('user_activity_log')
  .select('activity_type, activity_data, created_at')
  .eq('user_id', userId)
  .gte('created_at', sessionStartTime)
  .order('created_at', { ascending: false })
  .limit(30);

// Summarize for AI context:
context.recentSessionActivity = sessionActivity.map(a => ({
  what: formatActivityContent(a),
  when: timeSince(a.created_at),
  category: a.activity_type.split('.')[0]
}));
```

The AI then knows: "3 minutes ago: Viewed biomarker: Vitamin D → 2 minutes ago: Ordered test: Comprehensive Panel → 1 minute ago: Opened Orb"

### Solution 5: Automated Interest Extraction Pipeline

**Problem**: Interest extraction is manual.

**Solution**: Trigger `extract-user-interests` automatically:

```
Triggers:
├── Every 10 new ai_memory insertions → Supabase database webhook → extract-user-interests
├── Every 5 new diary entries → Supabase database webhook → extract-user-interests
├── Weekly scheduled cron → extract-user-interests for all active users
└── On explicit user request via Orb ("Update my interest profile")
```

**Implementation**: Add Supabase database webhooks or pg_cron jobs:
```sql
-- Trigger interest extraction when memory count changes significantly
CREATE OR REPLACE FUNCTION trigger_interest_extraction()
RETURNS trigger AS $$
BEGIN
  -- Count recent insertions for this user
  IF (SELECT count(*) FROM ai_memory
      WHERE user_id = NEW.user_id
      AND created_at > NOW() - INTERVAL '1 hour') >= 5 THEN
    -- Queue extraction (via pg_net or notification)
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/extract-user-interests',
      body := json_build_object('user_id', NEW.user_id)::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Solution 6: Behavioral Pattern Analysis from Activity Log

**Problem**: Pattern analysis only looks at automation executions.

**Solution**: Create `analyze-user-behavior-patterns` that mines the `user_activity_log`:

```typescript
// NEW: supabase/functions/analyze-user-behavior/index.ts
// Input: userId
// Analyzes:
//   - Time-of-day activity distribution
//   - Most used features (by activity_type frequency)
//   - Social engagement patterns (messages, events, groups)
//   - Health tracking consistency (diary frequency, tracker usage)
//   - Financial behavior (transaction patterns, spending categories)
//   - Navigation patterns (page visit frequency, session duration)
// Output: Stored in user_behavior_patterns table
//   - pattern_type: 'temporal' | 'feature_usage' | 'social' | 'health' | 'financial'
//   - pattern_data: { ... }
//   - confidence: number
//   - actionable_suggestions: string[]
```

These patterns feed back into the context engine and are available to:
- Autopilot (suggest actions based on actual behavior)
- Proactive messages (time messages for when user is most engaged)
- Recommendations (recommend features the user hasn't tried but similar users love)

### Solution 7: Memory Consolidation & Lifecycle

**Problem**: Memories grow indefinitely, no consolidation or decay.

**Solution**: Create `consolidate-memories` edge function:

```typescript
// NEW: supabase/functions/consolidate-memories/index.ts
// Runs weekly per user

// 1. MERGE similar memories
//    Find ai_memory pairs where embedding similarity > 0.85 AND same type
//    → Create consolidated memory with combined content, higher confidence
//    → Deactivate originals

// 2. PROMOTE recurring patterns
//    If an insight appears 3+ times across different conversations
//    → Promote confidence to 0.95+
//    → Mark as 'confirmed_fact'

// 3. DECAY stale memories
//    Memories not referenced in 90 days AND confidence < 0.6
//    → Reduce confidence by 10%
//    → If confidence < 0.2 → set is_active = false

// 4. RESOLVE contradictions
//    Find memories flagged as contradictory by search-memories
//    → Keep most recent / highest confidence
//    → Deactivate the other with metadata: { superseded_by: newId }
```

### Solution 8: Proactive Context Parity

**Problem**: Proactive system uses lighter context than AI chat.

**Solution**: Merge `get-proactive-context` into `build-full-context` with a `proactive` scope that includes everything the current proactive context has PLUS wallet, community, and social data.

Current proactive greeting knows: name, journey stage, experience level, interests, recent actions, upcoming events.

Should also know: wallet balance (to suggest purchases), community matches (to suggest connecting), unread messages (to prompt checking), health tracking gaps (to remind about logging).

### Solution 9: Real-Time Context Invalidation

**Problem**: Context is cached for 5 minutes, goes stale during active sessions.

**Solution**: Event-driven cache invalidation:

```typescript
// Client-side: VitanaContextManager subscribes to Supabase realtime
const channel = supabase.channel('context-invalidation')
  .on('postgres_changes', { event: '*', table: 'user_wallets', filter: `user_id=eq.${userId}` },
    () => invalidateLayer('economic'))
  .on('postgres_changes', { event: 'INSERT', table: 'messages', filter: `recipient_id=eq.${userId}` },
    () => invalidateLayer('social'))
  .on('postgres_changes', { event: '*', table: 'diary_entries', filter: `user_id=eq.${userId}` },
    () => invalidateLayer('health'))
  .on('postgres_changes', { event: 'INSERT', table: 'ai_memory', filter: `user_id=eq.${userId}` },
    () => invalidateLayer('memory'))
  .subscribe();

// When a layer is invalidated during an active Orb session:
// → Re-fetch only that layer
// → Send context delta to Gateway as a "context_update" message
// → Gateway injects updated fact into Gemini conversation
```

### Solution 10: Expanded Autopilot Context

**Problem**: Autopilot only considers health pillars.

**Solution**: Extend `AutopilotContextData` to include all domains:

```typescript
interface ExpandedAutopilotContext {
  // EXISTING: Health pillar synergies
  healthPillars: { synergyScore, insights, relationships };

  // NEW: Community engagement
  community: {
    unrespondedInvitations: number,
    upcomingEvents: Event[],
    staleGroups: Group[],  // Groups user hasn't visited in 14+ days
    pendingMatches: Match[]
  };

  // NEW: Financial opportunities
  financial: {
    unusedCredits: number,
    pendingTransactions: number,
    exchangeOpportunities: { favorable_rate: boolean, pair: string }[]
  };

  // NEW: Content & Discovery
  content: {
    bookmarkedButUnvisited: number,
    newServicesInInterests: number,
    expiringVouchers: Voucher[]
  };

  // NEW: Calendar awareness
  calendar: {
    gapInSchedule: { start: string, duration: number }[],
    overbooked: boolean,
    unconfirmedEvents: Event[]
  };
}
```

---

## 5. Integration Architecture: How It All Fits Together

```
┌────────────── USER INTERACTION ──────────────────────────┐
│                                                           │
│  [Voice/Orb]   [Text Chat]   [App Actions]   [Diary]    │
│       │             │              │             │        │
│       ▼             ▼              ▼             ▼        │
│  ┌─────────────────────────────────────────────────────┐ │
│  │          UNIFIED CONTEXT ENGINE                      │ │
│  │          (build-full-context)                        │ │
│  │                                                     │ │
│  │  Assembles from ALL sources:                        │ │
│  │  • fetch-user-context data (identity, wallet, etc.) │ │
│  │  • get-proactive-context data (journey, prefs)      │ │
│  │  • Recent session activity (activity_log)           │ │
│  │  • Discovered patterns (behavior analysis)          │ │
│  │  • Current navigation state (from client)           │ │
│  │  • Autopilot state (health + community + financial) │ │
│  └────────────────────┬────────────────────────────────┘ │
│                       │                                   │
│           ┌───────────┼───────────┐                       │
│           ▼           ▼           ▼                       │
│  ┌──────────────┐ ┌────────┐ ┌──────────────┐           │
│  │  VOICE/ORB   │ │AI CHAT │ │  PROACTIVE   │           │
│  │              │ │        │ │  SYSTEM      │           │
│  │ System prompt│ │ System │ │ Greeting +   │           │
│  │ + Memory     │ │ prompt │ │ Message gen  │           │
│  │ + Tools      │ │ + Full │ │              │           │
│  │              │ │ memory │ │              │           │
│  └──────┬───────┘ └───┬────┘ └──────┬───────┘           │
│         │             │             │                     │
│         ▼             ▼             ▼                     │
│  ┌─────────────────────────────────────────────────────┐ │
│  │       POST-INTERACTION INTELLIGENCE PIPELINE        │ │
│  │                                                     │ │
│  │  [1] Extract & store insights → ai_memory           │ │
│  │  [2] Generate embeddings → pgvector                 │ │
│  │  [3] Reinforce referenced memories                  │ │
│  │  [4] Log to activity timeline                       │ │
│  │  [5] Trigger interest re-extraction (if threshold)  │ │
│  │  [6] Update context cache                           │ │
│  └─────────────────────────────────────────────────────┘ │
│                       │                                   │
│                       ▼                                   │
│  ┌─────────────────────────────────────────────────────┐ │
│  │      BACKGROUND INTELLIGENCE (Periodic)             │ │
│  │                                                     │ │
│  │  Weekly:  consolidate-memories                      │ │
│  │  Weekly:  analyze-user-behavior                     │ │
│  │  Weekly:  extract-user-interests (full refresh)     │ │
│  │  Daily:   generate-daily-matches                    │ │
│  │  Hourly:  proactive message opportunity detection   │ │
│  └─────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────┘
```

---

## 6. Implementation Priority Matrix

| Priority | Solution | Effort | Impact | Dependencies |
|----------|----------|--------|--------|-------------|
| P0 | **Solution 1**: Unified Context Engine | Medium | Critical | None |
| P0 | **Solution 2**: Voice Intelligence Pipeline | Medium | Critical | Solution 1 |
| P0 | **Solution 3**: Semantic Memory for Voice | Medium | Critical | Solution 2 |
| P1 | **Solution 4**: Activity-Aware Intelligence | Low | High | Solution 1 |
| P1 | **Solution 8**: Proactive Context Parity | Low | High | Solution 1 |
| P2 | **Solution 5**: Automated Interest Extraction | Low | Medium | None |
| P2 | **Solution 6**: Behavioral Pattern Analysis | Medium | Medium | Solution 4 |
| P2 | **Solution 7**: Memory Consolidation | Medium | Medium | None |
| P2 | **Solution 9**: Real-Time Context Invalidation | Medium | Medium | Solution 1 |
| P3 | **Solution 10**: Expanded Autopilot Context | Medium | Medium | Solutions 1, 4, 6 |

---

## 7. Files to Create / Modify

### New Edge Functions
| File | Purpose |
|------|---------|
| `supabase/functions/build-full-context/index.ts` | Unified context engine replacing both existing context functions |
| `supabase/functions/process-voice-turn/index.ts` | Post-turn intelligence pipeline for voice conversations |
| `supabase/functions/analyze-user-behavior/index.ts` | Behavioral pattern analysis from activity log |
| `supabase/functions/consolidate-memories/index.ts` | Memory consolidation, decay, and contradiction resolution |

### Modified Edge Functions
| File | Change |
|------|--------|
| `supabase/functions/vertex-live/index.ts` | Inject user context into system prompt, add tool declarations |
| `supabase/functions/fetch-user-context/index.ts` | Merge with proactive context, add journey/preferences/activity |
| `supabase/functions/get-proactive-context/index.ts` | Deprecate → delegate to build-full-context with 'proactive' scope |
| `supabase/functions/ai-chat/index.ts` | Switch to build-full-context, ensure parity with voice |
| `supabase/functions/extract-user-interests/index.ts` | Add auto-trigger support, webhook-friendly |

### Client-Side Files
| File | Change |
|------|--------|
| `src/lib/OrbVoiceClient.ts` | Send userContext in session start, capture transcripts for intelligence pipeline |
| `src/hooks/useOrbVoiceClient.ts` | Fetch context before session, handle context updates during session |
| `src/services/VitanaContextManager.ts` | **New** - Unified client-side context manager with real-time subscriptions |
| `src/hooks/useVitanaOrbTools.ts` | Add search_memory, log_health, send_message tools |
| `src/services/autopilotContext.ts` | Expand beyond health pillars |

### Database Migrations
| Table | Change |
|-------|--------|
| `user_behavior_patterns` | **New** - Store discovered behavioral patterns per user |
| `ai_memory` | Add `last_accessed_at`, `consolidation_group_id`, `memory_lifecycle` columns |
| `user_activity_log` | Add index on `(user_id, session_id, created_at)` for fast session queries |

---

## 8. Success Criteria

The intelligence layer is fully integrated when:

1. **Voice conversations build memory** - Facts shared via Orb appear in Memory Garden
2. **Voice conversations search memory** - "What did I tell you about X?" works on Orb
3. **All channels share identical context** - Voice, text, and proactive systems see the same user state
4. **Activity feeds intelligence** - "I see you just booked a lab test. Would you like me to remind you to fast tomorrow?"
5. **Patterns drive suggestions** - "You usually check your diary around this time. Want to log today's entry?"
6. **Memory self-maintains** - Contradictions resolve, stale memories decay, strong facts consolidate
7. **Interests stay fresh** - New diary entries and conversations automatically update interest profiles
8. **Autopilot spans all domains** - Suggests community, financial, and discovery actions alongside health
