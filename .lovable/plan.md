

## Fix: Login Broken Due to PresenceDebugPanel Crash

### What Happened
The previous fix removed `useQueryClient()` from `AuthProvider`, which was the right fix. However, `PresenceDebugPanel` (which calls `useAuth` via `usePresenceDebug` → `useUserPresence`) can still crash the entire app if `AuthProvider` fails for any reason during initialization — because there's no error boundary protecting it.

The error at line 192 corresponds to the **previous** version of `AuthProvider.tsx` (before the `useQueryClient` removal). The current code is structurally correct, but the crash cascades because `PresenceDebugPanel` is rendered at the top level of `App` with no protection.

### Fix (Two Changes)

**1. Wrap `PresenceDebugPanel` in an error boundary** (`src/App.tsx`)
- Wrap it in a try-catch error boundary so if it crashes, the rest of the app (including login) continues working.
- Alternatively, make `PresenceDebugPanel` internally guard against missing auth context by catching the `useAuth` error.

**2. Make `PresenceDebugPanel` safe when AuthContext is unavailable** (`src/components/debug/PresenceDebugPanel.tsx`)
- Add a safe wrapper that uses `useContext(AuthContext)` directly (without throwing) and returns `null` if the context is undefined. This prevents the debug panel from ever crashing the app.

### Technical Detail
In `PresenceDebugPanel.tsx`, instead of calling `usePresenceDebug()` (which calls `useAuth()` which throws), wrap the entire component in a safety check:

```typescript
// Safe version - returns null if AuthProvider is not available
const PresenceDebugPanel: React.FC = () => {
  try {
    return <PresenceDebugPanelInner />;
  } catch {
    return null;
  }
};
```

Or better — create a `useAuthSafe()` hook that returns `null` instead of throwing, and use it in `useUserPresence`.

### Files to modify
- `src/components/debug/PresenceDebugPanel.tsx` — wrap in error boundary / safe check
- Optionally `src/App.tsx` — add React error boundary around the debug panel

