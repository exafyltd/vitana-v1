import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCampaigns } from "@/hooks/useCampaigns";
import { useDistributionPosts } from "@/hooks/useDistributionPosts";
import { useCampaignActions } from "@/hooks/useCampaignActions";
import { ActivateCampaignDialog } from "@/components/sharing/ActivateCampaignDialog";
import { ScheduleDialog } from "@/components/sharing/ScheduleDialog";
import { ArrowLeft, Calendar, TrendingUp, Send, Edit, Rocket, Pause, CheckCircle, Archive, Clock } from "lucide-react";
import { format } from "date-fns";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { toast } from "sonner";

function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { campaigns, isLoading, activateCampaign, pauseCampaign, completeCampaign } = useCampaigns();
  const { posts, updatePost, blastNow } = useDistributionPosts();
  const { activateAllPosts } = useCampaignActions();
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const campaign = campaigns?.find(c => c.id === id);
  const campaignPosts = posts?.filter(p => p.campaign_id === id) || [];
  const draftPosts = campaignPosts.filter(p => p.status === 'draft');

  const handleActivateCampaign = async (mode: "instant" | "scheduled") => {
    if (!id) return;

    if (mode === "instant") {
      await activateAllPosts.mutateAsync(id);
      await activateCampaign.mutateAsync(id);
      setShowActivateDialog(false);
    }
  };

  const handlePauseCampaign = async () => {
    if (!id) return;
    await pauseCampaign.mutateAsync(id);
  };

  const handleCompleteCampaign = async () => {
    if (!id) return;
    await completeCampaign.mutateAsync(id);
  };

  const handleSchedulePost = (postId: string) => {
    setSelectedPostId(postId);
    setShowScheduleDialog(true);
  };

  const handleConfirmSchedule = async (scheduledTime: Date) => {
    if (!selectedPostId) return;
    
    await updatePost.mutateAsync({
      id: selectedPostId,
      updates: {
        status: 'scheduled',
        scheduled_for: scheduledTime.toISOString(),
      },
    });
    
    setShowScheduleDialog(false);
    setSelectedPostId(null);
    toast.success("Post scheduled successfully");
  };

  const handlePublishNow = async (postId: string) => {
    await blastNow.mutateAsync(postId);
    toast.success("Post published!");
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'paused':
        return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'published':
        return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'scheduled':
        return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case 'draft':
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
      default:
        return 'bg-gray-500/10 text-gray-600 border-gray-500/20';
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-6 text-center">Loading campaign...</div>
      </AppLayout>
    );
  }

  if (!campaign) {
    return (
      <AppLayout>
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">Campaign not found</h2>
          <Button onClick={() => navigate('/sharing/campaigns')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <>
      <SEO 
        title={`${campaign.name} | Campaign`}
        description={campaign.description || 'Campaign details'}
      />
      <AppLayout>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/sharing/campaigns')}
                className="mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Campaigns
              </Button>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{campaign.name}</h1>
                <Badge className={getStatusColor(campaign.status)}>
                  {campaign.status}
                </Badge>
              </div>
              {campaign.description && (
                <p className="text-muted-foreground">{campaign.description}</p>
              )}
              {(campaign.start_date || campaign.end_date) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {campaign.start_date && format(new Date(campaign.start_date), 'MMM d, yyyy')}
                    {campaign.start_date && campaign.end_date && ' - '}
                    {campaign.end_date && format(new Date(campaign.end_date), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {campaign.status === 'draft' && (
                <Button 
                  size="sm"
                  onClick={() => setShowActivateDialog(true)}
                  disabled={draftPosts.length === 0}
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Activate Campaign
                </Button>
              )}
              {campaign.status === 'active' && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handlePauseCampaign}
                    disabled={pauseCampaign.isPending}
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCompleteCampaign}
                    disabled={completeCampaign.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete
                  </Button>
                </>
              )}
              {campaign.status === 'paused' && (
                <Button 
                  size="sm"
                  onClick={() => activateCampaign.mutate(id!)}
                  disabled={activateCampaign.isPending}
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              )}
              <Button variant="outline" size="sm">
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Posts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{campaignPosts.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Published</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {campaignPosts.filter(p => p.status === 'published').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {campaignPosts.filter(p => p.status === 'scheduled').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Drafts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-600">
                  {campaignPosts.filter(p => p.status === 'draft').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Posts List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Campaign Posts</CardTitle>
                <Button onClick={() => navigate('/sharing/distribution')}>
                  <Send className="w-4 h-4 mr-2" />
                  Create Post
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {campaignPosts.length > 0 ? (
                <div className="space-y-3">
                  {campaignPosts.map((post) => (
                    <div
                      key={post.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors"
                    >
                      <div className="flex-1">
                        <h3 className="font-semibold">{post.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {post.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className={getStatusColor(post.status)}>
                            {post.status}
                          </Badge>
                          {post.published_at && (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(post.published_at), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {post.status === 'draft' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleSchedulePost(post.id)}
                            >
                              <Clock className="w-4 h-4 mr-2" />
                              Schedule
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handlePublishNow(post.id)}
                            >
                              <Rocket className="w-4 h-4 mr-2" />
                              Publish Now
                            </Button>
                          </>
                        )}
                        {post.status !== 'draft' && (
                          <Button variant="outline" size="sm">
                            View
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Send className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create posts and assign them to this campaign
                  </p>
                  <Button onClick={() => navigate('/sharing/distribution')}>
                    <Send className="w-4 h-4 mr-2" />
                    Create First Post
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AppLayout>

      <ActivateCampaignDialog
        open={showActivateDialog}
        onOpenChange={setShowActivateDialog}
        onConfirm={handleActivateCampaign}
        isLoading={activateAllPosts.isPending || activateCampaign.isPending}
        postsCount={campaignPosts.length}
        draftCount={draftPosts.length}
        campaignId={campaign?.id || ''}
        campaignData={{
          channels: (campaign?.target_channels as string[]) || [],
          audienceData: (campaign?.distribution_config as any)?.audienceData,
          messageContent: (campaign?.distribution_config as any)?.messageContent,
        }}
      />

      <ScheduleDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        onConfirm={handleConfirmSchedule}
        isLoading={updatePost.isPending}
      />
    </>
  );
}

export default withScreenId(CampaignDetail, SCREEN_IDS.SHARING_CAMPAIGN_DETAIL);
