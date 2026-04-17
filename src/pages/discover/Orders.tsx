import SEO from "@/components/SEO";
import AppLayout from "@/components/AppLayout";
import SubNavigation from "@/components/SubNavigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { discoverNavigation } from "@/config/navigation";
import { Package, RefreshCw, Clock, CheckCircle, Ticket, Receipt } from "lucide-react";
import { useAutopilot } from "@/hooks/use-autopilot";
import { useState, useEffect, useMemo } from "react";
import { AutopilotPopup } from "@/components/AutopilotPopup";
import { useNavigate } from "react-router-dom";
import StandardHeader from "@/components/StandardHeader";
import { UtilityActionButton } from "@/components/ui/utility-action-button";
import { ExpandableSearchButton } from "@/components/ui/expandable-search-button";
import { UniversalCalendarButton } from "@/components/UniversalCalendarButton";
import { DiscoverOrderActionPopup } from "@/components/discover/DiscoverOrderActionPopup";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthProvider";
import { useMyTickets, TicketPurchase } from "@/hooks/useEventTickets";
import { useMyVouchers } from "@/hooks/useVouchers";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { EventTicket } from "@/components/tickets/EventTicket";
import { format, isPast } from "date-fns";
import { cn } from "@/lib/utils";
import { StandardHorizontalCard, StandardHorizontalCardProps } from "@/components/ui/standard-horizontal-card";
import { useIsMobile } from "@/hooks/use-mobile";
import { MobileOrdersView, UnifiedMobileOrder } from "@/components/orders/MobileOrdersView";
import { useTranslation } from "@/hooks/useTranslation";

// Unified order type that handles products, services, and tickets
interface UnifiedOrder {
  id: string;
  title: string;
  provider: string;
  providerImage: string;
  price: string;
  status: string;
  type: 'product' | 'service' | 'ticket' | 'voucher';
  orderDate: string;
  rawDate: Date;
  trackingNumber?: string;
  eventDate?: Date;
  eventLocation?: string;
  ticketType?: string;
  ticketNumber?: string;
  quantity?: number;
  qrCodeToken?: string;
  ticketPurchase?: TicketPurchase;
}

type HistoryFilter = 'all' | 'events' | 'products' | 'services' | 'refunds' | 'vouchers';

