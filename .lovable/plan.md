

# Fix Health Screen: Button Label + Reduce Spacing

## Changes

### 1. Button label: "Create" → "Upload" (`src/pages/Health.tsx`, line 227)
Change the button text from `translate('buttons.create', 'Add')` to `translate('health.upload', 'Upload')`.

### 2. Reduce gap between tab bar and Health Snapshot card
- **`src/pages/Health.tsx` line 234**: Remove or reduce `pb-2` on the SplitBar wrapper div
- **`src/components/health/mobile/MobileHealthSnapshot.tsx` line 57**: Reduce `mx-4 mt-4` to `mx-4 mt-1` to pull the card up closer to the tabs

These two spacing tweaks will eliminate the empty space visible in the screenshot between the tab pills and the dark Health Snapshot card.

