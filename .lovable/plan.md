

# Mobile Health Screen — Align with Standard Mobile Hub Pattern

## Problem
The mobile Health screen uses a custom layout (full-bleed dark snapshot hero, custom action strip) that doesn't match the established mobile pattern used by Events, Live Rooms, Wallet, Business Hub, etc. The user wants it to follow the same structure: App Bar → StandardHeader → UtilityActionButton → Tab Bar → Content.

## Architecture

```text
┌─────────────────────────────┐
│  Top App Bar (from Shell)   │
├─────────────────────────────┤
│  StandardHeader             │
│  "Health & Wellness 🌱"     │
│  subtitle                   │
├─────────────────────────────┤
│  UtilityActionButton rail   │
│  [🔍] [📅] [+ Upload] [🎁] [🧬] [✈ Autopilot] │
├─────────────────────────────┤
│  [Overview] [Medical] [Supplements]  ← pill tabs │
├─────────────────────────────┤
│                             │
│  Tab content (scrollable)   │
│                             │
└─────────────────────────────┘
```

## Changes

### 1. `src/pages/Health.tsx` — Rewrite mobile block (lines 187–243)

Replace the current custom mobile layout with the standard pattern:

- **StandardHeader** with health title/description (same component as Wallet, Events)
- **UtilityActionButton** with the standard chip sequence:
  - `ExpandableSearchButton` — search health reports, supplements
  - `UniversalCalendarButton` — date filtering
  - `+ Upload` primary action button — opens `HealthReportUploadSheet`
  - Gift Voucher (automatic via UtilityActionButton)
  - Vitana Index chip (🧬 742) in `afterGiftVoucherChildren`
  - Autopilot chip with pending badge in `afterGiftVoucherChildren`
- **Tab bar** — three horizontal pill tabs: Overview, Medical, Supplements
  - Use simple `useState` for active tab, render as scrollable pill buttons (matching the existing pattern from other hubs)
- **Tab content**:
  - **Overview**: existing `MobileHealthSnapshot`, `MobilePriorityFocus`, `MobileAutopilotGuidance` (current content minus the old action strip)
  - **Medical**: new `MobileHealthMedicalTab` component
  - **Supplements**: new `MobileHealthSupplementsTab` component

Remove `MobileHealthActionStrip` from the mobile layout (its actions move into the utility bar and tab-specific content).

### 2. New: `src/components/health/mobile/MobileHealthMedicalTab.tsx`

- Upload CTA card at top (large tap target → opens upload sheet)
- List of uploaded reports from `lab_reports` (passed as props from Health.tsx)
- Empty state with motivational message when no reports exist
- Each report card: category icon, name, date, status badge

### 3. New: `src/components/health/mobile/MobileHealthSupplementsTab.tsx`

- "Add Supplement" button at top
- Category filter pills (All, Vitamins, Minerals, etc.)
- Supplement cards from `useUserSupplements` (passed as props)
- Empty state when no supplements

### 4. Minor: `src/components/health/mobile/MobileHealthActionStrip.tsx`

No longer rendered in the mobile Health layout (actions absorbed by utility bar + tab content). File kept for potential reuse but removed from the page.

## Pattern Compliance

- Follows the exact same structure as `Wallet.tsx` lines 302–370 (StandardHeader → UtilityActionButton with afterGiftVoucherChildren → content)
- Satisfies mobile-page-header-standard and mobile-utility-bar-standard memories
- Tab bar follows Navigation Compression Rule 6 (users will toggle between Overview/Medical/Supplements)
- All popups remain full-screen per the 15 Experiences architecture

