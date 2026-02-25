

## Remove Appearance Theme & Center Role Badge in Profile Drawer

### Changes — 1 file

**`src/components/profile/ProfileDrawer.tsx`**

#### 1. Remove the Appearance Theme section (lines 155-203)
Delete the entire Theme Switcher block: the `<Separator />`, the label with `Palette` icon, and the 3-button grid (Serenity / Focus / Expression). This removes ~48 lines.

#### 2. Center the "Community" role badge under the avatar and name
Currently the badge is inside a `space-y-1` div alongside the `DrawerTitle`. The structure is:
```
<div className="flex flex-col items-center gap-3 mb-2">
  <Avatar />
  <div className="space-y-1">
    <DrawerTitle>Name</DrawerTitle>
    <Badge>Community</Badge>  ← inside space-y-1, not explicitly centered
  </div>
</div>
```

Change the inner div to explicitly center content:
```
<div className="space-y-1 flex flex-col items-center">
```

This ensures the role badge is horizontally centered beneath the name on all screen sizes.

#### 3. Clean up unused imports
Remove `Palette`, `Check` from lucide-react imports and `useProfileTheme, ProfileTheme` from hook imports since the theme switcher is gone. Also remove `theme`, `setTheme`, `themeLoading` from the destructured hook call (line 54).

### Summary
- **Removed**: Appearance Theme switcher (Serenity/Focus/Expression buttons)
- **Centered**: Role badge explicitly centered under avatar + name
- **Cleaned**: Unused imports (`Palette`, `Check`, `useProfileTheme`, `ProfileTheme`)

