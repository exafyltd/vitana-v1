/**
 * ORGANIZER EVENT SALES SHEET
 * 
 * Displays a comprehensive sales dashboard for event organizers:
 * - Sales tab: Revenue, tickets sold, buyers, check-ins, order table
 * - Operations tab: Attendee list, check-in mode, CSV export, client info
 * 
 * Supports events with client metadata (for agency/producer workflow).
 */

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Download, MapPin, Calendar, DollarSign, Ticket, Users, UserCheck, Settings, Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { OrganizerEvent } from "@/hooks/useOrganizerEvents";
import { OrderManagementTable } from "./OrderManagementTable";
import { OrderDetailView } from "./OrderDetailView";
import { OperationsPanel } from "./OperationsPanel";
import { TicketOrder } from "@/hooks/useOrderManagement";
import { notifyError, notifySuccess, t } from '@/lib/i18n-toast';

import { fmtNumber, formatDate } from '@/lib/locale-format';
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
  const [activeTab, setActiveTab] = useState("sales");
  const [exporting, setExporting] = useState(false);

  if (!event) return null;

  const handleBack = () => {
    if (selectedOrder) {
      setSelectedOrder(null);
    } else {
      onOpenChange(false);
    }
  };

  // Wrap a CSV cell: escape embedded quotes and guard against CSV injection
  // (cells starting with = + - @ are prefixed with a single quote).
  const csvCell = (value: unknown): string => {
    let str = value === null || value === undefined ? "" : String(value);
    if (/^[=+\-@]/.test(str)) str = `'${str}`;
    return `"${str.replace(/"/g, '""')}"`;
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const { data, error } = await supabase
        .from("event_ticket_purchases")
        .select(`
          ticket_number,
          buyer_name,
          buyer_email,
          quantity,
          unit_price,
          total_amount,
          currency,
          status,
          checked_in_at,
          created_at,
          event_ticket_types ( name )
        `)
        .eq("event_id", event.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      type ExportRow = {
        ticket_number: string | null;
        buyer_name: string | null;
        buyer_email: string | null;
        quantity: number | null;
        unit_price: number | null;
        total_amount: number | null;
        currency: string | null;
        status: string | null;
        checked_in_at: string | null;
        created_at: string;
        event_ticket_types: { name: string | null } | null;
      };

      const orders = (data || []) as unknown as ExportRow[];
      if (orders.length === 0) {
        notifyError('toasts.business.noOrdersExport');
        return;
      }

      const headers = [
        "Order #",
        "Buyer Name",
        "Email",
        "Ticket Type",
        "Quantity",
        "Unit Price",
        "Total Amount",
        "Currency",
        "Status",
        "Checked In",
        "Purchase Date",
      ];

      const rows = orders.map((o) => [
        o.ticket_number,
        o.buyer_name,
        o.buyer_email,
        o.event_ticket_types?.name || "General",
        o.quantity,
        (o.unit_price ?? 0).toFixed(2),
        (o.total_amount ?? 0).toFixed(2),
        (o.currency || "USD").toUpperCase(),
        o.status,
        o.checked_in_at
          ? formatDate(new Date(o.checked_in_at), "yyyy-MM-dd HH:mm")
          : "No",
        formatDate(new Date(o.created_at), "yyyy-MM-dd HH:mm"),
      ]);

      const csvContent = [headers, ...rows]
        .map((row) => row.map(csvCell).join(","))
        .join("\r\n");

      // Prepend a UTF-8 BOM so Excel reads accented names correctly.
      const blob = new Blob(["﻿" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(event.title || "event").replace(/[^a-z0-9]/gi, "_")}_sales.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      notifySuccess('toasts.business.ordersExported');
    } catch (err) {
      console.error("Error exporting sales CSV:", err);
      notifyError('toasts.business.noOrdersExport');
    } finally {
      setExporting(false);
    }
  };

  // Check if event has client info
  const clientInfo = (event as any).metadata?.client;
  const hasClientInfo = clientInfo && (clientInfo.name || clientInfo.company);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-4xl overflow-y-auto">
        <SheetHeader className="space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <SheetTitle className="text-lg">
              {selectedOrder ? `Order ${selectedOrder.ticket_number}` : "Event Dashboard"}
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
                    {formatDate(new Date(event.start_time), "MMM d, yyyy 'at' h:mm a")}
                  </span>
                </div>
                {hasClientInfo && (
                  <Badge variant="outline" className="mt-2 gap-1">
                    <Building2 className="w-3 h-3" />{t('screens.business.clientValue0', { value0: clientInfo.company || clientInfo.name })}</Badge>
                )}
              </div>
            </div>

            {/* Tabs: Sales / Operations */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sales" className="gap-2">
                  <DollarSign className="w-4 h-4" />
                  {t('screens.business.sales')}
                </TabsTrigger>
                <TabsTrigger value="operations" className="gap-2">
                  <Settings className="w-4 h-4" />
                  {t('screens.business.operations')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sales" className="space-y-6 mt-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl p-4 border border-green-200/50 dark:border-green-800/50">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-1">
                      <DollarSign className="w-4 h-4" />
                      <span className="text-xs font-medium">{t('screens.business.revenue')}</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                      ${fmtNumber(event.totalRevenue ?? 0, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 rounded-xl p-4 border border-blue-200/50 dark:border-blue-800/50">
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                      <Ticket className="w-4 h-4" />
                      <span className="text-xs font-medium">{t('screens.business.ticketsSold')}</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {event.ticketsSold ?? 0}
                      {(event.totalCapacity ?? 0) > 0 && (
                        <span className="text-sm font-normal text-muted-foreground">
                          /{event.totalCapacity}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/30 rounded-xl p-4 border border-purple-200/50 dark:border-purple-800/50">
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                      <Users className="w-4 h-4" />
                      <span className="text-xs font-medium">{t('screens.business.buyers')}</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                      {event.buyerCount ?? 0}
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl p-4 border border-amber-200/50 dark:border-amber-800/50">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-1">
                      <UserCheck className="w-4 h-4" />
                      <span className="text-xs font-medium">{t('screens.business.checked')}</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                      {event.checkedInCount ?? 0}
                      {(event.ticketsSold ?? 0) > 0 && (
                        <span className="text-sm font-normal text-muted-foreground">
                          /{event.ticketsSold}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Export Button */}
                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={exporting}>
                    {exporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    {t('screens.business.exportCsv')}
                  </Button>
                </div>

                {/* Orders Table */}
                <OrderManagementTable
                  eventId={event.id}
                  onSelectOrder={setSelectedOrder}
                />
              </TabsContent>

              <TabsContent value="operations" className="mt-4">
                <OperationsPanel event={event as any} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
