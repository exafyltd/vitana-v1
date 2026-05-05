import React from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { BlastCenter } from "@/components/sharing/BlastCenter";
import { GrowthKPIs } from "@/components/sharing/GrowthKPIs";
import { AutopilotNudge } from "@/components/sharing/AutopilotNudge";
import { NextScheduledPosts } from "@/components/sharing/NextScheduledPosts";
import { ChannelConnector } from "@/components/sharing/ChannelConnector";
import { AnalyticsDashboard } from "@/components/sharing/AnalyticsDashboard";
import { CampaignDialog } from "@/components/sharing/CampaignDialog";
import { SocialShareAutopilot } from "@/components/proactive/SocialShareAutopilot";
import { t } from '@/lib/i18n-toast';

function Sharing() {
  const [campaignPopupOpen, setCampaignPopupOpen] = React.useState(false);

  return (
    <AppLayout>
      <SEO
        title={t('screens.sharing.sharingDistributionGrowthVitana')}
        description="Distribute your content across multiple channels and grow your wellness community"
        canonical={window.location.href}
      />
      <SubNavigation items={sharingNavigation} />

      <div className="p-6 min-h-screen pb-24">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title={t('screens.sharing.distributionSharing')}
            description="Share your content across multiple channels and manage your data sharing"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder={t('screens.sharing.searchSharingActivities')} />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setCampaignPopupOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('screens.sharing.newCampaign')}
            </Button>
          </UtilityActionButton>

          {/* Growth & Autopilot Features */}
          <SocialShareAutopilot />
          <AutopilotNudge
            message="Your event 'Wellness Workshop' starts in 6 days — recommend posting to LinkedIn and X now for maximum reach."
            onPostNow={() => console.log("Post now clicked")}
            onSchedule={() => console.log("Schedule clicked")}
            onDismiss={() => console.log("Dismissed")}
          />

          {/* Overview Tab: Split Screen Layout (60/40) */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left: Blast Center (60%) */}
            <div className="lg:col-span-3">
              <BlastCenter />
            </div>

            {/* Right: Growth Dashboard (40%) */}
            <div className="lg:col-span-2 space-y-6">
              <ChannelConnector />
              <GrowthKPIs />
              <NextScheduledPosts />
            </div>
          </div>

          {/* Analytics Dashboard */}
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">{t('screens.sharing.performanceAnalytics')}</h2>
            <AnalyticsDashboard />
          </div>
        </div>
      </div>

      <CampaignDialog open={campaignPopupOpen} onOpenChange={setCampaignPopupOpen} />
    </AppLayout>
  );
}

export default withScreenId(Sharing, SCREEN_IDS.SHARING_OVERVIEW);
