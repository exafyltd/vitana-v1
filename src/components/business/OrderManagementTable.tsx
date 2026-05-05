import { format } from "date-fns";
import { Search, Check, X, MoreHorizontal, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrderManagement, TicketOrder } from "@/hooks/useOrderManagement";
import { Skeleton } from "@/components/ui/skeleton";
import { t } from '@/lib/i18n-toast';

interface OrderManagementTableProps {
  eventId: string;
  onSelectOrder: (order: TicketOrder) => void;
}

export function OrderManagementTable({
  eventId,
  onSelectOrder,
}: OrderManagementTableProps) {
  const { orders, loading, error, searchQuery, setSearchQuery } =
    useOrderManagement(eventId);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[300px] w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{error}</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <Check className="w-3 h-3 mr-1" />
            {t('screens.business.paid')}
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">{t('screens.business.pending')}</Badge>
        );
      case "refunded":
        return (
          <Badge variant="destructive">
            <X className="w-3 h-3 mr-1" />
            {t('screens.business.refunded')}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t('screens.business.searchByOrderNameEmail')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      {orders.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border rounded-lg">
          <p>{searchQuery ? "No orders match your search" : "No orders yet"}</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="font-semibold">{t('screens.business.order')}</TableHead>
                <TableHead className="font-semibold">{t('screens.business.buyer')}</TableHead>
                <TableHead className="font-semibold">{t('screens.business.ticketType')}</TableHead>
                <TableHead className="font-semibold">{t('screens.business.date')}</TableHead>
                <TableHead className="font-semibold text-right">{t('screens.business.total')}</TableHead>
                <TableHead className="font-semibold">{t('screens.business.status')}</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow
                  key={order.id}
                  className="cursor-pointer hover:bg-muted/30"
                  onClick={() => onSelectOrder(order)}
                >
                  <TableCell className="font-mono text-sm">
                    {order.ticket_number}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.buyer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.buyer_email}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {order.ticket_type_name}
                    </Badge>
                    {order.quantity > 1 && (
                      <span className="ml-1 text-muted-foreground">
                        ×{order.quantity}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(order.created_at), "MMM d, h:mm a")}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    ${order.total_amount.toFixed(2)}
                  </TableCell>
                  <TableCell>{getStatusBadge(order.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onSelectOrder(order)}>
                          <Eye className="w-4 h-4 mr-2" />
                          {t('screens.business.viewDetails')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Results count */}
      {orders.length > 0 && (
        <p className="text-sm text-muted-foreground">{t('screens.business.showingLengthOrderValue1', { length: orders.length, value1: orders.length !== 1 ? "s" : "" })}</p>
      )}
    </div>
  );
}
