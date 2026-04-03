import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/hooks/useTranslation';
import { format, isPast } from 'date-fns';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  ChevronRight,
  Calendar,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TicketPurchase } from '@/hooks/useEventTickets';
import { MobileOrderDetailSheet } from './MobileOrderDetailSheet';
import { UtilityActionButton } from '@/components/ui/utility-action-button';
import { ExpandableSearchButton } from '@/components/ui/expandable-search-button';
import { MobileModePill, ModeOption } from '@/components/ui/MobileModePill';
import { UniversalCalendarButton } from '@/components/UniversalCalendarButton';
import StandardHeader from '@/components/StandardHeader';
import { VitanaIndexChip, AutopilotChip } from '@/components/mobile/MobileActionChips';
import { useAutopilot } from '@/hooks/use-autopilot';
import { AutopilotPopup } from '@/components/AutopilotPopup';

// Unified order type
export interface UnifiedMobileOrder {
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string;
  price: string;
  status: string;
  statusLabel: string;
  type: 'ticket' | 'voucher' | 'product' | 'service';
  orderDate: string;
  rawDate: Date;
  eventDate?: Date;
  eventLocation?: string;
  ticketNumber?: string;
  quantity?: number;
  qrCodeToken?: string;
  ticketPurchase?: TicketPurchase;
  voucherOrder?: any;
  orderId?: string;
}

interface MobileOrdersViewProps {
  activeOrders: UnifiedMobileOrder[];
  historyOrders: UnifiedMobileOrder[];
  isLoading: boolean;
  isShowingMockData?: boolean;
  onRefresh: () => void;
}

