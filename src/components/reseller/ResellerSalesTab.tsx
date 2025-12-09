import { useResellerSales } from "@/hooks/useResellerSales";
import { useResellerProfile } from "@/hooks/useResellerProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Loader2, Ticket, DollarSign, TrendingUp, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

  const commissionRate = profile?.commission_rate || 15;
  const estimatedCommission = (sales.totalGrossRevenue * commissionRate) / 100;

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
                <p className="text-sm text-muted-foreground">Total Tickets Sold</p>
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
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(sales.totalGrossRevenue)}</p>
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
                <p className="text-2xl font-bold">{formatCurrency(sales.revenue30Days)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                <Info className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Est. Commission ({commissionRate}%)</p>
                <p className="text-2xl font-bold text-amber-600">{formatCurrency(estimatedCommission)}</p>
                <p className="text-xs text-muted-foreground">Paid manually by finance</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Event Sales Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Sales by Event</CardTitle>
        </CardHeader>
        <CardContent>
          {sales.eventSales.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No sales recorded yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Tickets Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.eventSales.map((event) => (
                  <TableRow key={event.eventId}>
                    <TableCell className="font-medium">{event.eventTitle}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(event.eventDate), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary">{event.ticketsSold}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(event.grossRevenue)}
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
