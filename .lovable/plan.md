

## Self-Service Account Deletion — App Store Compliant (Guideline 5.1.1v)

### Current Problem

The `/delete-account` page tells users to email `support@exafy.io`. Apple rejects this — deletion must be initiatable directly in the product without contacting support.

### Approach

**Backend: Edge function + database table for deletion requests**

1. **New migration** — Create `account_deletion_requests` table:
   - `id uuid PK`, `user_id uuid references auth.users(id)`, `status text default 'pending'`, `requested_at timestamptz default now()`, `processed_at timestamptz null`, `reason text null`
   - RLS: authenticated users can INSERT their own row and SELECT their own rows

2. **New edge function `request-account-deletion`**:
   - Validates JWT, inserts row into `account_deletion_requests`
   - Calls `supabase.auth.admin.deleteUser(userId)` to immediately delete the auth user (or mark for deferred deletion if you prefer a grace period)
   - Returns `{ ok: true }`

**Frontend: Replace the static page with an interactive flow**

3. **Rewrite `src/pages/legal/DeleteAccount.tsx`**:
   - **Step 1 (info)**: Explains what happens when you delete — data removed, action irreversible. Shows a destructive "Delete My Account" button.
   - **Step 2 (confirmation)**: If user is logged in, show a confirmation dialog: "Type DELETE to confirm" + final red button "Permanently Delete My Account". If not logged in, show a sign-in prompt first (link to `/maxina` portal login), then return here.
   - **Step 3 (done)**: Calls the edge function, signs the user out, shows success: "Your account has been deleted."
   - Loading and error states handled inline.

### Flow Summary

```text
User taps "Delete Account"
  → /delete-account page loads
  → Not logged in? → "Sign in to continue" button → login → redirect back
  → Logged in? → Info screen with "Delete My Account" (red)
  → Confirmation: type "DELETE" + final button
  → Edge function called → auth user deleted → signed out
  → "Your account has been deleted" screen
```

### Files to create/modify
- **Migration**: `account_deletion_requests` table with RLS
- **New edge function**: `supabase/functions/request-account-deletion/index.ts`
- **Rewrite**: `src/pages/legal/DeleteAccount.tsx` — interactive self-service flow

