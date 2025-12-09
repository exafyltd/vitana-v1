import { useAuth } from "@/context/AuthProvider";
import { useTenant } from "@/hooks/useTenant";
import { useResellerProfile } from "@/hooks/useResellerProfile";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { getResellerShareUrl } from "@/lib/shareUrl";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, ExternalLink, Ticket } from "lucide-react";

export function ResellerAvailableEventsTab() {
  const { session } = useAuth();
  const { activeTenantId } = useTenant();
  const { data: resellerProfile } = useResellerProfile();
  const [selectedShareUrl, setSelectedShareUrl] = useState<string | null>(null);

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
        .order("start_time", { ascending: true });

      if (error) {
        console.error("Error fetching resellable events:", error);
        throw error;
      }

      return data || [];
    },
    enabled: !!session?.user?.id && !!resellerProfile,
  });

  const handleStartSelling = (event: any) => {
    if (!resellerProfile?.reseller_code) {
      toast.error("Your reseller profile is not ready yet. Please try again.");
      return;
    }

    const shareUrl = getResellerShareUrl("event", event.id, resellerProfile.reseller_code);
    setSelectedShareUrl(shareUrl);
  };

  const copyToClipboard = async () => {
    if (!selectedShareUrl) return;
    try {
      await navigator.clipboard.writeText(selectedShareUrl);
      toast.success("Your reseller link is copied!");
    } catch (error: any) {
      toast.error("Copy failed. Please select and copy the link manually.");
    }
  };

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
        <div className="text-sm text-muted-foreground">Loading events you can sell…</div>
      </div>
    );
  }

  if (!events.length) {
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
      <div className="space-y-4">
        {events.map((event) => {
          const commissionRate = event.default_reseller_commission_rate ?? 0;

          return (
            <Card key={event.id} className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4">
              {event.image_url && (
                <div className="w-full md:w-40 h-28 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                  <img
                    src={event.image_url}
                    alt={event.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="flex-1 space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold truncate">{event.title}</h3>
                  {commissionRate > 0 && (
                    <span className="text-xs rounded-full px-2 py-0.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex-shrink-0">
                      {commissionRate}% commission
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {event.start_time && (
                    <span>
                      {format(new Date(event.start_time), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  )}
                  {event.location && (
                    <>
                      {" · "}
                      <span>{event.location}</span>
                    </>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  Open for resellers · {event.resale_scope === "tenant" ? "This community" : "Public"}
                </div>
              </div>

              <div className="flex flex-col items-stretch gap-2 w-full md:w-auto flex-shrink-0">
                <Button size="sm" onClick={() => handleStartSelling(event)}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                  Start Selling
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!selectedShareUrl} onOpenChange={(open) => !open && setSelectedShareUrl(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share this event</DialogTitle>
            <DialogDescription>
              This is your unique reseller link. Share it with your audience to earn commissions on every ticket sold.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              readOnly
              value={selectedShareUrl || ""}
              onFocus={(e) => e.currentTarget.select()}
              className="font-mono text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                <Copy className="h-3.5 w-3.5 mr-1.5" />
                Copy Link
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
