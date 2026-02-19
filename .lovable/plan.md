

## Fix Language Resetting to English After Login

### Problem
When you switch language on the intro screen (before logging in) and then log in, the app briefly shows the correct language but then reverts to English. This is because:

1. On the intro screen, you toggle language to German -- this saves to localStorage but cannot sync to the server (you're not logged in yet)
2. After login, the server preferences load with the old language (`en-US`)
3. The "initial sync from server" effect blindly overrides your local choice with the stale server value

### Solution
When syncing from the server on initial load, check if the user made a **recent local change** (within a time window). If they did, prefer the local value and push it to the server instead of the other way around.

### Technical Details

**File: `src/contexts/LanguageContext.tsx`**

Modify the server sync effect (lines 55-61) to respect recent local changes:

```tsx
useEffect(() => {
  if (!hasInitializedFromServer && preferences?.stt_language) {
    // Check if user changed language locally BEFORE auth loaded
    // (e.g., on intro screen). localStorage is the source of truth
    // for pre-auth changes.
    const localStored = getLocalStorageItem('global', 'language', LANGUAGE_STORAGE_KEY);
    
    if (localStored && localStored !== preferences.stt_language) {
      // Local value differs from server -- local wins, push to server
      console.log('[LANG] Local override:', localStored, '(server had:', preferences.stt_language, ')');
      setLocalLanguage(localStored);
      updatePreferences({ stt_language: localStored });
    } else {
      // No local override -- use server value as before
      console.log('[LANG] Initial sync from server:', preferences.stt_language);
      setLocalLanguage(preferences.stt_language);
    }
    
    setHasInitializedFromServer(true);
  }
}, [preferences?.stt_language, hasInitializedFromServer]);
```

The logic is:
- If localStorage has a language that **differs** from the server value, the user changed it locally (likely on the intro screen before login) -- keep the local value and update the server
- If localStorage matches the server or is empty, use the server value as normal

This is a single-file change with no new dependencies.

