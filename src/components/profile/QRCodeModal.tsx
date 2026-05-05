import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Download, Share2 } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { notify, t } from '@/lib/i18n-toast';

interface QRCodeModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  profileUrl: string;
  profileName: string;
}

export function QRCodeModal({ isOpen, onOpenChange, profileUrl, profileName }: QRCodeModalProps) {
  const { toast } = useToast();

  const handleDownload = () => {
    const canvas = document.getElementById('qr-code') as HTMLCanvasElement;
    if (canvas) {
      const svg = canvas.querySelector('svg');
      if (svg) {
        const svgData = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const downloadLink = document.createElement('a');
        downloadLink.href = svgUrl;
        downloadLink.download = `${profileName}-vitana-qr.svg`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(svgUrl);
        
        notify('toasts.profile.qrCodeDownloaded', 'toasts.profile.yourVitanaIdQrCodeHas');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{t('screens.profile.vitanaIdQrCode')}</DialogTitle>
          <DialogDescription className="text-center">
            Scan this code to view {profileName}'s profile
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-6 py-4">
          <div 
            id="qr-code"
            className="p-6 bg-white rounded-2xl shadow-lg border-4 border-gradient-to-br from-[hsl(var(--sys-vitana-accent))] to-[hsl(var(--pill-nutrition-accent))]"
          >
            <QRCodeSVG
              value={profileUrl}
              size={200}
              level="H"
              includeMargin={false}
              fgColor="hsl(var(--foreground))"
              bgColor="#ffffff"
            />
          </div>
          
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4 mr-2" />
              Download
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-gradient-to-r from-[hsl(var(--sys-vitana-accent))] to-[hsl(var(--pill-nutrition-accent))] text-white border-0"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: `${profileName}'s Vitana Profile`,
                    url: profileUrl,
                  });
                }
              }}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
