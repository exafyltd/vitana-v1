

## Plan: Replace inline error alert with a dedicated confirmation screen after signup

**Problem**: After signup, the "Please check your email" message is shown using the same `Alert` component as errors (red destructive styling), making it feel like something went wrong.

**Solution**: Instead of setting `error` with the confirmation message, set a new `signupSuccess` state that renders a friendly, dedicated confirmation view replacing the form — with a mail icon, positive messaging, and the resend button.

### Changes across all 4 portal files

**Files to modify:**
1. `src/pages/portals/MaxinaPortal.tsx`
2. `src/pages/portals/CommunityPortal.tsx`
3. `src/pages/portals/AlkalmaPortal.tsx`
4. `src/pages/portals/EarthlinksPortal.tsx`

**In each file:**

1. Add a `signupSuccess` boolean state (alongside existing `signupEmail`)
2. In `handleSignUp` success branch: set `signupSuccess(true)` and `setSignupEmail(email)` — stop setting `setError()` with the confirmation text
3. In the signup `TabsContent`, render a confirmation view when `signupSuccess` is true — this replaces the form with:
   - A mail/check icon (green/pink themed per portal)
   - "Check your email" heading
   - "We've sent a confirmation link to {email}" message
   - The existing `ResendConfirmationButton`
   - A "Back to sign in" or "Use a different email" button that resets `signupSuccess`
4. Remove the `error.includes('check your email')` variant logic from the Alert since it's no longer needed for this case

This gives users a clear, positive confirmation screen instead of what looks like a warning notification.

