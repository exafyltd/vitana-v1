import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, Megaphone, Edit, Eye, BarChart3, Ticket } from "lucide-react";
import { useState } from "react";
import { CampaignDialog } from "@/components/sharing/CampaignDialog";
import { StandardHorizontalCard } from "@/components/ui/standard-horizontal-card";
import { useNavigate } from "react-router-dom";
import { t } from '@/lib/i18n-toast';

interface ResellerCampaignsTabProps {
  searchQuery: string;
}

interface LinkedEvent {
  id: string;
  title: string;
  image_url: string | null;
}

type BadgeVariant = 'default' | 'secondary' | 'outline' | 'destructive';

const getStatusVariant = (status: string): BadgeVariant => {
  switch (status) {
    case 'active': return 'default';
    case 'scheduled': return 'outline';
    case 'draft': return 'secondary';
    case 'completed': return 'secondary';
    default: return 'secondary';
  }
};

const formatDateRange = (start?: string | null, end?: string | null): string => {
  if (start && end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const sameYear = startDate.getFullYear() === endDate.getFullYear();
    if (sameYear) {
      return `${format(startDate, "MMM d")} – ${format(endDate, "MMM d, yyyy")}`;
    }
    return `${format(startDate, "MMM d, yyyy")} – ${format(endDate, "MMM d, yyyy")}`;
  }
  if (start) {
    return `Starts ${format(new Date(start), "MMM d, yyyy")}`;
  }
  return "No date set";
};

export function ResellerCampaignsTab({ searchQuery }: ResellerCampaignsTabProps) {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<typeof campaigns[0] | null>(null);

  // Fetch campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["reseller-campaigns", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!session?.user?.id,
  });

  // Extract event IDs from campaigns metadata
  const eventIds = campaigns
    .filter(c => c.metadata && typeof c.metadata === 'object' && 'event_id' in c.metadata)
    .map(c => (c.metadata as { event_id?: string }).event_id)
    .filter((id): id is string => !!id);

  // Fetch linked events
  const { data: linkedEvents = [] } = useQuery({
    queryKey: ["campaign-linked-events", eventIds],
    queryFn: async () => {
      if (eventIds.length === 0) return [];
      const { data, error } = await supabase
        .from("global_community_events")
        .select("id, title, image_url")
        .in("id", eventIds);
      if (error) throw error;
      return (data || []) as LinkedEvent[];
    },
    enabled: eventIds.length > 0,
  });

  // Create lookup map for linked events
  const linkedEventMap = new Map(linkedEvents.map(e => [e.id, e]));

  const filteredCampaigns = campaigns.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditCampaign = (campaign: typeof campaigns[0]) => {
    setEditingCampaign(campaign);
  };

  const handleViewCampaign = (campaignId: string) => {
    navigate(`/pub/campaigns/${campaignId}`);
  };

  const handleViewAnalytics = (campaignId: string) => {
    // TODO: Implement campaign analytics view
    console.log("View analytics for campaign:", campaignId);
  };

  if (campaignsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filteredCampaigns.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
          <Megaphone className="h-6 w-6 text-accent" />
        </div>
        <div>
          <p className="font-medium text-foreground">{t('screens.reseller.noCampaignsYet')}</p>
          <p className="text-sm text-muted-foreground">
            Create a campaign to promote events and boost your ticket sales.
          </p>
        </div>
        <Button onClick={() => setShowCreateCampaign(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>

        <CampaignDialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateCampaign(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      <div className="space-y-3">
        {filteredCampaigns.map((campaign) => {
          const metadata = campaign.metadata as { event_id?: string } | null;
          const eventId = metadata?.event_id;
          const linkedEvent = eventId ? linkedEventMap.get(eventId) : null;
          const isDraft = campaign.status === 'draft';

          // Build description with date range and linked event
          let description = formatDateRange(campaign.start_date, campaign.end_date);
          if (linkedEvent) {
            description += ` • 🎟 Promoting: ${linkedEvent.title}`;
          }

          return (
            <StandardHorizontalCard
              key={campaign.id}
              id={campaign.id}
              screenId="MY_BUSINESS_RESELLER_CAMPAIGNS"
              icon={
                campaign.cover_image_url || linkedEvent?.image_url ? (
                  <img 
                    src={campaign.cover_image_url || linkedEvent?.image_url || ''} 
                    alt={campaign.name} 
                    className="w-10 h-10 rounded-lg object-cover" 
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <Megaphone className="h-5 w-5 text-accent" />
                  </div>
                )
              }
              title={campaign.name}
              description={description}
              badges={[
                { 
                  label: campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1),
                  variant: getStatusVariant(campaign.status),
                }
              ]}
              metadata={linkedEvent ? [
                { 
                  icon: <Ticket className="h-3.5 w-3.5" />, 
                  text: "Event campaign",
                }
              ] : undefined}
              primaryAction={{
                label: isDraft ? 'Edit Campaign' : 'View Campaign',
                onClick: () => isDraft ? handleEditCampaign(campaign) : handleViewCampaign(campaign.id),
                variant: 'ghost' as const,
                icon: isDraft ? <Edit className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />,
              }}
              secondaryActions={[
                {
                  label: 'View Analytics',
                  onClick: () => handleViewAnalytics(campaign.id),
                  icon: <BarChart3 className="h-3.5 w-3.5" />,
                },
                ...(isDraft ? [] : [{
                  label: 'Edit Campaign',
                  onClick: () => handleEditCampaign(campaign),
                  icon: <Edit className="h-3.5 w-3.5" />,
                }])
              ]}
              onClick={() => isDraft ? handleEditCampaign(campaign) : handleViewCampaign(campaign.id)}
              layoutMode="stack"
              density="compact"
            />
          );
        })}
      </div>

      <CampaignDialog open={showCreateCampaign} onOpenChange={setShowCreateCampaign} />
      
      {editingCampaign && (
        <CampaignDialog 
          open={!!editingCampaign} 
          onOpenChange={(open) => !open && setEditingCampaign(null)}
          editingCampaign={editingCampaign}
        />
      )}
    </div>
  );
}
