import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ExternalLink } from "lucide-react";
import { t } from '@/lib/i18n-toast';

interface ImageZoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  filename: string;
}

export function ImageZoomModal({ isOpen, onClose, imageUrl, filename }: ImageZoomModalProps) {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenInNewTab = () => {
    window.open(imageUrl, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold truncate flex-1 mr-4">{filename}</h3>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              aria-label={t('screens.messages.downloadImage')}
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleOpenInNewTab}
              aria-label={t('screens.messages.openNewTab')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              aria-label={t('screens.messages.close')}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Image */}
        <div className="flex-1 flex items-center justify-center p-4 bg-muted/50">
          <img
            src={imageUrl}
            alt={filename}
            className="max-w-full max-h-[70vh] object-contain rounded"
            loading="lazy"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}