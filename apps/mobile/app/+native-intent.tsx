/**
 * VTID-05178 — every system link (universal link / App Link / `maxina://`)
 * goes through the one resolver (N4-APP Change 11), never through Expo
 * Router's own path matching. Returning null keeps Expo Router where it is;
 * `useLinkRouting()` in the root layout performs the navigation, holds the
 * target until sign-in, and hands auth / OAuth / invite links to N3.
 */
import { getLinkRouter } from '../src/linking/link-router';

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string | null {
  try {
    getLinkRouter().handleLink(path);
  } catch {
    // A link must never crash the app; it simply does not navigate.
  }
  return null;
}
