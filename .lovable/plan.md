
## Deeper analysis (what is broken right now)

### 1) Your data *is* saved in the DB — but the voice assistant does not load it
I checked your Supabase data (user `0adc6ff6-acb0-4dca-99d0-295211a40e3e`):

- `diary_entries` contains your manual entries, including:
  - **learning-knowledge**: “i speak 4 languages German, English, Serbian and Swedish”
  - **business-projects**: the Mallorca “Maxina Experience” plan entries
- `user_memory_metadata` also reflects these (e.g. counts in business-projects + learning-knowledge).

However, **ORB voice** (the Vitana Audio Overlay) connects to the external gateway via `src/lib/OrbVoiceClient.ts` and **does not call `fetch-user-context`** at all. So the ORB session starts “blank” without your Memory Garden / Diary context.

### 2) “Daily Diary” from the ORB overlay is not persisted (critical)
The component used inside the ORB overlay is `src/components/diary/DiaryQuickEntry.tsx` and its save handler is currently:

- `// TODO: Implement actual save functionality`
- it only `console.log(...)` and closes.

So when you dictate/enter a diary entry inside the overlay, **it looks like it’s saved, but it is not written to `diary_entries`**. This alone makes the “memory setup feels broken”.

### 3) Semantic memory retrieval for new diary-derived insights is weakened (embedding bug)
`extract-diary-insights` tries to create `ai_memory` items and then calls `generate-memory-embedding`.

But it calls:
- `generate-memory-embedding` with `{ memoryId }` only  
while the function currently requires `{ memoryId, content }`.

That means **embeddings for diary-extracted `ai_memory` won’t be generated**, and the `search-memories` vector RPC (`match_memories`) will often return nothing (then it falls back to a weak keyword search).

### 4) Cross-session “conversation continuity” depends on saving/reusing a conversation id — ORB doesn’t do it
Text-chat uses `ai-chat` and persists `ai_conversation_id` in `localStorage` (see `src/services/aiVoiceService.ts`).

ORB voice does not:
- create/use `ai_conversations`
- store any `ai_messages`
- reuse a prior “conversation id” across sessions

So you cannot expect “the conversation continues tomorrow” in ORB, because nothing is persisted and no context is reloaded.

---

## Target outcome (what “working memory” will mean)
You selected: **Always load context**.

So “working” will be:
1. Every ORB voice session starts with a compact snapshot of:
   - top memory garden items (ai_memory)
   - recent diary entries (diary_entries)
   - key identity fields
2. Any diary entry created from ORB overlay is actually saved into `diary_entries`.
3. New diary/memory entries become searchable/retrievable because embeddings are generated correctly.
4. ORB sessions persist transcripts/messages into the existing conversation tables so cross-session continuity is real.

---

## Implementation plan (how we’ll fix it)

### Phase A — Fix data capture (DiaryQuickEntry must save to DB)
**Files**
- `src/components/diary/DiaryQuickEntry.tsx`

**Changes**
- Implement `handleSave` to:
  1) `supabase.auth.getUser()` → require login  
  2) insert row into `public.diary_entries` with:
     - `user_id`
     - `text: content`
     - `source: 'voice'` (or `'manual'` depending on how it’s opened)
     - `tags: ['diary', ...(optional category tag)]`
  3) invoke `extract-diary-insights` (non-blocking) to create long-term `ai_memory` facts/preferences/goals
  4) invoke `refresh-memory-metadata` so the Memory Garden progress updates
- Ensure this works on **mobile + desktop** (same overlay component).

**Result**
- “Daily Diary” finally persists and can be used as knowledge.

---

### Phase B — Fix embeddings so memory retrieval actually works
**Files**
- `supabase/functions/extract-diary-insights/index.ts`
- `supabase/functions/generate-memory-embedding/index.ts`

**Changes**
1) In `extract-diary-insights`, call `generate-memory-embedding` with `{ memoryId, content: insertedMemory.content }`.
2) Make `generate-memory-embedding` more robust:
   - allow `{ memoryId }` only: if `content` is missing, fetch `content` from `ai_memory` by `id` (and verify it belongs to the authenticated user) before generating embedding.

**Result**
- `match_memories` (vector search) starts working for new knowledge, and ORB/text retrieval becomes reliable.

---

### Phase C — Inject Memory Garden + Diary context into ORB sessions (so ORB can “read” it)
**Files**
- `src/hooks/useOrbVoiceClient.ts`
- `src/lib/OrbVoiceClient.ts`
- new helper: `src/lib/buildOrbContext.ts` (small, token-efficient summarizer)

**Changes**
1) In `useOrbVoiceClient.connect()`:
   - invoke Supabase edge function `fetch-user-context` right before creating the ORB client
   - use `forceRefresh: true` when starting a new ORB session (so the user’s just-added memory appears immediately)
2) Convert the returned context into a compact string (examples included: identity + top 10 diary previews + top ai_memory highlights).
3) Extend `OrbVoiceClientConfig` to include something like `initialContext?: string`.
4) In `OrbVoiceClient.start()`:
   - after session start (we have `sessionId`) but before the greeting:
     - send a **hidden system context** message to the gateway via `/orb/live/stream/send` type `text`
     - then call `endTurn()`
     - then request the welcome greeting (or combine both into one first turn)
   
This works even if the gateway can’t accept a dedicated “system_prompt” field, because we can deliver context as the first internal message.

**Result**
- ORB can answer questions like “What languages do I speak?” immediately, based on stored diary/memory data.

---

### Phase D — Make cross-session conversation continuity real (store ORB turns)
**Files**
- `src/lib/OrbVoiceClient.ts` (event handling)
- `src/hooks/useOrbVoiceClient.ts` (init + teardown)
- possibly a tiny edge function: `supabase/functions/orb-log-message` (optional; direct table writes from client also possible, but server-side is cleaner)

**Approach**
- Reuse existing tables:
  - `ai_conversations` (agent_type can remain `health` or `wellness`; put `{ channel: 'orb' }` into metadata)
  - `ai_messages` for turns

**Changes**
1) On ORB connect:
   - create (or reuse) an `ai_conversations` row for the session
   - store `orb_conversation_id` in `localStorage` (similar to `ai_conversation_id`)
2) While receiving ORB SSE:
   - store `assistant_text` as `ai_messages(role='assistant')`
   - store user transcript events as `ai_messages(role='user')` (we will map based on gateway message types; if ambiguous, store with metadata including the raw SSE type)
3) On ORB disconnect:
   - finalize/close session metadata (timestamps, counts)

**Result**
- The next time you open ORB, we can load “recent conversation memory” from `ai_messages` and also feed a short “last session summary” into the ORB context.

---

## Verification / acceptance tests (what you should be able to do)
1) Add a Memory Garden entry in **business-projects** and **learning-knowledge**, then open ORB and ask about them:
   - ORB should answer correctly without you repeating.
2) Create a diary entry via the ORB overlay (DiaryQuickEntry), refresh page, confirm it exists in the Diary list and in `diary_entries`.
3) Ask a semantically related question (not exact keyword match) and confirm ORB can retrieve the right memory (embedding-based).
4) Close ORB, reopen later, ask “What did we talk about last time?” and get a coherent answer (conversation continuity).

---

## Notes / risks to handle cleanly
- `fetch-user-context` caches for 5 minutes; for “always load context” we will either:
  - use `forceRefresh: true` on ORB start, or
  - clear cache after any new diary/memory insert (we’ll implement a lightweight invalidation behavior).
- Keep the injected context **compact** (top-N items + previews) so we don’t blow the gateway/model context window.
