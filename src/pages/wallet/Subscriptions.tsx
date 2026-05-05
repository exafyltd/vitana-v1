import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { SplitBar, SplitBarList, SplitBarTrigger, SplitBarContent } from "@/components/ui/split-bar";
import { WalletMotivationalBanner } from "@/components/wallet/WalletMotivationalBanner";
import { WalletSubscriptionCard } from "@/components/wallet/WalletSubscriptionCard";
import { walletNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { SubscriptionROIAnalyticsCard } from "@/components/wallet/intelligence/SubscriptionROIAnalyticsCard";
import { PersonalizedSubscriptionRecommendationCard } from "@/components/wallet/intelligence/PersonalizedSubscriptionRecommendationCard";
import { SmartRecommendationsSplitScreen } from "@/components/wallet/intelligence/SmartRecommendationsSplitScreen";
import { Plus } from "lucide-react";
import { useState } from "react";
import { t } from '@/lib/i18n-toast';

const subscriptionData = {
  active: [
    {
      id: "1",
      name: "Vitana Premium",
      description: "Complete health coaching and analytics platform",
      price: "$299",
      billing: "month",
      status: "active" as const,
      features: ["Personal Health Coach", "Advanced Analytics", "Lab Test Discounts", "Priority Support"],
      tier: "premium" as const
    },
    {
      id: "2", 
      name: "Community Plus",
      description: "Enhanced community features and exclusive content",
      price: "$49",
      billing: "month",
      status: "active" as const,
      features: ["All Group Access", "Live Room Hosting", "Premium Content", "Expert Q&A Sessions"],
      tier: "basic" as const
    }
  ],
  paused: [
    {
      id: "3",
      name: "Wellness Tracker Pro", 
      description: "Advanced health tracking and insights",
      price: "$19",
      billing: "month",
      status: "paused" as const,
      features: ["Health Metrics", "Goal Tracking", "Progress Reports"],
      tier: "basic" as const
    }
  ],
  available: [
    {
      id: "4",
      name: "AI Health Assistant",
      description: "24/7 AI-powered health guidance and recommendations", 
      price: "$99",
      billing: "month",
      status: "available" as const,
      features: ["24/7 AI Support", "Personalized Recommendations", "Health Risk Assessment", "Medication Reminders"],
      tier: "premium" as const,
      discount: "50% OFF"
    },
    {
      id: "5",
      name: "Family Plan",
      description: "Extend your health journey to family members",
      price: "$399", 
      billing: "month",
      status: "available" as const,
      features: ["Up to 4 Family Members", "Shared Health Goals", "Family Health Dashboard", "Group Coaching Sessions"],
      tier: "enterprise" as const
    }
  ]
};

function Subscriptions() {
  const [activeTab, setActiveTab] = useState("active");
  const [addSubscriptionOpen, setAddSubscriptionOpen] = useState(false);

  const splitBarOptions = [
    { value: "active", label: "Active" },
    { value: "paused", label: "Paused" }, 
    { value: "available", label: "Available" },
    { value: "recommendations", label: "Smart Recommendations" }
  ];

  return (
    <AppLayout>
      <SEO 
        title={t('screens.wallet.subscriptionsVitanaWallet')} 
        description="Manage your active subscriptions, view paused plans, and explore new subscription options."
      />
      <SubNavigation items={walletNavigation} />
      
      <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 min-h-screen">
        <div className="max-w-7xl mx-auto p-6 space-y-8">
        <StandardHeader 
          title={t('screens.wallet.subscriptions')}
          description="Manage your health and wellness subscription plans"
        />

        <UtilityActionButton>
          <ExpandableSearchButton placeholder={t('screens.wallet.searchSubscriptionsPlans')} />
          <UniversalCalendarButton />
          <Button size="sm" onClick={() => setAddSubscriptionOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('screens.wallet.addSubscription')}
          </Button>
        </UtilityActionButton>

        <SplitBar value={activeTab} onValueChange={setActiveTab}>
          <SplitBarList>
            <SplitBarTrigger value="active">{t('screens.wallet.active')}</SplitBarTrigger>
            <SplitBarTrigger value="paused">{t('screens.wallet.paused')}</SplitBarTrigger>
            <SplitBarTrigger value="available">{t('screens.wallet.available')}</SplitBarTrigger>
            <SplitBarTrigger value="recommendations">{t('screens.wallet.smartRecommendations2')}</SplitBarTrigger>
          </SplitBarList>

          <WalletMotivationalBanner variant="subscriptions" />

          <SplitBarContent value="active">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SubscriptionROIAnalyticsCard />
                <WalletMotivationalBanner variant="subscriptions" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subscriptionData.active.map((subscription) => (
                  <WalletSubscriptionCard
                    key={subscription.id}
                    {...subscription}
                    onAction={() => console.log('Manage subscription:', subscription.id)}
                    onClick={() => console.log('Subscription clicked:', subscription.id)}
                  />
                ))}
              </div>
            </div>
          </SplitBarContent>

          <SplitBarContent value="paused">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subscriptionData.paused.map((subscription) => (
                  <WalletSubscriptionCard
                    key={subscription.id}
                    {...subscription}
                    onAction={() => console.log('Resume subscription:', subscription.id)}
                    onClick={() => console.log('Paused subscription clicked:', subscription.id)}
                  />
                ))}
              </div>
              
              <WalletMotivationalBanner variant="subscriptions" />
            </div>
          </SplitBarContent>

          <SplitBarContent value="available">
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <PersonalizedSubscriptionRecommendationCard />
                <WalletMotivationalBanner variant="subscriptions" />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subscriptionData.available.map((subscription) => (
                  <WalletSubscriptionCard
                    key={subscription.id}
                    {...subscription}
                    onAction={() => console.log('Subscribe to:', subscription.id)}
                    onClick={() => console.log('Available subscription clicked:', subscription.id)}
                  />
                ))}
              </div>
            </div>
          </SplitBarContent>

          <SplitBarContent value="recommendations">
            <SmartRecommendationsSplitScreen />
          </SplitBarContent>
        </SplitBar>

        {/* Add Subscription Dialog */}
        <Dialog open={addSubscriptionOpen} onOpenChange={setAddSubscriptionOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('screens.wallet.addNewSubscription')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-muted-foreground">{t('screens.wallet.browseAvailableSubscriptionPlansAddThem')}</p>
              <div className="grid grid-cols-1 gap-4">
                {subscriptionData.available.map((sub) => (
                  <div key={sub.id} className="p-4 border rounded-lg">
                    <h4 className="font-semibold">{sub.name}</h4>
                    <p className="text-sm text-muted-foreground">{sub.description}</p>
                    <p className="text-sm font-medium mt-2">{sub.price}/{sub.billing}</p>
                    <Button size="sm" className="mt-2" onClick={() => console.log('Subscribe to:', sub.id)}>
                      {t('screens.wallet.subscribe')}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </AppLayout>
  );
}

export default withScreenId(Subscriptions, SCREEN_IDS.WALLET_SUBSCRIPTIONS);