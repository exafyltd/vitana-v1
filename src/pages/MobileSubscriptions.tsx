import { useNavigate } from "react-router-dom";
import { MobileAppShell } from "@/components/mobile/MobileAppShell";
import StandardHeader from "@/components/StandardHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { t } from "@/lib/i18n-toast";
import { useBilling } from "@/hooks/useBilling";
import { PrivacyFirstPromises } from "@/components/subscription/PrivacyFirstPromises";
import { SubscriptionStateCard } from "@/components/subscription/SubscriptionStateCard";
import { PlansGridHeadline } from "@/components/subscription/PlansGridHeadline";
import { PlansGridExpanded } from "@/components/subscription/PlansGridExpanded";
import { FeatureComparisonTable } from "@/components/subscription/FeatureComparisonTable";
import { AddExtraMinutesTile } from "@/components/subscription/AddExtraMinutesTile";
import { RedeemCodeCard } from "@/components/subscription/RedeemCodeCard";
import { YourEarningsWidget } from "@/components/subscription/YourEarningsWidget";
import { WhySubscribeFAQ } from "@/components/subscription/WhySubscribeFAQ";
import { FoundingBanner } from "@/components/subscription/FoundingBanner";
import { LaunchGrantBanner } from "@/components/subscription/LaunchGrantBanner";

function Loading() {
  return (
    <div className="space-y-4 px-4">
      <Skeleton className="h-32 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  );
}

export default function MobileSubscriptions() {
  const navigate = useNavigate();
  const { data, isLoading, isError, error } = useBilling();

  const isFree = data?.plan.plan_key === "free" || data?.plan.status === "free";
  const isPastDue =
    data?.plan.status === "past_due" || data?.plan.status === "unpaid";

  return (
    <MobileAppShell>
      <div className="h-[100dvh] overflow-hidden flex flex-col bg-gradient-to-b from-background to-muted/30">
        {/* Header strip with back button */}
        <div className="flex items-center gap-2 px-2 pt-3">
          <button
            onClick={() => navigate(-1)}
            aria-label={t("common.back")}
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-muted/60 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <StandardHeader
              title={t("billing.subscriptionsPage.title")}
              description={t("billing.subscriptionsPage.subtitle")}
              emoji="✨"
            />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 pb-28 space-y-4">
          {isLoading && <Loading />}

          {isError && (
            <Card className="rounded-2xl border-border/50 shadow-sm">
              <CardContent className="p-5 text-center">
                <p className="text-sm text-destructive">
                  {error instanceof Error
                    ? error.message
                    : t("billing.checkoutErrors.checkoutFailed")}
                </p>
              </CardContent>
            </Card>
          )}

          {data && (
            <>
              <SubscriptionStateCard data={data} />
              <LaunchGrantBanner data={data} />
              <FoundingBanner />
              {isFree && <RedeemCodeCard />}
              <PlansGridHeadline currentPlanKey={data.plan.plan_key} />
              <PlansGridExpanded currentPlanKey={data.plan.plan_key} />
              <FeatureComparisonTable data={data} />
              <AddExtraMinutesTile />
              <YourEarningsWidget data={data} />
              <PrivacyFirstPromises />
              <WhySubscribeFAQ />
            </>
          )}
        </div>

        {/* Sticky bottom CTA — only for users with an existing subscription.
            Free users have the plans grid in the page body. */}
        {data && !isFree && (
          <div
            className="absolute bottom-0 left-0 right-0 px-4 pt-2 bg-gradient-to-t from-background via-background to-transparent"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 12px)" }}
          >
            <Button
              variant={isPastDue ? "destructive" : "outline"}
              className="w-full h-12 rounded-xl"
              onClick={() => navigate("/settings?mode=billing")}
            >
              <SettingsIcon className="w-4 h-4 mr-2" />
              {t("billing.state.manage")}
            </Button>
          </div>
        )}
      </div>
    </MobileAppShell>
  );
}
