import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { format, formatDistanceToNow } from "date-fns";
import { Calendar, Info, Receipt, Loader2, Wallet, Clock, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useResellerProfile } from "@/hooks/useResellerProfile";
import { mockTransactionsByEventId } from "@/lib/mocks/mockResellerSales";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { t } from '@/lib/i18n-toast';

interface SalesDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    eventId: string;
    eventTitle: string;
    eventDate: string;
    ticketsSold: number;
    saleAmount: number;
    commissionAmount: number;
    commissionRate: number;
  } | null;
  useMock?: boolean;
}

interface Transaction {
  id: string;
  saleAmount: number;
  commissionAmount: number;
  createdAt: string;
  ticketQuantity: number;
  payoutId: string | null;
  payoutStatus: string | null;
  paidAt: string | null;
}

interface PayoutInfo {
  isPaid: boolean;
  paidAt: string | null;
  payoutId: string | null;
}

export function SalesDetailDrawer({ open, onOpenChange, event, useMock }: SalesDetailDrawerProps) {
  const { data: resellerProfile } = useResellerProfile();
  const navigate = useNavigate();

  // Fetch transactions with payout info
  const { data: transactions, isLoading } = useQuery({
    queryKey: ["reseller-event-transactions", event?.eventId, resellerProfile?.id, useMock],
    queryFn: async (): Promise<Transaction[]> => {
      // Return mock transactions if mock mode is enabled
      if (useMock && event?.eventId) {
        const mockTxs = mockTransactionsByEventId[event.eventId] || [];
        return mockTxs.map(tx => ({
          ...tx,
          payoutId: "mock-payout",
          payoutStatus: "paid_to_wallet",
          paidAt: "2024-09-12T10:00:00Z"
        }));
      }

      if (!event?.eventId || !resellerProfile?.id) return [];

      const { data: attributions, error } = await supabase
        .from("reseller_attributions")
        .select(`
          id,
          sale_amount,
          commission_amount,
          created_at,
          ticket_purchase_id,
          payout_id,
          reseller_payouts:payout_id (
            status,
            paid_at
          )
        `)
        .eq("reseller_id", resellerProfile.id)
        .eq("event_id", event.eventId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching transactions:", error);
        return [];
      }

      // Fetch ticket quantities
      const purchaseIds = attributions?.map(a => a.ticket_purchase_id) || [];
      const { data: purchases } = await supabase
        .from("event_ticket_purchases")
        .select("id, quantity")
        .in("id", purchaseIds);

      const purchaseMap = new Map(purchases?.map(p => [p.id, p.quantity || 1]) || []);

      return (attributions || []).map(attr => {
        const payout = attr.reseller_payouts as any;
        return {
          id: attr.id,
          saleAmount: Number(attr.sale_amount) || 0,
          commissionAmount: Number(attr.commission_amount) || 0,
          createdAt: attr.created_at,
          ticketQuantity: purchaseMap.get(attr.ticket_purchase_id) || 1,
          payoutId: attr.payout_id,
          payoutStatus: payout?.status || null,
          paidAt: payout?.paid_at || null,
        };
      });
    },
    enabled: open && !!event?.eventId && (useMock || !!resellerProfile?.id),
  });

  // Derive payout info from transactions
  const payoutInfo: PayoutInfo = (() => {
    if (!transactions || transactions.length === 0) {
      return { isPaid: false, paidAt: null, payoutId: null };
    }
    
    // Check if all transactions are paid
    const allPaid = transactions.every(tx => tx.payoutStatus === "paid_to_wallet");
    const anyPaid = transactions.find(tx => tx.payoutStatus === "paid_to_wallet");
    
    if (allPaid && anyPaid) {
      return {
        isPaid: true,
        paidAt: anyPaid.paidAt,
        payoutId: anyPaid.payoutId
      };
    }
    
    return { isPaid: false, paidAt: null, payoutId: null };
  })();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (!event) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-border/40">
          <SheetTitle className="text-left">{t('screens.reseller.salesDetails')}</SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Event Header */}
          <div className="space-y-2">
            <h3 className="font-semibold text-lg leading-tight">{event.eventTitle}</h3>
            {event.eventDate && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{format(new Date(event.eventDate), "MMMM d, yyyy")}</span>
              </div>
            )}
          </div>

          {/* Commission Logic */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span>{t('screens.reseller.commissionLogic')}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              You earn <span className="font-medium text-foreground">{event.commissionRate}%</span> per ticket sold via your reseller link. 
              Commission is calculated on gross ticket price before platform fees.
            </p>
          </div>

          {/* Payout Status */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <span>{t('screens.reseller.payoutStatus')}</span>
            </div>
            {payoutInfo.isPaid ? (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Paid to Wallet
                </Badge>
                {payoutInfo.paidAt && (
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(payoutInfo.paidAt), "MMM d, yyyy")}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
                <span className="text-xs text-muted-foreground">{t('screens.reseller.includedNextPayoutCycle')}</span>
              </div>
            )}
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate("/wallet?filter=reseller_commission")}
            >
              View in Wallet →
            </Button>
          </div>

          {/* Transactions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span>Transactions</span>
            </div>
            
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : transactions && transactions.length > 0 ? (
              <div className="space-y-2">
                {transactions.map((tx) => (
                  <div 
                    key={tx.id} 
                    className="flex items-center justify-between py-3 px-4 bg-card rounded-lg border border-border/40"
                  >
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">
                        {tx.ticketQuantity} ticket{tx.ticketQuantity > 1 ? "s" : ""} · {formatCurrency(tx.saleAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-accent">
                        +{formatCurrency(tx.commissionAmount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No transactions found
              </p>
            )}
          </div>

          {/* Summary Footer */}
          <div className="bg-accent/10 rounded-xl p-4 space-y-3 border border-accent/20">
            <h4 className="text-sm font-medium">Summary</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{t('screens.reseller.totalTickets')}</p>
                <p className="text-lg font-semibold">{event.ticketsSold}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('screens.reseller.totalCommission')}</p>
                <p className="text-lg font-semibold text-accent">{formatCurrency(event.commissionAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
