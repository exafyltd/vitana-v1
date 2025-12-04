import { useState } from "react";
import { format } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, MapPin, Calendar, DollarSign, Ticket, Users, UserCheck } from "lucide-react";
import { OrganizerEvent } from "@/hooks/useOrganizerEvents";
import { OrderManagementTable } from "./OrderManagementTable";
import { OrderDetailView } from "./OrderDetailView";
import { TicketOrder } from "@/hooks/useOrderManagement";

interface OrganizerEventSalesSheetProps {
  event: OrganizerEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrganizerEventSalesSheet({
  event,
  open,
  onOpenChange,
}: OrganizerEventSalesSheetProps) {
  const [selectedOrder, setSelectedOrder] = useState<TicketOrder | null>(null);

  if (!event) return null;

  const handleBack = () => {
    if (selectedOrder) {
      setSelectedOrder(null);
    } else {
      onOpenChange(false);
    }
  };

  const handleExportCSV = () => {
    // TODO: Implement CSV export
    console.log("Export CSV for event:", event.id);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl overflow-y-auto">
        <SheetHeader className="space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <SheetTitle className="text-lg">
              {selectedOrder ? `Order ${selectedOrder.ticket_number}` : "Sales Dashboard"}
            </SheetTitle>
          </div>
        </SheetHeader>

        {selectedOrder ? (
          <OrderDetailView
            order={selectedOrder}
            event={event}
            onBack={() => setSelectedOrder(null)}
          />
        ) : (
          <div className="space-y-6">
            {/* Event Header */}
            <div className="flex gap-4">
              <div className="w-32 h-20 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={event.image_url || "/placeholder.svg"}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold truncate">{event.title}</h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                  {event.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {event.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {format(new Date(event.start_time), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 border border-green-200/50 dark:border-green-800/50">
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                  <DollarSign className="w-4 h-4" />
                  <span className="text-xs font-medium">Revenue</span>
                </div>
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                  ${event.totalRevenue.toLocaleString()}
                </p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl p-4 border border-blue-200/50 dark:border-blue-800/50">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                  <Ticket className="w-4 h-4" />
                  <span className="text-xs font-medium">Tickets Sold</span>
                </div>
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {event.ticketsSold}
                  {event.totalCapacity > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      /{event.totalCapacity}
                    </span>
                  )}
                </p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/30 rounded-xl p-4 border border-purple-200/50 dark:border-purple-800/50">
                <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-medium">Buyers</span>
                </div>
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {event.buyerCount}
                </p>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-4 border border-amber-200/50 dark:border-amber-800/50">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                  <UserCheck className="w-4 h-4" />
                  <span className="text-xs font-medium">Checked In</span>
                </div>
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                  {event.checkedInCount}
                  {event.ticketsSold > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      /{event.ticketsSold}
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Orders Table */}
            <OrderManagementTable
              eventId={event.id}
              onSelectOrder={setSelectedOrder}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
