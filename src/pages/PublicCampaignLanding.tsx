import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, CalendarDays, Target, TrendingUp, Users, Sparkles, Ticket, Eye, UserPlus } from "lucide-react";
import SEO from "@/components/SEO";
import { useAuth } from "@/context/AuthProvider";
import { EventTicketSelector } from "@/components/tickets/EventTicketSelector";
import { getLocalizedPublicLandingCta, formatTicketPrice } from "@/lib/eventsCtaUtils";
import { useTranslation } from "@/hooks/useTranslation";
import { t } from '@/lib/i18n-toast';
import { ArchetypeSkeleton, ScreenFrame } from '@/components/layout/spotlight';
import { VCard } from '@/components/ui/vcard';
import { useSpotlightEnabled } from '@/hooks/useSpotlightEnabled';

import { formatDate } from '@/lib/locale-format';
import { canonicalTenantSlug, readStoredTenantSlug } from '@/lib/retired-tenants';
import { currentRegistrySync, tenantLoginRoute } from '@/lib/tenant-registry';
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
  is_sold_out: boolean;
}

export default function PublicCampaignLanding() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const spotlight = useSpotlightEnabled();
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
          const { data: eventData, error: eventError } = await supabase.rpc("get_public_event_details", {
            event_id: linkedEventId,
          });

          if (eventError) {
            console.error("Error fetching linked event ticket info:", eventError);
          }

          if (eventData && eventData.length > 0) {
            const event = eventData[0];
            setLinkedEventTickets({
              has_tickets: event.has_tickets || false,
              lowest_ticket_price: event.lowest_ticket_price ?? null,
              is_paid_event: event.is_paid_event || false,
              event_title: event.title || campaignData.name,
              is_sold_out: event.is_sold_out || false,
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

  // Helper to get tenant-specific login route.
  // VTID-04836: a record still tagged with a retired tenant (earthlinks) goes to its successor.
  // VTID-05151: any registry tenant has its own portal; anything else keeps the /maxina default.
  const getTenantLoginRoute = (tenantSlug: string | null): string =>
    tenantLoginRoute(canonicalTenantSlug(tenantSlug), currentRegistrySync(), '/maxina');

  // Try to detect linked event from campaign metadata
  const linkedEventId = campaign?.metadata?.event_id || campaign?.metadata?.eventId || null;
  const isEventPaid = linkedEventTickets?.is_paid_event || campaign?.metadata?.is_paid || campaign?.metadata?.isPaid || false;
  const eventPrice = linkedEventTickets?.lowest_ticket_price ?? campaign?.metadata?.price ?? campaign?.metadata?.event_price ?? null;
  const hasTickets = linkedEventTickets?.has_tickets || false;
  
  // Check for external ticket URL
  const ticketUrl = campaign ? getCampaignTicketUrl(campaign) : null;
  const hasExternalTicket = !!ticketUrl;
  
  // Get tenant from campaign metadata for proper login routing
  const tenantSlug = campaign?.metadata?.tenant_slug || campaign?.metadata?.tenantSlug || readStoredTenantSlug('tenant_slug') || null;

  // Use unified localized CTA logic
  const ctaConfig = getLocalizedPublicLandingCta({
    hasTickets,
    isPaid: isEventPaid,
    isSoldOut: linkedEventTickets?.is_sold_out || false,
    lowestPrice: eventPrice,
    currency: campaign?.metadata?.display_currency || 'USD',
    isAuthenticated: !!user,
    userHasTicket,
  }, translate);

  // Determine CTA icon
  const getPrimaryCTAIcon = () => {
    switch (ctaConfig.icon) {
      case 'ticket': return <Ticket className="h-4 w-4 me-2" />;
      case 'eye': return <Eye className="h-4 w-4 me-2" />;
      case 'user-plus': return <UserPlus className="h-4 w-4 me-2" />;
      default: return <CalendarDays className="h-4 w-4 me-2" />;
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
    if (spotlight) {
      return (
        <ScreenFrame archetype="detail" className="min-h-screen bg-background">
          <ArchetypeSkeleton archetype="detail" />
        </ScreenFrame>
      );
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-4xl">
          <ArchetypeSkeleton archetype="detail" />
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">{t('screens.publiccampaignlanding.campaignNotFound')}</h1>
          <p className="text-muted-foreground">{error || "The campaign you're looking for doesn't exist."}</p>
          <Button onClick={() => navigate("/")}>{t('screens.publiccampaignlanding.goHome')}</Button>
        </div>
      </div>
    );
  }

  const publicCampaignUrl = `${window.location.origin}/pub/campaigns/${campaign.id}${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
  const startDate = campaign.start_date ? formatDate(new Date(campaign.start_date), "MMMM d, yyyy") : "";
  const endDate = campaign.end_date ? formatDate(new Date(campaign.end_date), "MMMM d, yyyy") : "";
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

  const details = (
    <>
              {/* Campaign Details */}
              <div className="grid gap-2 md:gap-3 md:grid-cols-2">
                {campaign.start_date && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('screens.publiccampaignlanding.campaignPeriod')}</p>
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
                      <p className="text-xs text-muted-foreground">{t('screens.publiccampaignlanding.channels')}</p>
                      <p className="text-sm font-medium text-foreground">{t('screens.publiccampaignlanding.lengthChannelValue1', { length: campaign.target_channels.length, value1: campaign.target_channels.length !== 1 ? 's' : '' })}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-3">
                  <Target className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('screens.publiccampaignlanding.type')}</p>
                    <p className="text-sm font-medium text-foreground">{t('screens.publiccampaignlanding.marketingCampaign')}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('screens.publiccampaignlanding.community')}</p>
                    <p className="text-sm font-medium text-foreground">VITANA</p>
                  </div>
                </div>
              </div>

    </>
  );
  const description = (
    <>
              {/* Description */}
              {campaign.description && (
                <div className="max-w-3xl">
                  <p className="text-base text-foreground/80 leading-normal">{campaign.description}</p>
                </div>
              )}

    </>
  );
  const ctaPanel = (
    <>
              {/* Dual CTA Panel */}
              <div className="mt-3 md:mt-4">
                <div className="rounded-2xl border border-border/60 bg-card/70 dark:bg-card/40 backdrop-blur-sm shadow-md px-6 md:px-8 py-5">
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
                            ? 'bg-gradient-to-r from-status-success to-category-1 hover:from-status-success/90 hover:to-category-1/90' 
                            : ctaConfig.variant === 'view-ticket'
                            ? 'bg-gradient-to-r from-category-2 to-sys-member-accent hover:from-category-2/90 hover:to-sys-member-accent/90'
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
                    <div className="hidden md:block w-px h-14 bg-gradient-to-b from-transparent via-border to-transparent" />
                    <div className="flex items-center justify-center gap-3 md:hidden">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border" />
                      <span className="text-xs text-muted-foreground font-medium">{t('screens.publiccampaignlanding.text')}</span>
                      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border" />
                    </div>
                    
                    {/* Right: Community CTA */}
                    <div className="flex-1 flex flex-col items-start md:items-end gap-2">
                      <div className="flex items-start gap-1.5 max-w-72 md:max-w-xs text-start md:text-end">
                        <Sparkles className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-xs font-medium tracking-wide text-muted-foreground leading-relaxed">
                          {t('screens.publiccampaignlanding.discoverMoreEventsLongevityCommunities')}
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
                        <p className="text-[11px] text-muted-foreground/70 text-start md:text-end max-w-xs">{t('screens.publiccampaignlanding.youLlSignCreateAccountNext')}
                        </p>
                      )}
                    </div>
                    
                  </div>
                </div>
              </div>
    </>
  );
  const footer = (
    <>
        {/* Footer */}
        <div className="border-t border-border mt-auto">
          <div className="max-w-4xl mx-auto px-4 py-3 text-center">
            <p className="text-xs text-muted-foreground">
              {t('screens.publiccampaignlanding.poweredBy')} <span className="font-semibold text-foreground">VITANA</span>{t('screens.publiccampaignlanding.YourLongevityCommunity')}
            </p>
          </div>
        </div>
    </>
  );

  return (
    <>
      <SEO
        title={campaign.name}
        description={shortDescription}
        image={heroImage || undefined}
        url={publicCampaignUrl}
        type="website"
      />
      
      {spotlight ? (
        // VTID-05117: Spotlight on → the `detail` archetype; the campaign is the one spotlight item.
        <ScreenFrame archetype="detail" className="min-h-screen bg-background">
          <div className="space-y-5">
            <VCard
              size="spotlight"
              priority
              media={{ src: heroImage, alt: campaign.name }}
              eyebrow={displayStatus ?? undefined}
              title={<h1>{campaign.name}</h1>}
              body={hasTickets && eventPrice !== null ? (eventPrice === 0 ? t('spotlightPublic.event.free') : t('spotlightPublic.event.fromPrice', { price: formatTicketPrice(eventPrice, campaign?.metadata?.display_currency || 'USD') })) : undefined}
            />
            {details}
            {description}
            {ctaPanel}
            {footer}
          </div>
        </ScreenFrame>
      ) : (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Hero Section - Compact banner */}
        {heroImage ? (
          <div className="relative w-full h-72 md:h-96 overflow-hidden">
            <img
              src={heroImage}
              alt={campaign.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background from-30% via-background/80 via-60% to-transparent" />
          </div>
        ) : (
          <div className="relative w-full h-48 md:h-64 overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-background" />
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

              {details}
              {description}
              {ctaPanel}
            </div>
          </div>
        </div>

        {footer}
      </div>
      )}

      {/* Ticket Purchase Dialog */}
      {linkedEventId && (
        <Dialog open={showTicketDialog} onOpenChange={setShowTicketDialog}>
          {/* design-allow-next-line: viewport-relative scroll limit of the ticket dialog; the contract has no viewport-height token */}
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-primary" />{t('screens.publiccampaignlanding.getTicketsForValue0', { value0: linkedEventTickets?.event_title || campaign.name })}</DialogTitle>
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
