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
import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useRTL } from "@/components/RTLProvider";
import { isIAPRestricted } from "@/lib/appilix";
import { VtnaRewardRules } from "@/components/wallet/VtnaRewardRules";
import { RewardShop } from "@/components/wallet/RewardShop";
import { EarnMore } from "@/components/wallet/EarnMore";
import { t } from '@/lib/i18n-toast';

function Rewards() {
  const [urlTab, setActiveTab] = useUrlTab("tab", "earned");
  // VTID-05037: the former "intelligence" tab is now "Mehr verdienen" (earn); old links land there.
  const activeTab = urlTab === "intelligence" ? "earn" : urlTab;
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  // Radix Tabs (SplitBar) defaults to dir="ltr"; follow the app direction (same as settings/Support.tsx).
  const { isRTL } = useRTL();
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
        title={t('wallet.rewardsPage.seoTitle')}
        description={t('wallet.rewardsPage.description')}
      />
      {/* VTID-05024: on a phone, a back link to the mobile Wallet instead of the desktop tab bar. */}
      {isMobile ? null : <SubNavigation items={walletNavigation} />}
      
      <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className={isMobile ? "p-4 pb-32 space-y-4" : "max-w-7xl mx-auto p-6 space-y-8"}>
        {isMobile && (
          <Link
            to="/wallet"
            data-testid="rewards-back-to-wallet"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary min-h-11"
          >
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden="true" />
            {t('wallet.backToWallet')}
          </Link>
        )}
        <StandardHeader 
          title={t('wallet.rewardsPage.title')}
          description={t('wallet.rewardsPage.description')}
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder={t('screens.wallet.searchRewardsCommissionsAchievements')} />
          <UniversalCalendarButton />
        </UtilityActionButton>

        <SplitBar value={activeTab} onValueChange={setActiveTab} dir={isRTL ? "rtl" : "ltr"}>
          <SplitBarList>
            {/* VTID-05037: short labels so all three tabs fit on a phone. The former
                "Verdienst-Intelligenz" tab showed invented numbers and is replaced by "Mehr verdienen". */}
            <SplitBarTrigger value="earned">{t('wallet.rewardsPage.tabEarned')}</SplitBarTrigger>
            <SplitBarTrigger value="earn">{t('wallet.rewardsPage.tabEarnMore')}</SplitBarTrigger>
            <SplitBarTrigger value="shop">{t('wallet.rewardShop.tab')}</SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="earned">
            {/* VTID-04864: the real VTNA rules and this member's progress. */}
            <VtnaRewardRules />
          </SplitBarContent>

          <SplitBarContent value="earn">
            <EarnMore />
          </SplitBarContent>

          <SplitBarContent value="shop">
            <RewardShop shippingReturn={shippingReturn} />
          </SplitBarContent>
        </SplitBar>

        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Rewards, SCREEN_IDS.WALLET_REWARDS);