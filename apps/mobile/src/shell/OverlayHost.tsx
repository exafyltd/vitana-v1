/**
 * VTID-05186 (N3, plan change 19) — global overlays the shell owns. Screen
 * lanes register their own sheets on the overlay bus (`autopilot:open`,
 * `wallet:open`, `notifications:open`); the shell renders only the
 * admin-in-browser sheet (program decision 3, `native.adminInBrowser.*`).
 */
import { useState } from 'react';
import { BottomSheet, Text } from '../ports/ui';
import { useI18n } from '../i18n/I18nProvider';
import { useBusEvent } from '../navigation/overlay-bus';

export function OverlayHost() {
  const { t } = useI18n();
  const [adminOpen, setAdminOpen] = useState(false);
  useBusEvent('adminInBrowser:open', () => setAdminOpen(true));
  return (
    <BottomSheet testID="admin-in-browser" open={adminOpen} onClose={() => setAdminOpen(false)} title={t('native.adminInBrowser.title')}>
      <Text muted>{t('native.adminInBrowser.body')}</Text>
    </BottomSheet>
  );
}
