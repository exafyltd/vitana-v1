

## Analysis

Your email infrastructure is confirmed intact:
- Supabase SMTP → `smtp.resend.com` → `noreply@vitanaland.com`
- Resend domain `vitanaland.com` → **Verified**
- SPF/DKIM presumably valid (was working before)

The root cause is almost certainly the **duplicate/unconfirmed user edge case**: when a user signs up with an email already in `auth.users` (even unconfirmed), Supabase's `signUp()` returns success but silently skips the confirmation email. There is **zero** `supabase.auth.resend()` usage in the codebase — users have no recovery path.

A secondary possibility: Resend's SMTP API key (used as the Supabase SMTP password) was rotated without updating Supabase. You should verify this manually: Resend dashboard → API Keys → confirm the key matches what's in Supabase SMTP settings.

## Plan

### Step 1: Create `ResendConfirmationButton` component

**New file:** `src/components/auth/ResendConfirmationButton.tsx`

- Props: `email: string`, `redirectUrl: string`
- Calls `supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo } })`
- 60-second cooldown with countdown timer
- Shows toast on success/failure
- Renders as a subtle text link: "Didn't receive the email? Resend"

### Step 2: Add resend button to all signup success states

After signup succeeds and the "check your email" message appears, show the `ResendConfirmationButton` below it.

**Files to modify:**
- `src/pages/Auth.tsx` — after line ~140 where success message is set
- `src/pages/portals/MaxinaPortal.tsx` — after line ~201
- `src/pages/portals/CommunityPortal.tsx` — after line ~79
- `src/pages/portals/AlkalmaPortal.tsx` — after line ~119
- `src/pages/portals/EarthlinksPortal.tsx` — after line ~119

Each portal will track `signupEmail` state (the email used for signup) and show the resend button when the success message is displayed.

### Step 3: Add resend for "Email not confirmed" sign-in error

In `Auth.tsx` line ~62, when a user tries to sign in but gets "Email not confirmed", also show the resend button so they can request a new confirmation email.

### Manual verification (user action)

Confirm in Resend dashboard → API Keys that the key used as Supabase SMTP password is still active and not rotated.

