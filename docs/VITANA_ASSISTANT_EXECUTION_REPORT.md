# Vitana Assistant Awareness: Updated Execution Report

**Date**: March 2026
**Status**: For Approval Before Execution
**Based on**: Full codebase rescan after weeks of improvements

---

## 1. Progress Since Original Plan

### What Has Been Built / Improved

| Area | Status | What Changed |
|------|--------|-------------|
| **Vitanaland-Live Edge Function** | NEW | Dedicated WebSocket edge function (`vitanaland-live/index.ts`) with Gemini v1alpha, tool declarations (7 tools), VITANALAND system personality, and greeting rotation |
| **OrbVoiceClient (Gateway path)** | IMPROVED | REST+SSE architecture via Cloud Run Gateway with JWT auth, auto-silence detection, iOS polyfill, mute/unmute, error recovery with consecutive-failure detection |
| **Orb Tool Declarations** | PARTIAL | `vitanaland-live` declares 7 tools to Gemini: `navigate_to`, `start_glass_mode`, `stop_glass_mode`, `start_camera_mode`, `open_diary_entry`, `run_autopilot`, `show_text_input`. Client-side `useVitanaOrbTools.ts` executes them with 15+ navigation destinations |
| **Intelligent Greeting System** | NEW | Full pipeline: `IntelligentGreetingProvider` → `useIntelligentGreeting` → `generate-proactive-greeting` edge function. Time-aware, language-aware, frequency-controlled, with Glass Mode guards and single-flight guarantee |
| **Proactive Message System** | IMPROVED | `generate-proactive-message` with priority logic (urgent events > pending actions > new user > diary > morning check-in), multi-language translation pass |
| **Activity Logging** | COMPREHENSIVE | 100+ activity types tracked across wallet, calendar, discover, community (events/groups/live/following/messaging/search), health (biomarkers/labs/omics/supplements), memory, autopilot. Dedicated logger hooks: `useCommunityLogger`, `useHealthLogger`, `useActivityLogger` |
| **VitanalandNavigationContext** | NEW | Idle detection (2.5min), route-aware orb visibility, first-time experience, auto-minimize, scene tracking |
| **Pattern Discovery** | EXISTS | `usePatternDiscovery` hook + `analyze-patterns` edge function + `pattern_discoveries` table. But still limited to automation patterns only |
| **Proactive Growth** | NEW | `useProactiveGrowth` with contact import, invite, social connect, and share suggestions |
| **User Preferences** | COMPREHENSIVE | `user_preferences` table covers: autopilot settings (categories, priority, max/day, quiet hours), greeting settings, AI model/temp/length, STT/TTS settings, interests, wellness goals |

### What Has NOT Changed (Original Gaps Still Open)

| Gap | Original Status | Current Status | Still Open? |
|-----|----------------|----------------|-------------|
| **Voice channels have no user context** | CRITICAL | **STILL CRITICAL** | YES - `vitanaland-live` has a hardcoded generic system prompt with zero user data. `OrbVoiceClient` (Gateway path) sends no context. |
| **No insight extraction from voice** | CRITICAL | **STILL CRITICAL** | YES - Voice conversations generate zero ai_memory entries. No embeddings. Memory Garden deaf to voice. |
| **No semantic memory search for voice** | CRITICAL | **STILL CRITICAL** | YES - Neither `vitanaland-live` nor Gateway calls `search-memories`. Orb cannot recall anything. |
| **Two separate context functions** | HIGH | **STILL OPEN** | YES - `fetch-user-context` and `get-proactive-context` still exist separately with different coverage |
| **Interest extraction not automated** | MEDIUM | **STILL OPEN** | YES - No triggers, no webhooks, no scheduled re-extraction |
| **Pattern analysis limited to automations** | MEDIUM | **STILL OPEN** | YES - `analyze-patterns` still only looks at `automation_executions` |
| **No memory consolidation/decay** | MEDIUM | **STILL OPEN** | YES - No expiry, no merge, no contradiction resolution |
| **Activity log not fed to AI** | HIGH | **STILL OPEN** | YES - 100+ types tracked but never injected into any AI context |
| **Autopilot context health-only** | MEDIUM | **STILL OPEN** | YES - `autopilotContext.ts` still calculates only health pillar synergy (fixed scores: 84 synergy, 742 vitana) |
| **No real-time context updates in session** | MEDIUM | **STILL OPEN** | YES - Context fetched once, cached 5 minutes |

---

## 2. Updated Gap Analysis

### CRITICAL (Must Fix First - Blocks Everything)

