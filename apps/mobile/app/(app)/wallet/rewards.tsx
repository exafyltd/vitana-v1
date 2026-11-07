/**
 * VTID-05424 (Native Wave 2, wallet-rewards lane) — `/wallet/rewards`
 * (WALLET.REWARDS). The `tab` search param picks the earned (default) /
 * earn (WALLET.REWARDS_EARN_MORE) / shop (WALLET.REWARDS_SHOP) tab;
 * RewardsScreen reads it.
 */
import { RewardsScreen } from '../../../src/screens/wallet-rewards/RewardsScreen';

export default function WalletRewardsRoute() {
  return <RewardsScreen />;
}
