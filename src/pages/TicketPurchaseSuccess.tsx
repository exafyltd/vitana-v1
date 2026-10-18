import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Loader2, AlertCircle, Calendar, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VCard } from "@/components/ui/vcard";
import AppLayout from "@/components/AppLayout";
import { ScreenFrame } from "@/components/layout/spotlight";
import { EventTicket } from "@/components/tickets/EventTicket";
import { useAuth } from "@/context/AuthProvider";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { useTicketPurchase } from "@/hooks/useEventTickets";
import { supabase } from "@/integrations/supabase/client";
import { t } from '@/lib/i18n-toast';

/**
 * Desktop Spotlight, signed-in member: the app shell (AppLayout sidebar) with
 * the `detail` frame — the purchased ticket (or the state message) is the one
 * spotlight VCard. Phones, flag off and signed-out visitors keep today's page.
 */
function TicketShell({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout>
      <ScreenFrame archetype="detail">{children}</ScreenFrame>
    </AppLayout>
  );
}

export default function TicketPurchaseSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const purchaseId = searchParams.get("purchase_id");
  const sessionId = searchParams.get("session_id");
  const { user } = useAuth();
  const spotlight = useSpotlightEnabled();
  const inApp = spotlight && !!user;
  
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
    if (inApp) {
      return (
        <TicketShell>
          <VCard
            size="spotlight"
            eyebrow={<AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />}
            title={<h1>{t('screens.ticketpurchasesuccess.invalidRequest')}</h1>}
            body={t('screens.ticketpurchasesuccess.noPurchaseInformationFound')}
            actions={
              <Button onClick={() => navigate("/comm/events-meetups")}>
                {t('screens.ticketpurchasesuccess.browseEvents')}
              </Button>
            }
          />
        </TicketShell>
      );
    }
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

  if (loading || verifying) {
    const confirming = (
      <div className="text-center space-y-4">
        {/* design-allow-next-line: action in progress, not a data load */}
        <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
        <p className="text-muted-foreground">{t('screens.ticketpurchasesuccess.confirmingYourPurchase')}</p>
      </div>
    );
    if (inApp) {
      return (
        <TicketShell>
          <div className="flex items-center justify-center py-16">{confirming}</div>
        </TicketShell>
      );
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        {confirming}
      </div>
    );
  }

  if (error || !purchase) {
    if (inApp) {
      return (
        <TicketShell>
          <VCard
            size="spotlight"
            eyebrow={<AlertCircle className="h-5 w-5 text-destructive" aria-hidden="true" />}
            title={<h1>{t('screens.ticketpurchasesuccess.somethingWentWrong')}</h1>}
            body={error || "Could not load your ticket. Please check your email for confirmation."}
            actions={
              <Button onClick={() => navigate("/my-tickets")}>
                {t('screens.ticketpurchasesuccess.viewMyTickets')}
              </Button>
            }
          />
        </TicketShell>
      );
    }
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

  const event = purchase.event;
  const ticketType = purchase.ticket_type;

  const ticket = (
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
  );

  const actions = (
    <>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => navigate("/my-tickets")}
      >
        <Calendar className="h-4 w-4 me-2" />
        {t('screens.ticketpurchasesuccess.viewAllMyTickets')}
      </Button>
      
      <Button
        className="w-full"
        onClick={() => navigate("/comm/events-meetups")}
      >
        {t('screens.ticketpurchasesuccess.discoverMoreEvents')}
        <ArrowRight className="h-4 w-4 ms-2" />
      </Button>
    </>
  );

  if (inApp) {
    return (
      <TicketShell>
        <VCard
          size="spotlight"
          eyebrow={
            <span className="inline-flex items-center gap-2 text-status-success">
              <CheckCircle className="h-4 w-4" aria-hidden="true" />
              {t('screens.ticketpurchasesuccess.paymentSuccessful')}
            </span>
          }
          title={<h1 className="sr-only">{t('screens.ticketpurchasesuccess.paymentSuccessful')}</h1>}
          body={
            <>
              <p>
                {t('screens.ticketpurchasesuccess.yourTicketHasConfirmedConfirmationEmail', { value0: " " })}
                <span className="font-medium text-foreground">{purchase.buyer_email}</span>
              </p>
              <div className="pt-4">{ticket}</div>
            </>
          }
          actions={<div className="flex w-full flex-col gap-3 sm:flex-row">{actions}</div>}
        />
      </TicketShell>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Success Header */}
      <div className="bg-gradient-to-b from-primary/10 to-background py-12 px-4">
        <div className="max-w-md mx-auto text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-status-success/20 flex items-center justify-center mx-auto">
            <CheckCircle className="h-8 w-8 text-status-success" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {t('screens.ticketpurchasesuccess.paymentSuccessful')}
          </h1>
          <p className="text-muted-foreground">{t('screens.ticketpurchasesuccess.yourTicketHasConfirmedConfirmationEmail', { value0: " " })}<span className="font-medium text-foreground">{purchase.buyer_email}</span>
          </p>
        </div>
      </div>

      {/* Ticket Display */}
      <div className="px-4 py-8 -mt-4">
        {ticket}
      </div>

      {/* Actions */}
      <div className="max-w-md mx-auto px-4 pb-12 space-y-4">
        {actions}
      </div>
    </div>
  );
}
