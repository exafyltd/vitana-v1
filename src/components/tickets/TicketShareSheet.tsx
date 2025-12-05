import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Download, Link2, Mail, MessageSquare, Share2 } from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import { siWhatsapp, siViber } from "simple-icons";

interface TicketShareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketRef: React.RefObject<HTMLDivElement>;
  eventTitle: string;
  ticketNumber: string;
  eventDate?: string;
  eventLocation?: string;
}

export function TicketShareSheet({
  open,
  onOpenChange,
  ticketRef,
  eventTitle,
  ticketNumber,
  eventDate,
  eventLocation,
}: TicketShareSheetProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateTicketImage = async (): Promise<{ blob: Blob; file: File } | null> => {
    if (!ticketRef.current) return null;
    
    try {
      const canvas = await html2canvas(ticketRef.current, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, "image/png");
      });
      
      if (!blob) return null;
      
      const file = new File([blob], `ticket-${ticketNumber}.png`, { type: "image/png" });
      return { blob, file };
    } catch (error) {
      console.error("Error generating ticket image:", error);
      return null;
    }
  };

  const getShareText = () => {
    let text = `🎟️ My ticket for ${eventTitle}`;
    if (eventDate) text += `\n📅 ${eventDate}`;
    if (eventLocation) text += `\n📍 ${eventLocation}`;
    return text;
  };

  const handleNativeShare = async () => {
    setIsGenerating(true);
    try {
      const result = await generateTicketImage();
      if (!result) {
        toast.error("Failed to generate ticket image");
        return;
      }

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [result.file] })) {
        await navigator.share({
          title: `Ticket for ${eventTitle}`,
          text: getShareText(),
          files: [result.file],
        });
        toast.success("Ticket shared!");
        onOpenChange(false);
      } else {
        toast.error("Native sharing not supported on this device");
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast.error("Failed to share ticket");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWhatsApp = async () => {
    setIsGenerating(true);
    try {
      const result = await generateTicketImage();
      if (!result) {
        toast.error("Failed to generate ticket image");
        return;
      }

      // Try native share with file on mobile
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [result.file] })) {
        await navigator.share({
          title: `Ticket for ${eventTitle}`,
          text: getShareText(),
          files: [result.file],
        });
        toast.success("Ticket shared!");
        onOpenChange(false);
      } else {
        // Desktop: Download image and open WhatsApp with text
        const link = document.createElement("a");
        link.download = `ticket-${ticketNumber}.png`;
        link.href = URL.createObjectURL(result.blob);
        link.click();
        URL.revokeObjectURL(link.href);
        
        const text = encodeURIComponent(getShareText() + "\n\n(Ticket image downloaded - attach it to your message)");
        window.open(`https://wa.me/?text=${text}`, "_blank");
        toast.success("Ticket downloaded! Attach it in WhatsApp.");
        onOpenChange(false);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast.error("Failed to share via WhatsApp");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleViber = async () => {
    setIsGenerating(true);
    try {
      const result = await generateTicketImage();
      if (!result) {
        toast.error("Failed to generate ticket image");
        return;
      }

      // Download image first
      const link = document.createElement("a");
      link.download = `ticket-${ticketNumber}.png`;
      link.href = URL.createObjectURL(result.blob);
      link.click();
      URL.revokeObjectURL(link.href);

      const text = encodeURIComponent(getShareText());
      
      // Try to open Viber
      const viberUrl = `viber://forward?text=${text}`;
      const startTime = Date.now();
      window.location.href = viberUrl;
      
      // Check if Viber opened
      setTimeout(() => {
        if (Date.now() - startTime < 1500) {
          toast.success("Ticket downloaded! Attach it in Viber.");
        } else {
          toast.success("Opening Viber... Attach the downloaded ticket.");
        }
        onOpenChange(false);
      }, 1000);
    } catch (error) {
      toast.error("Failed to share via Viber");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEmail = async () => {
    setIsGenerating(true);
    try {
      const result = await generateTicketImage();
      if (!result) {
        toast.error("Failed to generate ticket image");
        return;
      }

      // Download image first
      const link = document.createElement("a");
      link.download = `ticket-${ticketNumber}.png`;
      link.href = URL.createObjectURL(result.blob);
      link.click();
      URL.revokeObjectURL(link.href);

      const subject = encodeURIComponent(`My Ticket for ${eventTitle}`);
      const body = encodeURIComponent(
        `${getShareText()}\n\n(Please attach the downloaded ticket image to this email)`
      );
      
      window.location.href = `mailto:?subject=${subject}&body=${body}`;
      toast.success("Ticket downloaded! Attach it to your email.");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to prepare email");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSMS = async () => {
    setIsGenerating(true);
    try {
      const result = await generateTicketImage();
      if (!result) {
        toast.error("Failed to generate ticket image");
        return;
      }

      // Try native share with file on mobile
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [result.file] })) {
        await navigator.share({
          title: `Ticket for ${eventTitle}`,
          text: getShareText(),
          files: [result.file],
        });
        toast.success("Ticket shared!");
        onOpenChange(false);
      } else {
        // Desktop: Download and open SMS
        const link = document.createElement("a");
        link.download = `ticket-${ticketNumber}.png`;
        link.href = URL.createObjectURL(result.blob);
        link.click();
        URL.revokeObjectURL(link.href);

        const text = encodeURIComponent(getShareText());
        window.location.href = `sms:?body=${text}`;
        toast.success("Ticket downloaded! Attach it to your message.");
        onOpenChange(false);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        toast.error("Failed to share via SMS");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const result = await generateTicketImage();
      if (!result) {
        toast.error("Failed to generate ticket image");
        return;
      }

      const link = document.createElement("a");
      link.download = `ticket-${ticketNumber}.png`;
      link.href = URL.createObjectURL(result.blob);
      link.click();
      URL.revokeObjectURL(link.href);
      
      toast.success("Ticket downloaded!");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to download ticket");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyDetails = async () => {
    try {
      await navigator.clipboard.writeText(getShareText());
      toast.success("Event details copied!");
    } catch (error) {
      toast.error("Failed to copy details");
    }
  };

  // Check if native file sharing is supported (primarily mobile)
  const supportsNativeFileShare = typeof navigator !== "undefined" && 
    navigator.share && 
    navigator.canShare;

  const shareOptions = [
    ...(supportsNativeFileShare ? [{
      id: "native",
      label: "Share...",
      icon: Share2,
      description: "Open share menu",
      onClick: handleNativeShare,
    }] : []),
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: () => (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d={siWhatsapp.path} />
        </svg>
      ),
      description: "Share via WhatsApp",
      onClick: handleWhatsApp,
    },
    {
      id: "viber",
      label: "Viber",
      icon: () => (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
          <path d={siViber.path} />
        </svg>
      ),
      description: "Share via Viber",
      onClick: handleViber,
    },
    {
      id: "email",
      label: "Email",
      icon: Mail,
      description: "Send via email",
      onClick: handleEmail,
    },
    {
      id: "sms",
      label: "SMS",
      icon: MessageSquare,
      description: "Send via text",
      onClick: handleSMS,
    },
    {
      id: "download",
      label: "Download",
      icon: Download,
      description: "Save image",
      onClick: handleDownload,
    },
    {
      id: "copy",
      label: "Copy Details",
      icon: Link2,
      description: "Copy event info",
      onClick: handleCopyDetails,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">Share Ticket</SheetTitle>
        </SheetHeader>
        
        <div className="grid grid-cols-4 gap-3 pb-6">
          {shareOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <Button
                key={option.id}
                variant="ghost"
                className="flex flex-col items-center gap-2 h-auto py-4 hover:bg-accent/50"
                onClick={option.onClick}
                disabled={isGenerating}
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <IconComponent className="h-5 w-5 text-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">{option.label}</span>
              </Button>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
