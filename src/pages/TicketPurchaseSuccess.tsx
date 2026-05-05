import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Loader2, AlertCircle, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventTicket } from "@/components/tickets/EventTicket";
import { useTicketPurchase } from "@/hooks/useEventTickets";
import { supabase } from "@/integrations/supabase/client";
import { t } from '@/lib/i18n-toast';

export default function TicketPurchaseSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const purchaseId = searchParams.get("purchase_id");
  const sessionId = searchParams.get("session_id");
  
  const { purchase, loading, error } = useTicketPurchase(purchaseId || "");
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  // Verify and update payment status
  useEffect(() => {
    if (!purchaseId || !sessionId) {
      setVerifying(false);
      return;
    }

    const verifyPayment = async () => {
      // Update the purchase status to completed
      const { error: updateError } = await supabase
        .from("event_ticket_purchases")
        .update({ 
          status: "completed",
          stripe_session_id: sessionId 
        })
        .eq("id", purchaseId)
        .eq("status", "pending");

      if (!updateError) {
        setVerified(true);
      }
      setVerifying(false);
    };

    // Small delay to ensure Stripe webhook has processed
    const timer = setTimeout(verifyPayment, 1500);
    return () => clearTimeout(timer);
  }, [purchaseId, sessionId]);

  if (!purchaseId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-2xl font-bold">{t('screens.ticketpurchasesuccess.invalidRequest')}</h1>
          <p className="text-muted-foreground">{t('screens.ticketpurchasesuccess.noPurchaseInformationFound')}</p>
          <Button onClick={() => navigate("/comm/events-meetups")}>
            Browse Events
          </Button>
        </div>
      </div>
    );
  }

  if (loading || verifying) {
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
            View My Tickets
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
            Payment Successful!
          </h1>
          <p className="text-muted-foreground">
            Your ticket has been confirmed. A confirmation email has been sent to{" "}
            <span className="font-medium text-foreground">{purchase.buyer_email}</span>
          </p>
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
          View All My Tickets
        </Button>
        
        <Button
          className="w-full"
          onClick={() => navigate("/comm/events-meetups")}
        >
          Discover More Events
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
