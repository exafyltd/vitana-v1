import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import SubNavigation from "@/components/SubNavigation";
import StandardHeader from "@/components/StandardHeader";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CampaignDialog } from "@/components/sharing/CampaignDialog";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useDistributionPosts } from "@/hooks/useDistributionPosts";
import { sharingNavigation } from "@/config/navigation";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { Plus, Calendar, TrendingUp, Eye, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";

function Campaigns() {
  const [campaignPopupOpen, setCampaignPopupOpen] = useState(false);
  const { campaigns, isLoading } = useCampaigns();
  const { posts } = useDistributionPosts();
  const navigate = useNavigate();

  const getCampaignStats = (campaignId: string) => {
    const campaignPosts = posts?.filter(p => p.campaign_id === campaignId) || [];
    return {
      totalPosts: campaignPosts.length,
      published: campaignPosts.filter(p => p.status === 'published').length,
      draft: campaignPosts.filter(p => p.status === 'draft').length,
    };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'draft':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  return (
    <>
      <SEO 
        title="Campaigns | Sharing"
        description="Manage your marketing campaigns and distribution strategies"
      />
      <AppLayout>
        <SubNavigation
          items={sharingNavigation}
          rightActions={
            <>
              <UniversalCalendarButton />
              <Button
                size="sm"
                onClick={() => setCampaignPopupOpen(true)}
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                New Campaign
              </Button>
            </>
          }
        />
        <div className="p-6 space-y-6">
          <StandardHeader
            title="Campaigns"
            description="Organize and manage your content distribution campaigns"
          />

          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading campaigns...
            </div>
          ) : campaigns && campaigns.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {campaigns.map((campaign) => {
                const stats = getCampaignStats(campaign.id);
                return (
                  <Card 
                    key={campaign.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/sharing/campaigns/${campaign.id}`)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{campaign.name}</CardTitle>
                          <Badge className={getStatusColor(campaign.status)}>
                            {campaign.status}
                          </Badge>
                        </div>
                      </div>
                      {campaign.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {campaign.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* Date Range */}
                        {(campaign.start_date || campaign.end_date) && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {campaign.start_date && format(new Date(campaign.start_date), 'MMM d')}
                              {campaign.start_date && campaign.end_date && ' - '}
                              {campaign.end_date && format(new Date(campaign.end_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        )}

                        {/* Stats */}
                        <div className="flex items-center justify-between pt-3 border-t">
                          <div className="text-center">
                            <div className="text-2xl font-bold">{stats.totalPosts}</div>
                            <div className="text-xs text-muted-foreground">Total Posts</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
                            <div className="text-xs text-muted-foreground">Published</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-gray-600">{stats.draft}</div>
                            <div className="text-xs text-muted-foreground">Drafts</div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-3 border-t">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/sharing/campaigns/${campaign.id}`);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Implement edit
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No campaigns yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first campaign to organize and track your content distribution
                </p>
                <Button onClick={() => setCampaignPopupOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Campaign
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </AppLayout>

      <CampaignDialog 
        open={campaignPopupOpen} 
        onOpenChange={setCampaignPopupOpen} 
      />
    </>
  );
}

export default withScreenId(Campaigns, SCREEN_IDS.SHARING_CAMPAIGNS);
