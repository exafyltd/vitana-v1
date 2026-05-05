/**
 * RESELLER INVENTORY TAB
 * 
 * Displays your resale inventory - events you can promote and earn commission on.
 * Events must have:
 * - resellable = true
 * - start_time in the future
 * 
 * Features:
 * - Filter chips (All, High Commission, Ending Soon, Popular)
 * - StandardHorizontalCard layout for consistency
 * - Earning-focused CTAs and badges
 */

import { useAuth } from "@/context/AuthProvider";
import { useTenant } from "@/hooks/useTenant";
import { useResellerProfile } from "@/hooks/useResellerProfile";
import { useActivateReseller } from "@/hooks/useActivateReseller";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { useState } from "react";
import { Ticket, Coins, Clock, TrendingUp, Loader2, Plus, ArrowRight, MapPin, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateEventPopup } from "@/components/CreateEventPopup";
import { Badge } from "@/components/ui/badge";
import { StandardHorizontalCard } from "@/components/ui/standard-horizontal-card";
import { MobileInventoryCard } from "./MobileInventoryCard";
import { SellEventModal } from "./SellEventModal";
import { notifyInfo, t } from '@/lib/i18n-toast';

// Format currency for earnings display
const formatEarning = (amount: number): string => {
  if (amount <= 0) return "";
  return amount % 1 === 0 ? `€${amount}` : `€${amount.toFixed(2)}`;
};

// Determine event type based on location
const getEventType = (location?: string | null): 'in-person' | 'online' => {
  if (!location || location.trim() === '') return 'online';
  const onlineKeywords = ['online', 'zoom', 'virtual', 'webinar', 'livestream', 'remote'];
  return onlineKeywords.some(kw => location.toLowerCase().includes(kw)) ? 'online' : 'in-person';
};

interface ResellableEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  image_url: string | null;
  created_by: string;
  resellable: boolean | null;
  resale_scope: string | null;
  default_reseller_commission_rate: number | null;
  metadata: Record<string, unknown> | null;
}

type FilterType = "all" | "high-commission" | "ending-soon" | "popular";

const RESELLABLE_EVENT_COLUMNS = `
  id,
  title,
  start_time,
  end_time,
  location,
  image_url,
  created_by,
  resellable,
  resale_scope,
  default_reseller_commission_rate,
  metadata
`;

async function fetchPublicResellableEvents(userId: string, nowIso: string): Promise<ResellableEvent[]> {
  // Using explicit any to avoid TS2589 with long Supabase query chains
  const baseQuery = supabase.from("global_community_events").select(RESELLABLE_EVENT_COLUMNS) as any;
  
  const { data, error } = await baseQuery
    .gte("start_time", nowIso)
    .eq("resellable", true)
    .eq("resale_scope", "public")
    .neq("created_by", userId)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error fetching public resellable events:", error);
    throw error;
  }
  return (data as ResellableEvent[]) || [];
}

async function fetchTenantResellableEvents(userId: string, tenantId: string, nowIso: string): Promise<ResellableEvent[]> {
  // Using explicit any to avoid TS2589 with long Supabase query chains
  const baseQuery = supabase.from("global_community_events").select(RESELLABLE_EVENT_COLUMNS) as any;
  
  const { data, error } = await baseQuery
    .gte("start_time", nowIso)
    .eq("resellable", true)
    .eq("resale_scope", "tenant")
    .eq("tenant_id", tenantId)
    .neq("created_by", userId)
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error fetching tenant resellable events:", error);
    throw error;
  }
  return (data as ResellableEvent[]) || [];
}

