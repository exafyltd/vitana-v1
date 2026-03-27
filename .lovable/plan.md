

## Add Mobile Settings Page & Update Drawer Navigation

### Summary
Create a dedicated mobile Settings page at `/settings`, replace the "Delete Account" drawer entry with "Settings", and de-emphasize account deletion by placing it inside the Settings page. Skip Billing for now.

### Changes

#### 1. `src/config/drawer-nav.config.ts`
- Import `Settings` icon from lucide-react
- Replace the `delete-account` entry with: `{ id: 'settings', route: '/settings', icon: Settings, translationKey: 'drawerNav.settings' }`
- Keep `connectors` entry unchanged
- Final order: Events, Live, Media, Business, Discover, Orders, Wallet, Health, Diary, Connectors, Inbox, Profile, **Settings**, Logout

#### 2. Create `src/pages/MobileSettings.tsx`
New page following `MobileDailyDiary` pattern:
- `MobileAppShell` wrapper
- `StandardHeader` — title: "Settings ⚙️", subtitle: "Manage your preferences and account"
- `UtilityActionButton` bar (search, calendar, Vitana Index chip, Autopilot chip)
- **Sections** (card-based, scrollable):
  - **Notifications** — Master push toggle + per-category toggles (Live Rooms, Community, Recommendations, Tasks, Memory) + Quiet Hours toggle with time pickers. Uses existing `useNotificationPreferences` hook
  - **Privacy** — navigation card → `/settings/privacy`
  - **Preferences** — navigation card → `/settings/preferences`
  - **Support** — navigation card → `/settings/support`
  - **Delete Account** — red-tinted card at bottom with warning subtitle, navigates to `/delete-account`. De-emphasized but accessible (App Store compliance)

#### 3. `src/App.tsx` (line ~741-747)
- Import `MobileSettings` and `useIsMobile`
- On `/settings` route: render `MobileSettings` when mobile, existing `Settings` when desktop

#### 4. `src/components/mobile/SideDrawerNav.tsx` (line 209)
- Change `isDestructive` check from `item.id === 'logout' || item.id === 'delete-account'` to just `item.id === 'logout'`

### Files
- **Create**: `src/pages/MobileSettings.tsx`
- **Edit**: `src/config/drawer-nav.config.ts`, `src/App.tsx`, `src/components/mobile/SideDrawerNav.tsx`

