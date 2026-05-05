/**
 * OPERATIONS PANEL
 * 
 * Displays event operations for organizers/producers:
 * - Attendee list with check-in status
 * - Export to CSV functionality
 * - Check-in QR mode link
 * - Ticket types summary
 * - Sales summary
 * - Client information (from event metadata.client)
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Download, 
  QrCode, 
  Users, 
  Ticket, 
  Building2, 
  Mail, 
  FileText,
  CheckCircle2,
  Clock,
  User
} from "lucide-react";
import { OrganizerEvent } from "@/hooks/useOrganizerEvents";
import { notifyError, notifySuccess, t } from '@/lib/i18n-toast';

interface ClientInfo {
  name?: string;
  company?: string;
  email?: string;
  notes?: string;
}

interface OperationsPanelProps {
  event: OrganizerEvent & { 
    metadata?: { 
      client?: ClientInfo;
      [key: string]: any;
    } | null;
  };
}

export function OperationsPanel({ event }: OperationsPanelProps) {
  const clientInfo = event.metadata?.client;

  // Fetch attendees/ticket purchases
  const { data: attendees = [], isLoading: loadingAttendees } = useQuery({
    queryKey: ["event-attendees", event.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_ticket_purchases")
        .select(`
          id,
          buyer_name,
          buyer_email,
          quantity,
          status,
          checked_in_at,
          ticket_number,
          created_at,
          ticket_type_id,
          event_ticket_types (
            name
          )
        `)
        .eq("event_id", event.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  // Fetch ticket types
  const { data: ticketTypes = [] } = useQuery({
    queryKey: ["event-ticket-types", event.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_ticket_types")
        .select("*")
        .eq("event_id", event.id)
        .order("sort_order", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const handleExportCSV = () => {
    if (attendees.length === 0) {
      notifyError('toasts.business.noAttendeesExport');
      return;
    }

    const headers = ["Name", "Email", "Ticket Type", "Quantity", "Status", "Checked In", "Ticket #", "Purchase Date"];
    const rows = attendees.map((a: any) => [
      a.buyer_name,
      a.buyer_email,
      a.event_ticket_types?.name || "General",
      a.quantity,
      a.status,
      a.checked_in_at ? format(new Date(a.checked_in_at), "MMM d, yyyy h:mm a") : "No",
      a.ticket_number,
      format(new Date(a.created_at), "MMM d, yyyy")
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, "_")}_attendees.csv`;
    a.click();
    URL.revokeObjectURL(url);

    notifySuccess('toasts.business.attendeeListExported');
  };

  const handleOpenCheckIn = () => {
    window.open(`/events/${event.id}/check-in`, "_blank");
  };

  const checkedInCount = attendees.filter((a: any) => a.checked_in_at).length;

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handleOpenCheckIn}>
          <QrCode className="w-4 h-4 mr-2" />
          {t('screens.business.checkinMode')}
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="w-4 h-4 mr-2" />
          {t('screens.business.exportCsv')}
        </Button>
      </div>

      {/* Client Information */}
      {clientInfo && (clientInfo.name || clientInfo.company || clientInfo.email) && (
        <Card className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-950/30 dark:to-fuchsia-950/30 border-purple-200/50 dark:border-purple-800/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-600" />
              {t('screens.business.clientInformation')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {clientInfo.name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-medium">{clientInfo.name}</span>
              </div>
            )}
            {clientInfo.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                <span>{clientInfo.company}</span>
              </div>
            )}
            {clientInfo.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                <a href={`mailto:${clientInfo.email}`} className="text-primary hover:underline">
                  {clientInfo.email}
                </a>
              </div>
            )}
            {clientInfo.notes && (
              <div className="pt-2 mt-2 border-t border-purple-200/50 dark:border-purple-800/50">
                <div className="flex items-start gap-2 text-sm">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                  <p className="text-muted-foreground">{clientInfo.notes}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Ticket Types Summary */}
      {ticketTypes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Ticket className="w-4 h-4" />
              {t('screens.business.ticketTypes')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ticketTypes.map((ticket: any) => (
                <div key={ticket.id} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/50">
                  <div>
                    <span className="font-medium">{ticket.name}</span>
                    <span className="text-muted-foreground ml-2">${ticket.price}</span>
                  </div>
                  <Badge variant="secondary">
                    {ticket.quantity_sold} / {ticket.quantity_available}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendee List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              Attendees ({attendees.length})
            </CardTitle>
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="w-3 h-3" />
              {checkedInCount} checked in
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loadingAttendees ? (
            <p className="text-sm text-muted-foreground">{t('screens.business.loadingAttendees')}</p>
          ) : attendees.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('screens.business.noAttendeesYet')}</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {attendees.map((attendee: any) => (
                <div 
                  key={attendee.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{attendee.buyer_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{attendee.buyer_email}</p>
                    <p className="text-xs text-muted-foreground">
                      {attendee.event_ticket_types?.name || "General"} × {attendee.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {attendee.checked_in_at ? (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {t('screens.business.checked')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="w-3 h-3" />
                        {t('screens.business.pending')}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
