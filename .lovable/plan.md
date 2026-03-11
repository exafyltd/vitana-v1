

# Replace custom tab bar with SplitBar component

The Health mobile screen uses a hand-rolled pill tab bar (lines 240–254), while Events and Live Rooms use the `SplitBar` component from `@/components/ui/split-bar`. The fix is straightforward: replace the custom buttons with `SplitBar`, `SplitBarList`, and `SplitBarTrigger`, and wrap each content section in `SplitBarContent`.

## Changes

**`src/pages/Health.tsx`** (single file)

1. Replace the custom tab `<div>` block (lines 239–254) with:
```tsx
<SplitBar value={mobileTab} onValueChange={(v) => setMobileTab(v as any)} className="px-4 pb-2">
  <SplitBarList className="mb-2">
    <SplitBarTrigger value="overview">{translate('health.tabs.overview', 'Overview')}</SplitBarTrigger>
    <SplitBarTrigger value="medical">{translate('health.tabs.medical', 'Medical')}</SplitBarTrigger>
    <SplitBarTrigger value="supplements">{translate('health.tabs.supplements', 'Supplements')}</SplitBarTrigger>
  </SplitBarList>
```

2. Wrap each tab content block (lines 258–287) in `SplitBarContent`:
```tsx
  <SplitBarContent value="overview" className="flex-1 overflow-y-auto">
    {/* existing overview content */}
  </SplitBarContent>
  <SplitBarContent value="medical" className="flex-1 overflow-y-auto">
    <MobileHealthMedicalTab onUpload={() => setUploadSheetOpen(true)} />
  </SplitBarContent>
  <SplitBarContent value="supplements" className="flex-1 overflow-y-auto">
    <MobileHealthSupplementsTab />
  </SplitBarContent>
</SplitBar>
```

3. Remove the `mobileTabs` array (lines 190–194) — no longer needed.

The `SplitBar` import already exists (line 14). This gives identical styling and behavior to Events/Live Rooms tabs.

