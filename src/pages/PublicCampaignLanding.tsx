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
      
      <div className="h-screen max-h-screen bg-background flex flex-col overflow-hidden">
        {/* Hero Section - Ultra compact banner */}
        {heroImage ? (
          <div className="relative w-full h-32 md:h-[160px] max-h-[180px] overflow-hidden flex-shrink-0">
            <img
              src={heroImage}
              alt={campaign.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          </div>
        ) : (
          <div className="relative w-full h-24 md:h-[120px] overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-background flex-shrink-0" />
        )}

        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-center min-h-0">
          <div className="max-w-4xl mx-auto px-4 py-1 md:py-2 -mt-12 md:-mt-14 relative z-10">
            <div className="space-y-1 md:space-y-1.5">
              {/* Campaign Title */}
              <div className="space-y-1">
                <h1 className="text-lg md:text-xl font-bold text-foreground leading-tight">
                  {campaign.name}
                </h1>
                {displayStatus && (
                  <div className="inline-block px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-medium capitalize">
                    {displayStatus}
                  </div>
                )}
              </div>

              {/* Campaign Details - Only 2 items */}
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {campaign.start_date && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs text-foreground">
                      {startDate} {endDate && `- ${endDate}`}
                    </p>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-foreground">Marketing Campaign</p>
                </div>
              </div>

              {/* Description - Clamped */}
              {campaign.description && (
                <p className="text-sm text-foreground/80 leading-snug line-clamp-2 md:line-clamp-3 max-w-3xl">
                  {campaign.description}
                </p>
              )}

              {/* Dual CTA Panel - Flattened */}
              <div className="pt-2 md:pt-3">
                <div className="rounded-xl border border-white/60 bg-white/70 dark:bg-white/10 dark:border-white/20 backdrop-blur-sm shadow-sm px-4 md:px-5 py-2 md:py-3">
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 md:gap-4">
                    
                    {/* Left: Event CTA */}
                    <div className="flex items-center gap-3">
                      <CalendarDays className="h-4 w-4 text-primary flex-shrink-0" />
                      <Button
                        size="sm"
                        onClick={handleEventClick}
                        className="px-4"
                      >
                        {getPrimaryCTALabel()}
                      </Button>
                    </div>
                    
                    {/* Divider */}
                    <div className="hidden md:block w-px h-8 bg-border/50" />
                    <div className="flex items-center gap-2 md:hidden">
                      <div className="flex-1 h-px bg-border/30" />
                      <span className="text-[10px] text-muted-foreground">or</span>
                      <div className="flex-1 h-px bg-border/30" />
                    </div>
                    
                    {/* Right: Community CTA */}
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleJoinClick}
                        className="border-primary/40 text-primary bg-transparent hover:bg-primary/5 rounded-full px-4"
                      >
                        {user ? "View in VITANA" : "Join in VITANA"}
                      </Button>
                    </div>
                    
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border flex-shrink-0">
          <div className="max-w-4xl mx-auto px-4 py-1.5 text-center">
            <p className="text-[10px] text-muted-foreground">
              Powered by <span className="font-semibold text-foreground">VITANA</span> - Your longevity community
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
