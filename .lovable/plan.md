
Fix the Command Hub profile flow by separating “navigate to Edit Profile – VITANA” from the existing shared profile popup behavior.

What’s happening now
- The Command Hub sidebar uses the shared `ProfileDrawer` component (`src/components/dev/DevSidebar.tsx` → `src/components/profile/ProfileDrawer.tsx`).
- Clicking “Edit Profile” correctly navigates to `/me/profile`, but that route renders `EditProfilePage`.
- `EditProfilePage` itself is built around nested edit dialogs/drawers (`IdentityDrawer`, `AboutDrawer`, `ServicesDrawer`, etc.), which is why you see another popup-like UI instead of a dedicated full-page VITANA edit screen.
- The screenshot matches the existing dialog-driven editor pattern, not a bad redirect.

What to change
1. Keep the shared profile popup unchanged
- Do not redesign or fork the shared `ProfileDrawer`.
- Keep its unified behavior for all tenants.

2. Make Command Hub always open the dedicated VITANA edit experience
- Update `src/components/profile/ProfileDrawer.tsx` so the Edit Profile action:
  - closes the drawer explicitly
  - navigates to `/me/profile`
  - passes route state indicating this navigation came from Command Hub, e.g. `{ fromCommandHub: true }`

3. Make `/me/profile` honor that Command Hub intent
- Update `src/pages/EditProfilePage.tsx` to read `useLocation().state`.
- When `fromCommandHub` is present:
  - render only the full-page “Edit Profile – VITANA” experience
  - suppress any auto-open or popup-style entry behavior
  - ensure the main page/toolbar/profile layout is the primary view

4. Remove popup-style editor chrome for this entry path
- The UI in your screenshot comes from the dialog components (`IdentityDrawer`, `AboutDrawer`) and form-driven editor blocks.
- For the Command Hub entry path, do not surface that modal-first presentation immediately.
- Instead, land on the page shell first, then allow editing from in-page actions.

5. Keep mobile and desktop parity
- Apply the same entry logic on both viewports.
- Desktop should land on the full edit page.
- Mobile should also land on the full edit page screen first, not jump straight into a dialog.

Files to update
- `src/components/profile/ProfileDrawer.tsx`
- `src/pages/EditProfilePage.tsx`

Technical notes
- Route already exists and is correct: `src/App.tsx` → `/me/profile` → `EditProfilePage`
- Root issue is not the route; it is that `EditProfilePage` is architected as a page that immediately centers around dialog-based editors.
- Best implementation is to make the page support an explicit “full-page entry mode” from Command Hub via React Router state rather than creating a separate duplicate page.

Expected result
- From Tenant Chooser → Vitana Dev → Command Hub → left sidebar user profile popup → Edit Profile:
  - the shared popup closes
  - the app redirects to `/me/profile`
  - the user lands on the dedicated “Edit Profile – VITANA” page/screen
  - no second modified popup appears immediately

Technical detail
```text
DevSidebar
  -> ProfileDrawer (shared)
      -> Edit Profile click
          -> close drawer
          -> navigate("/me/profile", { state: { fromCommandHub: true } })

/me/profile
  -> EditProfilePage
      -> if fromCommandHub:
           render full-page edit shell only
           do not present popup-first editing state
```
