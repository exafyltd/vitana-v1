/**
 * VTID-05431 (Native Wave 2, settings lane) — the `/settings/preferences`
 * route on the phone: a replace-redirect into the settings hub, mirroring the
 * web `MobileSettingsSection mode="preferences"` (`src/App.tsx:700-713`). The
 * hub owns the fallback for an unknown section (requirements R1.5).
 */
import type { ReactElement } from 'react';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { preferencesRedirectHref } from './sections';

export function PreferencesRedirect(): ReactElement {
  const { section } = useLocalSearchParams<{ section?: string | string[] }>();
  return <Redirect href={preferencesRedirectHref(section) as never} />;
}
