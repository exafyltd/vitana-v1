import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Maximize2, Share2, X, MoreHorizontal, ChevronLeft, ChevronRight, Heart, Copy, Edit, Trash2, Flag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useState, useEffect } from "react";
import { notifyInfo, notifySuccess, t } from '@/lib/i18n-toast';

interface PhotoPeekPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  image: string;
  images: string[];
  currentIndex: number;
  onIndexChange: (index: number) => void;
  caption?: string;
  tags?: string[];
  createdAt?: string;
  onOpenFull: () => void;
  metadata?: {
    size?: string;
    source?: string;
    camera?: string;
  };
  onAddToFavorites?: () => void;
  onCopyLink?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onReport?: () => void;
}

export function PhotoPeekPanel({
  open,
  onOpenChange,
  image,
  images,
  currentIndex,
  onIndexChange,
  caption,
  tags,
  createdAt,
  onOpenFull,
  metadata,
  onAddToFavorites,
  onCopyLink,
  onEdit,
  onDelete,
  onReport,
}: PhotoPeekPanelProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const handleDownload = async () => {
    try {
      const response = await fetch(image);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `photo-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  };

  const content = (
    <div className="flex flex-col flex-1 min-h-0 space-y-4 p-6 overflow-hidden">
      {/* Image Container */}
      <div className="relative shrink-0">
        <AspectRatio ratio={4 / 3} className="bg-muted rounded-xl overflow-hidden">
          <img
            src={image}
            alt={caption || `Photo ${currentIndex + 1}`}
            className="w-full h-full object-contain"
          />
        </AspectRatio>

        {/* Navigation for multiple images */}
        {images.length > 1 && (
          <>
            <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
              {currentIndex + 1} / {images.length}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 disabled:opacity-30"
              onClick={handlePrevious}
              disabled={currentIndex === 0}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 disabled:opacity-30"
              onClick={handleNext}
              disabled={currentIndex === images.length - 1}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
      </div>

      {/* Metadata Section */}
      <div className="space-y-3 flex-1 min-h-0 overflow-y-auto">
        {/* Timestamp */}
        {createdAt && (
          <p className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </p>
        )}

        {/* Caption */}
        {caption && (
          <p className="text-base font-semibold text-foreground leading-relaxed">
            {caption}
          </p>
        )}

        {/* Tags */}
        {tags && tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, index) => (
              <Badge
                key={index}
                variant="secondary"
                className="bg-secondary/50 backdrop-blur-sm border border-white/10 text-xs font-medium"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Optional Metadata */}
        {metadata && (metadata.size || metadata.source || metadata.camera) && (
          <div className="space-y-1 text-xs text-muted-foreground">
            {metadata.size && <p>Size: {metadata.size}</p>}
            {metadata.source && <p>Source: {metadata.source}</p>}
            {metadata.camera && <p>Camera: {metadata.camera}</p>}
          </div>
        )}
      </div>

      {/* Action Row */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/50 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          className="flex-1 text-sm font-medium"
        >
          <Download className="h-4 w-4 mr-2" />
          {t('screens.diary.download')}
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={onOpenFull}
          className="flex-1 text-sm font-medium"
        >
          <Maximize2 className="h-4 w-4 mr-2" />
          {t('screens.diary.openFull')}
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <Share2 className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => {
              if (onCopyLink) {
                onCopyLink();
              } else if (image) {
                navigator.clipboard.writeText(image);
                notifySuccess('toasts.diary.linkCopiedClipboard');
              }
            }}>
              <Copy className="h-4 w-4 mr-2" />
              {t('screens.diary.copyLink')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              if (image && navigator.share) {
                navigator.share({
                  title: caption || 'Photo',
                  url: image
                }).catch(() => {
                  // User cancelled or share not available
                });
              } else {
                notifyInfo('toasts.diary.sharingNotAvailableThisDevice');
              }
            }}>
              <Share2 className="h-4 w-4 mr-2" />
              {t('screens.diary.shareVia')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {onAddToFavorites && (
              <DropdownMenuItem onClick={onAddToFavorites}>
                <Heart className="h-4 w-4 mr-2" />
                {t('screens.diary.addFavorites')}
              </DropdownMenuItem>
            )}
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                {t('screens.diary.editDetails')}
              </DropdownMenuItem>
            )}
            {(onDelete || onReport) && <DropdownMenuSeparator />}
            {onDelete && (
              <DropdownMenuItem 
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('screens.diary.deletePhoto')}
              </DropdownMenuItem>
            )}
            {onReport && (
              <DropdownMenuItem onClick={onReport}>
                <Flag className="h-4 w-4 mr-2" />
                {t('screens.diary.report')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[80vh] mt-0 bg-card/95 backdrop-blur-sm border-white/10">
          <DrawerHeader className="relative shrink-0">
            <DrawerTitle>{t('screens.diary.photoPreview')}</DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[38vw] min-w-[420px] max-w-[560px] bg-card/95 backdrop-blur-sm border-white/10 shadow-xl p-0 overflow-hidden flex flex-col"
      >
        <SheetHeader className="p-6 pb-0 shrink-0">
          <SheetTitle className="text-left">{t('screens.diary.photoPreview')}</SheetTitle>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}
