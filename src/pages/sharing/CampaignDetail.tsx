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
import { CampaignDialog } from "@/components/sharing/CampaignDialog";
import { ScheduleDialog } from "@/components/sharing/ScheduleDialog";
import { CreatePostDialog } from "@/components/sharing/CreatePostDialog";
import { ArrowLeft, Calendar, TrendingUp, Send, Edit, Rocket, Pause, CheckCircle, Archive, Clock, Plus } from "lucide-react";
import { format } from "date-fns";
import { SCREEN_IDS, withScreenId } from "@/lib/screen-id";
import { toast } from "sonner";
import { notifySuccess, t } from '@/lib/i18n-toast';

function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { campaigns, isLoading, activateCampaign, pauseCampaign, completeCampaign, updateCampaign } = useCampaigns();
  const { posts, updatePost, blastNow } = useDistributionPosts();
  const { activateAllPosts } = useCampaignActions();
  const [showActivateDialog, setShowActivateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showCreatePostDialog, setShowCreatePostDialog] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  const campaign = campaigns?.find(c => c.id === id);
  const campaignPosts = posts?.filter(p => p.campaign_id === id) || [];
  const draftPosts = campaignPosts.filter(p => p.status === 'draft');

  // Check if campaign can be activated (has name and at least one channel selected)
  const targetChannels = campaign?.target_channels as Record<string, boolean> | null;
  const hasSelectedChannels = targetChannels && Object.values(targetChannels).some(v => v);
  const canActivateCampaign = campaign?.name && hasSelectedChannels;

  const handleActivateCampaign = async (mode: "instant" | "scheduled", scheduledFor?: Date) => {
    if (!id) return;

    if (mode === "instant") {
      // Only activate posts if there are draft posts
      if (draftPosts.length > 0) {
        await activateAllPosts.mutateAsync(id);
      }
      await activateCampaign.mutateAsync(id);
      setShowActivateDialog(false);
    } else if (mode === "scheduled" && scheduledFor) {
      // Schedule the campaign for later
      await updateCampaign.mutateAsync({
        id,
        status: "scheduled",
        start_date: scheduledFor.toISOString(),
      });
      toast.success(`Campaign scheduled for ${format(scheduledFor, "PPP 'at' p")}`);
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
    notifySuccess('toasts.sharing.postScheduledSuccessfully');
  };

  const handlePublishNow = async (postId: string) => {
    await blastNow.mutateAsync(postId);
    notifySuccess('toasts.sharing.postPublished');
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
        <div className="p-6 text-center">{t('screens.sharing.loadingCampaign')}</div>
      </AppLayout>
    );
  }

  if (!campaign) {
    return (
      <AppLayout>
        <div className="p-6 text-center">
          <h2 className="text-xl font-semibold mb-2">{t('screens.sharing.campaignNotFound')}</h2>
          <Button onClick={() => navigate('/sharing/campaigns')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('screens.sharing.backCampaigns')}
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
                {t('screens.sharing.backCampaigns')}
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
                  disabled={!canActivateCampaign}
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  {t('screens.sharing.activateCampaign')}
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
                    {t('screens.sharing.pause')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCompleteCampaign}
                    disabled={completeCampaign.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {t('screens.sharing.complete')}
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
                  {t('screens.sharing.resume')}
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowEditDialog(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                {t('screens.sharing.edit')}
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('screens.sharing.totalPosts')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{campaignPosts.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('screens.sharing.published')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {campaignPosts.filter(p => p.status === 'published').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('screens.sharing.scheduled')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {campaignPosts.filter(p => p.status === 'scheduled').length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">{t('screens.sharing.drafts')}</CardTitle>
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
                <CardTitle>{t('screens.sharing.campaignPosts')}</CardTitle>
                <Button onClick={() => setShowCreatePostDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('screens.sharing.createPost')}
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
                              {t('screens.sharing.schedule')}
                            </Button>
                            <Button 
                              size="sm"
                              onClick={() => handlePublishNow(post.id)}
                            >
                              <Rocket className="w-4 h-4 mr-2" />
                              {t('screens.sharing.publishNow')}
                            </Button>
                          </>
                        )}
                        {post.status !== 'draft' && (
                          <Button variant="outline" size="sm">{t('screens.sharing.view')}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Send className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">{t('screens.sharing.noPostsYet')}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {t('screens.sharing.createPostsAssignThemThisCampaign')}
                  </p>
                  <Button onClick={() => setShowCreatePostDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t('screens.sharing.createFirstPost')}
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
        targetChannels={campaign?.target_channels as Record<string, boolean> | null}
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

      <CampaignDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        editingCampaign={campaign}
      />

      <CreatePostDialog
        open={showCreatePostDialog}
        onOpenChange={setShowCreatePostDialog}
        campaignId={campaign?.id || ''}
        campaignName={campaign?.name || ''}
        campaignTargetChannels={campaign?.target_channels as Record<string, boolean> | null}
        onPostCreated={() => {
          // Posts list will auto-refresh via useDistributionPosts
        }}
      />
    </>
  );
}

export default withScreenId(CampaignDetail, SCREEN_IDS.SHARING_CAMPAIGN_DETAIL);
