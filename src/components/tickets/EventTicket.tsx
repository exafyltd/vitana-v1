import React, { useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import { Calendar, MapPin, User, Ticket, Download, Share2 } from "lucide-react";
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
          // Fallback to download
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
        className="relative w-full max-w-md mx-auto overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/5"
      >
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          {eventImageUrl ? (
            <img
              src={eventImageUrl}
              alt=""
              className="w-full h-full object-cover opacity-50 brightness-110 saturate-[0.6]"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 via-primary/10 to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/60 to-white/65" />
        </div>

        {/* Content */}
        <div className="relative p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold text-sm">V</span>
              </div>
              <span className="text-sm font-medium text-muted-foreground">VITANA</span>
            </div>
            <div className="text-xs font-mono text-muted-foreground">
              #{ticketNumber}
            </div>
          </div>

          {/* Decorative Line */}
          <div className="border-t border-dashed border-border/60" />

          {/* Event Title */}
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground leading-tight line-clamp-2">
              {eventTitle}
            </h2>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Ticket className="h-3 w-3" />
              {ticketType}
            </div>
          </div>

          {/* Event Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Calendar className="h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wide">Date</span>
              </div>
              <div className="text-sm font-medium text-foreground">
                {format(eventDate, "EEE, MMM d, yyyy")}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(eventDate, "h:mm a")}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wide">Location</span>
              </div>
              <div className="text-sm font-medium text-foreground line-clamp-2">
                {eventLocation || "TBA"}
              </div>
            </div>
          </div>

          {/* Perforation Line */}
          <div className="relative">
            <div className="absolute -left-6 top-1/2 -translate-y-1/2 w-4 h-8 bg-background rounded-r-full" />
            <div className="absolute -right-6 top-1/2 -translate-y-1/2 w-4 h-8 bg-background rounded-l-full" />
            <div className="border-t border-dashed border-border/60" />
          </div>

          {/* Attendee Info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Attendee
                </div>
                <div className="text-sm font-semibold text-foreground truncate">
                  {buyerName}
                </div>
              </div>
            </div>
            {quantity > 1 && (
              <div className="text-right">
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  Qty
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {quantity}
                </div>
              </div>
            )}
          </div>

          {/* QR Code Section */}
          <div className="flex flex-col items-center gap-4 pt-3">
            <div className="bg-white p-4 rounded-xl shadow-md ring-1 ring-black/5">
              <QRCodeSVG
                value={qrCodeData}
                size={160}
                level="H"
                includeMargin={false}
              />
            </div>
            <div className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
              <span>ADMIT {quantity}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
              <span>SEQ: {String(sequence).padStart(4, "0")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center max-w-md mx-auto">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleDownload}
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button
          className="flex-1"
          onClick={handleShare}
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </div>
    </div>
  );
}