#### Gap C1: Voice Channels Still Completely Blind

Both voice paths lack user awareness:

**`vitanaland-live/index.ts`** (WebSocket path):
- System prompt is a hardcoded `VITANALAND_SYSTEM_INSTRUCTION` string
- Never calls `fetch-user-context` or any context function
- Never calls `search-memories`
- Does not know user's name, wallet, health, community, or memory
- Has tool declarations but no user-context-aware tools (e.g., no `search_memory`, no `check_balance`)

**`OrbVoiceClient.ts`** (Gateway REST+SSE path):
- Session start sends only: `{ lang, voice_style, response_modalities }`
- No `userContext` field in the config or session payload
- Gateway likely has same blindness (no context injection)

**What needs to happen**:
1. Fetch user context before voice session starts
2. Inject into system prompt (both vitanaland-live and Gateway)
3. Add `search_memory`, `check_balance` tools

#### Gap C2: Voice Conversations Generate Zero Intelligence

When a user talks to the Orb for 30 minutes about their health goals:
- 0 facts extracted → `ai_memory` not updated
- 0 embeddings generated → vector search can't find these conversations
- 0 entries in `user_activity_log` → activity timeline doesn't show voice interactions
- 0 entries in `ai_messages` → conversation history is lost (Gateway path; vitanaland-live also doesn't log)

**What needs to happen**:
1. Capture voice transcripts (both user speech and AI response text)
2. Run `extractAndStoreInsights` after each voice turn (same as ai-chat does)
3. Log to `ai_messages` for conversation history
4. Log to `user_activity_log` for activity timeline

#### Gap C3: Unified Context Not Built

Two context functions still diverge:

| Data | `fetch-user-context` | `get-proactive-context` | Needed by Voice |
|------|---------------------|------------------------|-----------------|
| User name, handle, email | YES | Partial (name only) | YES |
| Wallet balances | YES | NO | YES |
| Social/messages | YES | NO | YES |
| Community data | YES | NO | YES |
| Memory catalog | YES (full) | Partial (top 10) | YES (compact) |
| Journey/experience | NO | YES | YES |
| Preferences | NO | YES | YES |
| Engagement metrics | NO | YES | Useful |
| Admin settings | NO | YES | Not needed |
| Activity log | NO | NO | YES |
| Navigation state | NO | NO | YES |

### HIGH (Blocks Autopilot / Full Awareness)

#### Gap H1: Activity Log is the Biggest Untapped Intelligence Gold Mine

You have 100+ activity types being meticulously tracked (`useCommunityLogger`, `useHealthLogger`, `useActivityLogger`), covering:
- Every community interaction (events, groups, live rooms, follows, messages, searches)
- Every health action (biomarkers, labs, omics, supplements)
- Every wallet operation (transfers, exchanges)
- Every memory operation (create, update, delete, promote)
- Every calendar action
- Every discover interaction (services, providers, offers)

**None of this feeds into AI context.** This is the single richest data source for making the assistant truly aware of "what the user just did."

#### Gap H2: Autopilot Actions Are Still Mock Data

`use-autopilot.ts` generates actions from a hardcoded `actionConfigs` array with 6 fixed actions. It doesn't:
- Query real user data to suggest relevant actions
- Use the activity log to avoid suggesting things the user already did
- Use memory/patterns to personalize suggestions
- Connect to real backend execution (2-second simulation with 90% fake success)

---

## 3. Execution Plan: What to Build

### Sprint 1: Make Voice Aware (Weeks 1-2)

#### Task 1.1: Inject User Context into vitanaland-live

**File**: `supabase/functions/vitanaland-live/index.ts`

After authenticating the user, fetch their context and build a personalized system prompt:

```typescript
// After user auth succeeds:
const serviceClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const { data: ctxData } = await serviceClient.functions.invoke('fetch-user-context', {
  body: { userId: user.id, forceRefresh: false }
});
const ctx = ctxData?.context;

// Build personalized system instruction
const personalizedInstruction = buildVoiceSystemPrompt(ctx);

// Use in setup message instead of hardcoded VITANALAND_SYSTEM_INSTRUCTION
```

The `buildVoiceSystemPrompt(ctx)` function builds a compact prompt that includes:
- User name, age, membership tier
- Wallet balances (3 currencies)
- Current time, day, upcoming events (next 3)
- Recent diary highlights (last 3)
- Top memory facts (5 highest confidence)
- Health score
- Community: joined groups count, upcoming events count, unread messages
- Recent activity summary (last 5 actions from user_activity_log)

**Estimated tokens**: ~800-1200 (well within Gemini Live limits)

#### Task 1.2: Inject User Context into Gateway/OrbVoiceClient

**Files**: `src/hooks/useOrbVoiceClient.ts`, `src/lib/OrbVoiceClient.ts`

```typescript
// In useOrbVoiceClient.ts connect():
const { data: ctxData } = await supabase.functions.invoke('fetch-user-context', {
  body: { userId: user.id }
});

const config: OrbVoiceClientConfig = {
  lang: ctxData?.context?.identity?.preferredLanguage || 'de',
  accessToken,
  userContext: ctxData?.context,  // NEW
};
```

```typescript
// In OrbVoiceClient.ts start():
body: JSON.stringify({
  lang: this.config.lang,
  voice_style: 'friendly, calm, empathetic',
  response_modalities: ['audio', 'text'],
  user_context: this.config.userContext,  // NEW - Gateway uses this to build system prompt
})
```

**Dependency**: Gateway service must be updated to accept and use `user_context`.

#### Task 1.3: Add Memory & Intelligence Tools to Voice

**File**: `supabase/functions/vitanaland-live/index.ts` (tool declarations)

Add to `function_declarations`:
```typescript
{
  name: "search_memory",
  description: "Search the user's memory garden for past information they've shared. Use when the user asks about something from the past.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "What to search for" }
    },
    required: ["query"]
  }
},
{
  name: "check_balance",
  description: "Check the user's wallet balances (USD, VTN, Credits)",
  parameters: { type: "object", properties: {} }
},
{
  name: "create_diary_entry",
  description: "Save a diary entry for the user",
  parameters: {
    type: "object",
    properties: {
      text: { type: "string", description: "The diary entry text" },
      tags: { type: "array", items: { type: "string" }, description: "Tags for the entry" }
    },
    required: ["text"]
  }
}
```

**Client-side**: Expand `useVitanaOrbTools.ts` to handle these tool responses by calling Supabase functions.

#### Task 1.4: Voice Intelligence Pipeline

**New file**: `supabase/functions/process-voice-turn/index.ts`

Called after each voice turn to extract intelligence:
```
Input: { userId, userTranscript, aiResponseText, sessionId, conversationId }
Actions:
  1. Store in ai_messages (role: user + role: assistant)
  2. Call extractAndStoreInsights(userTranscript, aiResponseText) - same logic as ai-chat
  3. Log to user_activity_log (activity_type: 'orb.voice.turn')
  4. If insights extracted → trigger generate-memory-embedding async
```

**Client-side trigger**: `OrbVoiceClient` and `vitanaland-live` must capture transcript text from SSE/WebSocket messages and POST to this function.

---

### Sprint 2: Unify Context & Feed Activity (Weeks 3-4)

#### Task 2.1: Merge Context Functions

**File**: Modify `supabase/functions/fetch-user-context/index.ts`

Add the missing fields from `get-proactive-context`:
- `user_journey` (onboarding_stage, experience_level, engagement_score, days_active, milestones)
- `user_preferences` (autopilot, greeting, AI, STT/TTS settings)
- `proactive_engagement` history (success rate)
- Recent session activity from `user_activity_log` (last 30 actions)

Add a `scope` parameter:
- `scope: 'full'` → Everything (for ai-chat)
- `scope: 'voice'` → Compact version (for voice channels, ~1000 tokens)
- `scope: 'proactive'` → Medium (for greeting/message generation)

Then update `get-proactive-context` to delegate to `fetch-user-context` with `scope: 'proactive'`.

#### Task 2.2: Inject Activity Log into AI Context

In the unified context function, add recent session activity:

```typescript
// Add to parallel queries:
supabase.from('user_activity_log')
  .select('activity_type, activity_data, created_at')
  .eq('user_id', userId)
  .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()) // last 2 hours
  .order('created_at', { ascending: false })
  .limit(20)
```

Format as compact summary for AI:
```
=== RECENT USER ACTIVITY (Last 2 Hours) ===
• 3m ago: Viewed biomarker: Vitamin D
• 8m ago: Joined event: Morning Yoga Session
• 15m ago: Sent message to Sarah
• 1h ago: Created diary entry about meditation
```

#### Task 2.3: Navigation Context from Client

**New**: Pass the user's current page to the context when initiating a voice session.

```typescript
// In useOrbVoiceClient.ts:
const currentPage = window.location.pathname;
const config = {
  // ...existing
  currentNavigation: {
    page: currentPage,
    label: getPageLabel(currentPage), // map /health/tracker/sleep → "Sleep Tracker"
  }
};
```

This lets the assistant say: "I see you're on the Sleep Tracker. Would you like me to log last night's sleep?"

---

### Sprint 3: Intelligence Automation (Weeks 5-6)

#### Task 3.1: Automated Interest Extraction

Add a Supabase database webhook or pg_cron:
- After every 5 new `ai_memory` insertions → trigger `extract-user-interests`
- Weekly cron for all active users

#### Task 3.2: Behavioral Pattern Analysis

**New file**: `supabase/functions/analyze-user-behavior/index.ts`

Analyze `user_activity_log` for:
- Time-of-day activity distribution
- Most used features
- Health tracking consistency
- Social engagement patterns

Store in `user_behavior_patterns` table. Feed into autopilot and proactive systems.

#### Task 3.3: Memory Consolidation

**New file**: `supabase/functions/consolidate-memories/index.ts`

Weekly job per user:
- Merge similar memories (embedding similarity > 0.85)
- Promote high-frequency patterns to confirmed facts
- Decay stale memories (not referenced in 90 days)
- Resolve contradictions

#### Task 3.4: Real Autopilot Actions

Replace mock `actionConfigs` in `use-autopilot.ts` with real data-driven suggestions:
- Query user's actual health plan adherence
- Check for stale community groups
- Find unused credits/expiring vouchers
- Detect calendar gaps
- Use behavioral patterns for timing

---

## 4. Files Changed Per Sprint

### Sprint 1 (Voice Awareness)
| File | Action |
|------|--------|
| `supabase/functions/vitanaland-live/index.ts` | MODIFY - Add context fetch, personalized prompt, new tool declarations |
| `supabase/functions/process-voice-turn/index.ts` | CREATE - Voice intelligence pipeline |
| `src/hooks/useOrbVoiceClient.ts` | MODIFY - Fetch context before connect, pass navigation state |
| `src/lib/OrbVoiceClient.ts` | MODIFY - Accept userContext in config, send in session start |
| `src/hooks/useVitanaOrbTools.ts` | MODIFY - Add search_memory, check_balance, create_diary_entry handlers |

### Sprint 2 (Context Unification)
| File | Action |
|------|--------|
| `supabase/functions/fetch-user-context/index.ts` | MODIFY - Add journey, preferences, engagement, activity log, scope param |
| `supabase/functions/get-proactive-context/index.ts` | MODIFY - Delegate to fetch-user-context with scope |
| `supabase/functions/ai-chat/index.ts` | MODIFY - Use unified context |
| `supabase/functions/generate-proactive-greeting/index.ts` | MODIFY - Use unified context |
| `supabase/functions/generate-proactive-message/index.ts` | MODIFY - Use unified context |

### Sprint 3 (Intelligence Automation)
| File | Action |
|------|--------|
| `supabase/functions/analyze-user-behavior/index.ts` | CREATE |
| `supabase/functions/consolidate-memories/index.ts` | CREATE |
| `supabase/functions/extract-user-interests/index.ts` | MODIFY - Add auto-trigger support |
| `src/hooks/use-autopilot.ts` | MODIFY - Replace mocks with real data queries |
| `src/services/autopilotContext.ts` | MODIFY - Expand beyond health |
| New migration | `user_behavior_patterns` table, ai_memory index additions |

---

## 5. Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Token limit on Gemini Live system prompt | Voice context too large | Use `scope: 'voice'` for compact context (~1000 tokens) |
| Latency on voice session start (context fetch) | Slow orb activation | Use cached context (already cached 5 min), fetch in parallel with WebSocket setup |
| Gateway service needs updates (external) | Blocks Gateway path | Implement vitanaland-live path first (fully within our control) |
| Voice transcript quality varies | Poor insight extraction | Apply same confidence thresholds as ai-chat (0.7+ only) |
| Increased edge function invocations | Cost increase | process-voice-turn is lightweight, use batching for long sessions |

---

## 6. Approval Checklist

Please confirm:

- [ ] **Sprint 1 scope** approved (voice awareness + intelligence pipeline)
- [ ] **Sprint 2 scope** approved (context unification + activity injection)
- [ ] **Sprint 3 scope** approved (automation + consolidation + real autopilot)
- [ ] **Gateway dependency** acknowledged (Gateway Cloud Run needs separate update for OrbVoiceClient path; vitanaland-live path is self-contained)
- [ ] **Start with vitanaland-live** path first (WebSocket, fully in Supabase, no external dependency)
- [ ] Ready to begin execution
