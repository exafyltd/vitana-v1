/**
 * VTID-05430 (Native Wave 2, public-profile lane) — native twin of the web
 * `LegacyProfileRedirect` (`/profile/:id`, `src/App.tsx:1482`, no AuthGuard).
 * Resolves the id with the web rule and replaces the route with the canonical
 * `/u/…` profile (web `<Navigate replace>`), signed in or out; an id with no
 * target renders the app's not-found screen (web `<NotFound />`). Lives in the
 * `(public)` group, so a signed-out visitor is never sent to sign-in first.
 * React 19: typed with `ReactElement`.
 */
import type { ReactElement } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import NotFound from '../../../app/+not-found';
import { legacyProfileTarget } from './legacy-redirect';

export function LegacyProfileRedirectScreen(): ReactElement {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const target = legacyProfileTarget(Array.isArray(id) ? id[0] : id);
  if (!target) return <NotFound />;
  return <Redirect href={target as never} />;
}
