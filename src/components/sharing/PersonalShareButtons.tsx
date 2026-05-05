import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, MessageSquare, Copy, Check, Link2, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { siWhatsapp, siViber } from "simple-icons";
import { notifyInfo, notifySuccess } from '@/lib/i18n-toast';

interface PersonalShareButtonsProps {
  shareUrl: string;
  shareText: string;
  title?: string;
  variant?: "grid" | "row";
  className?: string;
  showCopyLink?: boolean;
  showNativeShare?: boolean;
  onNativeShare?: () => void;
}

export function PersonalShareButtons({
  shareUrl,
  shareText,
  title,
  variant = "grid",
  className,
  showCopyLink = true,
  showNativeShare,
  onNativeShare,
}: PersonalShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const fullMessage = `${shareText}\n\n${shareUrl}`;

  const handleWhatsApp = () => {
    // Simple message for WhatsApp - OG tags in URL provide rich preview
    const whatsappMessage = title ? `🎉 ${title}\n${shareUrl}` : shareUrl;
    const url = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(url, '_blank');
  };

  const handleViber = () => {
    const viberUrl = `viber://forward?text=${encodeURIComponent(fullMessage)}`;
    
    window.location.href = viberUrl;
    
    let hasOpened = false;
    const checkTimer = setTimeout(() => {
      if (!hasOpened) {
        navigator.clipboard.writeText(fullMessage);
        notifyInfo('toasts.sharing.messageCopiedPasteItIntoViber');
      }
    }, 1500);
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        hasOpened = true;
        clearTimeout(checkTimer);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    setTimeout(() => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, 2000);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(title || "Check this out");
    const body = encodeURIComponent(fullMessage);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleSMS = () => {
    const body = encodeURIComponent(fullMessage);
    window.location.href = `sms:?&body=${body}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    notifySuccess('toasts.sharing.linkCopiedClipboard');
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
  ];

  if (showCopyLink) {
    buttons.push({
      id: "copy",
      label: copied ? "Copied!" : "Copy Link",
      onClick: handleCopyLink,
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
    });
  }

  if (showNativeShare && onNativeShare) {
    buttons.push({
      id: "native",
      label: "More...",
      onClick: onNativeShare,
      icon: (
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
          <Share2 className="w-5 h-5 text-muted-foreground" />
        </div>
      ),
    });
  }

  if (variant === "row") {
    return (
      <div className={cn("flex items-center gap-2 flex-wrap", className)}>
        {buttons.map((btn) => (
          <Button
            key={btn.id}
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={btn.onClick}
          >
            {btn.icon}
            <span className="text-xs font-medium">{btn.label}</span>
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 sm:grid-cols-5 gap-2", className)}>
      {buttons.map((btn) => (
        <Button
          key={btn.id}
          variant="outline"
          className="h-auto py-3 flex flex-col gap-2 items-center justify-center"
          onClick={btn.onClick}
        >
          {btn.icon}
          <span className="text-xs font-medium">{btn.label}</span>
        </Button>
      ))}
    </div>
  );
}
