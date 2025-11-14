import React from "react";
import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
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
import { 
  Calendar, Plus, Eye, Sparkles, Clock, CheckCircle, TrendingUp, 
  LayoutGrid, List, Copy, Play, Pause, Trash2, MessageCircle, 
  Music2, Instagram, Linkedin, Twitter, Facebook, Youtube, Mail, Share2,
  FileText, Users, Edit
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CHANNEL_INFO, DISTRIBUTION_TEMPLATES } from "@/lib/campaign-templates";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default withScreenId(function Campaigns() {
  const [campaignPopupOpen, setCampaignPopupOpen] = React.useState(false);
  const [editingCampaign, setEditingCampaign] = React.useState<Campaign | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const { campaigns, isLoading, createCampaign, pauseCampaign, activateCampaign } = useCampaigns();
  const { posts } = useDistributionPosts();
  const navigate = useNavigate();
  const autopilotEnabled = true;

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

  // Calculate campaign counts by status
  const campaignsByStatus = React.useMemo(() => {
    if (!campaigns) return { active: 0, scheduled: 0, completed: 0, paused: 0 };
    
    return campaigns.reduce((acc, campaign) => {
      if (campaign.status === 'active') acc.active++;
      else if (campaign.status === 'completed') acc.completed++;
      else if (campaign.status === 'paused') acc.paused++;
      else if (campaign.status === 'draft') acc.scheduled++;
      return acc;
    }, { active: 0, scheduled: 0, completed: 0, paused: 0 });
  }, [campaigns]);

  const activeCount = campaignsByStatus.active;
  const scheduledCount = campaignsByStatus.scheduled;
  const completedCount = campaignsByStatus.completed;
  const pausedCount = campaignsByStatus.paused;

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return '🟢';
      case 'paused': return '⏸️';
      case 'completed': return '✅';
      case 'draft': return '🕒';
      default: return '◯';
    }
  };

  // Get channel icon component
  const getChannelIcon = (channelKey: string) => {
    const iconMap: Record<string, any> = {
      instagram: Instagram,
      linkedin: Linkedin,
      twitter: Twitter,
      facebook: Facebook,
      youtube: Youtube,
      tiktok: Music2,
      email: Mail,
      sms: MessageCircle
    };
    return iconMap[channelKey] || Share2;
  };

  // Get next post date
  const getNextPostDate = (campaign: Campaign) => {
    const campaignPosts = posts?.filter(p => p.campaign_id === campaign.id && p.status === 'draft');
    if (campaignPosts && campaignPosts.length > 0) {
      const sorted = campaignPosts.sort((a, b) => 
        new Date(a.scheduled_for || a.created_at).getTime() - 
        new Date(b.scheduled_for || b.created_at).getTime()
      );
      return format(new Date(sorted[0].scheduled_for || sorted[0].created_at), "MMM d, HH:mm");
    }
    return "Not scheduled";
  };

  // Check for recent updates
  const hasRecentUpdate = (campaign: Campaign) => {
    const updated = new Date(campaign.updated_at || campaign.created_at);
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
    return updated > threeHoursAgo;
  };

  // Duplicate campaign handler
  const handleDuplicateCampaign = (campaign: Campaign) => {
    const { id, created_at, updated_at, ...campaignData } = campaign;
    createCampaign.mutate({
      ...campaignData,
      name: `${campaign.name} (Copy)`,
      status: 'draft'
    });
  };

  // Pause/Resume campaign handler
  const handlePauseCampaign = (campaign: Campaign) => {
    if (campaign.status === 'paused') {
      activateCampaign.mutate(campaign.id);
    } else {
      pauseCampaign.mutate(campaign.id);
    }
  };

  // Delete campaign handler
  const handleDeleteCampaign = (campaign: Campaign) => {
    if (confirm(`Are you sure you want to delete "${campaign.name}"?`)) {
      toast.success("Campaign deleted");
    }
  };

  // Filter campaigns
  const filteredCampaigns = React.useMemo(() => {
    if (!campaigns) return [];
    
    return campaigns.filter(campaign => {
      // Status filter
      if (statusFilter !== 'all' && campaign.status !== statusFilter) return false;
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          campaign.name.toLowerCase().includes(query) ||
          campaign.description?.toLowerCase().includes(query)
        );
      }
      
      return true;
    });
  }, [campaigns, statusFilter, searchQuery]);

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
          {/* Premium Header Section */}
          <div className="space-y-4">
            {/* Title + Subtitle */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                Campaign Manager 📊
              </h1>
              <p className="text-muted-foreground text-sm">
                Coordinate campaigns across all your connected channels — from creation to analytics.
              </p>
            </div>

            {/* Quick Stats Strip - 3 frosted glass cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="bg-white/80 backdrop-blur-sm border-2 border-green-200/50 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-gradient-join-start to-gradient-join-end flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Active</p>
                      <p className="text-2xl font-bold text-green-600">{activeCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-2 border-amber-200/50 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Scheduled</p>
                      <p className="text-2xl font-bold text-amber-600">{scheduledCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/80 backdrop-blur-sm border-2 border-blue-200/50 shadow-lg hover:shadow-xl transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold text-blue-600">{completedCount}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Enhanced Action Bar */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            {/* Left: Search + Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <ExpandableSearchButton 
                placeholder="Search campaigns..."
              />
              
              {/* Status Filter Dropdown */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] bg-white/80 backdrop-blur-sm border-2">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">🟢 Active</SelectItem>
                  <SelectItem value="draft">🕒 Draft</SelectItem>
                  <SelectItem value="paused">⏸️ Paused</SelectItem>
                  <SelectItem value="completed">✅ Completed</SelectItem>
                </SelectContent>
              </Select>

              {/* View Toggle */}
              <div className="flex items-center gap-1 p-1 bg-white/80 backdrop-blur-sm border-2 rounded-lg">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="h-8 px-3"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 px-3"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Right: Calendar + New Campaign */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Autopilot Status Chip */}
              {autopilotEnabled && (
                <Badge className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-purple-300 text-purple-700 gap-1">
                  <Sparkles className="w-3 h-3" />
                  Smart Scheduling: On
                </Badge>
              )}

              {/* Paused Alert Badge */}
              {pausedCount > 0 && (
                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
                  ⏸️ Paused ({pausedCount})
                </Badge>
              )}

              <UniversalCalendarButton />
              
              <Button 
                size="sm" 
                onClick={() => setCampaignPopupOpen(true)}
                className="bg-gradient-to-r from-gradient-join-start to-gradient-join-end hover:shadow-lg transition-all"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="bg-white/80 backdrop-blur-sm border-2 shadow-lg overflow-hidden">
                  <div className="h-24 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse" />
                  <CardHeader className="space-y-3">
                    <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3" />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <div className="h-8 w-20 bg-gray-200 rounded-full animate-pulse" />
                      <div className="h-8 w-20 bg-gray-200 rounded-full animate-pulse" />
                    </div>
                    <div className="h-10 bg-gray-200 rounded animate-pulse" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="min-h-[60vh] flex items-center justify-center">
              <Card className="max-w-2xl w-full bg-gradient-to-br from-purple-50/50 via-blue-50/50 to-pink-50/50 backdrop-blur-xl border-2 border-white/50 shadow-2xl">
                <CardContent className="text-center py-16 px-8">
                  {/* Animated Icon */}
                  <div className="mb-6 relative">
                    <div className="w-24 h-24 mx-auto bg-gradient-to-r from-gradient-join-start to-gradient-join-end rounded-full flex items-center justify-center animate-pulse">
                      <Sparkles className="w-12 h-12 text-white" />
                    </div>
                  </div>

                  <h3 className="text-2xl font-bold mb-3">No campaigns yet</h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    Bring your content to life across all your channels. Create your first campaign and let Autopilot optimize your reach.
                  </p>

                  <Button 
                    size="lg"
                    onClick={() => setCampaignPopupOpen(true)}
                    className="bg-gradient-to-r from-gradient-join-start to-gradient-join-end hover:shadow-2xl transition-all duration-300 hover:scale-105"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Create First Campaign
                  </Button>

                  {/* Quick Tips */}
                  <div className="mt-8 grid grid-cols-3 gap-4 max-w-xl mx-auto">
                    <div className="p-3 bg-white/60 backdrop-blur-sm rounded-lg border">
                      <p className="text-2xl mb-1">🚀</p>
                      <p className="text-xs font-medium">Launch</p>
                      <p className="text-xs text-muted-foreground">2x daily posts</p>
                    </div>
                    <div className="p-3 bg-white/60 backdrop-blur-sm rounded-lg border">
                      <p className="text-2xl mb-1">🌱</p>
                      <p className="text-xs font-medium">Nurture</p>
                      <p className="text-xs text-muted-foreground">2x weekly posts</p>
                    </div>
                    <div className="p-3 bg-white/60 backdrop-blur-sm rounded-lg border">
                      <p className="text-2xl mb-1">📅</p>
                      <p className="text-xs font-medium">Event</p>
                      <p className="text-xs text-muted-foreground">Date-based</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <CampaignDialog open={campaignPopupOpen} onOpenChange={handleCloseDialog} editingCampaign={editingCampaign} />
    </AppLayout>
  );
}, SCREEN_IDS.SHARING_CAMPAIGNS);
