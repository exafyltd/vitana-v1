

## Investigation Findings

### Issue 1: No external bell notification

The `appilixNotificationFallback.ts` code is correctly wired into the realtime handler. However, there are two problems:

1. **Foreground suppression is too aggressive**: The check on line 87 (`if (senderId && !isAppBackgrounded() && isViewingThread(senderId))`) only suppresses when the app is in foreground AND viewing that thread. But there's no notification shown when the app IS in the foreground but NOT viewing that thread — the code falls through and shows the notification. This part is fine.

2. **The real problem**: The `isAppilix()` check on line 74 requires `window.appilix?.postMessage` to exist. If you're testing in the Lovable preview (desktop browser), this returns false and the entire fallback is skipped. **This is expected** — it only fires inside the actual Appilix app.

3. **However**, if you ARE testing in the Appilix app and still not getting notifications, the likely cause is that `Notification` API permission has not been granted in the WebView. The `ensurePermission()` function only requests once (`permissionChecked` flag). If the first attempt fails silently, it never retries.

**Proposed fix**: Add diagnostic logging so we can see what's happening on the Appilix device, and also broaden the fallback to work on ALL platforms (not just Appilix) when the app is backgrounded — since browser notifications are useful everywhere.

### Issue 2: Inbox takes forever to load/update

The inbox thread list in `useGlobalMessages.ts` makes **three parallel data fetches** on every load:
- `fetchConversations()` — gateway API call to Cloud Run
- `fetchLegacyThreads()` — Supabase query for legacy thread_participants + global_thread_participants
- Profile enrichment for all user IDs

The gateway call goes to `https://gateway-q74ibpv6ia-uc.a.run.app` which may have cold start latency (Cloud Run). Combined with the legacy thread merge and profile enrichment, this creates a waterfall that can take several seconds.

The `staleTime: 10min` and `placeholderData` from localStorage should give instant rendering on subsequent visits, but **first load** or **after cache expiry** will be slow.

**Proposed fix**: Add more aggressive placeholder data usage and ensure the gateway timeout doesn't block the entire thread list.

---

## Plan

### Part A: Fix notification fallback (make it actually work and debuggable)

**File: `src/lib/appilixNotificationFallback.ts`**

1. Remove the `isAppilix()` gate — show browser notifications for ALL platforms when backgrounded (this is standard web behavior, not Appilix-specific)
2. Add `console.log` breadcrumbs at each decision point so we can diagnose on-device
3. Fix the permission check: if `permissionChecked` was set but permission is still `'default'`, allow re-requesting
4. For foreground state: also show notifications when the app is visible but user is NOT on the inbox/thread page

**File: `src/hooks/useNotifications.ts`**
- No changes needed — the call to `showAppilixFallbackNotification` is already wired in

### Part B: Improve inbox loading speed

**File: `src/hooks/useGlobalMessages.ts`**

1. Add a timeout wrapper around `fetchConversations()` (e.g., 5 seconds) so a slow gateway doesn't block the entire thread list
2. If gateway times out, fall through to `fetchDirectFromChatMessages` immediately instead of waiting
3. This ensures the inbox always populates within a reasonable time even if the gateway is slow

### Files changed

| File | Change |
|---|---|
| `src/lib/appilixNotificationFallback.ts` | Remove Appilix-only gate, add logging, fix permission retry |
| `src/hooks/useGlobalMessages.ts` | Add timeout to gateway fetch, improve fallback speed |

### Test steps

**Notification test:**
1. Open app in any browser or Appilix
2. Navigate to any page (not inbox)
3. Background the app / switch tabs
4. Send a DM from another account
5. Check console for `[AppilixFallback]` logs showing the decision path
6. A browser notification should appear

**Inbox speed test:**
1. Clear browser cache / localStorage
2. Navigate to inbox
3. Thread list should appear within 5 seconds even if gateway is slow

