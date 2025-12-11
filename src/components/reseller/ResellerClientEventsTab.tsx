import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useResellerProfile } from "@/hooks/useResellerProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Calendar, MapPin, Copy, Share2, ExternalLink, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { getResellerShareUrl } from "@/lib/shareUrl";
import { SellEventModal } from "./SellEventModal";
import { useNavigate } from "react-router-dom";
import { CreateEventPopup } from "@/components/CreateEventPopup";

interface ClientEvent {
  id: string;
  title: string;
  start_time: string;
  end_time: string | null;
  location: string | null;
  image_url: string | null;
  resellable: boolean;
  resale_scope: string;
  default_reseller_commission_rate: number | null;
  metadata: Record<string, unknown> | null;
}

/**
 * RESELLER CLIENT EVENTS TAB
 * 
 * Displays events created by the current user in Producer Mode.
 * These are events created on behalf of clients where the user
 * acts as the primary reseller/coordinator.
 */
export function ResellerClientEventsTab() {
  const { session } = useAuth();
  const { data: resellerProfile, isLoading: profileLoading } = useResellerProfile();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedEventForSell, setSelectedEventForSell] = useState<ClientEvent | null>(null);
  const [showCreateEventPopup, setShowCreateEventPopup] = useState(false);

  const { data: clientEvents, isLoading } = useQuery({
    queryKey: ["reseller-client-events", session?.user?.id],
    queryFn: async (): Promise<ClientEvent[]> => {
      if (!session?.user?.id) return [];

      const now = new Date().toISOString();

      // Fetch events where metadata contains producer_mode = true and producer_user_id = current user
      const { data, error } = await supabase
        .from("global_community_events")
        .select(`
          id,
          title,
          start_time,
          end_time,
          location,
          image_url,
          resellable,
          resale_scope,
          default_reseller_commission_rate,
          metadata
        `)
        .gte("start_time", now)
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching client events:", error);
        throw error;
      }

      // Filter for producer mode events created by this user
      const filtered = (data || []).filter((event) => {
        const meta = event.metadata as Record<string, unknown> | null;
        return (
          meta &&
          meta.producer_mode === true &&
          meta.producer_user_id === session.user.id
        );
      });

      return filtered as ClientEvent[];
    },
    enabled: !!session?.user?.id,
  });

  const handleCopyLink = async (event: ClientEvent) => {
    if (!resellerProfile?.reseller_code) {
      toast({
        title: "No reseller profile",
        description: "You need an active reseller profile to generate share links.",
        variant: "destructive",
      });
      return;
    }

    const shareUrl = getResellerShareUrl("event", event.id, resellerProfile.reseller_code);
    await navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied!",
      description: "Reseller link copied to clipboard.",
    });
  };

  const getCommissionRate = (event: ClientEvent): number => {
    return event.default_reseller_commission_rate || resellerProfile?.commission_rate || 10;
  };

  const getClientName = (event: ClientEvent): string => {
    const meta = event.metadata as Record<string, unknown> | null;
    // Prefer organizer_legal_name over producer_client_name
    return (meta?.organizer_legal_name as string) || 
           (meta?.producer_client_name as string) || 
           "Not specified";
  };

  const getOrganizerEmail = (event: ClientEvent): string | null => {
    const meta = event.metadata as Record<string, unknown> | null;
    return (meta?.organizer_contact_email as string) || null;
  };

  if (isLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!clientEvents || clientEvents.length === 0) {
    return (
      <>
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <Briefcase className="h-8 w-8 text-amber-600" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No client events yet</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            Create an event on behalf of a client using Producer Mode in the event creation flow.
          </p>
          <Button onClick={() => setShowCreateEventPopup(true)}>
            Create Client Event
          </Button>
        </div>

        <CreateEventPopup
          isOpen={showCreateEventPopup}
          onClose={() => setShowCreateEventPopup(false)}
          eventContext="community"
          defaultProducerMode={true}
          onEventCreated={(eventId) => {
            setShowCreateEventPopup(false);
            queryClient.invalidateQueries({ queryKey: ["reseller-client-events"] });
            toast({
              title: "Client event created!",
              description: "Your client event is now ready for promotion.",
            });
          }}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          Events you manage on behalf of clients. You earn commission on tickets sold via your reseller links.
        </p>
      </div>

      {clientEvents.map((event) => (
        <Card key={event.id} className="overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            <div className="flex gap-4">
              {/* Thumbnail */}
              <div className="w-24 h-24 flex-shrink-0 bg-muted">
                {event.image_url ? (
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 py-3 pr-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">{event.title}</h3>
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                        Client Event
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(event.start_time), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 text-xs">
                      <span className="text-muted-foreground">
                        Client: <span className="font-medium text-foreground">{getClientName(event)}</span>
                      </span>
                      {getOrganizerEmail(event) && (
                        <span className="text-muted-foreground">
                          <span className="font-medium text-foreground/80">{getOrganizerEmail(event)}</span>
                        </span>
                      )}
                      <span className="text-muted-foreground">
                        My commission: <span className="font-medium text-accent">{getCommissionRate(event)}%</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => setSelectedEventForSell(event)}
                      className="gap-1.5"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share Link
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/comm/events-meetups?event=${event.id}`)}
                      className="gap-1.5"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      View
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Sell Event Modal */}
      <SellEventModal
        open={!!selectedEventForSell}
        onOpenChange={(open) => !open && setSelectedEventForSell(null)}
        event={selectedEventForSell ? {
          id: selectedEventForSell.id,
          title: selectedEventForSell.title,
          image_url: selectedEventForSell.image_url,
        } : null}
        resellerCode={resellerProfile?.reseller_code || ""}
      />
    </div>
  );
}
