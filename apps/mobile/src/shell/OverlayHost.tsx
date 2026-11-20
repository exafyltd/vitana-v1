/**
 * VTID-05186 (N3, plan change 19) — global overlays the shell owns. Screen
 * lanes register their own sheets on the overlay bus (`autopilot:open`,
 * `wallet:open`, `notifications:open`); the shell renders the admin-in-browser
 * sheet (program decision 3, `native.adminInBrowser.*`).
 *
 * VTID-05653 — and the two hosts every utility bar relies on, once per app like
 * the web provider (`LifeCompassPopupContext.tsx:14, :32`): `vitana:open-life-compass`
 * opens the one Life Compass popup, `gift-voucher:open` `{ returnTo }` the one
 * voucher modal (`returnTo` = the detail when it is a `/` route, else the
 * current path). Both need a session for their reads and writes, so both
 * events are ignored signed out; the modal is a digital purchase and never opens
 * where IAP is restricted (iOS).
 */
import { useState } from 'react';
import { usePathname } from 'expo-router';
import { BottomSheet, Text } from '../ports/ui';
import { useAuth } from '../auth/AuthProvider';
import { useI18n } from '../i18n/I18nProvider';
import { useBusEvent } from '../navigation/overlay-bus';
import { LifeCompassPopup } from './utility/LifeCompassPopup';
import { VoucherModal } from './utility/VoucherModal';
import { GIFT_VOUCHER_OPEN, LIFE_COMPASS_OPEN, type GiftVoucherOpenDetail } from './utility/events';
import { isIAPRestricted } from './utility/UtilityBar';

export function OverlayHost() {
  const { t } = useI18n();
  const { user } = useAuth();
  const pathname = usePathname();
  const [adminOpen, setAdminOpen] = useState(false);
  const [compassOpen, setCompassOpen] = useState(false);
  const [voucher, setVoucher] = useState<{ returnTo: string } | null>(null);
  useBusEvent('adminInBrowser:open', () => setAdminOpen(true));
  useBusEvent(LIFE_COMPASS_OPEN, () => {
    if (user) setCompassOpen(true);
  });
  useBusEvent<GiftVoucherOpenDetail>(GIFT_VOUCHER_OPEN, (detail) => {
    if (!user || isIAPRestricted()) return;
    const requested = detail?.returnTo;
    setVoucher({ returnTo: typeof requested === 'string' && requested.startsWith('/') ? requested : pathname });
  });
  return (
    <>
      <BottomSheet testID="admin-in-browser" open={adminOpen} onClose={() => setAdminOpen(false)} title={t('native.adminInBrowser.title')}>
        <Text muted>{t('native.adminInBrowser.body')}</Text>
      </BottomSheet>
      {compassOpen && user ? <LifeCompassPopup open onOpenChange={setCompassOpen} /> : null}
      {voucher && user && !isIAPRestricted() ? <VoucherModal open returnTo={voucher.returnTo} onOpenChange={(o) => !o && setVoucher(null)} /> : null}
    </>
  );
}
