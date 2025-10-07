import React from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CampaignDialog } from "@/components/sharing/CampaignDialog";
import { useCampaigns, type Campaign } from "@/hooks/useCampaigns";
import { useDistributionPosts } from "@/hooks/useDistributionPosts";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Calendar, Users, FileText, Plus, Eye, Edit, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CHANNEL_INFO, DISTRIBUTION_TEMPLATES } from "@/lib/campaign-templates";

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "paused":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "completed":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "draft":
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
    }
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
                const statusColor = getStatusColor(campaign.status);
                const targetChannels = (campaign.target_channels as Record<string, boolean>) || {};
                const selectedChannels = Object.entries(targetChannels)
                  .filter(([_, selected]) => selected)
                  .map(([key]) => key);
                const templateId = (campaign.distribution_config as any)?.template_id || "custom";
                const template = DISTRIBUTION_TEMPLATES.find((t) => t.id === templateId);
                const smartSchedulingEnabled = (campaign.distribution_config as any)?.smart_scheduling_enabled;

                const frequency = template?.frequency || (campaign.distribution_config as any)?.frequency || "Custom";
                const bestTimes = (campaign.distribution_config as any)?.best_times;
                const hasBestTimes = bestTimes && Object.keys(bestTimes).length > 0;

                return (
                  <Card
                    key={campaign.id}
                    className="hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleEditCampaign(campaign)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-2 flex-1">
                          <CardTitle className="flex items-center gap-2 flex-wrap">
                            {campaign.name}
                            <Badge className={statusColor}>{campaign.status}</Badge>
                            {smartSchedulingEnabled && (
                              <Badge variant="outline" className="gap-1">
                                <Sparkles className="w-3 h-3" />
                                Smart
                              </Badge>
                            )}
                          </CardTitle>
                          {campaign.description && (
                            <CardDescription className="line-clamp-2">{campaign.description}</CardDescription>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Template & Frequency */}
                      <div className="flex flex-wrap items-center gap-2">
                        {template && (
                          <Badge variant="outline" className="gap-1">
                            {template.icon} {template.name}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          📊 {frequency}
                        </Badge>
                      </div>

                      {/* Target Channels */}
                      {selectedChannels.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Target Channels</p>
                          <div className="flex flex-wrap gap-1">
                            {selectedChannels.map((channelKey) => {
                              const channelInfo = CHANNEL_INFO[channelKey];
                              return channelInfo ? (
                                <Badge key={channelKey} variant="secondary" className="text-xs">
                                  {channelInfo.name}
                                </Badge>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}

                      {/* Best Posting Times */}
                      {hasBestTimes && (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground">Best Times</p>
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(bestTimes).slice(0, 3).map(([channel, times]) => {
                              const channelInfo = CHANNEL_INFO[channel];
                              const timeArray = times as string[];
                              return channelInfo && timeArray?.length > 0 ? (
                                <Badge key={channel} variant="outline" className="text-xs">
                                  {channelInfo.name}: {timeArray.slice(0, 2).join(", ")}
                                </Badge>
                              ) : null;
                            })}
                            {Object.keys(bestTimes).length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{Object.keys(bestTimes).length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Date Range */}
                      {(campaign.start_date || campaign.end_date) && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">
                            {campaign.start_date && new Date(campaign.start_date).toLocaleDateString()}
                            {campaign.start_date && campaign.end_date && " → "}
                            {campaign.end_date && new Date(campaign.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {/* Post Stats */}
                      <div className="flex gap-4 text-sm pt-2 border-t">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{stats.total}</span>
                          <span className="text-muted-foreground">posts</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium text-green-600">{stats.published}</span>
                          <span className="text-muted-foreground">live</span>
                        </div>
                        {stats.drafts > 0 && (
                          <div className="flex items-center gap-2">
                            <Edit className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{stats.drafts}</span>
                            <span className="text-muted-foreground">drafts</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
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