export function ResellerAvailableEventsTab() {
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const { session } = useAuth();
  const { activeTenantId } = useTenant();
  const { data: resellerProfile } = useResellerProfile();
  const { activateResellerForCurrentUser, isActivating } = useActivateReseller();
  const isMobile = useIsMobile();
  
  const [filter, setFilter] = useState<FilterType>("all");
  const [sellModalEvent, setSellModalEvent] = useState<any | null>(null);

  const { data: events = [], isLoading } = useQuery<ResellableEvent[]>({
    queryKey: ["reseller-available-events", session?.user?.id, activeTenantId],
    queryFn: async (): Promise<ResellableEvent[]> => {
      if (!session?.user?.id) return [];

      const nowIso = new Date().toISOString();
      const currentUserId = session.user.id;

      // Fetch public events (visible to all tenants)
      const publicEvents = await fetchPublicResellableEvents(currentUserId, nowIso);

      // Fetch tenant-only events (only for current tenant)
      // Wrapped in try-catch because tenant_id column may not exist
      let tenantEvents: ResellableEvent[] = [];
      if (activeTenantId) {
        try {
          tenantEvents = await fetchTenantResellableEvents(currentUserId, activeTenantId, nowIso);
        } catch (err) {
          // Tenant filtering not available - continue with public events only
          console.warn("Tenant events fetch skipped (tenant_id column may not exist):", err);
        }
      }

      // Merge and sort by start_time
      const allEvents = [...publicEvents, ...tenantEvents];
      allEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
      
      return allEvents;
    },
    enabled: !!session?.user?.id && !!resellerProfile,
  });

  const handleStartSelling = async (event: any) => {
    // If not a reseller yet, activate first
    if (!resellerProfile?.reseller_code) {
      notifyInfo('toasts.reseller.activatingYourResellerProfile');
      const success = await activateResellerForCurrentUser({ showToast: true, redirectAfter: false });
      if (!success) return;
    }
    setSellModalEvent(event);
  };

  // Filter events based on selected filter
  const filteredEvents = events.filter((event) => {
    const commissionRate = event.default_reseller_commission_rate ?? 0;
    const daysUntil = differenceInDays(new Date(event.start_time), new Date());
    
    switch (filter) {
      case "high-commission":
        return commissionRate >= 15;
      case "ending-soon":
        return daysUntil <= 7;
      case "popular":
        // In future, use actual popularity metrics
        return commissionRate >= 10;
      default:
        return true;
    }
  });

  const filterOptions: { value: FilterType; label: string; icon: React.ReactNode }[] = [
    { value: "all", label: "All", icon: <Ticket className="h-3 w-3" /> },
    { value: "high-commission", label: "High Earnings", icon: <Coins className="h-3 w-3" /> },
    { value: "ending-soon", label: "Ending Soon", icon: <Clock className="h-3 w-3" /> },
    { value: "popular", label: "Popular Now", icon: <TrendingUp className="h-3 w-3" /> },
  ];

  if (!resellerProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Ticket className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground max-w-md">
          {t('screens.reseller.activateResellerModeAccessYourInventory')}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Ticket className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold mb-2">{t('screens.reseller.noEventsYourInventory')}</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Once you add events to your inventory, you'll be able to promote them, share reseller links, and earn from every ticket sold.
        </p>
        <Button onClick={() => setIsCreateEventOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {t('screens.reseller.addFirstEvent')}
        </Button>
        <CreateEventPopup
          isOpen={isCreateEventOpen}
          onClose={() => setIsCreateEventOpen(false)}
          eventContext="community"
        />
      </div>
    );
  }

  return (
    <>
      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {filterOptions.map((option) => (
          <Badge
            key={option.value}
            variant={filter === option.value ? "default" : "outline"}
            className="cursor-pointer gap-1.5 px-3 py-1.5 transition-colors"
            onClick={() => setFilter(option.value)}
          >
            {option.icon}
            {option.label}
          </Badge>
        ))}
      </div>

      {/* Events List */}
      <div className="space-y-3">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">{t('screens.reseller.noInventoryItemsMatchThisFilter')}</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const commissionRate = event.default_reseller_commission_rate ?? 0;
            const ticketPrice = (event.metadata?.price as number) ?? 0;
            const earningPerTicket = ticketPrice * (commissionRate / 100);
            const earningFormatted = formatEarning(earningPerTicket);
            const scaledEarning = formatEarning(earningPerTicket * 10);
            const daysUntil = differenceInDays(new Date(event.start_time), new Date());
            const eventType = getEventType(event.location);
            
            // Mobile: Use compact MobileInventoryCard
            if (isMobile) {
              return (
                <MobileInventoryCard
                  key={event.id}
                  id={event.id}
                  imageUrl={event.image_url}
                  title={event.title}
                  startTime={new Date(event.start_time)}
                  eventType={eventType}
                  commissionRate={commissionRate}
                  ticketPrice={ticketPrice}
                  earningPerTicket={earningPerTicket}
                  resaleScope={event.resale_scope === "tenant" ? "tenant" : "public"}
                  quantity={10}
                  onSell={() => handleStartSelling(event)}
                />
              );
            }
            
            // Desktop: Keep existing StandardHorizontalCard
            const ctaLabel = earningPerTicket > 0 
              ? `Earn ${earningFormatted} / ticket` 
              : "Start Selling";

            return (
              <StandardHorizontalCard
                key={event.id}
                id={event.id}
                screenId="MY_BUSINESS_AVAILABLE_EVENTS"
                icon={
                  event.image_url ? (
                    <img 
                      src={event.image_url} 
                      alt={event.title} 
                      className="w-10 h-10 rounded-lg object-cover" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                      <Ticket className="h-5 w-5 text-accent" />
                    </div>
                  )
                }
                title={event.title}
                description={`${format(new Date(event.start_time), "MMM d, yyyy 'at' h:mm a")}${event.location ? ` • ${event.location}` : ""}`}
                badges={[
                  // Event type + commission badge
                  ...(commissionRate > 0 ? [{
                    label: eventType === 'in-person' 
                      ? `In-person · ${commissionRate}% commission`
                      : `Online · ${commissionRate}% commission`,
                    variant: 'secondary' as const,
                    icon: eventType === 'in-person' 
                      ? <MapPin className="h-3 w-3" /> 
                      : <Monitor className="h-3 w-3" />
                  }] : []),
                  // Urgency badge
                  ...(daysUntil <= 7 ? [{
                    label: daysUntil <= 1 ? 'Tomorrow' : `${daysUntil} days left`,
                    variant: 'outline' as const,
                    icon: <Clock className="h-3 w-3" />
                  }] : [])
                ]}
                metadata={[
                  { 
                    icon: <Ticket className="h-3.5 w-3.5" />, 
                    text: event.resale_scope === "tenant" ? "This community" : "Public"
                  },
                  // Scale motivation: show potential earnings for 10 tickets
                  ...(earningPerTicket > 0 ? [{
                    icon: <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />,
                    text: `Sell 10 → ${scaledEarning}`,
                    color: 'text-emerald-600 dark:text-emerald-400'
                  }] : [])
                ]}
                primaryAction={{
                  label: ctaLabel,
                  onClick: () => handleStartSelling(event),
                  variant: 'default' as const,
                  icon: earningPerTicket > 0 ? <ArrowRight className="h-4 w-4" /> : undefined,
                }}
                onClick={() => handleStartSelling(event)}
                layoutMode="stack"
                density="compact"
              />
            );
          })
        )}
      </div>

      <SellEventModal
        open={!!sellModalEvent}
        onOpenChange={(open) => !open && setSellModalEvent(null)}
        event={sellModalEvent}
        resellerCode={resellerProfile?.reseller_code || ""}
      />
    </>
  );
}