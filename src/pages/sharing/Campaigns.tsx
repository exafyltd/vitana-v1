import React from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CampaignDialog } from "@/components/sharing/CampaignDialog";
import { CampaignCard } from "@/components/sharing/CampaignCard";
import { useCampaigns, type Campaign } from "@/hooks/useCampaigns";
import { useDistributionPosts } from "@/hooks/useDistributionPosts";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Plus, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default withScreenId(function Campaigns() {
  const [campaignPopupOpen, setCampaignPopupOpen] = React.useState(false);
  const [editingCampaign, setEditingCampaign] = React.useState<Campaign | null>(null);
  const { campaigns, isLoading } = useCampaigns();
  const { posts } = useDistributionPosts();
  const navigate = useNavigate();

  const handleEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setCampaignPopupOpen(true);
  };

  const handleCloseDialog = (open: boolean) => {
    setCampaignPopupOpen(open);
    if (!open) {
      setEditingCampaign(null);
    }
  };

  const getCampaignStats = (campaignId: string) => {
    const campaignPosts = posts?.filter((p) => p.campaign_id === campaignId) || [];
    return {
      total: campaignPosts.length,
      published: campaignPosts.filter((p) => p.status === "published").length,
      drafts: campaignPosts.filter((p) => p.status === "draft").length,
    };
  };


  return (
    <AppLayout>
      <SEO
        title="Campaign Manager | VITANA"
        description="Plan, execute, and track multi-post campaigns"
        canonical={window.location.href}
      />
      <SubNavigation items={sharingNavigation} />

      <div className="p-6 min-h-screen pb-24">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title="Campaign Manager 📊"
            description="Plan, execute, and track multi-post campaigns"
          />

          <UtilityActionButton>
            <ExpandableSearchButton placeholder="Search campaigns..." />
            <UniversalCalendarButton />
            <Button size="sm" onClick={() => setCampaignPopupOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Campaign
            </Button>
          </UtilityActionButton>

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading campaigns...
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => {
                const stats = getCampaignStats(campaign.id);

                return (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    stats={stats}
                    onClick={() => handleEditCampaign(campaign)}
                  />
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first campaign to organize and track your content distribution
                </p>
                <Button onClick={() => setCampaignPopupOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Campaign
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <CampaignDialog open={campaignPopupOpen} onOpenChange={handleCloseDialog} editingCampaign={editingCampaign} />
    </AppLayout>
  );
}, SCREEN_IDS.SHARING_CAMPAIGNS);
