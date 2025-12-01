import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link2, MessageSquare, Mail, Send, Copy, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { siWhatsapp, siViber } from "simple-icons";

interface ShareCampaignModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
  campaignDescription?: string;
  campaignImage?: string;
}

export function ShareCampaignModal({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  campaignDescription,
  campaignImage,
}: ShareCampaignModalProps) {
  const [copied, setCopied] = useState(false);

  const publicUrl = `${window.location.origin}/pub/campaigns/${campaignId}`;
  
  const shareMessage = `Join me at: ${campaignName}
${campaignDescription ? `\n${campaignDescription.slice(0, 150)}${campaignDescription.length > 150 ? '...' : ''}` : ''}

${publicUrl}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(url, '_blank');
  };

  const handleViber = () => {
    const viberUrl = `viber://forward?text=${encodeURIComponent(shareMessage)}`;
    
    // Try to open Viber
    window.location.href = viberUrl;
    
    // If Viber doesn't open (app not installed), copy to clipboard as fallback
    let hasOpened = false;
    const checkTimer = setTimeout(() => {
      if (!hasOpened) {
        navigator.clipboard.writeText(shareMessage);
        toast.info("Message copied – paste it into Viber");
      }
    }, 1500);
    
    // Clear timer if user leaves the page (Viber opened)
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
    const subject = encodeURIComponent(`Join me: ${campaignName}`);
    const body = encodeURIComponent(shareMessage);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleSMS = () => {
    const body = encodeURIComponent(shareMessage);
    window.location.href = `sms:?&body=${body}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share this campaign</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Send a personal invite – no extra setup needed.
          </p>
        </DialogHeader>

        {/* Campaign Preview */}
        <div className="flex items-start gap-3 p-4 bg-muted/30 rounded-lg border">
          {campaignImage && (
            <img
              src={campaignImage}
              alt={campaignName}
              className="w-16 h-16 rounded-lg object-cover shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">{campaignName}</h4>
            {campaignDescription && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {campaignDescription}
              </p>
            )}
          </div>
        </div>

        {/* Quick Share Buttons */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Quick share</h4>
          
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col gap-2 items-center justify-center"
              onClick={handleWhatsApp}
            >
              <div className="w-8 h-8 rounded-full bg-[#25D366] flex items-center justify-center">
                <svg
                  role="img"
                  viewBox="0 0 24 24"
                  className="w-5 h-5 fill-white"
                  dangerouslySetInnerHTML={{ __html: siWhatsapp.path }}
                />
              </div>
              <span className="text-xs font-medium">WhatsApp</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col gap-2 items-center justify-center"
              onClick={handleViber}
            >
              <div className="w-8 h-8 rounded-full bg-[#7360F2] flex items-center justify-center">
                <svg
                  role="img"
                  viewBox="0 0 24 24"
                  className="w-5 h-5 fill-white"
                  dangerouslySetInnerHTML={{ __html: siViber.path }}
                />
              </div>
              <span className="text-xs font-medium">Viber</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col gap-2 items-center justify-center"
              onClick={handleEmail}
            >
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xs font-medium">Email</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-3 flex flex-col gap-2 items-center justify-center"
              onClick={handleSMS}
            >
              <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium">SMS</span>
            </Button>
          </div>
        </div>

        {/* Copy Link Section */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Link</h4>
          <div className="flex items-center gap-2">
            <Input
              value={publicUrl}
              readOnly
              className="flex-1 text-sm"
            />
            <Button
              variant={copied ? "default" : "outline"}
              size="sm"
              onClick={handleCopyLink}
              className={cn(
                "shrink-0 min-w-[80px]",
                copied && "bg-green-600 hover:bg-green-700"
              )}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Copy this link to paste into any app
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
