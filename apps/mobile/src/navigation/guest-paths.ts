/**
 * VTID-05186 (N3, plan change 14) — the web destinations a signed-out visitor
 * may open: every App.tsx route wrapped in `<AuthGuard allowGuest>`. A hand
 * list, CHECKED (never generated) by scripts/native/check-shell-pins.mjs
 * against src/App.tsx, so a new guest route on the web fails NATIVE-CI.
 */
export const GUEST_PATHS: readonly string[] = [
  '/e/game/:slug',
  '/discover',
  '/discover/supplements',
  '/discover/category/:subcategory',
  '/discover/wellness-services',
  '/discover/deals-offers',
  '/commerce',
];
