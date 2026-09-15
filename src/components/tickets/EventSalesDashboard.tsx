import React, { useState, useEffect } from "react";
import { 
  Ticket, 
  DollarSign, 
  Users, 
  Download, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { t } from '@/lib/i18n-toast';

import { formatDate } from '@/lib/locale-format';
interface TicketSale {
  id: string;
  buyer_name: string;
  buyer_email: string;
  quantity: number;
  total_amount: number;
  status: string;
  ticket_number: string;
  checked_in_at: string | null;
  created_at: string;
  ticket_type: {
    name: string;
    price: number;
  } | null;
}

interface TicketTypeSummary {
  id: string;
  name: string;
  price: number;
  quantity_available: number;
  quantity_sold: number;
}

interface EventSalesDashboardProps {
  eventId: string;
  eventTitle: string;
}

export function EventSalesDashboard({ eventId, eventTitle }: EventSalesDashboardProps) {
  const [sales, setSales] = useState<TicketSale[]>([]);
  const [ticketTypes, setTicketTypes] = useState<TicketTypeSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSalesData();
  }, [eventId]);

  const fetchSalesData = async () => {
    setLoading(true);

    // Fetch ticket types
    const { data: types, error: typesError } = await supabase
      .from("event_ticket_types")
      .select("id, name, price, quantity_available, quantity_sold")
      .eq("event_id", eventId)
      .order("sort_order");

    if (typesError) {
      console.error("Error fetching ticket types for event", eventId, typesError);
    }

    // Fetch purchases
    const { data: purchases, error: purchasesError } = await supabase
      .from("event_ticket_purchases")
      .select(`
        id,
        buyer_name,
        buyer_email,
        quantity,
        total_amount,
        status,
        ticket_number,
        checked_in_at,
        created_at,
        ticket_type:event_ticket_types(name, price)
      `)
      .eq("event_id", eventId)
      .order("created_at", { ascending: false });

    if (purchasesError) {
      console.error("Error fetching ticket purchases for event", eventId, purchasesError);
    }

    setTicketTypes(types || []);
    setSales((purchases as TicketSale[]) || []);
    setLoading(false);
  };

  // Calculate stats
  const completedSales = sales.filter(s => s.status === "completed");
  const totalRevenue = completedSales.reduce((sum, s) => sum + s.total_amount, 0);
  const totalTicketsSold = completedSales.reduce((sum, s) => sum + s.quantity, 0);
  const totalTicketsAvailable = ticketTypes.reduce((sum, t) => sum + t.quantity_available, 0);
  const checkedInCount = completedSales.filter(s => s.checked_in_at).length;

  const exportToCSV = () => {
    const headers = ["Ticket #", "Name", "Email", "Ticket Type", "Qty", "Amount", "Status", "Checked In", "Purchase Date"];
    const rows = completedSales.map(sale => [
      sale.ticket_number,
      sale.buyer_name,
      sale.buyer_email,
      sale.ticket_type?.name || "Unknown",
      sale.quantity,
      `$${sale.total_amount.toFixed(2)}`,
      sale.status,
      sale.checked_in_at ? "Yes" : "No",
      formatDate(new Date(sale.created_at), "yyyy-MM-dd HH:mm")
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${eventTitle.replace(/[^a-z0-9]/gi, "_")}_sales.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('screens.tickets.revenue')}</p>
                <p className="text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Ticket className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('screens.tickets.ticketsSold')}</p>
                <p className="text-2xl font-bold">{totalTicketsSold}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('screens.tickets.buyers')}</p>
                <p className="text-2xl font-bold">{completedSales.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <CheckCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('screens.tickets.checked')}</p>
                <p className="text-2xl font-bold">{checkedInCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ticket Type Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('screens.tickets.salesByTicketType')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticketTypes.map((type) => {
            const soldPercent = type.quantity_available > 0 
              ? (type.quantity_sold / type.quantity_available) * 100 
              : 0;
            const typeRevenue = type.quantity_sold * type.price;

            return (
              <div key={type.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{type.name}</span>
                  <span className="text-muted-foreground">{t('screens.tickets.quantity_soldQuantity_availableSold', { quantity_sold: type.quantity_sold, quantity_available: type.quantity_available })}
                  </span>
                </div>
                <Progress value={soldPercent} className="h-2" />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t('screens.tickets.value0Each', { value0: type.price.toFixed(2) })}</span>
                  <span className="font-medium text-foreground">{t('screens.tickets.value0Revenue', { value0: typeRevenue.toFixed(2) })}
                  </span>
                </div>
              </div>
            );
          })}

          {ticketTypes.length === 0 && (
            <p className="text-center text-muted-foreground py-4">{t('screens.tickets.noTicketTypesConfigured')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Buyer List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4" />{t('screens.tickets.ticketBuyersLength', { length: completedSales.length })}
            </CardTitle>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              {t('screens.tickets.exportCsv')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {completedSales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{sale.buyer_name}</p>
                      {sale.checked_in_at && (
                        <Badge variant="secondary" className="text-xs bg-green-500/10 text-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t('screens.tickets.checked')}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {sale.buyer_email}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{sale.ticket_type?.name || "Ticket"}</span>
                      <span>•</span>
                      <span>x{sale.quantity}</span>
                      <span>•</span>
                      <span>{formatDate(new Date(sale.created_at), "MMM d, h:mm a")}</span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-semibold">${sale.total_amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {sale.ticket_number}
                    </p>
                  </div>
                </div>
              ))}

              {completedSales.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Ticket className="h-12 w-12 mx-auto mb-2 opacity-30" />
                  <p>{t('screens.tickets.noTicketSalesYet')}</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
