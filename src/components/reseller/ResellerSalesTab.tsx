import { useState, useMemo } from "react";
import { useResellerSales, ResellerEventSale } from "@/hooks/useResellerSales";
import { useResellerPayouts } from "@/hooks/useResellerPayouts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, formatDistanceToNow } from "date-fns";
import { Loader2, Ticket, DollarSign, Award, Wallet, ChevronRight, Share2, Megaphone, Calendar, Clock, Eye, Settings2, ArrowDownToLine, CheckCircle2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ResponsivePopover, ResponsivePopoverContent, ResponsivePopoverTrigger } from "@/components/ui/responsive-popover";
import { TransferToWalletDialog } from "./TransferToWalletDialog";
import { t } from '@/lib/i18n-toast';

type TimeRange = "all" | "30d" | "7d";

export function ResellerSalesTab() {
  const navigate = useNavigate();
  const { data: sales, isLoading } = useResellerSales();
  const { data: resellerProfile } = useResellerProfile();
  const { transferToWallet, isTransferring } = useResellerPayouts();
  
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  
  const [selectedEvent, setSelectedEvent] = useState<ResellerEventSale | null>(null);
  
  // Empty state CTAs
  const [showEventPicker, setShowEventPicker] = useState(false);
  const [showCampaignDialog, setShowCampaignDialog] = useState(false);
  const [selectedEventForSell, setSelectedEventForSell] = useState<{ id: string; title: string; image_url?: string | null } | null>(null);
  const [showTransferDialog, setShowTransferDialog] = useState(false);

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
        commissionPaidToWallet: 200,
        commissionPendingPayout: 112.50,
        lastPayout: {
          id: "mock-payout-1",
          amount: 200,
          status: "paid_to_wallet",
          paid_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
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

  // Filter sales based on time range
  const getFilteredSales = () => {
    if (!activeSales?.eventSales) return [];
    
    let filtered = [...activeSales.eventSales];
    
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
          <h3 className="text-lg font-medium mb-2">{t('screens.reseller.noSalesYet')}</h3>
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
              <DialogTitle>{t('screens.reseller.selectEventShare')}</DialogTitle>
              <DialogDescription>{t('screens.reseller.pickEventGenerateYourResellerLink')}</DialogDescription>
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

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: "all", label: "All time" },
    { value: "30d", label: "Last 30 days" },
    { value: "7d", label: "Last 7 days" },
  ];

  return (
    <div className="space-y-5">
      {/* Unified KPI Strip */}
      <Card className="bg-card/70 backdrop-blur-sm border-border/40 rounded-2xl shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-border/40">
            {/* Commission Earned - Accent Styling */}
            <div className="p-4 flex items-center gap-3 relative">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-accent via-accent/80 to-accent/40" />
              <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
                <Award className="h-5 w-5 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">{t('screens.reseller.commissionEarned')}</p>
                <p className="text-2xl font-semibold tracking-tight text-accent">{formatCurrency(filteredTotals.commission)}</p>
              </div>
            </div>

            {/* Pending Payout */}
            <div className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-100/80 dark:bg-amber-950/40 flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">{t('screens.reseller.pendingPayout')}</p>
                <p className="text-2xl font-semibold tracking-tight text-amber-600 dark:text-amber-400">
                  {formatCurrency(activeSales?.commissionPendingPayout || 0)}
                </p>
              </div>
            </div>

            {/* In Wallet */}
            <div className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-100/80 dark:bg-emerald-950/40 flex items-center justify-center shrink-0">
                <Wallet className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">{t('screens.reseller.wallet')}</p>
                <p className="text-2xl font-semibold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(activeSales?.commissionPaidToWallet || 0)}
                </p>
              </div>
            </div>

            {/* Last Payout */}
            <div className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted/80 flex items-center justify-center shrink-0">
                <ArrowDownToLine className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground font-medium">{t('screens.reseller.lastPayout')}</p>
                {activeSales?.lastPayout ? (
                  <>
                    <p className="text-lg font-semibold tracking-tight">
                      {formatCurrency(activeSales.lastPayout.amount)}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(activeSales.lastPayout.paid_at || activeSales.lastPayout.created_at), { addSuffix: true })}
                    </p>
                  </>
                ) : (
                  <p className="text-lg font-medium text-muted-foreground/60">{t('screens.reseller.noPayoutsYet')}</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* View in Wallet link */}
      {(activeSales?.commissionPaidToWallet || 0) > 0 && (
        <div className="flex justify-end">
          <Button
            variant="link"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground gap-1 h-auto p-0"
            onClick={() => navigate("/wallet?filter=reseller_commission")}
          >
            View in Wallet
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Filter Bar - Segmented Control */}
      <div className="flex items-center justify-between gap-4">
        {/* Time Range Segmented Control */}
        <div className="inline-flex items-center bg-muted/50 rounded-full p-1 border border-border/40">
          {timeRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => setTimeRange(option.value)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-full transition-all",
                timeRange === option.value
                  ? "bg-background text-foreground shadow-sm border border-border/60"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Right side: Transfer to Wallet + Dev settings */}
        <div className="flex items-center gap-2">
          {/* Transfer to Wallet CTA */}
          {(activeSales?.commissionPendingPayout || 0) > 0 && (
            <Button
              size="sm"
              className="rounded-full gap-1.5 bg-accent hover:bg-accent/90"
              onClick={() => setShowTransferDialog(true)}
              disabled={isTransferring}
            >
              {isTransferring ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Wallet className="h-3.5 w-3.5" />
              )}
              Transfer to Wallet
            </Button>
          )}

          {/* Mock Data Toggle (Dev only) */}
          {shouldUseMock && (
            <ResponsivePopover>
              <ResponsivePopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full min-h-[44px] min-w-[44px]">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </ResponsivePopoverTrigger>
              <ResponsivePopoverContent title={t('screens.reseller.info')} align="end" className="w-auto p-2">
                <div className="flex items-center gap-2 text-xs text-amber-600">
                  <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                    Mock data active
                  </Badge>
                </div>
              </ResponsivePopoverContent>
            </ResponsivePopover>
          )}
        </div>
      </div>

      {/* Attributed Sales by Event */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">{t('screens.reseller.attributedSalesByEvent')}</h3>
        
        {filteredSales.length === 0 ? (
          <Card className="bg-card/50 rounded-2xl">
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">{t('screens.reseller.noSalesMatchCurrentFilters')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredSales.map((event) => (
              <Card 
                key={event.eventId} 
                className="bg-card/70 backdrop-blur-sm border-border/40 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Event Image */}
                    {(event as any).eventImageUrl ? (
                      <img 
                        src={(event as any).eventImageUrl} 
                        alt={event.eventTitle} 
                        className="w-12 h-12 rounded-xl object-cover shrink-0" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                        <Calendar className="h-6 w-6 text-accent" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {/* Title Row */}
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h4 className="font-semibold text-sm truncate">{event.eventTitle}</h4>
                            <Badge 
                              variant="outline" 
                              className="text-[10px] px-1.5 py-0 h-5 rounded-md font-medium"
                            >
                              Reseller Sale
                            </Badge>
                          </div>

                          {/* Stats Line */}
                          <p className="text-xs text-muted-foreground">
                            {event.ticketsSold} tickets · {formatCurrency(event.saleAmount)} sales · {event.commissionRate}% commission
                          </p>

                          {/* Earned + Last Sale Line */}
                          <div className="flex items-center gap-3 mt-1.5 text-xs">
                            <span className="inline-flex items-center gap-1 text-accent font-medium">
                              <Award className="h-3 w-3" />
                              {formatCurrency(event.commissionAmount)} earned
                            </span>
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              Last sale {formatDistanceToNow(new Date(event.lastSaleAt), { addSuffix: false })} ago
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 shrink-0">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-full"
                                onClick={() => {
                                  setSelectedEventForSell({
                                    id: event.eventId,
                                    title: event.eventTitle,
                                    image_url: (event as any).eventImageUrl,
                                  });
                                }}
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>{t('screens.reseller.shareResellerLink')}</TooltipContent>
                          </Tooltip>

                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 px-3 rounded-full text-xs gap-1"
                            onClick={() => setSelectedEvent(event)}
                          >
                            View details
                            <ChevronRight className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
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

      {/* Event Picker Dialog (for share reseller link) */}
      <Dialog open={showEventPicker} onOpenChange={setShowEventPicker}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('screens.reseller.selectEventShare')}</DialogTitle>
            <DialogDescription>{t('screens.reseller.pickEventGenerateYourResellerLink')}</DialogDescription>
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

      <TransferToWalletDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        pendingAmount={activeSales?.commissionPendingPayout || 0}
        onConfirm={() => {
          transferToWallet();
          setShowTransferDialog(false);
        }}
        isLoading={isTransferring}
      />
    </div>
  );
}
