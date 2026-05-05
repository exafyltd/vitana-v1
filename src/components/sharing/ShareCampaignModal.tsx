import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PersonalShareButtons } from "./PersonalShareButtons";
import { t } from '@/lib/i18n-toast';

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
  const publicUrl = `${window.location.origin}/pub/campaigns/${campaignId}`;
  
  const shareText = `Join me at: ${campaignName}${campaignDescription ? `\n${campaignDescription.slice(0, 150)}${campaignDescription.length > 150 ? '...' : ''}` : ''}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('screens.sharing.shareThisCampaign')}</DialogTitle>
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

        {/* Quick Share Buttons - Using unified component */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">{t('screens.sharing.quickShare')}</h4>
          <PersonalShareButtons
            shareUrl={publicUrl}
            shareText={shareText}
            title={`Join me: ${campaignName}`}
            variant="grid"
            showCopyLink={true}
          />
          <p className="text-xs text-muted-foreground">
            Opens your personal apps to share directly
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
