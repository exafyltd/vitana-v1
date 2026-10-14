/**
 * VTID-05186 (N3, plan change 14) — the resolver route. Every web destination
 * listed in the parity ledger that has no concrete native route lands here:
 * known → Unported (inside the shell), admin console → system browser /
 * adminInBrowser sheet, unknown → not found. Lanes replace it per screen by
 * adding concrete route files, which Expo Router ranks above this catch-all.
 */
import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { resolveWebPath } from '../../src/navigation/resolve';
import { openWebConsole } from '../../src/identity/web-console';
import { useCurrentHref } from '../../src/shell/AuthGate';
import { Unported } from '../../src/screens/Unported';
import NotFound from '../+not-found';

export default function Resolver() {
  const href = useCurrentHref();
  const r = resolveWebPath(href);
  useEffect(() => {
    if (r.kind === 'external-console') void openWebConsole(r.href);
  }, [r.kind, r.href]);
  if (r.kind === 'native' && r.href !== href) return <Redirect href={r.href as never} />;
  if (r.kind === 'unported' && r.href !== href) return <Redirect href={r.href as never} />;
  if (r.kind === 'unported' || r.kind === 'external-console') return <Unported screenKey={r.key} />;
  return <NotFound />;
}
