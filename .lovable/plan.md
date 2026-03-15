

## Analysis: "Unknown User" + No Response

### Root Cause 1: "Unknown User" for Vitana

The `enrichProfiles()` function (line 110) queries `global_community_profiles` and `profiles` tables for display names. **There are zero rows for the Vitana bot UUID (`00000000-0000-0000-0000-000000000001`) in either table.** So it falls through to the default `"Unknown User"`.

The codebase has `vitanaBotIdentity.ts` with `isVitanaBot()` and `VITANA_BOT_DISPLAY_NAME` / `VITANA_BOT_AVATAR_URL`, but `enrichProfiles()` doesn't use it. The auto-seeded thread at line 519 hardcodes `display_name: "Vitana"`, but once `fetchDirectFromChatMessages()` runs (which it does — the two messages ARE in `chat_messages`), it rebuilds the thread from DB data and calls `enrichProfiles()`, which returns "Unknown User" and overwrites the synthetic thread.

### Root Cause 2: No Response to Messages

The Supabase INSERT fallback **is working** — both "bist du da ?" and "Hallo ?" were successfully inserted into `chat_messages`. However, the Vitana AI reply is triggered by the **gateway**, not the client. When the gateway is down, messages land in the DB but no bot response is generated. This is expected behavior for the fallback path (noted in the original spec: "Vitana bot auto-replies and push notifications are skipped on the fallback path").

### Fix Plan

**File: `src/hooks/useGlobalMessages.ts`** — 1 change in `enrichProfiles()`

After building the profile map from DB queries (line 144-156), add a Vitana bot identity override. If the bot UUID is in the requested IDs but has no DB profile, inject the known identity from `vitanaBotIdentity.ts`:

```typescript
import { isVitanaBot, VITANA_BOT_DISPLAY_NAME, VITANA_BOT_AVATAR_URL } from '@/lib/vitanaBotIdentity';

// Inside enrichProfiles(), after line 155 (profileCache.set):
// Override: always use known Vitana identity regardless of DB state
uncachedIds.forEach((uid) => {
  if (isVitanaBot(uid)) {
    const vitanaProfile = {
      display_name: VITANA_BOT_DISPLAY_NAME,
      avatar_url: VITANA_BOT_AVATAR_URL,
    };
    map[uid] = vitanaProfile;
    profileCache.set(uid, { ...vitanaProfile, cachedAt: now });
  }
});
```

This ensures that everywhere `enrichProfiles` is called — thread lists, message bubbles, `fetchDirectFromChatMessages`, `sendMessageLegacy` — the Vitana bot always resolves to "Vitana" with the ORB avatar, regardless of whether DB rows exist.

**No DB migration needed.** The `enrichProfiles` override is the correct pattern — it matches how `conversationHelpers.ts` already handles this via `isVitanaBot()`.

**Re: no bot response** — This cannot be fixed client-side. The gateway must be restored for Vitana to auto-reply. The fallback path only guarantees message delivery to the DB.

