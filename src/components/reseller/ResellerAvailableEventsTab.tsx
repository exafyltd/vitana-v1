/**
 * RESELLER AVAILABLE EVENTS TAB
 * 
 * Displays events that resellers can sell tickets for. Events must have:
 * - resellable = true
 * - start_time in the future
 * 
 * Features:
 * - Filter chips (All, High Commission, Ending Soon, Popular)
 * - StandardHorizontalCard layout for consistency
 * - Start Selling button opens SellEventModal
 */

import { useAuth } from "@/context/AuthProvider";
import { useTenant } from "@/hooks/useTenant";
import { useResellerProfile } from "@/hooks/useResellerProfile";
import { useActivateReseller } from "@/hooks/useActivateReseller";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, differenceInDays } from "date-fns";
import { useState } from "react";
import { Ticket, Percent, Clock, TrendingUp, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StandardHorizontalCard } from "@/components/ui/standard-horizontal-card";
import { SellEventModal } from "./SellEventModal";
import { toast } from "sonner";

type FilterType = "all" | "high-commission" | "ending-soon" | "popular";

export function ResellerAvailableEventsTab() {
  const { session } = useAuth();
  const { activeTenantId } = useTenant();
  const { data: resellerProfile } = useResellerProfile();
  const { activateResellerForCurrentUser, isActivating } = useActivateReseller();
  
  const [filter, setFilter] = useState<FilterType>("all");
  const [sellModalEvent, setSellModalEvent] = useState<any | null>(null);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["reseller-available-events", session?.user?.id, activeTenantId],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      const nowIso = new Date().toISOString();

      const { data, error } = await supabase
        .from("global_community_events")
        .select(`
          id,
          title,
          start_time,
          end_time,
          location,
          image_url,
          created_by,
          resellable,
          resale_scope,
          default_reseller_commission_rate
        `)
        .gte("start_time", nowIso)
        .eq("resellable", true)
        .neq("created_by", session.user.id)
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching resellable events:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!session?.user?.id && !!resellerProfile,
  });

  const handleStartSelling = async (event: any) => {
    // If not a reseller yet, activate first
    if (!resellerProfile?.reseller_code) {
      toast.info("Activating your reseller profile...");
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
    { value: "high-commission", label: "High Commission", icon: <Percent className="h-3 w-3" /> },
    { value: "ending-soon", label: "Ending Soon", icon: <Clock className="h-3 w-3" /> },
    { value: "popular", label: "Popular Now", icon: <TrendingUp className="h-3 w-3" /> },
  ];

  if (!resellerProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Ticket className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-sm text-muted-foreground">
          Activate <strong>Sell Event Tickets</strong> in the Business popup to see events you can resell.
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
        <p className="text-sm text-muted-foreground max-w-md">
          There are currently no events opened for reselling. Check back later or create your own event to start selling.
        </p>
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
            <p className="text-sm text-muted-foreground">No events match this filter</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const commissionRate = event.default_reseller_commission_rate ?? 0;
            const daysUntil = differenceInDays(new Date(event.start_time), new Date());

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
                  ...(commissionRate > 0 ? [{
                    label: `${commissionRate}% commission`,
                    variant: 'secondary' as const,
                    icon: <Percent className="h-3 w-3" />
                  }] : []),
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
                  }
                ]}
                primaryAction={{
                  label: 'Start Selling',
                  onClick: () => handleStartSelling(event),
                  variant: 'default' as const,
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