export function MobileOrdersView({ 
  activeOrders, 
  historyOrders, 
  isLoading,
  isShowingMockData,
  onRefresh 
}: MobileOrdersViewProps) {
  const navigate = useNavigate();
  const { translate } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<UnifiedMobileOrder | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { pendingCount } = useAutopilot();
  const [autopilotOpen, setAutopilotOpen] = useState(false);

  // Filter orders based on search
  const filteredActiveOrders = useMemo(() => {
    if (!searchQuery) return activeOrders;
    const query = searchQuery.toLowerCase();
    return activeOrders.filter(order => 
      order.title.toLowerCase().includes(query) ||
      order.subtitle.toLowerCase().includes(query) ||
      order.ticketNumber?.toLowerCase().includes(query)
    );
  }, [activeOrders, searchQuery]);

  const filteredHistoryOrders = useMemo(() => {
    if (!searchQuery) return historyOrders;
    const query = searchQuery.toLowerCase();
    return historyOrders.filter(order => 
      order.title.toLowerCase().includes(query) ||
      order.subtitle.toLowerCase().includes(query) ||
      order.ticketNumber?.toLowerCase().includes(query)
    );
  }, [historyOrders, searchQuery]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Status badge styling
  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'outline' | 'destructive' => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      upcoming: 'default',
      active: 'default',
      paid: 'default',
      confirmed: 'default',
      shipped: 'default',
      attended: 'secondary',
      completed: 'secondary',
      delivered: 'secondary',
      redeemed: 'secondary',
      expired: 'outline',
      pending: 'outline',
      processing: 'outline',
      cancelled: 'destructive',
      refunded: 'destructive',
    };
    return variants[status] || 'outline';
  };

  // Get icon for order type
  const getOrderIcon = (order: UnifiedMobileOrder) => {
    if (order.imageUrl && order.imageUrl !== '/placeholder.svg') {
      return (
        <img 
          src={order.imageUrl} 
          alt={order.title}
          className="w-14 h-14 rounded-xl object-cover"
        />
      );
    }
    
    const iconClass = "w-6 h-6 text-muted-foreground";
    switch (order.type) {
      case 'ticket':
        return <div className="w-14 h-14 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">🎫</div>;
      case 'voucher':
        return <div className="w-14 h-14 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">🎁</div>;
      case 'product':
        return <div className="w-14 h-14 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">📦</div>;
      default:
        return <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">🩺</div>;
    }
  };

  // Order card component
  const OrderCard = ({ order }: { order: UnifiedMobileOrder }) => (
    <button
      onClick={() => setSelectedOrder(order)}
      className="w-full text-left bg-card/70 backdrop-blur-sm border border-border/30 rounded-xl p-4 hover:bg-accent/5 active:scale-[0.99] transition-all"
    >
      <div className="flex gap-3">
        {/* Order Image/Icon */}
        {getOrderIcon(order)}

        {/* Details */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground line-clamp-1 text-sm">
              {order.title}
            </h3>
            <Badge variant={getStatusBadgeVariant(order.status)} className="shrink-0 text-[10px] px-2 py-0.5">
              {order.statusLabel}
            </Badge>
          </div>
          
          <p className="text-xs text-muted-foreground line-clamp-1">
            {order.subtitle}
          </p>
          
          {/* Meta info */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {order.eventDate ? format(order.eventDate, 'MMM d') : order.orderDate}
            </span>
            
            {order.eventLocation && (
              <span className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{order.eventLocation}</span>
              </span>
            )}
          </div>

          {/* Price and quantity */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-bold text-foreground">{order.price}</span>
            {order.quantity && order.quantity > 1 && (
              <span className="text-xs text-muted-foreground">
                × {order.quantity}
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="h-5 w-5 text-muted-foreground self-center shrink-0" />
      </div>
    </button>
  );

  // Empty state component
  const EmptyState = ({ type }: { type: 'active' | 'history' }) => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-4">
        {type === 'active' ? (
          <Package className="w-8 h-8 text-muted-foreground/60" />
        ) : (
          <CheckCircle className="w-8 h-8 text-muted-foreground/60" />
        )}
      </div>
      <h3 className="text-base font-semibold text-foreground mb-1">
        {type === 'active' 
          ? translate('orders.emptyActive.title') 
          : translate('orders.emptyHistory.title')}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {type === 'active' 
          ? translate('orders.emptyActive.description')
          : translate('orders.emptyHistory.description')}
      </p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => navigate('/discover')}>
          {translate('orders.browseProducts')}
        </Button>
        <Button size="sm" variant="outline" onClick={() => navigate('/comm/events-meetups')}>
          {translate('orders.findEvents')}
        </Button>
      </div>
    </div>
  );

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className="space-y-3">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-[100px] rounded-xl bg-muted/20 animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Standard Header - scrolls with content */}
      <div className="px-4">
        <StandardHeader 
          title={translate('orders.myOrders')} 
          description={translate('orders.trackDescription')}
          emoji="📦"
        />
      </div>

      {/* Sticky utility bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/20">
        <div className="px-4">
          <UtilityActionButton 
            className="min-w-0"
            trailingElement={
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-muted/60 shrink-0"
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
              </Button>
            }
            afterGiftVoucherChildren={
              <>
                <VitanaIndexChip />
                <AutopilotChip pendingCount={pendingCount} onClick={() => setAutopilotOpen(true)} />
              </>
            }
          >
            <div className="flex items-center gap-2 min-w-max">
              <ExpandableSearchButton 
                placeholder={translate('orders.searchPlaceholder')} 
                onSearch={(query) => setSearchQuery(query)}
              />
              <UniversalCalendarButton />
            </div>
          </UtilityActionButton>
        </div>
      </div>
      {isShowingMockData && (
        <div className="mx-4 mt-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700 text-[10px]">
            {translate('orders.sampleData')}
          </Badge>
          <span className="text-xs text-amber-700 dark:text-amber-400">
            {translate('orders.previewNotice')}
          </span>
        </div>
      )}

      {/* Tabs content */}
      <div className="px-4 pt-4">
        <SplitBar defaultValue="active" className="w-full">
          <SplitBarList className="mb-4">
            <SplitBarTrigger value="active" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {translate('orders.tabs.active')} ({filteredActiveOrders.length})
            </SplitBarTrigger>
            <SplitBarTrigger value="history" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {translate('orders.tabs.history')} ({filteredHistoryOrders.length})
            </SplitBarTrigger>
          </SplitBarList>

          <SplitBarContent value="active" className="space-y-3">
            {isLoading ? (
              <LoadingSkeleton />
            ) : filteredActiveOrders.length > 0 ? (
              filteredActiveOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))
            ) : (
              <EmptyState type="active" />
            )}
          </SplitBarContent>

          <SplitBarContent value="history" className="space-y-3">
            {isLoading ? (
              <LoadingSkeleton />
            ) : filteredHistoryOrders.length > 0 ? (
              filteredHistoryOrders.map(order => (
                <OrderCard key={order.id} order={order} />
              ))
            ) : (
              <EmptyState type="history" />
            )}
          </SplitBarContent>
        </SplitBar>
      </div>

      {/* Order Detail Sheet */}
      <MobileOrderDetailSheet
        order={selectedOrder}
        open={!!selectedOrder}
        onOpenChange={(open) => !open && setSelectedOrder(null)}
      />
      <AutopilotPopup open={autopilotOpen} onOpenChange={setAutopilotOpen} />
    </div>
  );
}
