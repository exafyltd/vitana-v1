import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { CalendarDays, MapPin, Clock, User, Ticket, Download, Share2 } from "lucide-react";
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
      {/* Ticket Card - Airline Boarding Pass Style */}
      <div
        ref={ticketRef}
        className="relative w-full max-w-md mx-auto overflow-hidden rounded-2xl shadow-xl"
        style={{ minHeight: "420px" }}
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
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-white/75 to-white/85" />
        
        {/* Warm Paper Tint */}
        <div className="absolute inset-0 bg-amber-50/25" />

        {/* Content Overlay */}
        <div className="relative z-10 h-full flex flex-col p-5">
          {/* Header with VITANA Branding */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md">
                <span className="text-primary-foreground font-bold text-base">V</span>
              </div>
              <div>
                <span className="text-gray-700 text-xs font-semibold tracking-wider">VITANA</span>
                <div className="text-gray-500 text-[10px] font-medium tracking-widest">EVENT PASS</div>
              </div>
            </div>
            
            {/* Ticket Type Badge */}
            <div className="px-3 py-1.5 rounded-full bg-primary shadow-md">
              <span className="text-primary-foreground text-xs font-semibold uppercase tracking-wide">
                {ticketType}
              </span>
            </div>
          </div>
          
          {/* Event Title */}
          <h2 className="text-xl font-bold text-gray-900 mb-4 leading-tight">
            {eventTitle}
          </h2>
          
          {/* Event Details Grid */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* Date */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200/60 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                <span className="text-gray-500 text-[10px] uppercase tracking-wider font-medium">Date</span>
              </div>
              <p className="text-gray-900 font-semibold text-sm">{format(eventDate, "EEE, MMM d, yyyy")}</p>
            </div>
            
            {/* Time */}
            <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200/60 shadow-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span className="text-gray-500 text-[10px] uppercase tracking-wider font-medium">Time</span>
              </div>
              <p className="text-gray-900 font-semibold text-sm">{format(eventDate, "h:mm a")}</p>
            </div>
          </div>
          
          {/* Location */}
          <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200/60 shadow-sm mb-4">
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-primary" />
              <span className="text-gray-500 text-[10px] uppercase tracking-wider font-medium">Location</span>
            </div>
            <p className="text-gray-900 font-semibold text-sm">{eventLocation || "TBA"}</p>
          </div>
          
          {/* Perforation Line */}
          <div className="relative flex items-center my-3">
            <div className="absolute -left-5 w-4 h-4 bg-background rounded-full shadow-inner" />
            <div className="flex-1 border-t-2 border-dashed border-gray-300" />
            <div className="absolute -right-5 w-4 h-4 bg-background rounded-full shadow-inner" />
          </div>
          
          {/* Bottom Section - Attendee & QR */}
          <div className="flex-1 flex items-center justify-between gap-4 mt-2">
            {/* Attendee Info */}
            <div className="flex-1 space-y-3">
              <div className="bg-white/60 backdrop-blur-sm rounded-xl p-3 border border-gray-200/60 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
                    <User className="h-5 w-5 text-gray-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">
                      Attendee
                    </div>
                    <div className="text-sm font-bold text-gray-900 truncate">
                      {buyerName}
                    </div>
                  </div>
                  {quantity > 1 && (
                    <div className="text-right">
                      <div className="text-[10px] text-gray-500 uppercase tracking-wider">Qty</div>
                      <div className="text-lg font-bold text-gray-900">{quantity}</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Ticket Number */}
              <div className="flex items-center justify-between text-[10px] text-gray-500 font-mono px-1">
                <span>{ticketNumber}</span>
                <span>SEQ: {String(sequence).padStart(4, "0")}</span>
              </div>
            </div>

            {/* QR Code - Large and Prominent */}
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-xl bg-white shadow-lg border border-gray-100">
                <QRCodeSVG
                  value={qrCodeData}
                  size={140}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-gray-600">
                <Ticket className="h-3 w-3" />
                <span>ADMIT {quantity}</span>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-gray-200/60 flex items-center justify-center">
            <span className="text-gray-400 text-[10px] font-medium tracking-wide">
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
