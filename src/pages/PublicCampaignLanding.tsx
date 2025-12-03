import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Calendar, CalendarDays, Target, TrendingUp, Users, Sparkles } from "lucide-react";
import { format } from "date-fns";
import SEO from "@/components/SEO";
import { useAuth } from "@/context/AuthProvider";

interface PublicCampaignData {
  id: string;
  name: string;
  description: string | null;
  cover_image_url: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  target_channels: any;
  metadata: any;
  created_at: string;
  owner_id: string;
  owner_name: string;
  owner_avatar: string | null;
}

export default function PublicCampaignLanding() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<PublicCampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicCampaign = async () => {
      if (!id) {
        setError("Campaign ID is missing");
        setLoading(false);
        return;
      }

      try {
        // Use RPC function to bypass RLS for public campaign access
        const { data, error: fetchError } = await supabase.rpc("get_public_campaign_details", {
          campaign_id: id,
        });

        if (fetchError) {
          console.error("Error fetching campaign:", fetchError);
          setError("Campaign not found");
          setLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          setError("Campaign not found");
          setLoading(false);
          return;
        }

        setCampaign(data[0] as PublicCampaignData);
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load campaign");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicCampaign();
  }, [id]);

  // Helper to extract external ticket/booking URL from campaign
  const getCampaignTicketUrl = (campaign: PublicCampaignData): string | null => {
    return (
      (campaign as any).ticket_url ||
      (campaign as any).checkout_url ||
      campaign.metadata?.ticket_url ||
      campaign.metadata?.booking_url ||
      campaign.metadata?.external_url ||
      campaign.metadata?.ticketUrl ||
      campaign.metadata?.bookingUrl ||
      campaign.metadata?.externalUrl ||
      null
    );
  };

  // Helper to get tenant-specific login route
  const getTenantLoginRoute = (tenantSlug: string | null): string => {
    const tenantRoutes: Record<string, string> = {
      maxina: '/maxina',
      alkalma: '/alkalma',
      earthlinks: '/earthlinks',
    };
    return tenantSlug && tenantRoutes[tenantSlug] ? tenantRoutes[tenantSlug] : '/auth';
  };

  // Try to detect linked event from campaign metadata
  const linkedEventId = campaign?.metadata?.event_id || campaign?.metadata?.eventId || null;
  const isEventPaid = campaign?.metadata?.is_paid || campaign?.metadata?.isPaid || false;
  const eventPrice = campaign?.metadata?.price || campaign?.metadata?.event_price || null;
  
  // Check for external ticket URL
  const ticketUrl = campaign ? getCampaignTicketUrl(campaign) : null;
  const hasExternalTicket = !!ticketUrl;
  
  // Get tenant from campaign metadata for proper login routing
  const tenantSlug = campaign?.metadata?.tenant_slug || campaign?.metadata?.tenantSlug || null;

  // Determine primary CTA label
  const getPrimaryCTALabel = () => {
    if (linkedEventId) {
      if (isEventPaid && eventPrice) return "Get Ticket";
      return "Reserve Spot";
    }
    return "Join Event";
  };

  const handleEventClick = () => {
    // Priority 1: External ticket/booking URL - open in new tab
    if (ticketUrl) {
      window.open(ticketUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    
    // Priority 2: Linked event - navigate internally
    if (linkedEventId) {
      if (user) {
        navigate(`/comm/events-meetups?event=${linkedEventId}`);
      } else {
        navigate(`/pub/events/${linkedEventId}`);
      }
      return;
    }
    
    // Fallback: Same behavior as Join VITANA
    handleJoinClick();
  };

  const handleJoinClick = () => {
    if (!id) return;

    if (user) {
      // User is logged in, go directly to campaign detail page
      const params = new URLSearchParams(searchParams);
      navigate(`/sharing/campaigns/${id}${params.toString() ? '?' + params.toString() : ''}`);
    } else {
      // User not logged in, redirect to tenant-specific login with return URL
      const returnUrl = `/sharing/campaigns/${id}${searchParams.toString() ? '&' + searchParams.toString() : ''}`;
      const loginRoute = getTenantLoginRoute(tenantSlug);
      navigate(`${loginRoute}?redirectTo=${encodeURIComponent(returnUrl)}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Campaign Not Found</h1>
          <p className="text-muted-foreground">{error || "The campaign you're looking for doesn't exist."}</p>
          <Button onClick={() => navigate("/")}>Go to Home</Button>
        </div>
      </div>
    );
  }

  const publicCampaignUrl = `${window.location.origin}/pub/campaigns/${campaign.id}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  const startDate = campaign.start_date ? format(new Date(campaign.start_date), "MMMM d, yyyy") : "";
  const endDate = campaign.end_date ? format(new Date(campaign.end_date), "MMMM d, yyyy") : "";
  const shortDescription = campaign.description?.slice(0, 160) || `Check out ${campaign.name} on VITANA`;
  
  // Robust fallback chain matching event card pattern
  const heroImage = 
    campaign.cover_image_url ||
    (campaign as any).image_url ||
    campaign.metadata?.image_url ||
    campaign.metadata?.cover_image_url ||
    campaign.metadata?.event_image_url ||
    null;
  
  // Check if campaign is draft (hide status badge for draft on public view)
  const isDraft = campaign.status?.toLowerCase() === 'draft';
  const displayStatus = !isDraft ? campaign.status : null;

  return (
    <>
      <SEO
        title={campaign.name}
        description={shortDescription}
        image={heroImage || undefined}
        url={publicCampaignUrl}
        type="website"
      />
      
      <div className="min-h-screen bg-background flex flex-col">
        {/* Hero Section - Compact banner */}
        {heroImage ? (
          <div className="relative w-full h-36 md:h-[180px] max-h-[200px] overflow-hidden">
            <img
              src={heroImage}
              alt={campaign.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
        ) : (
          <div className="relative w-full h-28 md:h-[140px] overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
        )}

        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="max-w-4xl mx-auto px-4 py-2 md:py-3 -mt-8 md:-mt-10 relative z-10">
            <div className="space-y-1.5 md:space-y-2">
              {/* Campaign Title */}
              <div className="space-y-1.5">
                <h1 className="text-xl md:text-2xl font-bold text-foreground">
                  {campaign.name}
                </h1>
              {displayStatus && (
                <div className="inline-block px-2.5 py-0.5 bg-primary/10 text-primary rounded-full text-xs font-medium capitalize">
                  {displayStatus}
                </div>
              )}
            </div>

              {/* Campaign Details */}
              <div className="grid gap-1.5 md:gap-2 md:grid-cols-2">
              {campaign.start_date && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Campaign Period</p>
                    <p className="text-xs font-medium text-foreground">
                      {startDate} {endDate && `- ${endDate}`}
                    </p>
                  </div>
                </div>
              )}

              {campaign.target_channels && Array.isArray(campaign.target_channels) && (
                <div className="flex items-start gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Channels</p>
                    <p className="text-xs font-medium text-foreground">
                      {campaign.target_channels.length} channel{campaign.target_channels.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Type</p>
                  <p className="text-xs font-medium text-foreground">Marketing Campaign</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-[10px] text-muted-foreground">Community</p>
                  <p className="text-xs font-medium text-foreground">VITANA</p>
                </div>
              </div>
            </div>

              {/* Description */}
              {campaign.description && (
                <div className="max-w-3xl">
                  <p className="text-sm text-foreground/80 leading-snug">{campaign.description}</p>
                </div>
              )}

          {/* Dual CTA Panel */}
          <div className="mt-3 md:mt-4">
            <div className="rounded-2xl border border-white/60 bg-white/70 dark:bg-white/10 dark:border-white/20 backdrop-blur-sm shadow-md px-5 md:px-6 py-3 md:py-4">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 md:gap-6">
                
                {/* Left: Event CTA */}
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    <CalendarDays className="h-3.5 w-3.5 text-primary" />
                    <span>Join this event</span>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleEventClick}
                    className="w-full md:w-auto px-5"
                  >
                    {getPrimaryCTALabel()}
                  </Button>
                </div>
                
                {/* Divider */}
                <div className="hidden md:block w-px h-12 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
                <div className="flex items-center justify-center gap-3 md:hidden">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-200 dark:to-slate-700" />
                  <span className="text-[10px] text-muted-foreground font-medium">or</span>
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-700" />
                </div>
                
                {/* Right: Community CTA */}
                <div className="flex-1 flex flex-col items-start md:items-end gap-1.5">
                  <div className="flex items-start gap-1.5 max-w-[260px] md:max-w-xs text-left md:text-right">
                    <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-[10px] font-medium tracking-wide text-muted-foreground leading-relaxed">
                      Discover more events, wellness programs, and communities.
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleJoinClick}
                    className="w-full md:w-auto border-primary/40 text-primary bg-transparent hover:bg-primary/5 rounded-full px-4"
                  >
                    {user ? "View in VITANA" : "Join in VITANA"}
                  </Button>
                  {!user && (
                    <p className="text-[10px] text-muted-foreground/70 text-left md:text-right max-w-xs">
                      You'll sign in or create an account in the next step.
                    </p>
                  )}
                </div>
                
              </div>
            </div>
          </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border mt-auto">
          <div className="max-w-4xl mx-auto px-4 py-2 text-center">
            <p className="text-[11px] text-muted-foreground">
              Powered by <span className="font-semibold text-foreground">VITANA</span> - Your longevity community
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
