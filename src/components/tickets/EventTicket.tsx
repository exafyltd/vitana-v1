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
        style={{ minHeight: "520px" }}
      >
        {/* Full-bleed Background Image with Desaturation */}
        {eventImageUrl ? (
          <img
            src={eventImageUrl}
            alt={eventTitle}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ 
              filter: 'grayscale(0.3) saturate(0.6) brightness(1.1)',
            }}
            crossOrigin="anonymous"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-200 via-stone-200 to-zinc-300" />
        )}
        
        {/* Light Cream Overlay for Readability - Paper Effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/65 via-white/60 to-white/70" />
        
        {/* Warm Paper Tint */}
        <div className="absolute inset-0 bg-amber-50/15" />

        {/* Content Overlay */}
        <div className="relative z-10 h-full flex flex-col p-5">
          {/* Header - Simplified Text-Only */}
          <div className="flex items-center justify-between pb-3 border-b border-gray-300/50">
            <div>
              <span className="text-gray-800 text-sm font-bold tracking-wide">VITANA</span>
              <span className="text-gray-500 text-xs font-medium tracking-widest ml-2">EVENT PASS</span>
            </div>
            
            {/* Ticket Type Badge */}
            <div className="px-3 py-1 rounded-full bg-primary shadow-sm">
              <span className="text-primary-foreground text-[10px] font-semibold uppercase tracking-wide">
                {ticketType}
              </span>
            </div>
          </div>
          
          {/* Event Title - Large Hero */}
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mt-4 mb-5 leading-tight"
              style={{ textShadow: '0 1px 2px rgba(255,255,255,0.5)' }}>
            {eventTitle}
          </h2>
          
          {/* Event Details - Clean Label+Value Typography */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 mb-4">
            {/* Date */}
            <div>
              <div className="text-gray-500 text-[10px] uppercase tracking-widest font-medium mb-0.5">
                Date
              </div>
              <p className="text-gray-900 font-semibold text-sm">
                {format(eventDate, "EEE, MMM d, yyyy")}
              </p>
            </div>
            
            {/* Time */}
            <div>
              <div className="text-gray-500 text-[10px] uppercase tracking-widest font-medium mb-0.5">
                Time
              </div>
              <p className="text-gray-900 font-semibold text-sm">
                {format(eventDate, "h:mm a")}
              </p>
            </div>
          </div>
          
          {/* Location */}
          <div className="mb-5">
            <div className="text-gray-500 text-[10px] uppercase tracking-widest font-medium mb-0.5">
              Venue
            </div>
            <p className="text-gray-900 font-semibold text-sm">
              {eventLocation || "TBA"}
            </p>
          </div>
          
          {/* Thin Divider Line with Cutouts */}
          <div className="relative flex items-center my-2">
            <div className="absolute -left-5 w-4 h-4 bg-background rounded-full shadow-inner" />
            <div className="flex-1 border-t border-gray-300/60" />
            <div className="absolute -right-5 w-4 h-4 bg-background rounded-full shadow-inner" />
          </div>
          
          {/* Two-Column Attendee Row */}
          <div className="flex items-start justify-between mt-4 mb-5">
            <div>
                <div className="text-gray-500 text-[10px] uppercase tracking-widest font-medium mb-0.5">
                  Attendee
                </div>
              <p className="text-gray-900 font-bold text-base uppercase tracking-wide">
                {buyerName}
              </p>
            </div>
            <div className="text-right">
              <div className="text-gray-500 text-[10px] uppercase tracking-widest font-medium mb-0.5">
                Qty
              </div>
              <p className="text-gray-900 font-bold text-xl">
                {quantity}
              </p>
            </div>
          </div>
          
          {/* Huge Centered QR Code */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="p-3 rounded-xl bg-white shadow-lg border border-gray-100">
              <QRCodeSVG
                value={qrCodeData}
                size={180}
                level="H"
                includeMargin={false}
              />
            </div>
            <div className="mt-2 text-[10px] font-semibold text-gray-500 uppercase tracking-widest">
              Scan for Entry
            </div>
          </div>
          
          {/* Compact Footer */}
          <div className="mt-4 pt-3 border-t border-gray-200/50 flex items-center justify-between text-[10px] text-gray-400 font-mono">
            <span>{ticketNumber}</span>
            <span>SEQ {String(sequence).padStart(4, "0")}</span>
          </div>
          <div className="text-center mt-1">
            <span className="text-gray-400 text-[9px] font-medium tracking-wide">
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
