/**
 * VTID-05653 — the one gift-voucher modal lives in `shell/utility/VoucherModal.tsx`
 * and is hosted by `shell/OverlayHost.tsx`. This path stays only so
 * `tests/discover-commerce/discover-voucher.test.tsx` (outside this lane's
 * paths) keeps importing the Discover twin's modal; nothing in `src` imports it.
 */
export { VoucherModal } from '../../shell/utility/VoucherModal';
