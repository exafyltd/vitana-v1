import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { Calendar, MapPin, User, Ticket, Download, Share2, Sparkles } from "lucide-react";
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
      {/* Ticket Card */}
      <div
        ref={ticketRef}
        className="relative w-full max-w-md mx-auto overflow-hidden rounded-3xl shadow-2xl"
        style={{
          background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)",
        }}
      >
        {/* Gradient Border Glow */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-sky-500/20 via-purple-500/20 to-pink-500/20 blur-sm" />
        
        {/* Inner Container */}
        <div className="relative rounded-3xl border border-white/10 overflow-hidden">
          
          {/* Hero Event Image Section */}
          <div className="relative h-48 overflow-hidden">
            {eventImageUrl ? (
              <>
                <img
                  src={eventImageUrl}
                  alt={eventTitle}
                  className="w-full h-full object-cover"
                />
                {/* Gradient overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              </>
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-sky-600 via-purple-600 to-pink-600" />
            )}
            
            {/* Event Pass Header */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* VITANA Logo with Gradient */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <span className="text-white font-bold text-lg">V</span>
                </div>
                <div>
                  <span className="text-white/90 text-xs font-medium tracking-wider">VITANA</span>
                  <div className="text-white text-[10px] font-light tracking-widest">EVENT PASS</div>
                </div>
              </div>
              
              {/* Ticket Type Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-sky-500/90 via-purple-500/90 to-pink-500/90 backdrop-blur-sm shadow-lg">
                <Sparkles className="h-3 w-3 text-white" />
                <span className="text-white text-xs font-semibold">{ticketType}</span>
              </div>
            </div>
            
            {/* Event Title on Image */}
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-xl font-bold text-white leading-tight line-clamp-2 drop-shadow-lg">
                {eventTitle}
              </h2>
            </div>
          </div>

          {/* Glassmorphic Content Area */}
          <div className="relative bg-card/80 backdrop-blur-xl p-5 space-y-4">
            
            {/* Decorative Top Border */}
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

            {/* Event Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 p-3 rounded-xl bg-background/50 border border-border/50">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5 text-sky-500" />
                  <span className="text-[10px] uppercase tracking-wider font-medium">Date & Time</span>
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {format(eventDate, "EEE, MMM d")}
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {format(eventDate, "h:mm a")}
                </div>
              </div>

              <div className="space-y-1.5 p-3 rounded-xl bg-background/50 border border-border/50">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-pink-500" />
                  <span className="text-[10px] uppercase tracking-wider font-medium">Location</span>
                </div>
                <div className="text-sm font-semibold text-foreground line-clamp-2">
                  {eventLocation || "TBA"}
                </div>
              </div>
            </div>

            {/* Perforation Line with Cutouts */}
            <div className="relative py-2">
              <div className="absolute -left-5 top-1/2 -translate-y-1/2 w-5 h-10 bg-background rounded-r-full" />
              <div className="absolute -right-5 top-1/2 -translate-y-1/2 w-5 h-10 bg-background rounded-l-full" />
              <div className="border-t-2 border-dashed border-border/60 mx-2" />
              {/* Decorative dots */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-500/40" />
                <div className="w-1.5 h-1.5 rounded-full bg-purple-500/40" />
                <div className="w-1.5 h-1.5 rounded-full bg-pink-500/40" />
              </div>
            </div>

            {/* Attendee & QR Section */}
            <div className="flex items-center gap-4">
              {/* Attendee Info */}
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-background/50 border border-border/50">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400/20 via-purple-400/20 to-pink-400/20 flex items-center justify-center border border-primary/20">
                    <User className="h-5 w-5 text-primary" />
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
                    <div className="text-right px-2">
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Qty</div>
                      <div className="text-lg font-bold text-primary">{quantity}</div>
                    </div>
                  )}
                </div>
                
                {/* Ticket Number */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono px-1">
                  <span>#{ticketNumber}</span>
                  <span>SEQ: {String(sequence).padStart(4, "0")}</span>
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center gap-2">
                <div className="p-2.5 rounded-xl bg-white shadow-lg shadow-black/10 border border-gray-100">
                  <QRCodeSVG
                    value={qrCodeData}
                    size={80}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <div className="flex items-center gap-1 text-[10px] font-semibold text-primary">
                  <Ticket className="h-3 w-3" />
                  <span>ADMIT {quantity}</span>
                </div>
              </div>
            </div>

            {/* Footer Branding */}
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-border/30">
              <div className="h-4 w-0.5 rounded-full bg-gradient-to-b from-sky-500 via-purple-500 to-pink-500" />
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide">
                Powered by VITANA
              </span>
            </div>
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
