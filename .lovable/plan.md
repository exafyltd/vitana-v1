

# Fix Edit Identity: Race Condition and Data Restoration

## What's Wrong
The Identity form has a race condition: when the dialog opens, all fields start as empty strings, and the `onDataChange` callback fires immediately with those empty values. If the user hits "Save" before the database fetch completes, it overwrites real data with blanks. This is what wiped your display name and avatar previously.

Additionally, your profile currently has empty `display_name` and `avatar_url` in the database (from the previous wipe), so the form shows nothing to edit.

## Plan

### Step 1: Restore your profile data (database migration)
Run a SQL update to restore:
- `display_name` back to "Jovana Comm"  
- `avatar_url` from your Google account metadata

### Step 2: Fix the race condition in IdentityForm.tsx
Add a `loaded` flag so the form doesn't report data changes to the parent until the profile has actually been fetched from the database:
- Add a `loaded` state, initially `false`
- Set it to `true` after `loadProfile()` completes
- Guard the `onDataChange` effect so it only fires when `loaded` is `true`

This prevents the initial empty values from being treated as the user's intended data.

### Step 3: Add save validation in IdentityDrawer.tsx
Before saving, check that `displayName` is not empty. If it is, show an error toast and block the save. This acts as a safety net against accidental blank overwrites.

## Technical Details

### Files changed

| File | Change |
|------|--------|
| SQL migration | `UPDATE profiles SET display_name = 'Jovana Comm', avatar_url = '...' WHERE user_id = 'c7d3260d-...'` |
| `src/components/profile/editor/IdentityForm.tsx` | Add `loaded` state guard around the `onDataChange` effect |
| `src/components/profile/drawers/IdentityDrawer.tsx` | Add empty display name validation before save |

### IdentityForm.tsx changes
```typescript
const [loaded, setLoaded] = useState(false);

// Guard: only notify parent after data is loaded
useEffect(() => {
  if (loaded && onDataChange) {
    onDataChange({ displayName, handle, avatarUrl, longevityArchetype });
  }
}, [displayName, handle, avatarUrl, longevityArchetype, onDataChange, loaded]);

// In loadProfile, after setting state:
setLoaded(true);
```

### IdentityDrawer.tsx changes
```typescript
const handleSave = async () => {
  if (!formData.displayName.trim()) {
    toast({
      title: "Display name required",
      description: "Please enter a display name before saving.",
      variant: "destructive",
    });
    return;
  }
  // ...existing save logic
};
```
