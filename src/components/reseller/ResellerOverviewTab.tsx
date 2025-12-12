import { useState } from "react";
import { ResellerHeader } from "@/components/reseller/ResellerHeader";
import { AutopilotSuggestionsBanner } from "@/components/reseller/AutopilotSuggestionsBanner";
import { Button } from "@/components/ui/button";
import { Share2, Megaphone, Calendar, MapPin, Loader2 } from "lucide-react";
import { useResellerProfile } from "@/hooks/useResellerProfile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SellEventModal } from "./SellEventModal";
import { CampaignDialog } from "@/components/sharing/CampaignDialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { format } from "date-fns";

export function ResellerOverviewTab() {
  const { data: resellerProfile } = useResellerProfile();
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [selectedEventForSell, setSelectedEventForSell] = useState<{
    id: string;
    title: string;
    image_url?: string | null;
  } | null>(null);

  // Fetch resellable events for the picker
  const { data: resellableEvents, isLoading: eventsLoading } = useQuery({
    queryKey: ["resellable-events-picker"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_community_events")
        .select("id, title, image_url, start_time, location, default_reseller_commission_rate")
        .eq("resellable", true)
        .gte("start_time", new Date().toISOString())
        .order("start_time", { ascending: true })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    enabled: showEventPicker,
  });

  const handleSelectEvent = (event: { id: string; title: string; image_url?: string | null }) => {
    setSelectedEventForSell(event);
    setShowEventPicker(false);
  };

  return (
    <div className="space-y-8">
      {/* Autopilot Insight Card */}
      <AutopilotSuggestionsBanner />
      
      {/* 4 KPI Cards */}
      <ResellerHeader />

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full gap-2"
            onClick={() => setShowEventPicker(true)}
          >
            <Share2 className="h-4 w-4" />
            Share a reseller link
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-full gap-2"
            onClick={() => setShowCampaignDialog(true)}
          >
            <Megaphone className="h-4 w-4" />
            Create promotion
          </Button>
        </div>
      </div>

      {/* Event Picker Dialog */}
      <Dialog open={showEventPicker} onOpenChange={setShowEventPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select an event to share</DialogTitle>
            <DialogDescription>Pick an event to generate your reseller link</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {eventsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : resellableEvents && resellableEvents.length > 0 ? (
              resellableEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => handleSelectEvent(event)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left border border-border/50"
                >
                  {event.image_url ? (
                    <img 
                      src={event.image_url} 
                      alt={event.title}
                      className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Calendar className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{event.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(event.start_time), "MMM d, yyyy")}
                    </p>
                    {event.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </p>
                    )}
                  </div>
                  {event.default_reseller_commission_rate && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400 px-2 py-1 rounded-full flex-shrink-0">
                      {event.default_reseller_commission_rate}%
                    </span>
                  )}
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-sm">No events available to sell.</p>
                <p className="text-xs mt-1">Check back later!</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Sell Event Modal */}
      <SellEventModal
        open={!!selectedEventForSell}
        onOpenChange={(open) => !open && setSelectedEventForSell(null)}
        event={selectedEventForSell}
        resellerCode={resellerProfile?.reseller_code || ""}
      />

      {/* Campaign Dialog */}
      <CampaignDialog
        open={showCampaignDialog}
        onOpenChange={setShowCampaignDialog}
      />
    </div>
  );
}
