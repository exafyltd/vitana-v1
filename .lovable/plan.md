

## Problem: Language Toggle Broken on Landing Page

### Root Cause

The console logs show a clear fight loop:

```
[LANG] Rule-based change: en-US          ← user clicks toggle
[LANG] User not authenticated, skipping server sync  ← no server update (not logged in)
[LANG] Syncing runtime language from preferences: de-DE  ← effect REVERTS it back
```

The second `useEffect` on line 73-81 of `LanguageContext.tsx` watches `selectedLanguage` as a dependency. When the user (unauthenticated on the intro page) clicks the toggle:

1. `setSelectedLanguage('en-US')` fires → updates local state + localStorage
2. But `preferences.stt_language` is still `de-DE` (server value, or stale cached value)
3. The sync effect sees `preferences.stt_language !== selectedLanguage` → reverts to `de-DE`
4. This triggers the toggle logic again → infinite loop

The sync effect was designed for logged-in users where preferences change externally, but it also fires for unauthenticated users on the landing page, overriding their local toggle.

### Fix (1 file)

**`src/contexts/LanguageContext.tsx`** — Guard the sync-back effect so it does NOT override local changes:

1. **Skip sync when user is not authenticated** — add `if (!user) return;` at the top of the second `useEffect` (line 73). Unauthenticated users have no server preferences to sync from, so the effect should be a no-op.

2. **Add a recency guard** — after `setSelectedLanguage` fires, set a timestamp (`lastLanguageChangeAt` state already exists). In the sync effect, skip if the last local change was less than 2 seconds ago, preventing the server echo from reverting a fresh user choice even for logged-in users.

The combined guard on lines 73-81 becomes:
```typescript
useEffect(() => {
  if (!user) return; // No server prefs for unauthenticated users
  if (!hasInitializedFromServer || !preferences?.stt_language) return;
  if (Date.now() - lastLanguageChangeAt < 2000) return; // Don't revert recent local changes

  if (preferences.stt_language !== selectedLanguage) {
    console.log('[LANG] Syncing runtime language from preferences:', preferences.stt_language);
    setLocalLanguage(preferences.stt_language);
    setLocalStorageItem('global', 'language', LANGUAGE_STORAGE_KEY, preferences.stt_language);
  }
}, [user, hasInitializedFromServer, preferences?.stt_language, selectedLanguage, lastLanguageChangeAt]);
```

This is a 6-line change in one file. No other files need modification.

