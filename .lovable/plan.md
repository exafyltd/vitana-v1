

## Show Current Language Flag (Not Target)

### What's Wrong
The `LanguageToggleButton` currently shows the **opposite** flag -- the language you'd switch *to*. So when German is active, it shows the British flag, which is confusing because users expect the flag to represent what's currently selected.

### Fix
In `src/components/ui/language-toggle-button.tsx`, swap the flag logic so it shows the **current** language flag:

- When German is selected: show German flag
- When English is selected: show British flag

### Change

**File: `src/components/ui/language-toggle-button.tsx` (lines 23-24)**

```tsx
// Before:
const flagToShow = isGerman ? gbFlag : deFlag;

// After:
const flagToShow = isGerman ? deFlag : gbFlag;
```

One line change. Everything else (click behavior, aria labels, styling) stays the same.

