

# Conditional OAuth Redirect for Appilix Mobile

## Overview
Update the Google/Apple OAuth redirect logic to detect the `app=1` query parameter and redirect mobile users to `/comm/events-meetups?tab=upcoming` instead of `/home`.

## Technical Implementation

### 1. Modify `handleSocialLogin` in MaxinaPortal.tsx
**File:** `src/pages/portals/MaxinaPortal.tsx` (lines 181-197)

Add conditional logic using the existing `searchParams` hook (already imported on line 32):

```typescript
const handleSocialLogin = async (provider: 'google' | 'apple') => {
  try {
    // Detect mobile app context via query param
    const isAppContext = searchParams.get('app') === '1';
    const redirectPath = isAppContext 
      ? '/comm/events-meetups?tab=upcoming' 
      : '/home';
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getEmailRedirectUrl(redirectPath),
        queryParams: {
          tenant_slug: 'maxina'
        }
      }
    });
    if (error) throw error;
  } catch (err: any) {
    console.error('OAuth error:', err);
    setError(err.message || 'Social login failed. Please try again.');
  }
};
```

## Redirect Flow

```text
Mobile (Appilix):
  /maxina?app=1 → OAuth → /comm/events-meetups?tab=upcoming

Desktop/Web:
  /maxina → OAuth → /home
```

## Supabase Configuration
The redirect allowlist already includes `https://vitanaland.com/**` which covers both paths:
- `https://vitanaland.com/home`
- `https://vitanaland.com/comm/events-meetups?tab=upcoming`

No dashboard changes required.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/portals/MaxinaPortal.tsx` | Update `handleSocialLogin` with conditional redirect logic |

## Implementation Notes
- Uses existing `searchParams` hook (already in component)
- No new dependencies required
- Desktop behavior unchanged when `app` param is absent
- Appilix drawer links should include `?app=1` parameter

