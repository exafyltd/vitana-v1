

# Fix Ugly Empty States on Mobile Health Tabs

## Problems

1. **Missing translation keys**: `health.noSupplements`, `health.noSupplementsDesc`, `health.noReports`, `health.noReportsDesc` do not exist in the translation files. The `translate()` function falls back to showing the raw key string (e.g., "health.noSupplements"), which is what you see in the screenshots.

2. **Plain empty state design**: The `I18nEmptyState` component renders a bare icon + text with no visual warmth -- no background card, no gradient, no call-to-action button. Compare this to the rich empty states used in the health pillar tabs (Exercise, Sleep, etc.) which have gradient cards, large icon containers, and action buttons.

## Fix

### 1. Add missing translation keys to `en.json` and `de.json`

Add to the `health` section:
- `noSupplements`: "No Supplements Yet"
- `noSupplementsDesc`: "Track your daily vitamins, minerals, and supplements. Add your first supplement to get started."
- `noReports`: "No Health Reports Yet"  
- `noReportsDesc`: "Upload your blood tests, lab results, and medical reports to unlock personalized health insights."
- `medical`: "Medical"
- `supplements`: "Supplements"

Plus German equivalents.

### 2. Replace bare `I18nEmptyState` with styled inline empty states

**MobileHealthSupplementsTab.tsx**: Replace the `I18nEmptyState` with a styled card matching the health pillar empty state pattern -- rounded card with gradient background, large circular icon container, warm description text, and an "Add Supplement" action button.

**MobileHealthMedicalTab.tsx**: Replace the `I18nEmptyState` with a similar styled card -- gradient background, Upload icon in a large circle, motivational description, and a "Upload your first report" button wired to `onUpload`.

### 3. Files changed

- `src/i18n/en.json` -- add 6 keys under `health`
- `src/i18n/de.json` -- add 6 keys under `health`
- `src/components/health/mobile/MobileHealthSupplementsTab.tsx` -- replace empty state with styled card + action button
- `src/components/health/mobile/MobileHealthMedicalTab.tsx` -- replace empty state with styled card + action button

