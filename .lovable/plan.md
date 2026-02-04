

## Start Connected Apps Sections Collapsed by Default

### Summary
Change the Mobile Connected Apps screen so all integration sections (Social, Fitness, Health, Other) start in the collapsed state, giving users a full overview of all categories at first glance.

---

### Current Behavior
- Social, Fitness, and Health sections open expanded by default
- Only "Other" section starts collapsed
- Users see only the first section's content on initial load

### Desired Behavior
- All 4 sections start collapsed
- Users see the full list of categories with their connection counts (e.g., 3/6, 4/6)
- Users can tap any section to expand it

---

### Solution

**Option A (Recommended): Change the default in the component**

**File:** `src/components/settings/MobileIntegrationSection.tsx` (line 22)

Change the default value of `defaultExpanded` from `true` to `false`:

```typescript
// Before
defaultExpanded = true,

// After
defaultExpanded = false,
```

This is the cleanest solution since the "collapsed by default" behavior should apply everywhere this component is used.

---

**Option B (Alternative): Explicitly pass prop to each usage**

If we want to keep the component's default as `true` for potential future uses, we could instead pass `defaultExpanded={false}` to each section in `MobileConnectedAppsView.tsx`:

```tsx
<MobileIntegrationSection
  title={translate('connectedApps.sections.social')}
  emoji="📱"
  integrations={filteredSocial}
  onSelect={setSelectedApp}
  defaultExpanded={false}  // Add this
/>
```

---

### Recommended Approach: Option A

Change the default in `MobileIntegrationSection.tsx` since:
- It's a single-line change
- The "Other" section already expects collapsed behavior
- A collapsed overview is better UX for mobile hub screens

---

### File to Modify
- `src/components/settings/MobileIntegrationSection.tsx`

