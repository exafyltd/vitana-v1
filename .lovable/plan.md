

## Plan: Create Reset Password Page for Maxina

### Step 1: Create `src/pages/auth/ResetPassword.tsx`

A new page with two views, Maxina-themed (pink gradient):

**Request view** (default):
- Maxina-branded card with mail icon
- Email input + "Send reset link" button
- Calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: origin + '/reset-password?type=recovery' })`
- On success: shows confirmation screen ("Check your email for a reset link")
- "Back to Maxina" link → `/maxina`

**Update view** (when URL has `type=recovery` or hash has `type=recovery`):
- Password + confirm password inputs with show/hide toggle
- Calls `supabase.auth.updateUser({ password })`
- On success: confirmation screen with "Continue to Maxina" button → `/maxina`

### Step 2: Add route in `src/App.tsx`

- Import `ResetPassword` (lazy or direct)
- Add `<Route path="/reset-password" element={<ResetPassword />} />` in the public routes section (around line 341-346)

No changes needed to MaxinaPortal — the "Forgot password?" link already points to `/reset-password`.

