

# Fix: Vitana calling Alex "Jovana" — identity contamination via AI memory

## Root Cause

The `ai-chat` edge function extracts "insights" from every conversation and stores them in `ai_memory` (lines 352-515). The extraction prompt includes "Personal facts (birthday, age, location, occupation, family)" — which means if someone says "my name is Jovana" in a conversation, it gets stored as a high-confidence fact like `"User's name is Jovana"`.

These memories are then injected into:
1. **Greeting prompt** (`generate-proactive-greeting`) — via `get-proactive-context` which includes `memory.recent_facts`
2. **Chat system prompt** (`ai-chat`) — via the "USER SNAPSHOT (High-Confidence Facts)" section
3. **ORB voice context** (`buildOrbContext.ts`) — feeds `ai_memory` directly

The AI sees **both** the profile name ("Alex") and a stored memory ("User's name is Jovana") and trusts the memory because it says "based on previous conversations."

There's also a **1-hour cache** in `proactive_context_cache` that could serve stale data from a previous session.

## Fix (3 changes)

### 1. Filter identity-conflicting memories from greeting context
**File: `supabase/functions/get-proactive-context/index.ts`**

After fetching memories (line 112-118), filter out any memories whose content mentions a name that conflicts with the profile's `display_name`. Add a post-processing step:

```typescript
// Filter out name-identity memories that conflict with the profile
const profileName = profileResult.data?.display_name || profileResult.data?.full_name;
const filteredMemories = (memoryResult.data || []).filter(m => {
  const contentLower = m.content.toLowerCase();
  // Skip memories that try to override the user's name
  if (/\b(name is|called|goes by|known as)\b/i.test(m.content)) {
    if (profileName && !contentLower.includes(profileName.toLowerCase())) {
      console.log(`[context] Filtered conflicting name memory: "${m.content}" (profile: ${profileName})`);
      return false;
    }
  }
  return true;
});
```

Then use `filteredMemories` instead of `memoryResult.data` when building context (line 194).

### 2. Exclude name/identity facts from `extractAndStoreInsights`
**File: `supabase/functions/ai-chat/index.ts`**

Update the extraction system prompt (line 409-417) to explicitly exclude name extraction since the profile already has the canonical name:

```
Do NOT extract the user's name — it is already known from their profile.
```

### 3. Invalidate stale context cache on login
**File: `supabase/functions/get-proactive-context/index.ts`**

Reduce cache TTL from 1 hour to 15 minutes, and add a `force_refresh` parameter that callers can use when needed:

```typescript
// Line 74: reduce stale window
if (cachedContext && new Date(cachedContext.expires_at) > new Date() && !body.force_refresh) {
```

### 4. Filter identity memories in `buildOrbContext.ts`
**File: `src/lib/buildOrbContext.ts`**

Apply the same name-conflict filter when building ORB voice context, so the ORB widget also won't receive conflicting name memories.

## Data cleanup needed

The existing incorrect memories in `ai_memory` for Alex's user should be deactivated. This requires a one-time database query (or the user can delete them from the Memory Garden UI).

## Files to change
1. `supabase/functions/get-proactive-context/index.ts` — filter conflicting name memories + reduce cache TTL
2. `supabase/functions/ai-chat/index.ts` — exclude name from insight extraction prompt
3. `src/lib/buildOrbContext.ts` — filter conflicting name memories from ORB context

