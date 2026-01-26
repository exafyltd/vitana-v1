

# Fix: Eliminate Flash by Making Mobile Detection Synchronous

## Problem
When clicking Events on mobile, users briefly see the unadjusted Community Overview screen because:

1. `useIsMobile()` hook initializes with `undefined`
2. Returns `!!undefined` = `false` on first render
3. The guard `if (isMobile) return null` doesn't fire
4. Full Community component renders for one frame
5. Then `useEffect` runs → `isMobile` becomes `true` → redirect happens

**Timeline of the bug:**
```text
Render 1: isMobile = false → Full Community renders (THE FLASH)
Render 2: isMobile = true → return null + redirect
```

## Solution
Use a **synchronous** mobile check on first render so we can immediately return `null` or a skeleton without waiting for `useEffect`.

## Technical Implementation

### File: `src/pages/Community.tsx`

Replace the current pattern with synchronous detection:

```typescript
export default withScreenId(function Community() {
  const navigate = useNavigate();
  
  // Synchronous mobile check - works on first render
  const [isMobile] = useState(() => 
    typeof window !== 'undefined' && window.innerWidth < 768
  );

  // Immediate redirect for mobile users
  useEffect(() => {
    if (isMobile) {
      navigate('/comm/events-meetups?tab=upcoming', { replace: true });
    }
  }, [isMobile, navigate]);

  // Prevent flash: return null immediately on mobile
  // This now works on FIRST render because isMobile is set synchronously
  if (isMobile) {
    return null;
  }

  // ... rest of desktop-only component
});
```

**Why this works:**
- `useState(() => window.innerWidth < 768)` runs synchronously during component initialization
- On the very first render, `isMobile` is already `true` for mobile devices
- The `if (isMobile) return null` guard fires immediately
- No flash ever occurs

## Alternative: Update useIsMobile Hook Globally

If we want this fix to apply everywhere, we could update the hook itself:

```typescript
// src/hooks/use-mobile.tsx
export function useIsMobile() {
  // Initialize synchronously with actual value (not undefined)
  const [isMobile, setIsMobile] = React.useState<boolean>(() => 
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  React.useEffect(() => {
    // ... existing resize listener logic
  }, []);

  return isMobile;
}
```

**Recommendation:** Update the global hook so all components benefit from synchronous mobile detection.

## Files to Modify

| File | Change |
|------|--------|
| `src/hooks/use-mobile.tsx` | Initialize state synchronously with `window.innerWidth` check |

## Before vs After

| Phase | Before | After |
|-------|--------|-------|
| Initial render | `isMobile = false` (wrong) | `isMobile = true` (correct) |
| Guard check | Fails, renders full UI | Succeeds, returns `null` |
| User sees | Flash of Community Overview | Nothing (instant redirect) |

