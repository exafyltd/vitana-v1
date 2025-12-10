import { useResellerSales } from "@/hooks/useResellerSales";
import { useResellerProfile } from "@/hooks/useResellerProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Loader2, Ticket, DollarSign, TrendingUp, Award, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * RESELLER SALES TAB
 * 
 * Displays attributed sales from reseller_attributions table.
 * Shows commissions earned, NOT organizer revenue.
 * Client Events (Producer Mode) are highlighted with a badge.
 */
export function ResellerSalesTab() {
  const { data: sales, isLoading } = useResellerSales();
  const { data: profile } = useResellerProfile();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!sales) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Ticket className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tickets Sold</p>
                <p className="text-2xl font-bold">{sales.totalTicketsSold}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sales</p>
                <p className="text-2xl font-bold">{formatCurrency(sales.totalSaleAmount)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last 30 Days</p>
                <p className="text-2xl font-bold">{formatCurrency(sales.saleAmount30Days)}</p>
                <p className="text-xs text-muted-foreground">{sales.ticketsSold30Days} tickets</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Award className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Commission Earned</p>
                <p className="text-2xl font-bold text-accent">{formatCurrency(sales.totalCommissionEarned)}</p>
                <p className="text-xs text-muted-foreground">Paid manually by finance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Event Sales Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Attributed Sales by Event</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.eventSales.length === 0 ? (
            <div className="text-center py-8">
              <Ticket className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                No attributed sales yet
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Share your reseller links to start earning commissions
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Tickets</TableHead>
                  <TableHead className="text-right">Sales</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.eventSales.map((event) => (
                  <TableRow key={event.eventId}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{event.eventTitle}</span>
                          {event.isClientEvent && (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs gap-1">
                              <Briefcase className="h-3 w-3" />
                              Client Event
                            </Badge>
                          )}
                        </div>
                        {event.clientName && (
                          <span className="text-xs text-muted-foreground">Client: {event.clientName}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {event.eventDate ? format(new Date(event.eventDate), "MMM d, yyyy") : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{event.ticketsSold}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(event.saleAmount)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-accent">
                      {formatCurrency(event.commissionAmount)}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({event.commissionRate}%)
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
