import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VCard } from "@/components/ui/vcard";
import AppLayout from "@/components/AppLayout";
import { ScreenFrame } from "@/components/layout/spotlight";
import { Panel, PanelContent } from "@/components/layout/spotlight/Panel";
import { EventTicket, TicketTenant } from "@/components/tickets/EventTicket";
import { useAuth } from "@/context/AuthProvider";
import { useSpotlightEnabled } from "@/hooks/useSpotlightEnabled";
import { t } from '@/lib/i18n-toast';

const TENANT_OPTIONS: { value: TicketTenant; label: string; color: string }[] = [
  { value: "vitana", label: "VITANA", color: "#E8CFAF" },
  { value: "maxina", label: "Maxina", color: "#FF6FAF" },
  { value: "alkalma", label: "AlKalma", color: "#3AB5D0" },
];

export default function TicketDemo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const spotlight = useSpotlightEnabled();
  const [selectedTenant, setSelectedTenant] = useState<TicketTenant>("vitana");

  // Sample demo data
  const demoTicket = {
    ticketNumber: "VTN-20241215-000042",
    eventTitle: "VITANA Wellness Summit 2024",
    eventDate: new Date("2024-12-15T18:00:00"),
    eventLocation: "The Grand Wellness Center, 123 Health Avenue, San Francisco, CA",
    eventImageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop",
    ticketType: "VIP Access",
    buyerName: "Alex Johnson",
    quantity: 2,
    qrCodeData: "DEMO-TICKET-VTN-20241215-000042",
    sequence: 42,
  };

  const tenantSelector = (
    <div className="flex flex-wrap gap-2">
      {TENANT_OPTIONS.map((tenant) => (
        <button
          key={tenant.value}
          onClick={() => setSelectedTenant(tenant.value)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
            selectedTenant === tenant.value
              // design-allow-next-line: tenant brand colour swatch (fixed brand colour, theme-independent)
              ? "text-white shadow-lg scale-105"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
          style={{
            backgroundColor: selectedTenant === tenant.value ? tenant.color : undefined,
          }}
        >
          {tenant.label}
        </button>
      ))}
    </div>
  );

  const demoBadge = (
    <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
      <p className="text-sm font-medium text-primary">
        {t('screens.ticketdemo.thisDemoTicketPreview')}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {t('screens.ticketdemo.actualTicketsWillDisplayYourReal')}
      </p>
    </div>
  );

  const features = (
    <>
      <h3 className="font-medium text-foreground">{t('screens.ticketdemo.ticketFeatures')}</h3>
      <ul className="space-y-2 list-disc list-inside">
        <li>{t('screens.ticketdemo.multitenantBrandingLogoColorsHologram')}</li>
        <li>{t('screens.ticketdemo.washedoutEventImageBackground')}</li>
        <li>{t('screens.ticketdemo.tenantAccentUnderlineBadgeGlow')}</li>
        <li>{t('screens.ticketdemo.eventDetailsWithDateTimeLocation')}</li>
        <li>{t('screens.ticketdemo.ticketTypeBadgeVipGeneralEtc')}</li>
        <li>{t('screens.ticketdemo.attendeeNameQuantity')}</li>
        <li>{t('screens.ticketdemo.scannableQrCodeForCheckin')}</li>
        <li>{t('screens.ticketdemo.tenantspecificSerialMetadata')}</li>
        <li>{t('screens.ticketdemo.downloadAsPngShareOptions')}</li>
      </ul>
    </>
  );

  // Desktop Spotlight, signed-in member: app shell + `detail` frame. The demo
  // ticket is the one spotlight VCard; the brand picker and the feature list
  // sit in the context rail.
  if (spotlight && user) {
    return (
      <AppLayout>
        <ScreenFrame
          archetype="detail"
          header={{
            title: t('screens.ticketdemo.ticketPreview'),
            description: t('screens.ticketdemo.multitenantBoardingPassDesign'),
          }}
          rail={
            <div className="flex flex-col gap-4">
              <Panel>
                <PanelContent className="space-y-3 p-4">
                  <p className="text-sm text-muted-foreground">{t('screens.ticketdemo.selectTenantBrand')}</p>
                  {tenantSelector}
                </PanelContent>
              </Panel>
              <Panel>
                <PanelContent className="space-y-4 p-4 text-sm text-muted-foreground">{features}</PanelContent>
              </Panel>
            </div>
          }
        >
          <VCard
            size="spotlight"
            title={<h2 className="sr-only">{demoTicket.eventTitle}</h2>}
            body={
              <div className="space-y-4">
                {demoBadge}
                <EventTicket {...demoTicket} tenant={selectedTenant} />
              </div>
            }
          />
        </ScreenFrame>
      </AppLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{t('screens.ticketdemo.ticketPreview')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('screens.ticketdemo.multitenantBoardingPassDesign')}
            </p>
          </div>
        </div>

        {/* Tenant Selector */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">{t('screens.ticketdemo.selectTenantBrand')}</p>
          {tenantSelector}
        </div>

        {/* Demo Badge */}
        <div className="mb-6">{demoBadge}</div>

        {/* Ticket Component */}
        <EventTicket {...demoTicket} tenant={selectedTenant} />

        {/* Info */}
        <div className="mt-8 space-y-4 text-sm text-muted-foreground">
          {features}
        </div>
      </div>
    </div>
  );
}
