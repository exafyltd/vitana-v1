
Fix the behavior in two layers so the Command Hub drawer always lands on the dedicated Edit Profile screen and never appears to “open another popup”.

1. Update the ProfileDrawer edit action
- In `src/components/profile/ProfileDrawer.tsx`, replace the current inline `onClick={() => navigate('/me/profile')}` with a dedicated handler that:
  - explicitly closes the Vaul drawer first
  - then navigates to `/me/profile`
- This avoids the current state where the drawer remains visually present during the route change, making it look like the drawer content itself transformed into an edit popup.

2. Make the route transition deterministic
- Use the same pattern already used in `handleRoleChange`: trigger drawer close, then navigate after a very short timeout.
- Keep the destination as `/me/profile` only. No popup logic should be added to the drawer.

3. Keep the Edit Profile page as the dedicated screen
- Do not modify the profile popup/drawer architecture itself.
- The current “popup” the user sees is actually the existing edit UI on `EditProfilePage`, which contains page-level drawers like `IdentityDrawer` and `AboutDrawer`.
- Leave those intact, since your requirement is specifically “no changes to profile popup”.

4. Verify the actual sync/unification path
- Ensure the drawer action from Command Hub uses the same canonical route as the rest of the app: `/me/profile`.
- Confirm there are no alternate edit-profile entry points from the drawer after this change.

Technical notes
- Files involved:
  - `src/components/profile/ProfileDrawer.tsx`
- Root cause from code review:
  - The button already calls `navigate('/me/profile')`, but it does not close the surrounding Vaul drawer.
  - Because the drawer stays open while the route changes, the user experiences the destination edit UI as if it opened “inside” the existing profile drawer.
- Relevant code paths:
  - Drawer action: `src/components/profile/ProfileDrawer.tsx`
  - Dedicated screen route: `src/App.tsx` → `/me/profile`
  - Dedicated page component: `src/pages/EditProfilePage.tsx`

Expected result
- Clicking “Edit Profile” in the Command Hub User Profile drawer closes the drawer first, then redirects to the full “Edit Profile – VITANA” page/screen.
- No new changes are made to the profile popup components themselves.
