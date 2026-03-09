

# Fix: Language Switch Reverts After Selection

## Problem

`LanguageContext.tsx` uses `Date.now() - lastLanguageChangeAt < 2000` to prevent server preferences from overwriting a recent local language change. If the mutation takes longer than 2 seconds or a query refetch returns stale data after the guard expires, the effect reverts the language back to the server's old value.

## Fix

### `src/contexts/LanguageContext.tsx`

Replace the 2-second time guard with a `pendingLanguageRef` (useRef):

- `setSelectedLanguage()` sets `pendingLanguageRef.current = language` before firing the mutation
- The sync-from-server effect (lines 72-83) skips reverting while `pendingLanguageRef.current !== null`
- The effect clears the ref only when `preferences.stt_language === pendingLanguageRef.current` (server confirmed the change)
- Remove `lastLanguageChangeAt` from state and context interface (no longer needed)

One file changed, no other files affected.

