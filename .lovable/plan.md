

# Fix: Settings Mobile Mode Pill with Nested Sub-Categories + Build Error

## Problem

1. **Settings mobile navigation**: The mode pill dropdown has 4 flat entries (Notifications, Privacy, Preferences, Support). When selecting Privacy/Preferences/Support, it merely scrolls to a NavCard on the same page that then navigates to an independent screen (`/settings/privacy`, `/settings/preferences`, `/settings/support`) which does NOT follow the unified mobile pattern. The screenshots confirm this — each sub-page has its own separate header, SplitBarList tabs, and non-unified layout.

2. **Build error**: `npm:@react-email/components@0.0.22` cannot be resolved. The Supabase edge function needs a `deno.json` with package mappings or the import approach needs adjustment.

## Solution

### 1. Settings Mode Pill — Add Nested Children with Direct Navigation

Convert Privacy, Preferences, and Support from flat modes into expandable groups with children (same pattern as Business Hub). Selecting a child navigates directly to a route parameter or renders inline content.

**Updated mode structure:**
```
Notifications (flat — stays as-is, renders inline)
Privacy (expandable)
  → Profile Visibility
  → Data Sharing  
  → Security
Preferences (expandable)
  → Appearance
  → Language & Region
Support (expandable)
  → Contact Support
  → Knowledge Base
```

When a child is selected, use `navigate()` to go to the sub-page route (e.g., `/settings/privacy`) with a query parameter or state indicating which tab to auto-select (`?tab=profile`, `?tab=data`, `?tab=security`). The sub-pages already use `SplitBar` with those exact tab values.

**However**, the real ask is that these sub-screens should also follow the unified mobile pattern. So instead of navigating away, we should render the sub-content inline within MobileSettings itself, using the mode pill as the sole navigation.

**Approach**: Keep `MobileSettings` as the single mobile settings screen. When a nested child is selected (e.g., `privacy.visibility`), render the corresponding content cards inline rather than navigating to a separate page. This eliminates the non-unified sub-screens on mobile entirely.

### Files changed

**`src/pages/MobileSettings.tsx`**
- Change `settingsModes` to use `children` for Privacy, Preferences, Support (matching Business Hub pattern)
- Remove `NavCard` components and `sectionRefs` scroll logic
- Add inline content rendering for each child mode:
  - `privacy.visibility` — Profile Visibility Controls (switches from Privacy.tsx)
  - `privacy.data` — Data Sharing controls + AI consent (from Privacy.tsx)
  - `privacy.security` — Security settings (from Privacy.tsx)
  - `preferences.appearance` — Theme, primary color, compact mode (from Preferences.tsx)
  - `preferences.language` — Language & Region (from Preferences.tsx)
  - `support.contact` — Contact Support options (from Support.tsx)
  - `support.knowledge` — Knowledge Base (from Support.tsx)
- Keep Notifications as a flat top-level mode (renders inline as it does now)
- Keep Delete Account card at the bottom regardless of mode
- Remove `useRef` scroll refs since navigation is now mode-based

**`supabase/functions/send-appointment-reminder/index.ts`** and **`_templates/appointment-reminder.tsx`**
- Both already use `@0.0.22`. The build error is likely caused by missing Deno config. Add a `deno.json` in the function directory with `nodeModulesDir: "auto"` or switch to `esm.sh` imports which Deno resolves without npm node_modules.
- Safest fix: replace `npm:@react-email/components@0.0.22` with `https://esm.sh/@react-email/components@0.0.22` in both files, which Deno can resolve as URL imports without needing node_modules.

### What does not change
- Desktop settings pages remain untouched
- The `MobileModePill` component needs no changes (already supports children)
- Other screens are not affected

