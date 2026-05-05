import React, { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import { TicketShareSheet } from "./TicketShareSheet";
import { notifyError, notifySuccess } from '@/lib/i18n-toast';

// Tenant Types
export type TicketTenant = "vitana" | "maxina" | "alkalma" | "earthlinks";

interface TicketTenantConfig {
  brandName: string;
  passLabel: string;
  accentColor: string;
  tenantCode: string;
  hologramText: {
    primary: string;
    secondary: string;
  };
  microText: string;
  footerText: string;
  backgroundGradient: string;
}

// Tenant-specific branding configuration
const TICKET_TENANT_CONFIG: Record<TicketTenant, TicketTenantConfig> = {
  vitana: {
    brandName: "VITANA",
    passLabel: "EVENT PASS",
    accentColor: "#E8CFAF", // Champagne gold
    tenantCode: "VTN",
    hologramText: {
      primary: "VITANA",
      secondary: "AUTHENTIC",
    },
    microText: "OFFICIAL • VERIFIED • SECURE",
    footerText: "Powered by VITANA",
    backgroundGradient: "from-slate-700 via-slate-800 to-zinc-900",
  },
  maxina: {
    brandName: "MAXINA",
    passLabel: "EVENT PASS",
    accentColor: "#FF6FAF", // Pink/coral
    tenantCode: "MAX",
    hologramText: {
      primary: "MAXINA",
      secondary: "ORIGINAL",
    },
    microText: "OFFICIAL • VERIFIED • SECURE",
    footerText: "Powered by VITANA",
    backgroundGradient: "from-rose-600 via-pink-700 to-orange-800",
  },
  alkalma: {
    brandName: "ALKALMA",
    passLabel: "EVENT PASS",
    accentColor: "#3AB5D0", // Blue/teal
    tenantCode: "ALK",
    hologramText: {
      primary: "ALKALMA",
      secondary: "VERIFIED",
    },
    microText: "OFFICIAL • VERIFIED • SECURE",
    footerText: "Powered by VITANA",
    backgroundGradient: "from-cyan-700 via-teal-800 to-blue-900",
  },
  earthlinks: {
    brandName: "EARTHLINKS",
    passLabel: "EVENT PASS",
    accentColor: "#58A676", // Earthy green
    tenantCode: "ELX",
    hologramText: {
      primary: "EARTHLINKS",
      secondary: "MEMBER PASS",
    },
    microText: "OFFICIAL • VERIFIED • SECURE",
    footerText: "Powered by VITANA",
    backgroundGradient: "from-emerald-700 via-green-800 to-teal-900",
  },
};

interface EventTicketProps {
  ticketNumber: string;
  eventTitle: string;
  eventDate: Date;
  eventLocation: string;
  eventImageUrl?: string;
  ticketType: string;
  buyerName: string;
  quantity: number;
  qrCodeData: string;
  sequence?: number;
  tenant?: TicketTenant;
}

export function EventTicket({
  ticketNumber,
  eventTitle,
  eventDate,
  eventLocation,
  eventImageUrl,
  ticketType,
  buyerName,
  quantity,
  qrCodeData,
  sequence = 1,
  tenant = "vitana",
}: EventTicketProps) {
  const ticketRef = useRef<HTMLDivElement>(null);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  
  // Get tenant-specific configuration
  const config = TICKET_TENANT_CONFIG[tenant] || TICKET_TENANT_CONFIG.vitana;

  const handleDownload = async () => {
    if (!ticketRef.current) return;
    
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      
      const link = document.createElement("a");
      link.download = `ticket-${ticketNumber}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      
      notifySuccess('toasts.tickets.ticketDownloaded');
    } catch (error) {
      notifyError('toasts.tickets.failedDownloadTicket');
    }
  };

  // Removed inline handleShare - now uses TicketShareSheet

  // Decorative barcode heights
  const barcodeHeights = [3, 5, 2, 6, 4, 2, 5, 3, 6, 2, 4, 5, 3, 2, 6, 4];
  
  // Generate tenant-formatted serial
  const serialNumber = `VTN-${config.tenantCode}-${format(eventDate, "yyyyMMdd")}-${String(sequence).padStart(5, "0")}`;

  return (
    <div className="space-y-4">
      {/* Ticket Card - Premium Boarding Pass */}
      <div
        ref={ticketRef}
        className="relative w-full max-w-md mx-auto overflow-hidden rounded-2xl"
        style={{ 
          minHeight: "440px",
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          boxShadow: `
            0 25px 50px -12px rgba(0,0,0,0.35),
            inset 0 1px 0 rgba(255,255,255,0.15),
            inset 0 -1px 0 rgba(255,255,255,0.05),
            inset 1px 0 0 rgba(255,255,255,0.08),
            inset -1px 0 0 rgba(255,255,255,0.08)
          `,
        }}
      >
        {/* Metallic Inner Frame Highlight */}
        <div 
          className="absolute inset-0 rounded-2xl pointer-events-none z-20"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 3%, transparent 97%, rgba(255,255,255,0.05) 100%)',
          }}
        />

        {/* Full-bleed Background Image - Muted backdrop */}
        {eventImageUrl ? (
          <img
            src={eventImageUrl}
            alt={eventTitle}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ 
              filter: 'saturate(0.93) contrast(0.55) brightness(1.16)',
              opacity: 0.85,
              transform: 'scale(1.15)',
              transformOrigin: 'center center',
            }}
            crossOrigin="anonymous"
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-br ${config.backgroundGradient}`} />
        )}
        
        {/* Dark overlay at 20% opacity for content focus */}
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: 'rgba(0,0,0,0.20)' }}
        />
        
        {/* Vignette effect - dark edges */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
          }}
        />

        {/* Branded Pattern Layer - Subtle Orb & Geometric Lines */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.08]">
          {/* Large subtle orb - top right */}
          <div 
            className="absolute -top-20 -right-20 w-64 h-64 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)',
            }}
          />
          {/* Smaller orb - bottom left */}
          <div 
            className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
            }}
          />
          {/* Geometric accent lines */}
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <line x1="0" y1="30%" x2="100%" y2="25%" stroke="white" strokeWidth="0.5" opacity="0.4" />
            <line x1="0" y1="70%" x2="100%" y2="75%" stroke="white" strokeWidth="0.5" opacity="0.3" />
            <line x1="85%" y1="0" x2="90%" y2="100%" stroke="white" strokeWidth="0.5" opacity="0.25" />
          </svg>
        </div>
        
        {/* Dark gradient - Top info section (60-75% opacity) */}
        <div className="absolute inset-x-0 top-0 h-[52%] bg-gradient-to-b from-black/70 via-black/55 to-transparent" />

        {/* Spotlight gradient behind title area */}
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[45%] pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.12) 0%, transparent 60%)',
          }}
        />
        
        {/* Dark gradient - Lower section (ATTENDEE to bottom): 5-10% start, 25-30% end */}
        <div 
          className="absolute inset-x-0 bottom-0 h-[48%] pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.28) 100%)',
          }}
        />
        
        {/* Additional contrast reduction layer for lower section */}
        <div 
          className="absolute inset-x-0 bottom-0 h-[48%] pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.10) 100%)',
          }}
        />

        {/* Holographic Seal - Bottom Right - Tenant Branded */}
        <div className="absolute bottom-24 right-4 w-16 h-16 pointer-events-none z-10">
          {/* Outer glow ring with tenant accent */}
          <div 
            className="absolute inset-0 rounded-full opacity-40"
            style={{
              background: `conic-gradient(from 0deg, ${config.accentColor}20, ${config.accentColor}60, ${config.accentColor}30, ${config.accentColor}20)`,
            }}
          />
          {/* Inner seal circle */}
          <div 
            className="absolute inset-1 rounded-full border flex items-center justify-center"
            style={{
              borderColor: `${config.accentColor}40`,
              background: 'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 80%)',
            }}
          >
            <div className="text-center">
              <span className="text-white/50 text-[6px] font-bold tracking-widest block">
                {config.hologramText.primary}
              </span>
              <span className="text-white/30 text-[4px] tracking-wider block mt-0.5">
                {config.hologramText.secondary}
              </span>
            </div>
          </div>
          {/* Shimmer effect */}
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.15) 50%, transparent 60%)',
            }}
          />
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 h-full flex flex-col p-4">
          {/* Header - Enhanced with micro-text and tenant branding */}
          <div className="flex items-center justify-between pb-3 border-b border-white/30">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-bold tracking-wide drop-shadow-sm">
                  {config.brandName}
                </span>
                <span className="text-white/70 text-xs font-medium tracking-widest">
                  {config.passLabel}
                </span>
              </div>
              {/* Accent underline */}
              <div 
                className="h-[2px] w-14 mt-1 rounded-full"
                style={{ backgroundColor: config.accentColor }}
              />
              {/* Micro-text accent for official feel */}
              <span className="text-white/30 text-[7px] tracking-[0.3em] font-medium mt-1">
                {config.microText}
              </span>
            </div>
            
            {/* Ticket Type Badge with tenant accent glow */}
            <div 
              className="px-3 py-1 rounded-full bg-white/90 shadow-md backdrop-blur-sm"
              style={{
                boxShadow: `0 0 12px ${config.accentColor}40, 0 4px 6px -1px rgba(0, 0, 0, 0.1)`,
              }}
            >
              <span className="text-gray-900 text-[10px] font-semibold uppercase tracking-wide">
                {ticketType}
              </span>
            </div>
          </div>
          
          {/* Event Title - Large Hero */}
          <h2 className="text-2xl md:text-3xl font-bold text-white mt-3 mb-3 leading-tight drop-shadow-md">
            {eventTitle}
          </h2>
          
          {/* Event Details - Clean Label+Value Typography */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-3">
            {/* Date */}
            <div>
              <div className="text-white/60 text-[10px] uppercase tracking-widest font-medium mb-0.5">
                Date
              </div>
              <p className="text-white font-semibold text-sm drop-shadow-sm">
                {format(eventDate, "EEE, MMM d, yyyy")}
              </p>
            </div>
            
            {/* Time */}
            <div>
              <div className="text-white/60 text-[10px] uppercase tracking-widest font-medium mb-0.5">
                Time
              </div>
              <p className="text-white font-semibold text-sm drop-shadow-sm">
                {format(eventDate, "h:mm a")}
              </p>
            </div>
          </div>
          
          {/* Location */}
          <div className="mb-3">
            <div className="text-white/60 text-[10px] uppercase tracking-widest font-medium mb-0.5">
              Venue
            </div>
            <p className="text-white font-semibold text-sm drop-shadow-sm">
              {eventLocation || "TBA"}
            </p>
          </div>
          
          {/* Strong Divider Line with Cutouts - Boarding Pass Style */}
          <div className="relative flex items-center my-3">
            <div className="absolute -left-4 w-5 h-5 bg-black/80 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]" />
            <div className="flex-1 border-t-2 border-dashed border-white/40" />
            <div className="absolute -right-4 w-5 h-5 bg-black/80 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]" />
          </div>
          
          {/* Two-Column Attendee Row - with subtle dark backing */}
          <div className="flex items-start justify-between mt-3 mb-3 px-3 py-2 rounded-lg bg-black/30 backdrop-blur-sm">
            <div>
              <div className="text-white/60 text-[10px] uppercase tracking-widest font-medium mb-0.5">
                Attendee
              </div>
              <p className="text-white font-bold text-base uppercase tracking-wide drop-shadow-sm">
                {buyerName}
              </p>
            </div>
            <div className="text-right">
              <div className="text-white/60 text-[10px] uppercase tracking-widest font-medium mb-0.5">
                Qty
              </div>
              <p className="text-white font-bold text-xl drop-shadow-sm">
                {quantity}
              </p>
            </div>
          </div>
          
          {/* Huge Centered QR Code - Enhanced white container */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="p-3 rounded-2xl bg-white shadow-[0_4px_12px_rgba(0,0,0,0.25)] border border-white/10">
              <QRCodeSVG
                value={qrCodeData}
                size={140}
                level="H"
                includeMargin={false}
              />
            </div>
            <div className="mt-2 text-[10px] font-semibold text-white/80 uppercase tracking-widest drop-shadow-sm">
              Scan for Entry
            </div>
          </div>
          
          {/* Enhanced Compact Footer with tenant branding */}
          <div className="mt-2 pt-2 border-t border-white/20">
            {/* Main footer row */}
            <div className="flex items-center justify-between text-[10px] text-white/60 font-mono">
              <span>{ticketNumber}</span>
              <span>SEQ {String(sequence).padStart(4, "0")}</span>
            </div>
            
            {/* Decorative barcode + tenant serial row */}
            <div className="flex items-center justify-between mt-1.5">
              {/* Mini decorative barcode (non-functional) */}
              <div className="flex gap-[1px] items-end h-3 opacity-30">
                {barcodeHeights.map((h, i) => (
                  <div 
                    key={i} 
                    className="w-[2px] bg-white rounded-sm" 
                    style={{ height: `${h * 2}px` }} 
                  />
                ))}
              </div>
              
              {/* Tenant Serial Number */}
              <span className="text-white/40 text-[8px] font-mono tracking-wider">
                {serialNumber}
              </span>
            </div>
            
            {/* Powered by Tenant */}
            <div className="text-center mt-1.5">
              <span className="text-white/50 text-[9px] font-medium tracking-wide">
                {config.footerText}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center max-w-md mx-auto">
        <Button
          variant="outline"
          className="flex-1 rounded-xl"
          onClick={handleDownload}
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button
          className="flex-1 rounded-xl"
          onClick={() => setShareSheetOpen(true)}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </div>

      {/* Share Sheet */}
      <TicketShareSheet
        open={shareSheetOpen}
        onOpenChange={setShareSheetOpen}
        ticketRef={ticketRef}
        eventTitle={eventTitle}
        ticketNumber={ticketNumber}
        eventDate={format(eventDate, "EEE, MMM d, yyyy 'at' h:mm a")}
        eventLocation={eventLocation}
        eventImageUrl={eventImageUrl}
        ticketType={ticketType}
        buyerName={buyerName}
      />
    </div>
  );
}
