/**
 * VTID-05422 (Native Wave 2, wallet-home lane) — `/wallet/balance`
 * (WALLET.BALANCE). The `tab` search param picks the credits (default) /
 * tokens / membership / optimization pane (WALLET.BALANCE_TOKENS,
 * WALLET.BALANCE_MEMBERSHIP, WALLET.BALANCE_OPTIMIZATION); BalanceScreen
 * reads it.
 */
import { BalanceScreen } from '../../../src/screens/wallet-home/BalanceScreen';

export default function WalletBalanceRoute() {
  return <BalanceScreen />;
}
