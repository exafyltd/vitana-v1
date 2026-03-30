

# ORB Widget Fixes + Language Selector Auth Guard

## 1. Simplify `VitanaOrb.init()` — remove redundant params
**File: `src/hooks/useOrbVoiceWidget.ts`**

Gateway URL is already correct (no `/api/v1`). Changes:
- Remove `gatewayUrl`, `authToken`, `lang` from `init()` — widget auto-detects these now
- Remove `session` dependency and `setAuth` call — widget reads auth from localStorage
- Remove `useAuth` import — no longer needed
- Keep only `showFab: true` in init

```typescript
import { useEffect, useRef } from "react";

export function useOrbVoiceWidget() {
  const initialized = useRef(false);

  useEffect(() => {
    function tryInit() {
      const orb = (window as any).VitanaOrb;
      if (!orb) return false;

      if (!initialized.current) {
        orb.init({ showFab: true });
        initialized.current = true;
        console.log("[ORB] Widget initialized");
      }
      return true;
    }

    if (tryInit()) return;

    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      if (tryInit() || attempts >= 20) {
        clearInterval(interval);
        if (attempts >= 20) console.warn("[ORB] Widget script never loaded");
      }
    }, 500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      const orb = (window as any).VitanaOrb;
      if (orb && initialized.current) {
        orb.destroy();
        initialized.current = false;
      }
    };
  }, []);
}
```

## 2. Fix language selector auth error
**File: `src/contexts/LanguageContext.tsx`**

Two changes:
- **Line 60**: Wrap `updatePreferences` in `if (user)` guard (the pending plan from previous message)
- **`setSelectedLanguage` function**: After setting localStorage with namespaced key, also set `localStorage.setItem('vitana.lang', language)` so the ORB widget can read it directly

## Files to edit
1. `src/hooks/useOrbVoiceWidget.ts` — simplify to zero-config init
2. `src/contexts/LanguageContext.tsx` — add user guard + set `vitana.lang` in localStorage

