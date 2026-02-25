
## Unified Notification System (Push + In-App) — IMPLEMENTED

### Files Created
- `src/lib/firebase.ts` — Firebase init + FCM token + foreground listener
- `public/firebase-messaging-sw.js` — Background push service worker
- `src/lib/notification-types.ts` — 70-type notification registry
- `src/hooks/useNotifications.ts` — Gateway-backed notification + preferences hooks

### Files Replaced
- `src/lib/pushNotifications.ts` — FCM-based push manager (was Web Push API)
- `src/components/NotificationBell.tsx` — Gateway-backed bell with type-aware icons
- `src/pages/settings/SettingsNotifications.tsx` — New preferences UI

### Files Modified
- `src/lib/appilix.ts` — Merged `appilix_fcm_token` into Window + added `requestNativeFcmToken`
- `src/App.tsx` — Removed `useMessageNotifications`, added `initializePushNotifications`
- `src/pages/Settings.tsx` — Switched to `useNotificationPreferences` from new hook

### Files Deleted
- `src/hooks/useMessageNotifications.ts` — Replaced by `useNotifications.ts`

### Env Var
Uses `VITE_GATEWAY_BASE` (existing) — NOT `VITE_GATEWAY_URL`
