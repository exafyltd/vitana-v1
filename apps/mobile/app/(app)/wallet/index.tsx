/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — `/wallet` (WALLET.OVERVIEW +
 * the WalletPopup overlay OVERLAY.WALLET_POPUP). The `tab` search param picks
 * the Balances / Activity (WALLET.ACTIVITY) / Actions (WALLET.ACTIONS) mode;
 * WalletScreen reads it.
 */
import { WalletScreen } from '../../../src/screens/wallet-home/WalletScreen';

export default function WalletRoute() {
  return <WalletScreen />;
}
