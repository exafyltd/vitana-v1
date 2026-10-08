import { useUrlTab } from "@/hooks/useUrlTab";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { walletNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { EarningIntelligenceSplitScreen } from "@/components/wallet/intelligence/EarningIntelligenceSplitScreen";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { isIAPRestricted } from "@/lib/appilix";
import { VtnaRewardRules } from "@/components/wallet/VtnaRewardRules";
import { RewardShop } from "@/components/wallet/RewardShop";
import { t } from '@/lib/i18n-toast';

function Rewards() {
  const [activeTab, setActiveTab] = useUrlTab("tab", "earned");
  const navigate = useNavigate();
  // VTID-04983: back from Stripe Checkout for a shipped reward.
  const [searchParams] = useSearchParams();
  const shipping = searchParams.get("shipping");
  const shippingReturn = shipping === "paid" || shipping === "cancelled" ? shipping : null;

  // Same as Wallet.tsx: the wallet stays hidden in the iPhone app until its
  // launch there; Android and web show it.
  useEffect(() => {
    if (isIAPRestricted()) {
      navigate('/home', { replace: true });
    }
  }, [navigate]);

  return (
    <AppLayout>
      <SEO 
        title={t('screens.wallet.rewardsCommissionsVitanaWallet')} 
        description="Track your rewards, commissions, and achievements. Manage your referral program and earning opportunities."
      />
      <SubNavigation items={walletNavigation} />
      
      <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto p-6 space-y-8">
        <StandardHeader 
          title={t('screens.wallet.rewardsCommissions')}
          description="Track your earnings, achievements, and referral rewards"
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder={t('screens.wallet.searchRewardsCommissionsAchievements')} />
          <UniversalCalendarButton />
        </UtilityActionButton>

        <SplitBar value={activeTab} onValueChange={setActiveTab}>
          <SplitBarList>
            <SplitBarTrigger value="earned">{t('screens.wallet.earnedRewards')}</SplitBarTrigger>
            {/* VTID-04983: spend earned VTNA. The former "pending" and "referral" tabs showed hardcoded sample data and are gone. */}
            <SplitBarTrigger value="shop">{t('wallet.rewardShop.tab')}</SplitBarTrigger>
            <SplitBarTrigger value="intelligence">{t('screens.wallet.earningIntelligence')}</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="earned">
            {/* VTID-04864: the real VTNA rules and this member's progress. */}
            <VtnaRewardRules />
          </SplitBarContent>

          <SplitBarContent value="shop">
            <RewardShop shippingReturn={shippingReturn} />
          </SplitBarContent>

          <SplitBarContent value="intelligence">
            <EarningIntelligenceSplitScreen />
          </SplitBarContent>
        </SplitBar>

        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Rewards, SCREEN_IDS.WALLET_REWARDS);