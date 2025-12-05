import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventTicket, TicketTenant } from "@/components/tickets/EventTicket";

const TENANT_OPTIONS: { value: TicketTenant; label: string; color: string }[] = [
  { value: "vitana", label: "VITANA", color: "#E8CFAF" },
  { value: "maxina", label: "Maxina", color: "#FF6FAF" },
  { value: "alkalma", label: "AlKalma", color: "#3AB5D0" },
  { value: "earthlinks", label: "Earthlinks", color: "#58A676" },
];

export default function TicketDemo() {
  const navigate = useNavigate();
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
            <h1 className="text-xl font-bold">Ticket Preview</h1>
            <p className="text-sm text-muted-foreground">
              Multi-tenant boarding pass design
            </p>
          </div>
        </div>

        {/* Tenant Selector */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">Select Tenant Brand:</p>
          <div className="flex flex-wrap gap-2">
            {TENANT_OPTIONS.map((tenant) => (
              <button
                key={tenant.value}
                onClick={() => setSelectedTenant(tenant.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedTenant === tenant.value
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
        </div>

        {/* Demo Badge */}
        <div className="mb-6 p-3 rounded-lg bg-primary/10 border border-primary/20 text-center">
          <p className="text-sm font-medium text-primary">
            🎫 This is a demo ticket preview
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Actual tickets will display your real event and purchase details
          </p>
        </div>

        {/* Ticket Component */}
        <EventTicket {...demoTicket} tenant={selectedTenant} />

        {/* Info */}
        <div className="mt-8 space-y-4 text-sm text-muted-foreground">
          <h3 className="font-medium text-foreground">Ticket Features:</h3>
          <ul className="space-y-2 list-disc list-inside">
            <li>Multi-tenant branding (logo, colors, hologram)</li>
            <li>Washed-out event image background</li>
            <li>Tenant accent underline and badge glow</li>
            <li>Event details with date, time, and location</li>
            <li>Ticket type badge (VIP, General, etc.)</li>
            <li>Attendee name and quantity</li>
            <li>Scannable QR code for check-in</li>
            <li>Tenant-specific serial metadata</li>
            <li>Download as PNG or Share options</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
