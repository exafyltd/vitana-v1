

## In-App Top App Bar + Drawer Sidebar Navigation

### Overview

Build a native React Top App Bar and slide-from-left Drawer to replace the Appilix-generated navigation. The existing mobile bottom nav and desktop sidebar remain untouched.

### Key Clarification from Screenshot

- **Left**: Kebab menu icon (three vertical dots) that opens the drawer
- **Center**: Tenant name in uppercase (e.g., "MAXINA")
- **Right**: Nothing (no back button, no extra icons)

### New Files

| File | Purpose |
|------|---------|
| `src/config/drawer-nav.config.ts` | Centralized navigation items: 12 entries with id, route, icon, i18n key |
| `src/components/mobile/TopAppBar.tsx` | Fixed top bar with kebab (left) + tenant name (center) |
| `src/components/mobile/SideDrawerNav.tsx` | Slide-from-left drawer with tenant header, nav items, active highlight, logout |
| `src/components/mobile/MobileAppShell.tsx` | Composes TopAppBar + SideDrawerNav + children; no-op on desktop |

### Changed Files

| File | Change |
|------|--------|
| `src/components/AppLayout.tsx` | Wrap children in `MobileAppShell` |
| `src/i18n/en.json` | Add `drawerNav.*` keys (12 items) |
| `src/i18n/de.json` | Add `drawerNav.*` keys (12 items, German) |
| `src/lib/appilix.ts` | Add `hideAppilixAppBar()` to suppress native bar |
| `src/hooks/useAppilix.ts` | Call `hideAppilixAppBar()` once detected |

### Technical Details

**1. Navigation Config (`drawer-nav.config.ts`)**

Single source of truth for all drawer items, matching the Appilix categories exactly:

```text
events        /comm/events-meetups      Calendar       drawerNav.events
live          /comm/live-rooms          Video          drawerNav.live
media         /comm/media-hub           LayoutGrid     drawerNav.media
business      /business                 Briefcase      drawerNav.business
discover      /discover                 Compass        drawerNav.discover
orders        /discover/orders          ShoppingBag    drawerNav.orders
wallet        /wallet                   Wallet         drawerNav.wallet
health        /health                   HeartPulse     drawerNav.health
connectors    /settings/connected-apps  Plug           drawerNav.connectors
inbox         /inbox                    Mail           drawerNav.inbox
profile       /me/profile               UserCircle     drawerNav.profile
logout        __logout__                LogOut         drawerNav.logout
```

**2. TopAppBar Layout**

```text
+----------------------------------------------+
| [kebab]          MAXINA                       |
+----------------------------------------------+
```

- Fixed position, `z-40` (below modals/drawers, above content)
- Height: `h-14` (56px)
- Kebab icon on the left triggers drawer open
- Tenant name centered, uppercase, semi-bold, `tracking-wider`
- Maxina gradient: `linear-gradient(180deg, hsl(201 90% 78%) 0%, hsl(201 75% 70%) 100%)`
- Text/icons: `rgba(255,255,255,0.95)` on gradient
- Other tenants: neutral theme background
- Only renders on mobile (`useIsMobile`)
- Hidden on the same routes as MobileBottomNav (intro, auth, live room viewer, etc.)

**3. SideDrawerNav**

- Uses `framer-motion` for slide-from-left animation + backdrop fade
- Drawer header: tenant name + sublabel on the Maxina gradient (or theme bg for others)
- Nav list: maps `drawerNavItems`, each with `icon + translate(translationKey)`
- Active route: highlighted background (`primary/10`) + left accent bar, using `useLocation` path matching
- Click any item: navigate + close drawer
- Logout: calls `signOut()` from `useAuth()`, redirects to `/`
- Closes on backdrop click

**4. MobileAppShell**

```tsx
function MobileAppShell({ children }) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  if (!isMobile) return <>{children}</>;

  return (
    <>
      <TopAppBar onMenuClick={() => setDrawerOpen(true)} />
      <SideDrawerNav open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      <div className="pt-14">{children}</div>
    </>
  );
}
```

**5. AppLayout Integration**

In the return of `AppLayout`, wrap `{children}` inside `<MobileAppShell>`:

```tsx
<main className="flex-1">
  <MobileAppShell>{children}</MobileAppShell>
</main>
```

The existing `MobileBottomNav` remains completely independent and unchanged.

**6. Translation Keys**

English (`drawerNav` block in `en.json`):
```text
events      Events & MeetUps
live        Live Channels
media       Media
business    Business
discover    Discover
orders      Orders
wallet      Wallet
health      Health
connectors  Connectors
inbox       Inbox
profile     Profile
logout      Log Out
```

German (`drawerNav` block in `de.json`):
```text
events      Events & MeetUps
live        Live Kanale
media       Medien
business    Business
discover    Entdecken
orders      Bestellungen
wallet      Wallet
health      Gesundheit
connectors  Connectors
inbox       Postfach
profile     Profil
logout      Abmelden
```

**7. Appilix Bridge Update**

Add `hideAppilixAppBar()` to `appilix.ts`:

```typescript
export function hideAppilixAppBar(): boolean {
  return updateSettings({
    app_bar: false,
    navigation_drawer: false,
    show_menu_icon: false,
  });
}
```

In `useAppilix.ts`, replace `forceAppBarVisibility()` with `hideAppilixAppBar()` so the native Appilix bar disappears when the React bar is active.

### What Stays Unchanged

- Desktop sidebar (`AppSidebar`)
- `MobileBottomNav` component
- All existing routing in `App.tsx`
- The `useAppilix` detection logic (only post-detection action changes)

