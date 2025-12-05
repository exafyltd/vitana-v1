import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import { toast } from "sonner";

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
}: EventTicketProps) {
  const ticketRef = useRef<HTMLDivElement>(null);

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
      
      toast.success("Ticket downloaded!");
    } catch (error) {
      toast.error("Failed to download ticket");
    }
  };

  const handleShare = async () => {
    if (!ticketRef.current) return;
    
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        if (navigator.share && navigator.canShare) {
          const file = new File([blob], `ticket-${ticketNumber}.png`, { type: "image/png" });
          await navigator.share({
            title: `Ticket for ${eventTitle}`,
            text: `My ticket for ${eventTitle}`,
            files: [file],
          });
        } else {
          handleDownload();
        }
      }, "image/png");
    } catch (error) {
      toast.error("Failed to share ticket");
    }
  };

  return (
    <div className="space-y-4">
      {/* Ticket Card - Condor Boarding Pass Style */}
      <div
        ref={ticketRef}
        className="relative w-full max-w-md mx-auto overflow-hidden rounded-2xl shadow-xl"
        style={{ minHeight: "440px" }}
      >
        {/* Full-bleed Background Image - Sharp with Vignette */}
        {eventImageUrl ? (
          <img
            src={eventImageUrl}
            alt={eventTitle}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ 
              filter: 'saturate(1.25) contrast(1.1) brightness(0.95)',
              transform: 'scale(1.15)',
              transformOrigin: 'center center',
            }}
            crossOrigin="anonymous"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 via-slate-800 to-zinc-900" />
        )}
        
        {/* Vignette effect - dark edges */}
        <div 
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 100%)',
          }}
        />
        
        {/* Dark gradient - Top info section (60-75% opacity) */}
        <div className="absolute inset-x-0 top-0 h-[52%] bg-gradient-to-b from-black/70 via-black/55 to-transparent" />
        
        {/* Dark gradient - Bottom QR/footer area (30-40% opacity) */}
        <div className="absolute inset-x-0 bottom-0 h-[50%] bg-gradient-to-t from-black/50 via-black/35 to-transparent" />

        {/* Content Overlay */}
        <div className="relative z-10 h-full flex flex-col p-4">
          {/* Header - Simplified Text-Only */}
          <div className="flex items-center justify-between pb-3 border-b border-white/30">
            <div>
              <span className="text-white text-sm font-bold tracking-wide drop-shadow-sm">VITANA</span>
              <span className="text-white/70 text-xs font-medium tracking-widest ml-2">EVENT PASS</span>
            </div>
            
            {/* Ticket Type Badge */}
            <div className="px-3 py-1 rounded-full bg-white/90 shadow-md backdrop-blur-sm">
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
            <div className="absolute -left-4 w-5 h-5 bg-background rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]" />
            <div className="flex-1 border-t-2 border-dashed border-white/40" />
            <div className="absolute -right-4 w-5 h-5 bg-background rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]" />
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
            <div className="p-3 rounded-2xl bg-white shadow-[0_8px_32px_rgba(0,0,0,0.25)] border border-white/50">
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
          
          {/* Compact Footer */}
          <div className="mt-2 pt-2 border-t border-white/20 flex items-center justify-between text-[10px] text-white/60 font-mono">
            <span>{ticketNumber}</span>
            <span>SEQ {String(sequence).padStart(4, "0")}</span>
          </div>
          <div className="text-center mt-1">
            <span className="text-white/50 text-[9px] font-medium tracking-wide">
              Powered by VITANA
            </span>
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
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </div>
    </div>
  );
}
