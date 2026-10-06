import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Loader2, AlertCircle, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventTicket } from "@/components/tickets/EventTicket";
import { useTicketPurchase } from "@/hooks/useEventTickets";
import { t } from '@/lib/i18n-toast';

// The Stripe webhook is the only thing that completes a purchase (VTID-04757).
// This page just waits for it: poll while pending, then show the ticket.
const POLL_INTERVAL_MS = 2500;
const MAX_POLLS = 8;

export default function TicketPurchaseSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const purchaseId = searchParams.get("purchase_id");

  const { purchase, loading, error, refetch } = useTicketPurchase(purchaseId || "");
  const [polls, setPolls] = useState(0);

  const isPending = !!purchase && purchase.status === "pending";
  const pollsExhausted = polls >= MAX_POLLS;

  useEffect(() => {
    if (!isPending || pollsExhausted) return;
    const timer = setTimeout(async () => {
      await refetch(true);
      setPolls((n) => n + 1);
    }, POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [isPending, pollsExhausted, polls, refetch]);

  const checkAgain = async () => {
    setPolls(0);
    await refetch(true);
  };

  if (!purchaseId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">{t('screens.ticketpurchasesuccess.invalidRequest')}</h1>
          <p className="text-muted-foreground">{t('screens.ticketpurchasesuccess.noPurchaseInformationFound')}</p>
          <Button onClick={() => navigate("/comm/events-meetups")}>
            {t('screens.ticketpurchasesuccess.browseEvents')}
          </Button>
        </div>
      </div>
    );
  }

  if (loading || (isPending && !pollsExhausted)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">{t('screens.ticketpurchasesuccess.confirmingYourPurchase')}</p>
        </div>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">{t('screens.ticketpurchasesuccess.somethingWentWrong')}</h1>
          <p className="text-muted-foreground">
            {error || "Could not load your ticket. Please check your email for confirmation."}
          </p>
          <Button onClick={() => navigate("/my-tickets")}>
            {t('screens.ticketpurchasesuccess.viewMyTickets')}
          </Button>
        </div>
      </div>
    );
  }

  if (purchase.status !== "completed") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-md">
          <AlertCircle className="h-16 w-16 text-amber-500 mx-auto" />
          <h1 className="text-2xl font-bold">{t('screens.ticketpurchasesuccess.processingTitle')}</h1>
          <p className="text-muted-foreground">{t('screens.ticketpurchasesuccess.processingBody')}</p>
          <Button onClick={checkAgain}>{t('screens.ticketpurchasesuccess.checkAgain')}</Button>
          <Button variant="outline" onClick={() => navigate("/my-tickets")}>
            {t('screens.ticketpurchasesuccess.viewMyTickets')}
          </Button>
        </div>
      </div>
    );
  }

  const event = purchase.event;
  const ticketType = purchase.ticket_type;

  return (
    <div className="min-h-screen bg-background">
      {/* Success Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background py-12 px-4">
        <div className="max-w-md mx-auto text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('screens.ticketpurchasesuccess.paymentSuccessful')}
          </h1>
          <p className="text-muted-foreground">{t('screens.ticketpurchasesuccess.ticketConfirmed')}</p>
        </div>
      </div>

      {/* Ticket Display */}
      <div className="px-4 py-8 -mt-4">
        <EventTicket
          ticketNumber={purchase.ticket_number}
          eventTitle={event?.title || "Event"}
          eventDate={new Date(event?.start_time || Date.now())}
          eventLocation={event?.location || ""}
          eventImageUrl={event?.image_url || undefined}
          ticketType={ticketType?.name || "General Admission"}
          buyerName={purchase.buyer_name}
          quantity={purchase.quantity}
          qrCodeData={purchase.qr_code_token}
          sequence={1}
        />
      </div>

      {/* Actions */}
      <div className="max-w-md mx-auto px-4 pb-12 space-y-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate("/my-tickets")}
        >
          <Calendar className="h-4 w-4 mr-2" />
          {t('screens.ticketpurchasesuccess.viewAllMyTickets')}
        </Button>
        
        <Button
          className="w-full"
          onClick={() => navigate("/comm/events-meetups")}
        >
          {t('screens.ticketpurchasesuccess.discoverMoreEvents')}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
