/**
 * VTID-05424 (Native Wave 2, wallet-rewards lane) — the native twin of the web
 * `isIAPRestricted()` (src/lib/appilix.ts, class B: it reads browser globals,
 * so it is not extracted). The rule is today's native rule, the one the drawer
 * already applies (src/shell/components/SideDrawer.tsx:
 * `iapRestricted: Platform.OS === 'ios'`, program decision 5 default): digital
 * purchases are hidden on iOS (App Store Guideline 3.1.1). It is read at call
 * time, like the web function, and neither widens nor narrows the gate.
 */
import { Platform } from 'react-native';

export function isIAPRestricted(): boolean {
  return Platform.OS === 'ios';
}
