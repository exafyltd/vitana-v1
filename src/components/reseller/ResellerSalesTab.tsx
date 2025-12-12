import { useState, useMemo } from "react";
import { useResellerSales, ResellerEventSale } from "@/hooks/useResellerSales";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2, Ticket, DollarSign, Award, Wallet, ChevronRight, Share2, Megaphone, Calendar, Briefcase, FlaskConical, Clock, Eye, MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { SalesDetailDrawer } from "./SalesDetailDrawer";
import { SellEventModal } from "./SellEventModal";
import { CampaignDialog } from "@/components/sharing/CampaignDialog";
import { useResellerProfile } from "@/hooks/useResellerProfile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  mockResellerSales, 
  isMockResellerSalesEnabled,
  type MockEventSale 
} from "@/lib/mocks/mockResellerSales";
import { StandardHorizontalCard } from "@/components/ui/standard-horizontal-card";

type TimeRange = "all" | "30d" | "7d";

export function ResellerSalesTab() {
  const navigate = useNavigate();
  const { data: sales, isLoading } = useResellerSales();
  const { data: resellerProfile } = useResellerProfile();
  
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [clientEventsOnly, setClientEventsOnly] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ResellerEventSale | null>(null);
  
  // Empty state CTAs
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [selectedEventForSell, setSelectedEventForSell] = useState<{ id: string; title: string; image_url?: string | null } | null>(null);

  // Mock mode detection
  const mockEnabled = isMockResellerSalesEnabled();
  const hasRealSales = sales && sales.eventSales && sales.eventSales.length > 0;
  const shouldUseMock = mockEnabled && !hasRealSales;
  
  // Use mock data as fallback when enabled and no real sales
  const activeSales = useMemo(() => {
    if (shouldUseMock) {
      return {
        totalTicketsSold: mockResellerSales.totalTicketsSold,
        totalSaleAmount: mockResellerSales.totalSaleAmount,
        totalCommissionEarned: mockResellerSales.totalCommissionEarned,
        eventSales: mockResellerSales.eventSales as unknown as ResellerEventSale[],
      };
    }
    return sales;
  }, [shouldUseMock, sales]);

  // Fetch resellable events for event picker
  const { data: resellableEvents, isLoading: isLoadingEvents } = useQuery({
    queryKey: ["resellable-events-sales-picker"],
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Filter sales based on time range and client events toggle
  const getFilteredSales = () => {
    if (!activeSales?.eventSales) return [];
    
    let filtered = [...activeSales.eventSales];
    
    // Filter by client events
    if (clientEventsOnly) {
      filtered = filtered.filter(e => e.isClientEvent);
    }
    
    // Filter by time range (based on lastSaleAt)
    if (timeRange !== "all") {
      const now = new Date();
      const cutoff = timeRange === "7d" 
        ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      filtered = filtered.filter(e => new Date(e.lastSaleAt) >= cutoff);
    }
    
    return filtered;
  };

  // Calculate filtered totals
  const getFilteredTotals = () => {
    const filtered = getFilteredSales();
    return {
      ticketsSold: filtered.reduce((sum, e) => sum + e.ticketsSold, 0),
      grossSales: filtered.reduce((sum, e) => sum + e.saleAmount, 0),
      commission: filtered.reduce((sum, e) => sum + e.commissionAmount, 0),
    };
  };

  const filteredSales = getFilteredSales();
  const filteredTotals = getFilteredTotals();

  const handleSelectEvent = (event: typeof resellableEvents extends (infer T)[] ? T : never) => {
    setSelectedEventForSell({
      id: event.id,
      title: event.title,
      image_url: event.image_url,
    });
    setShowEventPicker(false);
  };

  if (isLoading && !shouldUseMock) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Empty state (only show if not using mock data)
  if (!activeSales || activeSales.eventSales.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-16">
          <Ticket className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium mb-2">No sales yet</h3>
          <p className="text-sm text-muted-foreground mb-8 max-w-sm mx-auto">
            Share your reseller links or create a promotion to start earning commissions.
          </p>
          <div className="flex justify-center gap-3">
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full gap-2"
              onClick={() => setShowEventPicker(true)}
            >
              <Share2 className="h-4 w-4" />
              Share reseller link
            </Button>
            <Button 
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
              {isLoadingEvents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : resellableEvents && resellableEvents.length > 0 ? (
                resellableEvents.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => handleSelectEvent(event)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
                  >
                    {event.image_url ? (
                      <img src={event.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.start_time && format(new Date(event.start_time), "MMM d, yyyy")}
                        {event.default_reseller_commission_rate && ` · ${event.default_reseller_commission_rate}% commission`}
                      </p>
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No events available to sell
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <SellEventModal
          open={!!selectedEventForSell}
          onOpenChange={(open) => !open && setSelectedEventForSell(null)}
          event={selectedEventForSell}
          resellerCode={resellerProfile?.reseller_code || ""}
        />

        <CampaignDialog
          open={showCampaignDialog}
          onOpenChange={setShowCampaignDialog}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mock Data Badge */}
      {shouldUseMock && (
        <div className="flex justify-end">
          <Badge variant="outline" className="gap-1.5 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
            <FlaskConical className="h-3 w-3" />
            Mock data
          </Badge>
        </div>
      )}

      {/* KPI Header - Compact Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-card/80 backdrop-blur-sm border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                <Ticket className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tickets Sold</p>
                <p className="text-xl font-semibold">{filteredTotals.ticketsSold}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Gross Sales</p>
                <p className="text-xl font-semibold">{formatCurrency(filteredTotals.grossSales)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Commission Card with accent */}
        <Card className="bg-card/80 backdrop-blur-sm border-accent/30 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent to-accent/60" />
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-accent/10 flex items-center justify-center">
                <Award className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Commission Earned</p>
                <p className="text-xl font-semibold text-accent">{formatCurrency(filteredTotals.commission)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm border-border/40">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Last Payout</p>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1">
          {(["all", "30d", "7d"] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "secondary" : "ghost"}
              size="sm"
              className="rounded-full h-8 px-3 text-xs"
              onClick={() => setTimeRange(range)}
            >
              {range === "all" ? "All time" : range === "30d" ? "Last 30 days" : "Last 7 days"}
            </Button>
          ))}
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          <Checkbox 
            id="client-only" 
            checked={clientEventsOnly}
            onCheckedChange={(checked) => setClientEventsOnly(checked === true)}
          />
          <Label htmlFor="client-only" className="text-xs text-muted-foreground cursor-pointer">
            Client Events only
          </Label>
        </div>
      </div>

      {/* Attributed Sales by Event */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">Attributed Sales by Event</h3>
        
        {filteredSales.length === 0 ? (
          <Card className="bg-card/50">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No sales match the current filters</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredSales.map((event) => (
              <StandardHorizontalCard
                key={event.eventId}
                id={event.eventId}
                screenId="SELL_AND_EARN_SALES"
                icon={
                  (event as any).eventImageUrl ? (
                    <img 
                      src={(event as any).eventImageUrl} 
                      alt={event.eventTitle} 
                      className="w-10 h-10 rounded-lg object-cover" 
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-accent" />
                    </div>
                  )
                }
                title={event.eventTitle}
                description={`${event.ticketsSold} tickets · ${formatCurrency(event.saleAmount)} sales · ${event.commissionRate}% commission`}
                badges={[
                  event.isClientEvent 
                    ? { label: "Client Event", variant: "outline" as const, icon: <Briefcase className="h-3 w-3" /> }
                    : { label: "Public Resale", variant: "outline" as const }
                ]}
                metadata={[
                  { icon: <Award className="h-3.5 w-3.5 text-accent" />, text: `${formatCurrency(event.commissionAmount)} earned` },
                  { icon: <Clock className="h-3.5 w-3.5" />, text: formatDistanceToNow(new Date(event.lastSaleAt), { addSuffix: true }) }
                ]}
                primaryAction={{
                  label: "View details",
                  onClick: () => setSelectedEvent(event),
                  variant: "ghost",
                  icon: <ChevronRight className="h-3.5 w-3.5" />
                }}
                secondaryActions={[
                  {
                    label: "Share reseller link",
                    onClick: () => {
                      setSelectedEventForSell({
                        id: event.eventId,
                        title: event.eventTitle,
                        image_url: (event as any).eventImageUrl,
                      });
                    },
                    icon: <Share2 className="h-3.5 w-3.5" />,
                  },
                  {
                    label: "View event",
                    onClick: () => navigate(`/comm/events-meetups?event=${event.eventId}`),
                    icon: <Eye className="h-3.5 w-3.5" />,
                  },
                ]}
                layoutMode="stack"
                density="compact"
              />
            ))}
          </div>
        )}
      </div>

      {/* Sales Detail Drawer */}
      <SalesDetailDrawer
        open={!!selectedEvent}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        event={selectedEvent}
        useMock={shouldUseMock}
      />
    </div>
  );
}
