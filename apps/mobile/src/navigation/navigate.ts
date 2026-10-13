/**
 * VTID-05186 (N3, plan change 19 / I-SH.2) — the one way the drawer, the
 * bottom bar, N4 (deep links, push) and N6 (ORB directives) move to a web
 * path. Native and unported destinations go through Expo Router (the
 * resolver route renders Unported); admin consoles open in the system browser.
 */
import { router } from 'expo-router';
import { openWebConsole } from '../identity/web-console';
import { resolveWebPath, type Resolution } from './resolve';

export function navigateToWebPath(url: string, opts: { replace?: boolean } = {}): Resolution {
  const r = resolveWebPath(url);
  if (r.kind === 'external-console') {
    void openWebConsole(r.href);
    return r;
  }
  if (opts.replace) router.replace(r.href as never);
  else router.navigate(r.href as never);
  return r;
}
