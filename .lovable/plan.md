## Memory System Fix — Implementation Complete

### What was broken
1. **DiaryQuickEntry** had a `TODO` instead of actual DB save — entries were lost
2. **extract-diary-insights** called `generate-memory-embedding` without `content` — embeddings never generated
3. **ORB voice** never fetched user context — started every session "blank"
4. **ORB conversations** were not persisted — no cross-session continuity

### What was fixed

#### Phase A — DiaryQuickEntry now saves to DB
- `src/components/diary/DiaryQuickEntry.tsx`: inserts into `diary_entries`, triggers `extract-diary-insights` + `refresh-memory-metadata` (non-blocking)

#### Phase B — Embedding generation fixed
- `supabase/functions/extract-diary-insights/index.ts`: now passes `content` to `generate-memory-embedding`
- `supabase/functions/generate-memory-embedding/index.ts`: falls back to fetching content from `ai_memory` if not provided

#### Phase C — ORB context injection
- `src/lib/buildOrbContext.ts` (new): builds compact context from profile + ai_memory (top 15) + diary_entries (last 10)
- `src/lib/OrbVoiceClient.ts`: accepts `initialContext` in config, injects it as first message before greeting
- `src/hooks/useOrbVoiceClient.ts`: calls `buildOrbContext()` before session start

#### Phase D — ORB conversation persistence
- `src/hooks/useOrbVoiceClient.ts`: creates/reuses `ai_conversations` row, logs assistant transcripts and user text messages to `ai_messages`
