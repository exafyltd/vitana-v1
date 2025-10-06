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

export default withScreenId(function Sharing() {
  return (
    <AppLayout>
      <SEO
        title="Sharing - Distribution & Growth | VITANA"
        description="Distribute your content across multiple channels and grow your wellness community"
        canonical={window.location.href}
      />
      <SubNavigation items={sharingNavigation} />

      <div className="p-6 min-h-screen pb-24">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="Distribution & Sharing 🚀"
            description="Share your content across multiple channels and manage your data sharing"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search sharing activities..." />
            <UniversalCalendarButton />
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Campaign
            </Button>
          </UtilityActionButton>

          {/* Autopilot Nudge */}
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
              <GrowthKPIs />
              <NextScheduledPosts />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}, SCREEN_IDS.SHARING_OVERVIEW);
