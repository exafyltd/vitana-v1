import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, CalendarDays, Target, TrendingUp, Users, Sparkles, Ticket, Eye, UserPlus } from "lucide-react";
import { format } from "date-fns";
import SEO from "@/components/SEO";
import { useAuth } from "@/context/AuthProvider";
import { EventTicketSelector } from "@/components/tickets/EventTicketSelector";
import { getLocalizedPublicLandingCta, formatTicketPrice } from "@/lib/eventsCtaUtils";
import { useTranslation } from "@/hooks/useTranslation";

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

interface LinkedEventTicketInfo {
  has_tickets: boolean;
  lowest_ticket_price: number | null;
  is_paid_event: boolean;
  event_title: string;
}

export default function PublicCampaignLanding() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { translate } = useTranslation();
  const [campaign, setCampaign] = useState<PublicCampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTicketDialog, setShowTicketDialog] = useState(false);
  const [linkedEventTickets, setLinkedEventTickets] = useState<LinkedEventTicketInfo | null>(null);
  const [userHasTicket, setUserHasTicket] = useState(false);

  // Extract UTM params from URL for reseller attribution
  const utmParams = {
    utm_source: searchParams.get('utm_source') || undefined,
    utm_medium: searchParams.get('utm_medium') || undefined,
    utm_campaign: searchParams.get('utm_campaign') || undefined,
  };

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

        const campaignData = data[0] as PublicCampaignData;
        setCampaign(campaignData);

        // Fetch linked event ticket info if campaign has event_id
        const linkedEventId = campaignData.metadata?.event_id || campaignData.metadata?.eventId;
        if (linkedEventId) {
          const { data: eventData } = await supabase.rpc("get_public_event_details", {
            event_id: linkedEventId,
          });
          
          if (eventData && eventData.length > 0) {
            const event = eventData[0];
            setLinkedEventTickets({
              has_tickets: event.has_tickets || false,
              lowest_ticket_price: event.lowest_ticket_price ?? null,
              is_paid_event: event.is_paid_event || false,
              event_title: event.title || campaignData.name,
            });
          }
        }
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load campaign");
      } finally {
        setLoading(false);
      }
    };

    fetchPublicCampaign();
  }, [id]);

  // Check if user has a ticket for linked event
  useEffect(() => {
    const checkUserTicket = async () => {
      const linkedEventId = campaign?.metadata?.event_id || campaign?.metadata?.eventId;
      if (!user || !linkedEventId) {
        setUserHasTicket(false);
        return;
      }
      
      const { data } = await supabase
        .from("event_ticket_purchases")
        .select("id")
        .eq("event_id", linkedEventId)
        .eq("buyer_id", user.id)
        .eq("status", "completed")
        .limit(1);
      
      setUserHasTicket(!!data && data.length > 0);
    };
    
    checkUserTicket();
  }, [user, campaign?.metadata]);

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
    return tenantSlug && tenantRoutes[tenantSlug] ? tenantRoutes[tenantSlug] : '/maxina';
  };

  // Try to detect linked event from campaign metadata
  const linkedEventId = campaign?.metadata?.event_id || campaign?.metadata?.eventId || null;
  const isEventPaid = linkedEventTickets?.is_paid_event || campaign?.metadata?.is_paid || campaign?.metadata?.isPaid || false;
  const eventPrice = linkedEventTickets?.lowest_ticket_price ?? campaign?.metadata?.price ?? campaign?.metadata?.event_price ?? null;
  const hasTickets = linkedEventTickets?.has_tickets || false;
  
  // Check for external ticket URL
  const ticketUrl = campaign ? getCampaignTicketUrl(campaign) : null;
  const hasExternalTicket = !!ticketUrl;
  
  // Get tenant from campaign metadata for proper login routing
  const tenantSlug = campaign?.metadata?.tenant_slug || campaign?.metadata?.tenantSlug || localStorage.getItem('tenant_slug') || null;

  // Use unified localized CTA logic
  const ctaConfig = getLocalizedPublicLandingCta({
    hasTickets,
    isPaid: isEventPaid,
    isSoldOut: false, // TODO: Fetch from event data
    lowestPrice: eventPrice,
    currency: campaign?.metadata?.display_currency || 'USD',
    isAuthenticated: !!user,
    userHasTicket,
  }, translate);

  // Determine CTA icon
  const getPrimaryCTAIcon = () => {
    switch (ctaConfig.icon) {
      case 'ticket': return <Ticket className="h-4 w-4 mr-2" />;
      case 'eye': return <Eye className="h-4 w-4 mr-2" />;
      case 'user-plus': return <UserPlus className="h-4 w-4 mr-2" />;
      default: return <CalendarDays className="h-4 w-4 mr-2" />;
    }
  };

  const handleEventClick = () => {
    // Priority 1: External ticket/booking URL - open in new tab
    if (ticketUrl) {
      window.open(ticketUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    
    // Priority 2: Linked event with tickets - show ticket dialog (supports guest checkout)
    if (linkedEventId && hasTickets && !user) {
      setShowTicketDialog(true);
      return;
    }
    
    // Priority 3: Linked event - navigate internally
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
          <div className="relative w-full h-[300px] md:h-[380px] overflow-hidden">
            <img
              src={heroImage}
              alt={campaign.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background from-30% via-background/80 via-60% to-transparent" />
          </div>
        ) : (
          <div className="relative w-full h-[200px] md:h-[260px] overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
        )}

        {/* Content Section */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="max-w-4xl mx-auto px-4 py-2 md:py-3 -mt-36 md:-mt-48 relative z-10">
            <div className="space-y-1.5 md:space-y-2">
              {/* Campaign Title */}
              <div className="space-y-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                  {campaign.name}
                </h1>
                <div className="flex items-center gap-2 flex-wrap">
                  {displayStatus && (
                    <div className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium capitalize">
                      {displayStatus}
                    </div>
                  )}
                  {hasTickets && eventPrice !== null && (
                    <div className="inline-flex items-center gap-1 px-3 py-1 bg-accent/10 text-accent-foreground rounded-full text-sm font-medium">
                      <Ticket className="h-3.5 w-3.5" />
                      {eventPrice === 0 ? "Free" : `From ${formatTicketPrice(eventPrice, campaign?.metadata?.display_currency || 'USD')}`}
                    </div>
                  )}
                </div>
              </div>

              {/* Campaign Details */}
              <div className="grid gap-2 md:gap-3 md:grid-cols-2">
                {campaign.start_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Campaign Period</p>
                      <p className="text-sm font-medium text-foreground">
                        {startDate} {endDate && `- ${endDate}`}
                      </p>
                    </div>
                  </div>
                )}

                {campaign.target_channels && Array.isArray(campaign.target_channels) && (
                  <div className="flex items-start gap-3">
                    <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">Channels</p>
                      <p className="text-sm font-medium text-foreground">
                        {campaign.target_channels.length} channel{campaign.target_channels.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="text-sm font-medium text-foreground">Marketing Campaign</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Community</p>
                    <p className="text-sm font-medium text-foreground">VITANA</p>
                  </div>
                </div>
              </div>

              {/* Description */}
              {campaign.description && (
                <div className="max-w-3xl">
                  <p className="text-base text-foreground/80 leading-normal">{campaign.description}</p>
                </div>
              )}

              {/* Dual CTA Panel */}
              <div className="mt-3 md:mt-4">
                <div className="rounded-2xl border border-white/60 bg-white/70 dark:bg-white/10 dark:border-white/20 backdrop-blur-sm shadow-md px-6 md:px-8 py-5">
                  <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 md:gap-8">
                    
                    {/* Left: Event CTA */}
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        {hasTickets ? (
                          <Ticket className="h-4 w-4 text-primary" />
                        ) : (
                          <CalendarDays className="h-4 w-4 text-primary" />
                        )}
                        <span>{hasTickets ? translate('eventCta.getYourTicket', 'Get your ticket') : translate('eventCta.joinThisEvent', 'Join this event')}</span>
                      </div>
                      <Button
                        size="default"
                        onClick={handleEventClick}
                        disabled={ctaConfig.disabled}
                        className={`w-full md:w-auto px-6 ${
                          ctaConfig.variant === 'ticket' 
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700' 
                            : ctaConfig.variant === 'view-ticket'
                            ? 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700'
                            : ctaConfig.variant === 'disabled'
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : ''
                        }`}
                      >
                        {getPrimaryCTAIcon()}
                        {ctaConfig.label}
                      </Button>
                    </div>
                    
                    {/* Divider */}
                    <div className="hidden md:block w-px h-14 bg-gradient-to-b from-transparent via-slate-300 dark:via-slate-600 to-transparent" />
                    <div className="flex items-center justify-center gap-3 md:hidden">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-200 dark:to-slate-700" />
                      <span className="text-xs text-muted-foreground font-medium">or</span>
                      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-700" />
                    </div>
                    
                    {/* Right: Community CTA */}
                    <div className="flex-1 flex flex-col items-start md:items-end gap-2">
                      <div className="flex items-start gap-1.5 max-w-[280px] md:max-w-xs text-left md:text-right">
                        <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-xs font-medium tracking-wide text-muted-foreground leading-relaxed">
                          Discover more events and longevity communities.
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="default"
                        onClick={() => {
                          if (user) {
                            navigate('/comm/events-meetups');
                          } else {
                            const returnUrl = '/comm/events-meetups';
                            const loginRoute = getTenantLoginRoute(tenantSlug);
                            navigate(`${loginRoute}?redirectTo=${encodeURIComponent(returnUrl)}`);
                          }
                        }}
                        className="w-full md:w-auto border-primary/40 text-primary bg-transparent hover:bg-primary/5 rounded-full px-5"
                      >
                        {user ? "Explore VITANA" : "Join in VITANA"}
                      </Button>
                      {!user && (
                        <p className="text-[11px] text-muted-foreground/70 text-left md:text-right max-w-xs">
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
          <div className="max-w-4xl mx-auto px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">
              Powered by <span className="font-semibold text-foreground">VITANA</span> - Your longevity community
            </p>
          </div>
        </div>
      </div>

      {/* Ticket Purchase Dialog */}
      {linkedEventId && (
        <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />
                Get Tickets for {linkedEventTickets?.event_title || campaign.name}
              </DialogTitle>
            </DialogHeader>
            <EventTicketSelector 
              eventId={linkedEventId} 
              eventTitle={linkedEventTickets?.event_title || campaign.name}
              forceGuestMode={!user}
              utmParams={utmParams}
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
