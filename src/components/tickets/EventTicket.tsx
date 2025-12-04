import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { Calendar, MapPin, Clock, User, Ticket, Download, Share2 } from "lucide-react";
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
      {/* Ticket Card - Clean Boarding Pass Style */}
      <div
        ref={ticketRef}
        className="relative w-full max-w-md mx-auto overflow-hidden rounded-2xl bg-card border border-border shadow-lg"
      >
        {/* Washed-out Background Image */}
        {eventImageUrl && (
          <>
            <img
              src={eventImageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover brightness-110 saturate-[0.3] opacity-30"
              crossOrigin="anonymous"
            />
            {/* Light overlay for washed-out effect */}
            <div className="absolute inset-0 bg-background/85" />
          </>
        )}
        
        {/* Content */}
        <div className="relative z-10 p-5">
          {/* Header with VITANA Branding */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">V</span>
              </div>
              <div>
                <span className="text-foreground text-xs font-semibold tracking-wider">VITANA</span>
                <div className="text-muted-foreground text-[10px] tracking-widest">EVENT PASS</div>
              </div>
            </div>
            
            {/* Ticket Type Badge */}
            <span className="px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
              {ticketType}
            </span>
          </div>
          
          {/* Event Title */}
          <h2 className="text-xl font-bold text-foreground mb-5 leading-tight">
            {eventTitle}
          </h2>
          
          {/* Event Details Grid */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Date */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-wider font-medium">Date</span>
              </div>
              <p className="text-foreground font-semibold text-sm">{format(eventDate, "EEE, MMM d, yyyy")}</p>
            </div>
            
            {/* Time */}
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-[10px] uppercase tracking-wider font-medium">Time</span>
              </div>
              <p className="text-foreground font-semibold text-sm">{format(eventDate, "h:mm a")}</p>
            </div>
          </div>
          
          {/* Location */}
          <div className="mb-5">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase tracking-wider font-medium">Location</span>
            </div>
            <p className="text-foreground font-semibold text-sm">{eventLocation || "TBA"}</p>
          </div>
          
          {/* Perforation Line */}
          <div className="relative flex items-center my-5">
            <div className="absolute -left-5 w-4 h-4 bg-background rounded-full border-r border-border" />
            <div className="flex-1 border-t border-dashed border-border" />
            <div className="absolute -right-5 w-4 h-4 bg-background rounded-full border-l border-border" />
          </div>
          
          {/* Attendee Section */}
          <div className="flex items-start justify-between gap-4">
            {/* Attendee Info */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                    Attendee
                  </div>
                  <div className="text-sm font-bold text-foreground truncate">
                    {buyerName}
                  </div>
                </div>
                {quantity > 1 && (
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Qty</div>
                    <div className="text-lg font-bold text-foreground">{quantity}</div>
                  </div>
                )}
              </div>
              
              {/* Ticket Number */}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                <span>#{ticketNumber}</span>
                <span>SEQ: {String(sequence).padStart(4, "0")}</span>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center gap-2">
              <div className="p-2 rounded-lg bg-white border border-border shadow-sm">
                <QRCodeSVG
                  value={qrCodeData}
                  size={72}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground">
                <Ticket className="h-3 w-3" />
                <span>ADMIT {quantity}</span>
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-center">
            <span className="text-muted-foreground text-[10px] font-medium tracking-wide">
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
