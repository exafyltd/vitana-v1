

## Fix: Strict Role-Based Screen Separation (Revised)

Incorporates all feedback from your review. Four files, five fixes.

---

### Fix 1: `src/hooks/useSmartRouting.tsx` — `useSmartRouting()` (lines 37-42)

**Problem**: Exafy Admins are always redirected to `/admin/tenant-management` regardless of their stored `currentRole`.

**Change**: Replace the Exafy Admin block with `currentRole`-aware routing:

- `admin` or `staff` role selected --> navigate to `/admin`
- `professional` --> `/professional/dashboard`
- `patient` --> `/patient/dashboard`
- `community` (default) --> use the same tenant-based community routing logic (e.g., Maxina events on mobile, `/maxina` on desktop)

---

### Fix 2: `src/hooks/useSmartRouting.tsx` — `useRoleBasedRedirect()` (lines 95-98)

**Problem**: Same hardcoded `/admin/tenant-management` for all Exafy Admins, used in post-login redirects.

**Change**: Remove the `if (isExafyAdmin) return "/admin/tenant-management"` early return. Instead, let Exafy Admins fall through to the same `currentRole` switch statement that already handles all roles correctly. The existing `switch(currentRole)` at line 100 already does the right thing -- the early return just short-circuits it.

---

### Fix 3: `src/components/AppLayout.tsx` — Sidebar navigation (line 81)

**Problem**: Sidebar always shows `currentRole` navigation, even when the user is on a page belonging to a different role (e.g., admin page with community sidebar).

**Change**: Replace line 81 with a URL-aware function:

```text
pathname === '/admin' OR starts with '/admin/'  --> admin nav
pathname === '/staff' OR starts with '/staff/'  --> staff nav
pathname === '/professional' OR starts with '/professional/'  --> professional nav
pathname === '/patient' OR starts with '/patient/'  --> patient nav
everything else  --> getRoleNavigation(currentRole)
```

Uses precise matching (`=== '/admin' || startsWith('/admin/')`) to avoid false positives on hypothetical paths like `/admin-something`.

---

### Fix 4: `src/components/profile/ProfileDrawer.tsx` — `handleRoleChange` navigation (lines 74-87)

**Problem**: After switching roles, navigation targets are wrong:

- `professional` navigates to `/dashboard` (should be `/professional/dashboard`)
- `patient` navigates to `/dashboard` (should be `/patient/dashboard`)
- `community` navigates to `/dashboard` (should be `/home` or tenant-based)

**Change**: Fix the switch statement to match the actual routes in `role-navigation.ts`:

```
admin / staff   --> /admin
professional    --> /professional/dashboard
patient         --> /patient/dashboard
community       --> /home
```

---

### Fix 5: `src/components/profile/ProfileDrawer.tsx` — Hide role switcher on mobile (lines 200-223)

**Problem**: Mobile should be community-only with no role switching capability.

**Change**: Import `useIsMobile` and wrap the entire role switcher section (lines 200-223) with `!isMobile`, so it only renders on desktop. Mobile users will never see the Switch Role dropdown.

---

### Summary

| File | Fix | Lines |
|------|-----|-------|
| `useSmartRouting.tsx` | Exafy Admin respects `currentRole` in `useSmartRouting()` | 37-42 |
| `useSmartRouting.tsx` | Remove hardcoded admin redirect in `useRoleBasedRedirect()` | 95-98 |
| `AppLayout.tsx` | URL-aware sidebar with precise prefix matching | 81 |
| `ProfileDrawer.tsx` | Fix wrong navigation paths after role switch | 74-87 |
| `ProfileDrawer.tsx` | Hide role switcher on mobile | 200-223 |

