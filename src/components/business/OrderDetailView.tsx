import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Printer,
  Mail,
  RefreshCw,
  MapPin,
  Calendar,
  CreditCard,
  User,
  Ticket,
  Check,
  QrCode,
} from "lucide-react";
import { TicketOrder } from "@/hooks/useOrderManagement";
import { OrganizerEvent } from "@/hooks/useOrganizerEvents";
import { notify, notifyError } from '@/lib/i18n-toast';

interface OrderDetailViewProps {
  order: TicketOrder;
  event: OrganizerEvent;
  onBack: () => void;
}

export function OrderDetailView({ order, event, onBack }: OrderDetailViewProps) {
  const handlePrintTickets = () => {
    // TODO: Implement print functionality
    notify('toasts.business.printTickets', 'toasts.business.ticketPrintingWillAvailableSoon');
  };

  const handleResendConfirmation = () => {
    // TODO: Implement resend email
    notify('toasts.business.confirmationSent');
  };

  const handleRefund = () => {
    // TODO: Implement refund flow
    notifyError('toasts.business.refund', 'toasts.business.refundFunctionalityWillAvailableSoon');
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={handlePrintTickets}>
          <Printer className="w-4 h-4 mr-2" />
          Print Tickets
        </Button>
        <Button variant="outline" size="sm" onClick={handleResendConfirmation}>
          <Mail className="w-4 h-4 mr-2" />
          Resend Confirmation
        </Button>
        {order.status === "completed" && (
          <Button variant="outline" size="sm" onClick={handleRefund} className="text-destructive hover:text-destructive">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refund
          </Button>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Event Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Event</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              <div className="w-20 h-14 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={event.image_url || "/placeholder.svg"}
                  alt={event.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold truncate">{event.title}</h3>
                {event.location && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {event.location}
                  </p>
                )}
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(event.start_time), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Details Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="w-3.5 h-3.5" />
                Buyer
              </span>
              <span className="font-medium">{order.buyer_name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="w-3.5 h-3.5" />
                Email
              </span>
              <span className="text-sm">{order.buyer_email}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Order Total</span>
              <span className="text-lg font-bold">${order.total_amount.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                Purchase Date
              </span>
              <span className="text-sm">
                {format(new Date(order.created_at), "MMM d, yyyy 'at' h:mm a")}
              </span>
            </div>
            {order.stripe_payment_intent_id && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5" />
                  Payment
                </span>
                <span className="text-sm font-mono">Stripe</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attendees / Tickets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Ticket className="w-4 h-4" />
            Attendees ({order.quantity})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50 text-sm">
                  <th className="text-left px-4 py-2 font-semibold">Ticket #</th>
                  <th className="text-left px-4 py-2 font-semibold">Name</th>
                  <th className="text-left px-4 py-2 font-semibold">Type</th>
                  <th className="text-right px-4 py-2 font-semibold">Price</th>
                  <th className="text-center px-4 py-2 font-semibold">Check-in</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: order.quantity }).map((_, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="px-4 py-3 font-mono text-sm">
                      {order.ticket_number}-{String(idx + 1).padStart(3, "0")}
                    </td>
                    <td className="px-4 py-3">{order.buyer_name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{order.ticket_type_name}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      ${order.unit_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {order.checked_in_at ? (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <Check className="w-3 h-3 mr-1" />
                          Checked In
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not Yet</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* QR Code Token Reference */}
          <div className="mt-4 p-3 bg-muted/30 rounded-lg flex items-center gap-3">
            <QrCode className="w-8 h-8 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">QR Code Token</p>
              <p className="text-xs text-muted-foreground font-mono">
                {order.qr_code_token}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
