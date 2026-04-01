

# Fix: Landing page language selection reverts to stored language

## Root Cause

There is a race condition between two `useEffect` hooks in `LanguageContext.tsx`:

**Effect 1 (line 53-70)** — Initial sync: detects that localStorage differs from server, correctly picks localStorage, and calls `updatePreferences()` to push local value to server. But it does NOT set `pendingLanguageRef`.

**Effect 2 (line 73-93)** — Ongoing sync: checks if server preferences differ from runtime language. Since `pendingLanguageRef` is `null` (Effect 1 never set it), this effect sees the OLD server value and immediately **overrides the user's selection back to the server value**.

The same race happens when the user clicks the toggle while unauthenticated on the landing page:
1. User clicks toggle → `setSelectedLanguage('en-US')` → `!user` → saves to localStorage, clears `pendingLanguageRef` immediately
2. Auth resolves moments later → user becomes non-null
3. Effect 1: local differs from server → uses local, pushes to server (no pending set)
4. Effect 2: server still has old value, no pending lock → **reverts the selection**

Console log confirms: `[LANG] Syncing runtime language from preferences: en-US` fires and overrides the user's choice.

## Fix

**File: `src/contexts/LanguageContext.tsx`** — two changes:

### 1. Effect 1: Set `pendingLanguageRef` when pushing local override to server
When the first effect calls `updatePreferences({ stt_language: localStored })`, also set `pendingLanguageRef.current = localStored`. This prevents Effect 2 from reverting the value before the server confirms.

### 2. Effect 2: Also compare against localStorage, not just server
Add a guard: if `selectedLanguage` matches what's in localStorage, don't override it from server. The user's explicit localStorage choice should always win until confirmed.

### 3. `setSelectedLanguage`: Don't clear `pendingLanguageRef` for unauthenticated users
Currently line 111 clears `pendingLanguageRef` when `!user`. Instead, keep it set so that if auth resolves shortly after, Effect 2 won't override. Only clear it after a short delay or when the value is stable.

## Changes summary

Only one file: `src/contexts/LanguageContext.tsx`

- Line 60-62: After `updatePreferences`, add `pendingLanguageRef.current = localStored`
- Line 88-92: Add localStorage cross-check before overriding from server
- Line 109-112: Keep `pendingLanguageRef` set even when `!user`, use a timeout or let Effect 2's pending logic handle it naturally