export default function Orders() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { translate } = useTranslation();
  const { pendingCount, getLatestActions } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);
  const [masterActionOpen, setMasterActionOpen] = useState(false);
  const [cjOrders, setCjOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<TicketPurchase | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilter>('all');

  const { tickets, loading: ticketsLoading, refetch: refetchTickets } = useMyTickets();
  const { data: voucherOrders = [], isLoading: vouchersLoading, refetch: refetchVouchers } = useMyVouchers();

  // Mock ticket data for preview
  const mockTickets: TicketPurchase[] = [
    {
      id: "mock-1",
      event_id: "evt-1",
      ticket_type_id: "tt-1",
      buyer_id: user?.id || null,
      buyer_email: "user@example.com",
      buyer_name: "Sarah Johnson",
      quantity: 2,
      unit_price: 75,
      total_amount: 150,
      currency: "usd",
      status: "completed",
      qr_code_token: "MOCK-QR-TOKEN-001",
      ticket_number: "VTN-20250115-000042",
      checked_in_at: null,
      created_at: new Date().toISOString(),
      metadata: {},
      ticket_type: {
        id: "tt-1",
        event_id: "evt-1",
        name: "VIP Access",
        description: "Front row seating with meet & greet",
        price: 75,
        currency: "usd",
        quantity_available: 50,
        quantity_sold: 23,
        sale_start_date: null,
        sale_end_date: null,
        is_active: true,
        sort_order: 1
      },
      event: {
        id: "evt-1",
        title: "VITANA Wellness Summit 2025",
        start_time: "2025-01-15T18:00:00Z",
        location: "The Grand Wellness Center, San Francisco, CA",
        image_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800"
      }
    },
    {
      id: "mock-2",
      event_id: "evt-2",
      ticket_type_id: "tt-2",
      buyer_id: user?.id || null,
      buyer_email: "user@example.com",
      buyer_name: "Sarah Johnson",
      quantity: 1,
      unit_price: 25,
      total_amount: 25,
      currency: "usd",
      status: "completed",
      qr_code_token: "MOCK-QR-TOKEN-002",
      ticket_number: "VTN-20250120-000108",
      checked_in_at: null,
      created_at: new Date().toISOString(),
      metadata: {},
      ticket_type: {
        id: "tt-2",
        event_id: "evt-2",
        name: "General Admission",
        description: "Standard entry to the event",
        price: 25,
        currency: "usd",
        quantity_available: 100,
        quantity_sold: 67,
        sale_start_date: null,
        sale_end_date: null,
        is_active: true,
        sort_order: 1
      },
      event: {
        id: "evt-2",
        title: "Morning Yoga Flow",
        start_time: "2025-01-20T07:00:00Z",
        location: "Zen Garden Studio, Oakland, CA",
        image_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800"
      }
    },
    {
      id: "mock-3",
      event_id: "evt-3",
      ticket_type_id: "tt-3",
      buyer_id: user?.id || null,
      buyer_email: "user@example.com",
      buyer_name: "Sarah Johnson",
      quantity: 1,
      unit_price: 45,
      total_amount: 45,
      currency: "usd",
      status: "completed",
      qr_code_token: "MOCK-QR-TOKEN-003",
      ticket_number: "VTN-20241201-000015",
      checked_in_at: "2024-12-01T09:15:00Z",
      created_at: "2024-11-15T10:00:00Z",
      metadata: {},
      ticket_type: {
        id: "tt-3",
        event_id: "evt-3",
        name: "Early Bird",
        description: "Discounted early registration",
        price: 45,
        currency: "usd",
        quantity_available: 30,
        quantity_sold: 30,
        sale_start_date: null,
        sale_end_date: null,
        is_active: false,
        sort_order: 1
      },
      event: {
        id: "evt-3",
        title: "New Year Meditation Retreat",
        start_time: "2024-12-01T09:00:00Z",
        location: "Mountain Lodge Retreat Center, Lake Tahoe",
        image_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=800"
      }
    }
  ];

  // Use mock data when no real tickets exist
  const displayTickets = tickets.length > 0 ? tickets : mockTickets;
  const isShowingMockData = tickets.length === 0 && !ticketsLoading;

  useEffect(() => {
    if (user) {
      fetchCjOrders();
    }
  }, [user]);

  const fetchCjOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cj_orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCjOrders(data || []);
    } catch (error) {
      console.error('Error fetching CJ orders:', error);
    } finally {
      setLoading(false);
    }
  };

  // Transform ticket to unified order format
  const transformTicketToUnifiedOrder = (ticket: TicketPurchase): UnifiedOrder => {
    const eventDate = ticket.event ? new Date(ticket.event.start_time) : new Date();
    const isUpcoming = ticket.event && !isPast(eventDate);
    
    let status = 'upcoming';
    if (!isUpcoming) {
      status = ticket.checked_in_at ? 'attended' : 'expired';
    }
    if (ticket.status === 'refunded') status = 'refunded';
    if (ticket.status === 'cancelled') status = 'cancelled';
    
    return {
      id: ticket.id,
      title: ticket.event?.title || 'Event Ticket',
      provider: ticket.ticket_type?.name || 'General Admission',
      providerImage: ticket.event?.image_url || '/placeholder.svg',
      price: `$${ticket.total_amount}`,
      status,
      type: 'ticket',
      orderDate: format(new Date(ticket.created_at), 'MMM d, yyyy'),
      rawDate: new Date(ticket.created_at),
      eventDate,
      eventLocation: ticket.event?.location || 'Location TBD',
      ticketType: ticket.ticket_type?.name,
      ticketNumber: ticket.ticket_number,
      quantity: ticket.quantity,
      qrCodeToken: ticket.qr_code_token,
      ticketPurchase: ticket,
    };
  };

  // Transform CJ order to unified format
  const transformCJOrder = (order: any, isActive: boolean): UnifiedOrder => {
    return {
      id: order.id,
      title: order.order_items[0]?.item_name || 'CJ Product',
      provider: 'CJDropshipping',
      providerImage: order.order_items[0]?.item_image_url || '/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png',
      trackingNumber: order.tracking_number,
      price: `$${order.total_amount}`,
      status: order.status,
      type: 'product',
      orderDate: format(new Date(order.created_at), 'MMM d, yyyy'),
      rawDate: new Date(order.created_at),
    };
  };

  // Transform voucher order to unified format
  const transformVoucherOrder = (order: any): UnifiedOrder => {
    const tierNames: Record<string, string> = {
      test: 'Test Voucher',
      experience: 'Experience Voucher', 
      exclusive: 'Exclusive Voucher',
    };
    
    return {
      id: order.id,
      title: `Maxina ${tierNames[order.tier] || 'Gift Voucher'}`,
      provider: 'Maxina Gift Voucher',
      providerImage: '/lovable-uploads/7cca32ae-be17-4ab2-bc65-98257922207a.png',
      price: `€${(order.amount_cents / 100).toFixed(2)}`,
      status: order.status,
      type: 'voucher',
      orderDate: format(new Date(order.created_at), 'MMM d, yyyy'),
      rawDate: new Date(order.created_at),
    };
  };

  // Build unified order lists
  const { unifiedActiveOrders, allHistoryOrders } = useMemo(() => {
    const activeCjOrders = cjOrders
      .filter(order => !['delivered', 'cancelled'].includes(order.status))
      .map(o => transformCJOrder(o, true));

    const completedCjOrders = cjOrders
      .filter(order => ['delivered', 'cancelled'].includes(order.status))
      .map(o => transformCJOrder(o, false));

    const upcomingTickets = displayTickets
      .filter(t => t.event && !isPast(new Date(t.event.start_time)))
      .map(transformTicketToUnifiedOrder);

    const pastTickets = displayTickets
      .filter(t => t.event && isPast(new Date(t.event.start_time)))
      .map(transformTicketToUnifiedOrder);

    // Vouchers: paid are active (not pending!), completed/redeemed/expired are history
    const activeVouchers = voucherOrders
      .filter(v => v.status === 'paid')
      .map(transformVoucherOrder);
    
    const completedVouchers = voucherOrders
      .filter(v => ['completed', 'redeemed', 'expired', 'cancelled'].includes(v.status))
      .map(transformVoucherOrder);

    const active = [...activeCjOrders, ...upcomingTickets, ...activeVouchers]
      .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

    const history = [...completedCjOrders, ...pastTickets, ...completedVouchers]
      .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime());

    return { unifiedActiveOrders: active, allHistoryOrders: history };
  }, [cjOrders, displayTickets, voucherOrders]);

  // Transform to mobile order format
  const transformToMobileOrder = (order: UnifiedOrder, voucherOrder?: any): UnifiedMobileOrder => {
    const getStatusLabel = (status: string) => {
      const statusMap: Record<string, string> = {
        upcoming: 'Upcoming',
        attended: 'Attended',
        expired: 'Expired',
        completed: 'Completed',
        delivered: 'Delivered',
        cancelled: 'Cancelled',
        refunded: 'Refunded',
        shipped: 'In Transit',
        confirmed: 'Confirmed',
        pending: 'Pending',
        processing: 'Processing',
        paid: 'Active',
        active: 'Active',
      };
      return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
    };

    return {
      id: order.id,
      title: order.title,
      subtitle: order.provider,
      imageUrl: order.providerImage,
      price: order.price,
      status: order.status,
      statusLabel: getStatusLabel(order.status),
      type: order.type,
      orderDate: order.orderDate,
      rawDate: order.rawDate,
      eventDate: order.eventDate,
      eventLocation: order.eventLocation,
      ticketNumber: order.ticketNumber,
      quantity: order.quantity,
      qrCodeToken: order.qrCodeToken,
      ticketPurchase: order.ticketPurchase,
      voucherOrder: voucherOrder,
      orderId: order.id,
    };
  };

  // Build mobile order lists
  const { mobileActiveOrders, mobileHistoryOrders } = useMemo(() => {
    const activeMobile = unifiedActiveOrders.map(order => {
      const vOrder = order.type === 'voucher' 
        ? voucherOrders.find(v => v.id === order.id) 
        : undefined;
      return transformToMobileOrder(order, vOrder);
    });
    
    const historyMobile = allHistoryOrders.map(order => {
      const vOrder = order.type === 'voucher' 
        ? voucherOrders.find(v => v.id === order.id) 
        : undefined;
      return transformToMobileOrder(order, vOrder);
    });
    
    return { mobileActiveOrders: activeMobile, mobileHistoryOrders: historyMobile };
  }, [unifiedActiveOrders, allHistoryOrders, voucherOrders]);

  // Apply history filter
  const unifiedHistoryOrders = useMemo(() => {
    return allHistoryOrders.filter(order => {
      if (historyFilter === 'all') return true;
      if (historyFilter === 'events') return order.type === 'ticket';
      if (historyFilter === 'products') return order.type === 'product';
      if (historyFilter === 'services') return order.type === 'service';
      if (historyFilter === 'vouchers') return order.type === 'voucher';
      if (historyFilter === 'refunds') return order.status === 'refunded' || order.status === 'cancelled';
      return true;
    });
  }, [allHistoryOrders, historyFilter]);


  // Transform to StandardHorizontalCard props
  const transformToCardProps = (order: UnifiedOrder): StandardHorizontalCardProps => {
    const categoryLabel = order.type === 'ticket' ? 'Event' : 
                          order.type === 'product' ? 'Product' : 'Service';
    
    const dateInfo = order.type === 'ticket' && order.eventDate
      ? format(order.eventDate, 'MMM d, yyyy • h:mm a')
      : order.orderDate;
    
    const orderId = order.type === 'ticket' 
      ? order.ticketNumber?.slice(0, 12) 
      : order.id.slice(0, 8);

    const description = `${categoryLabel} • ${dateInfo} • #${orderId}`;

    // Status badge mapping
    const getStatusBadge = (): { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' } => {
      const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
        upcoming: { label: 'Upcoming', variant: 'default' },
        attended: { label: 'Attended', variant: 'secondary' },
        expired: { label: 'Expired', variant: 'outline' },
        completed: { label: 'Completed', variant: 'secondary' },
        delivered: { label: 'Delivered', variant: 'secondary' },
        cancelled: { label: 'Cancelled', variant: 'destructive' },
        refunded: { label: 'Refunded', variant: 'destructive' },
        shipped: { label: 'In Transit', variant: 'default' },
        confirmed: { label: 'Confirmed', variant: 'default' },
        pending: { label: 'Pending', variant: 'outline' },
        processing: { label: 'Processing', variant: 'outline' },
      };
      return statusMap[order.status] || { label: order.status, variant: 'outline' };
    };

    const statusBadge = getStatusBadge();

    // Primary action based on type
    const getPrimaryAction = () => {
      if (order.type === 'ticket' && order.ticketPurchase) {
        return {
          label: 'View Ticket',
          onClick: () => setSelectedTicket(order.ticketPurchase!),
          variant: 'ghost' as const,
          icon: <Ticket className="h-3.5 w-3.5" />,
        };
      }
      return {
        label: 'Details',
        onClick: () => console.log('View details', order.id),
        variant: 'ghost' as const,
        icon: <Receipt className="h-3.5 w-3.5" />,
      };
    };

    // Icon based on type
    const getIcon = () => {
      if (order.providerImage && order.providerImage !== '/placeholder.svg') {
        return (
          <img 
            src={order.providerImage} 
            alt={order.title}
            className="w-10 h-10 rounded-lg object-cover shadow-sm"
          />
        );
      }
      if (order.type === 'ticket') return '🎫';
      if (order.type === 'product') return '📦';
      if (order.type === 'voucher') return '🎁';
      return '🩺';
    };

    return {
      id: order.id,
      screenId: 'ORDERS',
      icon: getIcon(),
      title: order.title,
      description,
      badges: [statusBadge],
      metadata: [{ icon: null, text: order.price }],
      primaryAction: getPrimaryAction(),
      layoutMode: 'stack',
      density: 'compact',
    };
  };

  // Segmented filter controls for History tab
  const HistoryFilterRow = () => {
    const filterKeys: HistoryFilter[] = ['all', 'events', 'products', 'vouchers', 'services', 'refunds'];

    return (
      <div className="flex gap-1 p-1 bg-card/40 backdrop-blur-xl rounded-xl border border-border/20 w-fit mb-4">
        {filterKeys.map(key => (
          <button
            key={key}
            onClick={() => setHistoryFilter(key)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-200",
              historyFilter === key 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            )}
          >
            {translate(`orders.filters.${key}`)}
          </button>
        ))}
      </div>
    );
  };

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-[88px] rounded-xl bg-muted/20 animate-pulse" />
      ))}
    </div>
  );

  const isLoading = loading || ticketsLoading || vouchersLoading;

  // Mobile view
  if (isMobile) {
    return (
      <AppLayout>
        <MobileOrdersView
          activeOrders={mobileActiveOrders}
          historyOrders={mobileHistoryOrders}
          isLoading={isLoading}
          isShowingMockData={isShowingMockData}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <SEO title="Orders | Discover" description="Track your wellness service bookings and product orders" canonical={window.location.href} />
      <SubNavigation items={discoverNavigation} />
      <div className="p-6 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 dark:from-background dark:via-background dark:to-background min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <StandardHeader
            title={translate('orders.myOrders')}
            description={translate('orders.trackDescription')}
            emoji="📦"
          />

          <UtilityActionButton
            trailingElement={
              <Button 
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => window.location.reload()}
                title="Refresh page"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            }
          >
            <ExpandableSearchButton 
              placeholder={translate('orders.searchPlaceholder')}
            />
            <UniversalCalendarButton />
          </UtilityActionButton>

          {/* Mock data indicator */}
          {isShowingMockData && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                {translate('orders.sampleData')}
              </Badge>
              <span className="text-sm text-amber-700 dark:text-amber-400">
                {translate('orders.previewNotice')}
              </span>
            </div>
          )}

          {/* Orders Content */}
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-card/60 backdrop-blur-sm rounded-xl p-1 border border-border/20">
              <TabsTrigger 
                value="active" 
                className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <Clock className="h-4 w-4" />
                {translate('orders.tabs.active')} ({unifiedActiveOrders.length})
              </TabsTrigger>
              <TabsTrigger 
                value="history" 
                className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm"
              >
                <CheckCircle className="h-4 w-4" />
                {translate('orders.tabs.history')} ({allHistoryOrders.length})
              </TabsTrigger>
            </TabsList>
            
            {/* Active Orders Tab */}
            <TabsContent value="active" className="space-y-3">
              {isLoading ? (
                <LoadingSkeleton />
              ) : unifiedActiveOrders.length > 0 ? (
                <div className="space-y-3">
                  {unifiedActiveOrders.map(order => (
                    <StandardHorizontalCard
                      key={order.id}
                      {...transformToCardProps(order)}
                    />
                  ))}
                </div>
              ) : (
                <Card className="bg-card/70 backdrop-blur-xl border-border/30 rounded-2xl">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
                      <Package className="w-8 h-8 text-muted-foreground/60" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{translate('orders.emptyActive.title')}</h3>
                    <p className="text-muted-foreground mb-4">{translate('orders.emptyActive.description')}</p>
                    <div className="flex gap-3 justify-center">
                      <Button onClick={() => navigate('/discover')}>
                        {translate('orders.browseProducts')}
                      </Button>
                      <Button variant="outline" onClick={() => navigate('/comm/events-meetups')}>
                        {translate('orders.findEvents')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            {/* History Tab */}
            <TabsContent value="history" className="space-y-3">
              <HistoryFilterRow />
              
              {isLoading ? (
                <LoadingSkeleton />
              ) : unifiedHistoryOrders.length > 0 ? (
                <div className="space-y-3">
                  {unifiedHistoryOrders.map(order => (
                    <StandardHorizontalCard
                      key={order.id}
                      {...transformToCardProps(order)}
                    />
                  ))}
                </div>
              ) : (
                <Card className="bg-card/70 backdrop-blur-xl border-border/30 rounded-2xl">
                  <CardContent className="p-8 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-muted-foreground/60" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {historyFilter === 'all' 
                        ? translate('orders.emptyHistory.title') 
                        : translate('orders.noFilter', translate(`orders.filters.${historyFilter}`))}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {historyFilter === 'all' 
                        ? translate('orders.emptyHistory.description')
                        : translate('orders.noFilterDesc', translate(`orders.filters.${historyFilter}`))}
                    </p>
                    <Button onClick={() => navigate('/discover')}>
                      {translate('orders.startShopping')}
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Ticket Detail Dialog */}
          <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
            <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl border-0 bg-transparent shadow-none [&>button]:hidden">
              {selectedTicket && selectedTicket.event && (
                <EventTicket
                  eventTitle={selectedTicket.event.title}
                  eventDate={new Date(selectedTicket.event.start_time)}
                  eventLocation={selectedTicket.event.location || 'Location TBD'}
                  ticketType={selectedTicket.ticket_type?.name || 'General'}
                  ticketNumber={selectedTicket.ticket_number}
                  buyerName={selectedTicket.buyer_name}
                  quantity={selectedTicket.quantity}
                  qrCodeData={selectedTicket.qr_code_token}
                  eventImageUrl={selectedTicket.event.image_url}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <AutopilotPopup 
        open={autopilotOpen}
        onOpenChange={setAutopilotOpen}
      />
      <DiscoverOrderActionPopup 
        open={masterActionOpen}
        onOpenChange={setMasterActionOpen}
      />
    </AppLayout>
  );
}
