import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { Calendar, MapPin, Clock, User, Ticket, Download, Share2, Sparkles } from "lucide-react";
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
        backgroundColor: null,
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
        backgroundColor: null,
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
      {/* Ticket Card with Full Background Image */}
      <div
        ref={ticketRef}
        className="relative w-full max-w-md mx-auto overflow-hidden rounded-3xl shadow-2xl"
      >
        {/* Full-bleed Background Image */}
        {eventImageUrl ? (
          <img
            src={eventImageUrl}
            alt={eventTitle}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sky-600 via-purple-600 to-pink-600" />
        )}
        
        {/* Gradient Overlay for Readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/55 to-black/70" />
        
        {/* Content Overlay */}
        <div className="relative z-10 p-6">
          {/* Header with VITANA Branding */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              {/* VITANA Gradient Logo */}
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <span className="text-white font-bold text-lg">V</span>
              </div>
              <div>
                <span className="text-white/90 text-xs font-medium tracking-wider">VITANA</span>
                <div className="text-white/70 text-[10px] font-light tracking-widest">EVENT PASS</div>
              </div>
            </div>
            
            {/* Ticket Type Badge */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-sky-500/80 via-purple-500/80 to-pink-500/80 backdrop-blur-sm shadow-lg">
              <Sparkles className="h-3 w-3 text-white" />
              <span className="text-white text-xs font-semibold uppercase tracking-wide">
                {ticketType}
              </span>
            </div>
          </div>
          
          {/* Event Title */}
          <h2 className="text-2xl font-bold text-white mb-6 leading-tight drop-shadow-lg">
            {eventTitle}
          </h2>
          
          {/* Event Details Grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* Date */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-sky-300" />
                <span className="text-white/60 text-[10px] uppercase tracking-wider font-medium">Date</span>
              </div>
              <p className="text-white font-semibold text-sm">{format(eventDate, "EEE, MMM d")}</p>
            </div>
            
            {/* Time */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="w-3.5 h-3.5 text-purple-300" />
                <span className="text-white/60 text-[10px] uppercase tracking-wider font-medium">Time</span>
              </div>
              <p className="text-white font-semibold text-sm">{format(eventDate, "h:mm a")}</p>
            </div>
          </div>
          
          {/* Location */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 mb-5">
            <div className="flex items-center gap-1.5 mb-1">
              <MapPin className="w-3.5 h-3.5 text-pink-300" />
              <span className="text-white/60 text-[10px] uppercase tracking-wider font-medium">Location</span>
            </div>
            <p className="text-white font-semibold text-sm">{eventLocation || "TBA"}</p>
          </div>
          
          {/* Perforation Line */}
          <div className="relative flex items-center my-5">
            {/* Left cutout */}
            <div className="absolute -left-6 w-5 h-5 bg-background rounded-full" />
            
            {/* Dashed line with gradient dots */}
            <div className="flex-1 flex items-center justify-center gap-1">
              {Array.from({ length: 20 }).map((_, i) => (
                <div 
                  key={i} 
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: `hsl(${200 + i * 8}, 80%, 70%)`,
                    opacity: 0.5
                  }}
                />
              ))}
            </div>
            
            {/* Right cutout */}
            <div className="absolute -right-6 w-5 h-5 bg-background rounded-full" />
          </div>
          
          {/* Attendee Section */}
          <div className="flex items-start justify-between gap-4">
            {/* Attendee Info */}
            <div className="flex-1 space-y-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-white/20">
                    <User className="h-5 w-5 text-white/80" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] text-white/60 uppercase tracking-wider font-medium">
                      Attendee
                    </div>
                    <div className="text-sm font-bold text-white truncate">
                      {buyerName}
                    </div>
                  </div>
                  {quantity > 1 && (
                    <div className="text-right">
                      <div className="text-[10px] text-white/60 uppercase tracking-wider">Qty</div>
                      <div className="text-lg font-bold text-white">{quantity}</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Ticket Number */}
              <div className="flex items-center justify-between text-[10px] text-white/50 font-mono px-1">
                <span>#{ticketNumber}</span>
                <span>SEQ: {String(sequence).padStart(4, "0")}</span>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-2">
              <div className="p-2.5 rounded-xl bg-white shadow-lg">
                <QRCodeSVG
                  value={qrCodeData}
                  size={80}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-white/80">
                <Ticket className="h-3 w-3" />
                <span>ADMIT {quantity}</span>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-center gap-2">
            <div className="h-4 w-0.5 rounded-full bg-gradient-to-b from-sky-400 via-purple-500 to-pink-500" />
            <span className="text-white/40 text-[10px] font-medium tracking-wide">
              Powered by VITANA
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center max-w-md mx-auto">
        <Button
          variant="outline"
          className="flex-1 rounded-xl border-border/50 hover:border-primary/50 hover:bg-primary/5"
          onClick={handleDownload}
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button
          className="flex-1 rounded-xl bg-gradient-to-r from-sky-500 via-purple-500 to-pink-500 hover:from-sky-600 hover:via-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/20"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </div>
    </div>
  );
}
