

## Fix Social Network Import Not Working on Mobile

### Problem Summary
When you add Instagram or Facebook on the Profile screen (mobile), nothing happens - no success/error message appears, and the social networks don't show as connected.

### Root Cause
The import fails silently because:
1. The `profileId` passed to the edge function may be the placeholder `'current-user'` instead of your actual user ID
2. When the database update runs with an invalid user ID, it matches zero rows and returns no error - making it look successful when nothing actually changed

### Solution Overview

We will fix this in **3 places**:

---

### 1. Validate User ID Before Import (Frontend)

**File: `src/components/profile/dialogs/SocialMediaImportDialog.tsx`**

Add validation to catch and show an error if no valid user ID is available:
- Check if `profileId` is a valid UUID (not `'current-user'` or empty)
- Show clear error message if user isn't properly authenticated
- Log the actual profileId being used for debugging

---

### 2. Improve Error Handling in Edge Function

**File: `supabase/functions/social-media-import/index.ts`**

Make the edge function fail explicitly when no rows are updated:
- After the `.update().select().single()` call, check if `data` is null
- If no profile was found/updated, return an explicit error: "No profile found for this user ID"
- This prevents silent failures and gives actionable feedback

---

### 3. Ensure Correct User ID is Passed from Profile Screen

**File: `src/components/profile/mobile/MobileIdCardBack.tsx`**

Improve the profileId selection logic:
- Prioritize `user?.id` from `useAuth()` (the authenticated user)
- Only fall back to `profile.user_id` if it looks like a valid UUID
- Never pass placeholder IDs like `'current-user'`

---

### Technical Details

#### Change 1: SocialMediaImportDialog.tsx (Lines 75-86)
```tsx
const handleImport = async () => {
  // NEW: Validate profileId is a real UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!profileId || !uuidRegex.test(profileId)) {
    console.error('[SocialMediaImport] Invalid profileId:', profileId);
    toast({
      title: translate('socialImport.authRequired', 'Authentication Required'),
      description: translate('socialImport.authRequiredDesc', 'Please make sure you are logged in to connect social accounts.'),
      variant: 'destructive'
    });
    return;
  }
  
  if (!profileUrl.trim()) {
    // ... existing URL validation
  }
  // ... rest of function
};
```

#### Change 2: social-media-import/index.ts (Lines 106-118)
```typescript
const { data, error } = await supabaseClient
  .from('profiles')
  .update(updateData)
  .eq('user_id', userId)
  .select()
  .single();

// NEW: Explicit check for no matching profile
if (!data && !error) {
  console.error(`[social-media-import] No profile found for user ${userId}`);
  throw new Error(`No profile found for user ID: ${userId}. Please ensure you have a profile.`);
}

if (error) {
  console.error(`[social-media-import] Database update error:`, error);
  throw error;
}
```

#### Change 3: MobileIdCardBack.tsx (Line 245)
```tsx
// Current: profileId={user?.id ?? profile.user_id ?? profile.id}
// NEW: Validate before fallback
profileId={
  user?.id || 
  (profile.user_id && profile.user_id !== 'current-user' ? profile.user_id : undefined) ||
  ''
}
```

---

### Expected Outcome
After these changes:
- If you're not logged in, you'll see "Please make sure you are logged in"
- If the import fails, you'll see "No profile found for user ID" with the actual ID
- If successful, the social network will appear as connected with the green checkmark

---

### Testing Checklist
After implementation:
1. Open the Profile screen on mobile
2. Switch to "Social" tab
3. Tap an unconnected platform (e.g., Instagram or Facebook)
4. Enter a URL and tap "Import Profile"
5. Verify you see either a success toast (and the icon turns colored with checkmark) or a clear error message

