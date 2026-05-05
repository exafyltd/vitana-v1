import { useState, useRef } from "react";
import html2canvas from "html2canvas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, MessageSquare, Download, Link2, Check, Calendar, MapPin, Ticket } from "lucide-react";
import { siWhatsapp, siViber } from "simple-icons";
import { cn } from "@/lib/utils";
import { notifyError, notifyInfo, notifySuccess, t } from '@/lib/i18n-toast';

interface TicketShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketRef: React.RefObject<HTMLDivElement>;
  eventTitle: string;
  ticketNumber: string;
  eventDate?: string;
  eventLocation?: string;
  eventImageUrl?: string;
  ticketType?: string;
  buyerName?: string;
}

export function TicketShareSheet({
  open,
  onOpenChange,
  ticketRef,
  eventTitle,
  ticketNumber,
  eventDate,
  eventLocation,
  eventImageUrl,
  ticketType,
  buyerName,
}: TicketShareSheetProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const imageCache = useRef<Blob | null>(null);

  const shareText = `🎟️ I'm going to ${eventTitle}!${eventDate ? `\n📅 ${eventDate}` : ""}${eventLocation ? `\n📍 ${eventLocation}` : ""}`;

  const generateTicketImage = async (): Promise<Blob | null> => {
    if (imageCache.current) return imageCache.current;
    if (!ticketRef.current) {
      notifyError('toasts.tickets.unableGenerateTicketImage');
      return null;
    }

    setIsGenerating(true);
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        backgroundColor: null,
        useCORS: true,
        allowTaint: true,
      });

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          imageCache.current = blob;
          setIsGenerating(false);
          resolve(blob);
        }, "image/png", 0.95);
      });
    } catch (error) {
      console.error("Error generating ticket image:", error);
      setIsGenerating(false);
      notifyError('toasts.tickets.failedGenerateTicketImage');
      return null;
    }
  };

  const downloadTicket = async () => {
    const blob = await generateTicketImage();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ticket-${ticketNumber}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return blob;
  };

  const handleWhatsApp = async () => {
    const blob = await downloadTicket();
    if (!blob) return;
    
    notifySuccess('toasts.tickets.ticketDownloadedOpeningWhatsapp');
    const url = `https://wa.me/?text=${encodeURIComponent(shareText + "\n\n(Ticket image attached separately)")}`;
    window.open(url, "_blank");
  };

  const handleViber = async () => {
    const blob = await downloadTicket();
    if (!blob) return;

    const viberUrl = `viber://forward?text=${encodeURIComponent(shareText)}`;
    window.location.href = viberUrl;

    let hasOpened = false;
    const checkTimer = setTimeout(() => {
      if (!hasOpened) {
        navigator.clipboard.writeText(shareText);
        notifyInfo('toasts.tickets.ticketDownloadedMessageCopiedPasteIt');
      }
    }, 1500);

    const handleVisibilityChange = () => {
      if (document.hidden) {
        hasOpened = true;
        clearTimeout(checkTimer);
        notifySuccess('toasts.tickets.ticketDownloadedOpeningViber');
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    setTimeout(() => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }, 2000);
  };

  const handleEmail = async () => {
    const blob = await downloadTicket();
    if (!blob) return;

    notifySuccess('toasts.tickets.ticketDownloadedOpeningEmail');
    const subject = encodeURIComponent(`My ticket for ${eventTitle}`);
    const body = encodeURIComponent(`${shareText}\n\n(Please attach the downloaded ticket image)`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleSMS = async () => {
    const blob = await downloadTicket();
    if (!blob) return;

    notifySuccess('toasts.tickets.ticketDownloadedOpeningMessages');
    const body = encodeURIComponent(shareText);
    window.location.href = `sms:?&body=${body}`;
  };

  const handleDownload = async () => {
    await downloadTicket();
    notifySuccess('toasts.tickets.ticketSaved');
  };

  const handleCopyDetails = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    notifySuccess('toasts.tickets.eventDetailsCopied');
    setTimeout(() => setCopied(false), 2000);
  };

  const buttons = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      onClick: handleWhatsApp,
      icon: (
        <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center">
          <svg role="img" viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d={siWhatsapp.path} />
          </svg>
        </div>
      ),
    },
    {
      id: "viber",
      label: "Viber",
      onClick: handleViber,
      icon: (
        <div className="w-8 h-8 rounded-full bg-[#7360F2] flex items-center justify-center">
          <svg role="img" viewBox="0 0 24 24" className="w-5 h-5 fill-white">
            <path d={siViber.path} />
          </svg>
        </div>
      ),
    },
    {
      id: "email",
      label: "Email",
      onClick: handleEmail,
      icon: (
        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <Mail className="w-5 h-5 text-primary-foreground" />
        </div>
      ),
    },
    {
      id: "sms",
      label: "SMS",
      onClick: handleSMS,
      icon: (
        <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
      ),
    },
    {
      id: "download",
      label: "Download",
      onClick: handleDownload,
      icon: (
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
          <Download className="w-5 h-5 text-secondary-foreground" />
        </div>
      ),
    },
    {
      id: "copy",
      label: copied ? "Copied!" : "Copy Link",
      onClick: handleCopyDetails,
      icon: (
        <div className={cn(
          "w-8 h-8 rounded-full flex items-center justify-center",
          copied ? "bg-green-600" : "bg-muted"
        )}>
          {copied ? (
            <Check className="w-5 h-5 text-white" />
          ) : (
            <Link2 className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      ),
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('screens.tickets.shareYourTicket')}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {t('screens.tickets.sendYourTicketFriendsSaveFor')}
          </p>
        </DialogHeader>

        {/* Ticket Preview Card */}
        <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border">
          {eventImageUrl ? (
            <img
              src={eventImageUrl}
              alt={eventTitle}
              className="w-16 h-16 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Ticket className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{eventTitle}</h4>
            {(ticketType || buyerName) && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <Ticket className="w-3 h-3" />
                {[ticketType, buyerName].filter(Boolean).join(" • ")}
              </p>
            )}
            <div className="flex flex-col gap-0.5 mt-1">
              {eventDate && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {eventDate}
                </p>
              )}
              {eventLocation && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">{eventLocation}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Share Buttons Grid */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">{t('screens.tickets.quickShare')}</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {buttons.map((btn) => (
              <Button
                key={btn.id}
                variant="outline"
                className="h-auto py-3 flex flex-col gap-2 items-center justify-center"
                onClick={btn.onClick}
                disabled={isGenerating}
              >
                {btn.icon}
                <span className="text-xs font-medium">{btn.label}</span>
              </Button>
            ))}
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {t('screens.tickets.opensYourPersonalAppsShareDirectly')}
        </p>
      </DialogContent>
    </Dialog>
  );
}
